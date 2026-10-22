import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoatendService } from './coatend';
import { API_URL } from '../config/api.config';
import { SwapDateOption } from '../models/coatend/CoatendMilestoneModel';

describe('CoatendService', () => {
  let service: CoatendService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CoatendService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('groups planned dates, excludes missing dates and separates confirmations from pending Coatends', () => {
    let result: SwapDateOption[] = [];
    service.getSwapDates().subscribe(value => { result = value; });
    http.expectOne(`${API_URL}/coatends`).flush([
      { id: 'c2', coatendNumber: 2, description: 'Pendente' },
      { id: 'c1', coatendNumber: 1, description: 'Confirmada' },
      { id: 'c3', coatendNumber: 3, description: 'Sem data' },
      { id: 'c4', coatendNumber: 4, description: 'Outra data' }
    ]);
    const requests = http.match(request => request.url.endsWith('/milestones'));
    const states: Record<string, { plannedEnd: string | null; confirmedAt: string | null }> = {
      c1: { plannedEnd: '2026-10-26', confirmedAt: '2026-10-22T10:00:00Z' },
      c2: { plannedEnd: '2026-10-26', confirmedAt: null },
      c3: { plannedEnd: null, confirmedAt: null },
      c4: { plannedEnd: '2026-10-23', confirmedAt: null }
    };
    for (const request of requests.reverse()) {
      const coatendId = request.request.url.split('/').at(-2)!;
      request.flush({ swap: states[coatendId] });
    }
    expect(result.map(option => option.date)).toEqual(['2026-10-23', '2026-10-26']);
    expect(result[0].confirmed).toEqual([]);
    expect(result[1].confirmed.map(coatend => coatend.id)).toEqual(['c1']);
    expect(result[1].pending.map(coatend => coatend.id)).toEqual(['c2']);
  });

  it('returns an empty list without milestone requests when no Coatends exist', () => {
    const received = vi.fn();
    service.getSwapDates().subscribe(received);
    http.expectOne(`${API_URL}/coatends`).flush([]);
    expect(received).toHaveBeenCalledExactlyOnceWith([]);
    http.expectNone(request => request.url.endsWith('/milestones'));
  });

  it('fails instead of publishing partial dates when a milestone request fails', () => {
    const received = vi.fn();
    const failed = vi.fn();
    service.getSwapDates().subscribe({ next: received, error: failed });
    http.expectOne(`${API_URL}/coatends`).flush([
      { id: 'c1', coatendNumber: 1, description: 'Primeira' },
      { id: 'c2', coatendNumber: 2, description: 'Segunda' }
    ]);
    http.expectOne(`${API_URL}/coatends/c1/milestones`).flush({
      swap: { plannedEnd: '2026-10-26', confirmedAt: '2026-10-22T10:00:00Z' }
    });
    http.expectOne(`${API_URL}/coatends/c2/milestones`).flush({}, { status: 500, statusText: 'Error' });
    expect(received).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledOnce();
  });
});
