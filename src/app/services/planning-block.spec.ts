import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlanningBlockService } from './planning-block';
import { BlockRequest, PlanningBlock } from '../models/components/planner/PlanningBlock';
import { API_URL } from '../config/api.config';

describe('PlanningBlockService', () => {
  let service: PlanningBlockService;
  let http: HttpTestingController;
  const payload: BlockRequest = {
    type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
  };
  const block: PlanningBlock = { ...payload, id: 'b1', conflictingActivityIds: ['a1'] };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PlanningBlockService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should load blocks including existing activity conflicts', () => {
    const received = vi.fn();
    service.getAll().subscribe(received);
    const request = http.expectOne(`${API_URL}/blocks`);
    expect(request.request.method).toBe('GET');
    request.flush([block]);
    expect(received).toHaveBeenCalledWith([block]);
  });

  it('should create a dependency block using the backend contract', () => {
    const received = vi.fn();
    service.create(payload).subscribe(received);
    const request = http.expectOne(`${API_URL}/blocks`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(block);
    expect(received).toHaveBeenCalledWith(block);
  });

  it('should update the existing block and support changing it to global', () => {
    const requestPayload: BlockRequest = { ...payload, type: 'CORPORATE', coatendId: null };
    const received = vi.fn();
    service.update('b1', requestPayload).subscribe(received);
    const request = http.expectOne(`${API_URL}/blocks/b1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(requestPayload);
    request.flush({ ...block, ...requestPayload });
    expect(received).toHaveBeenCalledWith({ ...block, ...requestPayload });
  });

  it('should propagate validation errors instead of returning success', () => {
    const error = vi.fn();
    const received = vi.fn();
    service.create(payload).subscribe({ next: received, error });
    http.expectOne(`${API_URL}/blocks`).flush({ message: 'Invalid dates' }, { status: 400, statusText: 'Bad Request' });
    expect(error).toHaveBeenCalledOnce();
    expect(received).not.toHaveBeenCalled();
  });
});
