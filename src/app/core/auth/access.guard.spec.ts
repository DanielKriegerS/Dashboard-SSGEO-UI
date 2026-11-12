import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AuthenticationService, CurrentUser, SessionState } from '../../services/authentication';
import { MembershipAccessService } from '../../services/membership-access';
import { accessGuard, adminGuard, globalAdminGuard } from './access.guard';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';

@Component({ template: 'Page' })
class GuardedPageStub {}

describe('access guards', () => {
  const state = signal<SessionState>('active');
  const user = signal<CurrentUser>({ userId: 'user', name: 'Pessoa', squadId: 'squad', accessState: 'ACTIVE', role: 'MEMBER' });
  const membership = { globalStatus: vi.fn(() => of({ globalAdmin: true })) };
  const run = (admin = false) => TestBed.runInInjectionContext(() => (admin ? adminGuard : accessGuard)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  const runGlobal = () => TestBed.runInInjectionContext(() => globalAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  beforeEach(() => {
    state.set('active'); user.update(value => ({ ...value, role: 'MEMBER' }));
    membership.globalStatus.mockReturnValue(of({ globalAdmin: true }));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthenticationService, useValue: { state, user, blocked: computed(() => state() !== 'active') } },
      { provide: MembershipAccessService, useValue: membership }] });
  });
  it('allows ordinary members to plan without granting privileged administration', () => {
    expect(run()).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(run(true) as ReturnType<Router['parseUrl']>)).toBe('/');
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

  it('allows a global administrator without a team and denies other unassigned accounts', async () => {
    state.set('unassigned');
    user.set({ userId: 'global', name: 'Global', accessState: 'NO_MEMBERSHIP' });
    const allowed = runGlobal();
    expect(isObservable(allowed)).toBe(true);
    if (!isObservable(allowed)) { throw new Error('Expected asynchronous permission check'); }
    expect(await firstValueFrom(allowed)).toBe(true);
    membership.globalStatus.mockReturnValue(of({ globalAdmin: false }));
    const denied = runGlobal();
    expect(isObservable(denied)).toBe(true);
    if (!isObservable(denied)) { throw new Error('Expected asynchronous permission check'); }
    expect(TestBed.inject(Router).serializeUrl(await firstValueFrom(denied) as ReturnType<Router['parseUrl']>)).toBe('/access');
  });

  it.each(['/admin', '/admin/features', '/admin/features/new', '/admin/features/feature-id', '/admin/developers', '/admin/members', '/admin/team', '/developers'])('denies MEMBER direct navigation to %s', async path => {
    const protectedRoutes = routes.find(route => route.path === '' && route.children)!.children!;
    const admin = protectedRoutes.find(route => route.path === 'admin')!;
    expect(admin.canActivate).toContain(adminGuard);
    expect(admin.canActivateChild).toContain(adminGuard);
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: '', pathMatch: 'full', component: GuardedPageStub },
      { ...admin, loadComponent: undefined, component: GuardedPageStub,
        children: admin.children!.map(child => ({ ...child, loadComponent: async () => GuardedPageStub })) },
      protectedRoutes.find(route => route.path === 'developers')!
    ])] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(path);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('keeps global administration outside the team-membership guarded routes', () => {
    const global = routes.find(route => route.path === 'global-administration');
    expect(global?.canActivate).toContain(globalAdminGuard);
    expect(routes.find(route => route.path === '' && route.children)?.children?.some(route => route.path === 'global-administration')).toBe(false);
  });
});