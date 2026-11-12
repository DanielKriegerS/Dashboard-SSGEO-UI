import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { MembershipAccessService, SquadCreationRequest } from '../../services/membership-access';

@Component({
  selector: 'app-global-requests',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container py-3" aria-labelledby="global-requests-title">
      <h1 id="global-requests-title" class="h4">Solicitacoes de equipes</h1>
      @if (error()) { <p class="alert alert-danger" role="alert">{{ error() }}</p> }
      @if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
      @if (busy()) { <p role="status">Processando...</p> }
      @if (decision(); as current) {
        <section class="border-start border-3 ps-3 my-3" aria-labelledby="decision-title">
          <h2 id="decision-title" class="h6">Confirmar decisao</h2>
          <p>{{ current.approve ? 'Aprovar' : 'Rejeitar' }} a equipe {{ current.request.name }} solicitada por {{ current.request.requesterName }}?</p>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-primary" (click)="apply()" [disabled]="busy()">Confirmar</button>
            <button type="button" class="btn btn-outline-secondary" (click)="decision.set(null)" [disabled]="busy()">Cancelar</button>
          </div>
        </section>
      }
      @for (request of requests(); track request.id) {
        <article class="border-bottom py-3">
          <h2 class="h6">{{ request.name }}</h2>
          <p>Codigo: {{ request.admissionCode }}<br>Solicitante: {{ request.requesterName }} ({{ request.requesterEmail }})<br>Subgrupo: {{ request.operationalGroup }}<br>Enviado em: {{ request.requestedAt | date:'dd/MM/yyyy HH:mm' }}</p>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-primary" (click)="decision.set({request, approve: true})" [disabled]="busy() || !!decision()">Aprovar</button>
            <button type="button" class="btn btn-outline-danger" (click)="decision.set({request, approve: false})" [disabled]="busy() || !!decision()">Rejeitar</button>
          </div>
        </article>
      } @empty { @if (!busy() && !error()) { <p>Nenhuma solicitacao pendente.</p> } }
      <button type="button" class="btn btn-outline-secondary mt-3" (click)="load()" [disabled]="busy()">Atualizar</button>
    </section>
  `
})
export class GlobalRequestsPage {
  private readonly service = inject(MembershipAccessService);
  private readonly auth = inject(AuthenticationService);
  readonly requests = signal<SquadCreationRequest[]>([]);
  readonly decision = signal<{ request: SquadCreationRequest; approve: boolean } | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  constructor() { this.load(); }

  load(): void {
    if (this.busy() || (this.auth.blocked() && this.auth.state() !== 'unassigned')) return;
    this.busy.set(true); this.error.set('');
    this.service.globalRequests().pipe(finalize(() => this.busy.set(false))).subscribe({
      next: requests => this.requests.set(requests),
      error: () => { this.requests.set([]); this.error.set('Nao foi possivel consultar as solicitacoes globais.'); }
    });
  }

  apply(): void {
    const decision = this.decision();
    if (!decision || this.busy() || (this.auth.blocked() && this.auth.state() !== 'unassigned')) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    this.service.decideCreation(decision.request.id, decision.approve).subscribe({
      next: () => { this.busy.set(false); this.decision.set(null); this.notice.set('Decisao registrada.'); this.load(); },
      error: () => { this.busy.set(false); this.error.set('Decisao nao registrada. Confira se o solicitante continua sem vinculo e se o codigo esta disponivel.'); }
    });
  }
}