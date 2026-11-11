import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MembershipAccessService } from './membership-access';
import { API_URL } from '../config/api.config';

describe('MembershipAccessService contracts', () => {
  let service: MembershipAccessService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MembershipAccessService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('reads only the own admission request and supports 204 without a catalog', () => {
    service.ownRequest().subscribe(value => expect(value).toBeNull());
    http.expectOne(`${API_URL}/admission-requests/me`).flush(null, { status: 204, statusText: 'No Content' });
    service.request('opaque').subscribe();
    const request = http.expectOne(`${API_URL}/admission-requests`);
    expect(request.request.method).toBe('POST'); expect(request.request.body).toEqual({ code: 'opaque' }); request.flush({ status: 'PENDING' });
  });
  it('uses the exact administration contracts without client-selected Squad or user', () => {
    service.members().subscribe(); http.expectOne(`${API_URL}/administration/members`).flush([]);
    service.pending().subscribe(); http.expectOne(`${API_URL}/administration/admission-requests`).flush([]);
    service.approve('request', 'SWAP').subscribe();
    const approval = http.expectOne(`${API_URL}/administration/admission-requests/request/approve`);
    expect(approval.request.body).toEqual({ operationalGroup: 'SWAP' }); approval.flush({});
    service.reject('request').subscribe(); http.expectOne(`${API_URL}/administration/admission-requests/request/reject`).flush({});
    service.change('member', { active: false }).subscribe();
    const change = http.expectOne(`${API_URL}/administration/members/member`);
    expect(change.request.method).toBe('PATCH'); expect(change.request.body).toEqual({ active: false }); change.flush({});
  });
});