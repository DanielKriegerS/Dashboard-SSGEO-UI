import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_URL } from '../config/api.config';
import { FeatureService } from './feature';

describe('FeatureService', () => {
  let service: FeatureService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FeatureService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the CRUD and planning routes without changing server values', () => {
    service.getAll().subscribe(value => expect(value).toEqual([]));
    http.expectOne(`${API_URL}/features`).flush([]);
    service.getById('f1').subscribe();
    http.expectOne(`${API_URL}/features/f1`).flush({ id: 'f1', coatends: [] });
    service.getPlanning('f1').subscribe(value => expect(value.development.estimatedPercent).toBeNull());
    http.expectOne(`${API_URL}/features/f1/planning`).flush({ development: { estimatedPercent: null } });
    const payload = { name: 'Feature', description: null };
    service.create(payload).subscribe();
    const create = http.expectOne(`${API_URL}/features`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ id: 'f1', ...payload, coatends: [] });
    service.update('f1', payload).subscribe();
    const update = http.expectOne(`${API_URL}/features/f1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ id: 'f1', ...payload, coatends: [] });
    service.delete('f1').subscribe();
    const remove = http.expectOne(`${API_URL}/features/f1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('preserves optional weight and uses explicit unlink', () => {
    service.link('f1', 'c1', null).subscribe();
    const link = http.expectOne(`${API_URL}/features/f1/coatends/c1`);
    expect(link.request.method).toBe('PUT');
    expect(link.request.body).toEqual({ weight: null });
    link.flush({ id: 'c1', weight: null });
    service.unlink('f1', 'c1').subscribe();
    const unlink = http.expectOne(`${API_URL}/features/f1/coatends/c1`);
    expect(unlink.request.method).toBe('DELETE');
    unlink.flush(null);
  });

  it('propagates conflict responses to the screen', () => {
    service.delete('f1').subscribe({ error: error => expect(error.status).toBe(409) });
    http.expectOne(`${API_URL}/features/f1`).flush({ message: 'Linked Coatends' }, { status: 409, statusText: 'Conflict' });
  });
});