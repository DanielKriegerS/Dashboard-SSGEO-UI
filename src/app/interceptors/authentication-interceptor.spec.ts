import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthenticationService } from '../services/authentication';
import { API_URL } from '../config/api.config';
import { authenticationInterceptor } from './authentication-interceptor';

describe('authenticationInterceptor', () => {
  let session: { state: ReturnType<typeof vi.fn>; blocked: ReturnType<typeof vi.fn>; contextHeaders: ReturnType<typeof vi.fn>; csrf: ReturnType<typeof vi.fn>; expire: ReturnType<typeof vi.fn>; contextChanged: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    session = { state: vi.fn(() => 'active'), blocked: vi.fn(() => false), contextHeaders: vi.fn(() => ({ 'X-Expected-User-Id': 'owner', 'X-Expected-Squad-Id': 'squad-a' })),
      csrf: vi.fn(() => of({ headerName: 'X-XSRF-TOKEN', token: 'csrf' })), expire: vi.fn(), contextChanged: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthenticationService, useValue: session }] });
  });

  it('adds CSRF and the original editor context only to API mutations', () => {
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse({ status: 200 })));
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('PUT', `${API_URL}/incidents/one`, {}), next)).subscribe();
    const request = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(request.headers.get('X-XSRF-TOKEN')).toBe('csrf');
    expect(request.headers.get('X-Expected-User-Id')).toBe('owner');
    expect(request.headers.get('X-Expected-Squad-Id')).toBe('squad-a');
  });

  it('does not send session headers to third parties or request CSRF for reads', () => {
    const next = vi.fn((request: HttpRequest<unknown>) => of(new HttpResponse({ status: 200 })));
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('GET', `${API_URL}/incidents`), next)).subscribe();
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('POST', 'https://external.example/api', {}), next)).subscribe();
    expect(session.csrf).not.toHaveBeenCalled();
    expect(next.mock.calls[1][0].headers.has('X-Expected-User-Id')).toBe(false);
    expect(next.mock.calls[1][0].headers.has('X-XSRF-TOKEN')).toBe(false);
  });

  it('never retries expired, denied or ambiguous writes', () => {
    for (const status of [401, 403, 0]) {
      const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status })));
      TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('POST', `${API_URL}/incidents`, {}), next))
        .subscribe({ error: () => undefined });
      expect(next).toHaveBeenCalledTimes(1);
    }
    expect(session.expire).toHaveBeenCalledTimes(1);
  });

  it('blocks dispatch while the workspace is locked', () => {
    session.blocked.mockReturnValue(true);
    const next = vi.fn();
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('POST', `${API_URL}/incidents`, {}), next))
      .subscribe({ error: () => undefined });
    expect(next).not.toHaveBeenCalled();
    expect(session.csrf).not.toHaveBeenCalled();
  });

  it('allows only admission for an authenticated unassigned account, with CSRF on writes', () => {
    session.state.mockReturnValue('unassigned');
    session.blocked.mockReturnValue(true);
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse({ status: 200 })));
    for (const [method, path] of [['GET', '/admission-requests/me'], ['POST', '/admission-requests'],
      ['GET', '/squad-creation-requests/me'], ['POST', '/squad-creation-requests']]) {
      TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest(method, `${API_URL}${path}`, null), next)).subscribe();
    }
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.calls[1][0].headers.get('X-XSRF-TOKEN')).toBe('csrf');
    expect(next.mock.calls[3][0].headers.get('X-XSRF-TOKEN')).toBe('csrf');
    for (const path of ['/incidents', '/administration/members', '/admission-requests/other']) {
      TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('GET', `${API_URL}${path}`), next)).subscribe({ error: () => undefined });
    }
    expect(next).toHaveBeenCalledTimes(4);
    session.state.mockReturnValue('disabled');
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('POST', `${API_URL}/admission-requests`, {}), next)).subscribe({ error: () => undefined });
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('locks the preserved draft when the server reports a different session context', () => {
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SESSION_CONTEXT_CHANGED' } })));
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('POST', `${API_URL}/incidents`, {}), next))
      .subscribe({ error: () => undefined });
    expect(next).toHaveBeenCalledTimes(1);
    expect(session.contextChanged).toHaveBeenCalledOnce();
  });

  it('allows only global administration requests for unassigned sessions', () => {
    session.state.mockReturnValue('unassigned');
    session.blocked.mockReturnValue(true);
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse({ status: 200 })));
    for (const [method, path] of [['GET', '/global-administration/status'],
      ['GET', '/global-administration/squad-creation-requests'],
      ['POST', '/global-administration/squad-creation-requests/request-id/approve'],
      ['POST', '/global-administration/squad-creation-requests/request-id/reject']]) {
      TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest(method, `${API_URL}${path}`, null), next)).subscribe();
    }
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.calls[2][0].headers.get('X-XSRF-TOKEN')).toBe('csrf');
    for (const path of ['/incidents', '/global-administration/other']) {
      TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('GET', `${API_URL}${path}`), next)).subscribe({ error: () => undefined });
    }
    session.state.mockReturnValue('disabled');
    TestBed.runInInjectionContext(() => authenticationInterceptor(new HttpRequest('GET', `${API_URL}/global-administration/status`), next)).subscribe({ error: () => undefined });
    expect(next).toHaveBeenCalledTimes(4);
  });
});