import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './core/layout/sidebar/sidebar';
import { FeedbackComponent } from "./shared/components/feedback-component/feedback-component";
import { ConnectionState } from './services/connection-state';
import { AuthenticationService } from './services/authentication';
import { AccessPage } from './pages/access/access';
import { MembershipAccessService } from './services/membership-access';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, FeedbackComponent, AccessPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  readonly connection: ConnectionState = inject(ConnectionState);
  readonly auth = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly membership = inject(MembershipAccessService);
  private readonly retryGlobalAccess = new Subject<void>();
  readonly globalAccess = signal<'none' | 'checking' | 'allowed' | 'denied' | 'error'>('none');
  readonly sessionTitle = computed(() => ({
    checking: 'Verificando sessão', active: 'Sessão ativa', anonymous: 'Dashboard SSGEO',
    expired: 'Sessão expirada', disabled: 'Acesso desativado', unassigned: 'Conta sem acesso a um Squad',
    changed: 'A conta ou o Squad da sessão mudou', unavailable: 'Não foi possível verificar a sessão'
  }[this.auth.state()]));
  protected readonly title = signal('dashboardSSGEO-ui');

  constructor() {
    toObservable(this.auth.state).pipe(
      switchMap(state => state === 'unassigned' ? this.retryGlobalAccess.pipe(
        startWith(undefined),
        switchMap(() => this.membership.globalStatus().pipe(
          map(result => result.globalAdmin ? 'allowed' as const : 'denied' as const),
          catchError(() => of('error' as const)),
          startWith('checking' as const)
        ))
      ) : of('none' as const)),
      takeUntilDestroyed()
    ).subscribe(status => {
      this.globalAccess.set(status);
      if (status === 'allowed' && this.router.url !== '/global-administration') {
        void this.router.navigateByUrl('/global-administration');
      }
    });
    this.auth.refresh().subscribe();
  }

  checkGlobalAccess(): void { this.retryGlobalAccess.next(); }

  logout(): void {
    if (!window.confirm('Encerrar esta sessão? Edições não salvas permanecerão somente nesta aba.')) { return; }
    this.auth.logout().subscribe({ error: () => this.auth.notice.set('Não foi possível encerrar a sessão. Verifique a sessão e tente novamente.') });
  }
}
