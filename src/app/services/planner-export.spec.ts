import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlannerExportService } from './planner-export';
import { PlannerExportRequest } from '../models/components/planner/PlannerExportRequest';
import { API_URL } from '../config/api.config';

describe('PlannerExportService', () => {
  let service: PlannerExportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PlannerExportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const requests: PlannerExportRequest[] = [
    { mode: 'COUNT', startDate: '2026-10-08', count: 15 },
    { mode: 'PERIOD', startDate: '2026-10-08', endDate: '2026-10-12' },
    { mode: 'QUARTER', quarterId: 'q1' },
    { mode: 'SPRINT', sprintId: 's1' }
  ];

  it.each(requests)('should fetch XLSX with only the parameters for $mode', request => {
    const blob = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const received = vi.fn();
    service.export(request).subscribe(received);
    const call = http.expectOne(req => req.url === `${API_URL}/planner/export`);
    expect(call.request.method).toBe('GET');
    expect(call.request.responseType).toBe('blob');
    expect(call.request.params.keys().sort()).toEqual(Object.keys(request).sort());
    for (const [key, value] of Object.entries(request)) {
      expect(call.request.params.get(key)).toBe(String(value));
    }
    call.flush(blob);
    expect(received).toHaveBeenCalledWith(blob);
  });

  it('should propagate HTTP errors instead of downloading an error response', () => {
    const error = vi.fn();
    const received = vi.fn();
    service.export(requests[0]).subscribe({ next: received, error });
    http.expectOne(req => req.url === `${API_URL}/planner/export`)
      .flush(new Blob(['error']), { status: 400, statusText: 'Bad Request' });
    expect(error).toHaveBeenCalledOnce();
    expect(received).not.toHaveBeenCalled();
  });
});
