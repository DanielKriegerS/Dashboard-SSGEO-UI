import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ConnectionState } from './services/connection-state';
import { AuthenticationService, CurrentUser, SessionState } from './services/authentication';
import { of } from 'rxjs';

@Component({ template: '<input aria-label="Rascunho">' })
class DraftPage {}

describe('App', () => {
  const createSession = () => {
    const state = signal<SessionState>('active');
    return { state, blocked: computed(() => state() !== 'active'), workspaceOpened: signal(true), busy: signal(false),
      notice: signal(''), user: signal<CurrentUser | null>(null), refresh: vi.fn(() => of(null)),
      openLogin: vi.fn(), logout: vi.fn(() => of(undefined)) };
  };
  let session: ReturnType<typeof createSession>;
  beforeEach(async () => {
    session = createSession();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'draft', component: DraftPage }]), provideHttpClient(),
        { provide: AuthenticationService, useValue: session }],
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
});
