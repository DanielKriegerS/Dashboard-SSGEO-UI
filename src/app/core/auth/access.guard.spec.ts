import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { AuthenticationService, CurrentUser, SessionState } from '../../services/authentication';
import { accessGuard, adminGuard } from './access.guard';

describe('access guards', () => {
  const state = signal<SessionState>('active');
  const user = signal<CurrentUser>({ userId: 'user', name: 'Pessoa', squadId: 'squad', accessState: 'ACTIVE', role: 'MEMBER' });
  const run = (admin = false) => TestBed.runInInjectionContext(() => (admin ? adminGuard : accessGuard)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  beforeEach(() => {
    state.set('active'); user.update(value => ({ ...value, role: 'MEMBER' }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthenticationService, useValue: { state, user, blocked: computed(() => state() !== 'active') } }] });
  });
  it('allows ordinary members to plan without granting privileged administration', () => {
    expect(run()).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(run(true) as ReturnType<Router['parseUrl']>)).toBe('/admin');
    user.update(value => ({ ...value, role: 'ADMIN' }));
    expect(run(true)).toBe(true);
  });
  it('redirects every blocked state to access without loading privileged routes', () => {
    for (const blocked of ['anonymous', 'unassigned', 'disabled', 'expired', 'changed', 'unavailable'] as const) {
      state.set(blocked);
      expect(TestBed.inject(Router).serializeUrl(run(true) as ReturnType<Router['parseUrl']>)).toBe('/access');
    }
  });
  it('waits for the initial server check instead of assuming authentication', async () => {
    state.set('checking');
    const result = run();
    expect(isObservable(result)).toBe(true);
    if (!isObservable(result)) { throw new Error('Expected asynchronous session check'); }
    const settled = firstValueFrom(result);
    TestBed.tick(); state.set('active'); TestBed.tick();
    expect(await settled).toBe(true);
  });
});