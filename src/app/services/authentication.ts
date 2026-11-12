import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, switchMap, tap } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface CurrentUser {
  userId: string;
  name: string;
  accessState: 'ACTIVE' | 'NO_MEMBERSHIP' | 'DISABLED';
  squadId?: string;
  role?: 'ADMIN' | 'MEMBER';
  operationalGroup?: 'DESENVOLVEDORES' | 'ADMINISTRATIVO' | 'SWAP';
}

export interface SessionCsrf { headerName: string; token: string; }
export type SessionState = 'checking' | 'active' | 'anonymous' | 'expired' | 'disabled' | 'unassigned' | 'changed' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly destroyRef = inject(DestroyRef);
  private token: SessionCsrf | null = null;
  private owner: CurrentUser | null = null;
  private popup: Window | null = null;
  private popupTimer: number | undefined;
  readonly state = signal<SessionState>('checking');
  readonly user = signal<CurrentUser | null>(null);
  readonly workspaceOpened = signal(false);
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly blocked = computed(() => this.state() !== 'active');

  private readonly receivedMessage = (event: MessageEvent): void => {
    if (!this.popup || event.source !== this.popup || event.origin !== window.location.origin
        || event.data?.type !== 'SSGEO_SESSION_READY') { return; }
    this.stopWatching();
    this.refresh().subscribe();
  };

  constructor() {
    window.addEventListener('message', this.receivedMessage);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('message', this.receivedMessage);
      this.stopWatching();
    });
  }

  refresh(): Observable<CurrentUser | null> {
    this.busy.set(true);
    this.notice.set('');
    return this.http.get<CurrentUser>(`${API_URL}/auth/me`).pipe(
      switchMap(user => this.http.get<SessionCsrf>(`${API_URL}/auth/csrf`).pipe(map(token => ({ user, token })))),
      map(({ user, token }) => {
        this.token = token;
        this.user.set(user);
        if (this.owner && (this.owner.userId !== user.userId || this.owner.squadId !== user.squadId)) {
          this.state.set('changed');
        } else if (user.accessState === 'ACTIVE' && user.squadId) {
          this.owner ??= user;
          this.workspaceOpened.set(true);
          this.state.set('active');
        } else {
          this.state.set(user.accessState === 'DISABLED' ? 'disabled' : 'unassigned');
        }
        if (window.opener && window.name === 'ssgeo-authentication') {
          window.opener.postMessage({ type: 'SSGEO_SESSION_READY' }, window.location.origin);
          window.close();
        }
        return user;
      }),
      catchError((error: HttpErrorResponse) => {
        this.token = null;
        this.state.set(error.status === 401 ? (this.workspaceOpened() ? 'expired' : 'anonymous') : 'unavailable');
        return of(null);
      }),
      finalize(() => this.busy.set(false))
    );
  }

  csrf(): Observable<SessionCsrf> {
    return this.token ? of(this.token) : this.http.get<SessionCsrf>(`${API_URL}/auth/csrf`).pipe(tap(token => this.token = token));
  }

  contextHeaders(): Record<string, string> {
    if (this.owner?.squadId) {
      return { 'X-Expected-User-Id': this.owner.userId, 'X-Expected-Squad-Id': this.owner.squadId };
    }
    const user = this.user();
    return this.state() === 'unassigned' && user ? { 'X-Expected-User-Id': user.userId } : {};
  }

  expire(): void {
    this.token = null;
    this.state.set(this.workspaceOpened() ? 'expired' : 'anonymous');
  }

  contextChanged(): void {
    this.token = null;
    this.state.set('changed');
  }

  openLogin(): void {
    if (this.popup && !this.popup.closed) { this.popup.focus(); return; }
    this.popup = window.open(`${API_URL}/oauth2/authorization/google`, 'ssgeo-authentication', 'popup,width=520,height=720');
    if (!this.popup) {
      this.notice.set('A janela de autenticação foi bloqueada pelo navegador.');
      return;
    }
    this.popupTimer = window.setInterval(() => {
      if (this.popup?.closed) {
        this.stopWatching();
        this.refresh().subscribe();
      }
    }, 500);
  }

  logout(): Observable<void> {
    return this.csrf().pipe(
      switchMap(token => this.http.post<void>(`${API_URL}/auth/logout`, null, { headers: { [token.headerName]: token.token } })),
      tap(() => { this.expire(); this.notice.set('Sessão encerrada.'); })
    );
  }

  private stopWatching(): void {
    window.clearInterval(this.popupTimer);
    this.popupTimer = undefined;
    this.popup = null;
  }
}