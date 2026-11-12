import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthenticationService, CurrentUser } from './authentication';
import { API_URL } from '../config/api.config';

describe('AuthenticationService', () => {
  let session: AuthenticationService;
  let http: HttpTestingController;
  const owner: CurrentUser = { userId: 'owner', name: 'Owner', accessState: 'ACTIVE', squadId: 'squad-a', role: 'MEMBER' };
  const finishRefresh = (user = owner, token = 'fresh-token'): void => {
    http.expectOne(`${API_URL}/auth/me`).flush(user);
    http.expectOne(`${API_URL}/auth/csrf`).flush({ headerName: 'X-XSRF-TOKEN', token });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(AuthenticationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); });

  it('resumes the same workspace after expiry and renews CSRF without storing credentials', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    session.refresh().subscribe();
    finishRefresh();
    session.expire();
    expect(session.blocked()).toBe(true);
    expect(session.workspaceOpened()).toBe(true);
    session.refresh().subscribe();
    finishRefresh(owner, 'renewed-token');
    expect(session.blocked()).toBe(false);
    session.csrf().subscribe(token => expect(token.token).toBe('renewed-token'));
    expect(storage).not.toHaveBeenCalled();
  });

  it('keeps the editor locked when reauthentication changes the user or Squad', () => {
    session.refresh().subscribe();
    finishRefresh();
    for (const changed of [{ ...owner, userId: 'other' }, { ...owner, squadId: 'squad-b' }]) {
      session.expire();
      session.refresh().subscribe();
      finishRefresh(changed);
      expect(session.state()).toBe('changed');
      expect(session.blocked()).toBe(true);
      expect(session.contextHeaders()['X-Expected-User-Id']).toBe('owner');
      expect(session.contextHeaders()['X-Expected-Squad-Id']).toBe('squad-a');
      expect(session.workspaceOpened()).toBe(true);
    }
  });

  it('does not open planning for disabled or unassigned accounts', () => {
    for (const accessState of ['DISABLED', 'NO_MEMBERSHIP'] as const) {
      session.refresh().subscribe();
      finishRefresh({ ...owner, accessState, squadId: undefined });
      expect(session.blocked()).toBe(true);
      expect(session.workspaceOpened()).toBe(false);
    }
  });

  it('pins the authenticated user without inventing a squad for unassigned requests', () => {
    session.refresh().subscribe();
    finishRefresh({ ...owner, accessState: 'NO_MEMBERSHIP', squadId: undefined, role: undefined });
    expect(session.contextHeaders()).toEqual({ 'X-Expected-User-Id': 'owner' });
    session.expire();
    expect(session.contextHeaders()).toEqual({});
  });

  it('does not navigate or discard the workspace when login is unavailable', () => {
    session.refresh().subscribe();
    finishRefresh();
    session.expire();
    vi.spyOn(window, 'open').mockReturnValue(null);
    session.openLogin();
    expect(session.workspaceOpened()).toBe(true);
    expect(session.state()).toBe('expired');
    expect(session.notice()).toContain('bloqueada');
  });

  it('ignores popup messages from another origin or another window', () => {
    const popup = { closed: false, focus: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(popup);
    session.openLogin();
    window.dispatchEvent(new MessageEvent('message', { source: popup, origin: 'https://untrusted.example', data: { type: 'SSGEO_SESSION_READY' } }));
    window.dispatchEvent(new MessageEvent('message', { source: window, origin: window.location.origin, data: { type: 'SSGEO_SESSION_READY' } }));
    http.expectNone(`${API_URL}/auth/me`);
    window.dispatchEvent(new MessageEvent('message', { source: popup, origin: window.location.origin, data: { type: 'SSGEO_SESSION_READY' } }));
    finishRefresh();
    expect(session.state()).toBe('active');
  });

  it('requires CSRF to logout and locks rather than removing the mounted workspace', () => {
    session.refresh().subscribe();
    finishRefresh();
    session.logout().subscribe();
    const logout = http.expectOne(`${API_URL}/auth/logout`);
    expect(logout.request.method).toBe('POST');
    expect(logout.request.headers.get('X-XSRF-TOKEN')).toBe('fresh-token');
    logout.flush(null);
    expect(session.blocked()).toBe(true);
    expect(session.workspaceOpened()).toBe(true);
  });
});