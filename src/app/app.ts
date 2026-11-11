import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './core/layout/sidebar/sidebar';
import { FeedbackComponent } from "./shared/components/feedback-component/feedback-component";
import { ConnectionState } from './services/connection-state';
import { AuthenticationService } from './services/authentication';
import { AccessPage } from './pages/access/access';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, SidebarComponent, FeedbackComponent, AccessPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  readonly connection: ConnectionState = inject(ConnectionState);
  readonly auth = inject(AuthenticationService);
  readonly sessionTitle = computed(() => ({
    checking: 'Verificando sessão', active: 'Sessão ativa', anonymous: 'Dashboard SSGEO',
    expired: 'Sessão expirada', disabled: 'Acesso desativado', unassigned: 'Conta sem acesso a um Squad',
    changed: 'A conta ou o Squad da sessão mudou', unavailable: 'Não foi possível verificar a sessão'
  }[this.auth.state()]));
  protected readonly title = signal('dashboardSSGEO-ui');

  constructor() { this.auth.refresh().subscribe(); }

  logout(): void {
    if (!window.confirm('Encerrar esta sessão? Edições não salvas permanecerão somente nesta aba.')) { return; }
    this.auth.logout().subscribe({ error: () => this.auth.notice.set('Não foi possível encerrar a sessão. Verifique a sessão e tente novamente.') });
  }
}
