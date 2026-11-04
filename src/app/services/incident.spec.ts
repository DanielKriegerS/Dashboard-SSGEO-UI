import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentService } from './incident';
import { API_URL } from '../config/api.config';

describe('IncidentService', () => {
  let service: IncidentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(IncidentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('preserves textual codes and uses the Incident contract without hierarchy', () => {
    service.create({ code: 'INC0001769649', description: 'Incident' }).subscribe();
    const request = http.expectOne(`${API_URL}/incidents`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'INC0001769649', description: 'Incident' });
    request.flush({ id: 'i1', code: 'INC0001769649', description: 'Incident', completed: false });
  });

  it('routes segment edits and confirmations to the Incident owner', () => {
    const periods = [{ activity: 'ANALYSIS' as const, startDate: '2026-10-15', endDate: '2026-10-16', developerId: 'd1' }];
    service.updatePeriods('i1', 'a1', periods).subscribe();
    const edit = http.expectOne(`${API_URL}/incidents/i1/timeline/a1/periods`);
    expect(edit.request.method).toBe('PUT');
    expect(edit.request.body).toEqual(periods);
    edit.flush([]);
    service.confirmMilestone('i1', 'SWAP').subscribe();
    const confirm = http.expectOne(`${API_URL}/incidents/i1/milestones/SWAP/confirmation`);
    expect(confirm.request.method).toBe('PUT');
    confirm.flush({});
    service.reopenMilestone('i1', 'TU').subscribe();
    const reopen = http.expectOne(`${API_URL}/incidents/i1/milestones/TU/confirmation`);
    expect(reopen.request.method).toBe('DELETE');
    reopen.flush({});
  });

  it('does not request per-item data for an empty list', () => {
    const received = vi.fn();
    service.getPlanningData().subscribe(received);
    http.expectOne(`${API_URL}/incidents`).flush([]);
    expect(received).toHaveBeenCalledExactlyOnceWith([]);
    http.expectNone(request => request.url.includes('/timeline'));
  });

  it('groups SWAP dates by authoritative confirmation, preserving textual Incident codes', () => {
    const received = vi.fn();
    service.getSwapDates().subscribe(received);
    http.expectOne(`${API_URL}/incidents`).flush([
      { id: 'i1', code: 'INC0001769649', description: 'Confirmed', completed: false },
      { id: 'i2', code: 'INC2', description: 'Pending', completed: true },
      { id: 'i3', code: 'INC3', description: 'No forecast', completed: false }
    ]);
    http.expectOne(`${API_URL}/incidents/i2/milestones`).flush({ swap: { plannedEnd: '2026-11-11', confirmedAt: null } });
    http.expectOne(`${API_URL}/incidents/i3/milestones`).flush({ swap: { plannedEnd: null, confirmedAt: null } });
    http.expectOne(`${API_URL}/incidents/i1/milestones`).flush({ swap: { plannedEnd: '2026-11-11', confirmedAt: '2026-11-04T10:00:00Z' } });
    expect(received).toHaveBeenCalledOnce();
    const dates = received.mock.calls[0][0];
    expect(dates).toHaveLength(1);
    expect(dates[0].date).toBe('2026-11-11');
    expect(dates[0].confirmedIncidents.map((item: { code: string }) => item.code)).toEqual(['INC0001769649']);
    expect(dates[0].pendingIncidents.map((item: { code: string }) => item.code)).toEqual(['INC2']);
    http.expectNone(request => request.url.includes('/timeline') || request.url.includes('/blocks'));
  });

  it('bounds planning requests and preserves list order despite reverse completion', () => {
    const received = vi.fn();
    service.getPlanningData().subscribe(received);
    http.expectOne(`${API_URL}/incidents`).flush(Array.from({ length: 5 }, (_, index) => ({
      id: `i${index}`, code: `INC${index}`, description: 'Incident', completed: false
    })));
    let active = http.match(request => request.url !== `${API_URL}/incidents`);
    expect(active).toHaveLength(12);
    for (const request of active.reverse()) request.flush(request.request.url.endsWith('/milestones') ? { warnings: [] } : []);
    active = http.match(request => request.url.includes('/i4/'));
    expect(active).toHaveLength(3);
    for (const request of active) request.flush(request.request.url.endsWith('/milestones') ? { warnings: [] } : []);
    expect(received).toHaveBeenCalledOnce();
    expect(received.mock.calls[0][0].map((item: { incident: { id: string } }) => item.incident.id)).toEqual(['i0', 'i1', 'i2', 'i3', 'i4']);
  });
});