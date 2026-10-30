import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { defer, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FeedbackService } from '../services/feedback';
import { ConnectionState } from '../services/connection-state';

import { httpErrorInterceptor } from './http-error-interceptor';

describe('httpErrorInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [
      { provide: FeedbackService, useValue: { error: vi.fn(), info: vi.fn() } }
    ] });
  });

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('replays a milestone change only after acceptance with the exact server revision', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const next = vi.fn((request: HttpRequest<unknown>) => request.params.has('milestoneRevision')
      ? of(new HttpResponse({ status: 200 }))
      : throwError(() => new HttpErrorResponse({ status: 409, error: {
        code: 'MILESTONE_REPLAN_REQUIRED', message: 'Reabrir TU?', revision: 'current-revision'
      } })));
    const received = vi.fn();
    TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest('PUT', '/timeline/a1', {}), next)).subscribe(received);
    expect(confirm).toHaveBeenCalledWith('Reabrir TU?');
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[1][0].params.get('milestoneRevision')).toBe('current-revision');
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('does not replay a cancelled milestone change', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: {
      code: 'MILESTONE_REPLAN_REQUIRED', message: 'Reabrir TU?', revision: 'current-revision'
    } })));
    const failed = vi.fn();
    const completed = vi.fn();
    TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest('PUT', '/timeline/a1', {}), next))
      .subscribe({ error: failed, complete: completed });
    expect(next).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('reports a preserved milestone without asking for acceptance', () => {
    const confirm = vi.spyOn(window, 'confirm');
    TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest('PUT', '/timeline/a1', {}),
      () => of(new HttpResponse({ body: [{ milestoneNotice: 'Marco preservado.' }] })))).subscribe();
    expect(TestBed.inject(FeedbackService).info).toHaveBeenCalledWith('Marco preservado.');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('shows fallback only after the third failed read', async () => {
    const attempts = vi.fn();
    const failed = vi.fn();
    TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest('GET', '/quarters'),
      () => defer(() => { attempts(); return throwError(() => new HttpErrorResponse({ status: 0 })); })
    )).subscribe({ error: failed });
    expect(attempts).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ConnectionState).unavailable()).toBe(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(attempts).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(ConnectionState).unavailable()).toBe(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(attempts).toHaveBeenCalledTimes(3);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ConnectionState).unavailable()).toBe(true);
  });

  it('recovers a read without showing fallback', async () => {
    let attempts = 0;
    const received = vi.fn();
    TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest('GET', '/quarters'),
      () => defer(() => ++attempts === 1 ? throwError(() => new HttpErrorResponse({ status: 503 })) : of(new HttpResponse({ status: 200 })))
    )).subscribe(received);
    await vi.advanceTimersByTimeAsync(10000);
    expect(received).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(ConnectionState).unavailable()).toBe(false);
  });

  it('never retries writes or business errors', async () => {
    for (const [method, status] of [['POST', 0], ['GET', 409], ['GET', 400]] as const) {
      const attempts = vi.fn();
      TestBed.runInInjectionContext(() => httpErrorInterceptor(new HttpRequest(method, '/quarters', null),
        () => defer(() => { attempts(); return throwError(() => new HttpErrorResponse({ status })); })
      )).subscribe({ error: () => undefined });
      await vi.advanceTimersByTimeAsync(30000);
      expect(attempts).toHaveBeenCalledTimes(1);
    }
    expect(TestBed.inject(ConnectionState).unavailable()).toBe(false);
  });
});
