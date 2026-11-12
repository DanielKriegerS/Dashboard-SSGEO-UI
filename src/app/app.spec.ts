import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ConnectionState } from './services/connection-state';
import { AuthenticationService, CurrentUser, SessionState } from './services/authentication';
import { of, throwError } from 'rxjs';
import { MembershipAccessService } from './services/membership-access';

@Component({ template: '<input aria-label="Rascunho">' })
class DraftPage {}
@Component({ template: '<h1>Solicitações globais</h1>' })
class GlobalAreaPage {}

describe('App', () => {
  const createSession = () => {
    const state = signal<SessionState>('active');
    return { state, blocked: computed(() => state() !== 'active'), workspaceOpened: signal(true), busy: signal(false),
      notice: signal(''), user: signal<CurrentUser | null>(null), refresh: vi.fn(() => of(null)),
      openLogin: vi.fn(), logout: vi.fn(() => of(undefined)) };
  };
  let session: ReturnType<typeof createSession>;
  let membership: { globalStatus: ReturnType<typeof vi.fn>; globalRequests: ReturnType<typeof vi.fn>;
    ownRequest: ReturnType<typeof vi.fn>; ownCreationRequest: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    session = createSession();
    membership = { globalStatus: vi.fn(() => of({ globalAdmin: false })), globalRequests: vi.fn(() => of([])),
      ownRequest: vi.fn(() => of(null)), ownCreationRequest: vi.fn(() => of(null)) };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', pathMatch: 'full', component: DraftPage },
        { path: 'draft', component: DraftPage }, { path: 'global-administration', component: GlobalAreaPage }]), provideHttpClient(),
        { provide: AuthenticationService, useValue: session },
        { provide: MembershipAccessService, useValue: membership }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps routed content visible before retries are exhausted', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('.connection-fallback')).toBeNull();
  });

  it('preserves the mounted editor and unsaved input when the connection fails', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/draft');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input')!;
    input.value = 'Trabalho em andamento';
    const connection = TestBed.inject(ConnectionState);
    connection.unavailable.set(true);
    await fixture.whenStable();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('input')).toBe(input);
    expect(input.value).toBe('Trabalho em andamento');
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('três tentativas');
    compiled.querySelector<HTMLButtonElement>('.connection-fallback button')?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.connection-fallback')).toBeNull();
    expect(compiled.querySelector('input')).toBe(input);
    expect(input.value).toBe('Trabalho em andamento');
  });

  it('hides rather than destroys the draft during expiry and restores the same editor after login', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/draft');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input')!;
    input.value = 'Rascunho antes da expiração';
    session.state.set('expired');
    await fixture.whenStable();
    expect(compiled.querySelector<HTMLElement>('.workspace')?.hidden).toBe(true);
    expect(compiled.querySelector('input')).toBe(input);
    compiled.querySelector<HTMLButtonElement>('.session-actions button')?.click();
    expect(session.openLogin).toHaveBeenCalledOnce();
    session.state.set('changed');
    await fixture.whenStable();
    expect(compiled.querySelector<HTMLElement>('.workspace')?.hidden).toBe(true);
    session.state.set('active');
    await fixture.whenStable();
    expect(compiled.querySelector<HTMLElement>('.workspace')?.hidden).toBe(false);
    expect(compiled.querySelector('input')).toBe(input);
    expect(input.value).toBe('Rascunho antes da expiração');
  });

  it('opens only global administration for an authorized user without a team', async () => {
    session.state.set('unassigned'); session.workspaceOpened.set(false);
    session.user.set({ userId: 'global', name: 'Global', accessState: 'NO_MEMBERSHIP' });
    membership.globalStatus.mockReturnValue(of({ globalAdmin: true }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/global-administration');
    expect(compiled.textContent).toContain('Solicitações globais');
    expect(compiled.querySelector('app-access')).toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector<HTMLElement>('app-sidebar')?.hidden).toBe(false);
    expect(compiled.querySelector('a[href="/global-administration"]')).not.toBeNull();
    session.state.set('disabled');
    await fixture.whenStable();
    expect(compiled.querySelector('app-global-requests')).toBeNull();
  });

  it('retains the admission screen for an unassigned user without global access', async () => {
    session.state.set('unassigned'); session.workspaceOpened.set(false);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-access')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-global-requests')).toBeNull();
    expect(membership.globalRequests).not.toHaveBeenCalled();
  });

  it('does not mistake a failed global access check for a denied permission', async () => {
    session.state.set('unassigned'); session.workspaceOpened.set(false);
    membership.globalStatus.mockReturnValueOnce(throwError(() => new Error('unavailable')))
      .mockReturnValueOnce(of({ globalAdmin: true }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível verificar o acesso global');
    expect(fixture.nativeElement.querySelector('app-access')).toBeNull();
    membership.globalStatus.mockReturnValue(of({ globalAdmin: true }));
    fixture.componentInstance.checkGlobalAccess();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/global-administration');
  });
});
