import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IncidentService } from '../../services/incident';
import { IncidentModel } from '../../models/incident/IncidentModel';

@Component({
  selector: 'app-incidents', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../incident/incident.scss',
  template: `
    <main class="container incident-page">
      <header class="incident-heading"><h1>Incidentes</h1><a class="btn btn-primary" routerLink="/incidents/new">Novo Incidente</a></header>
      @if (loading()) { <p role="status">Carregando Incidentes...</p> }
      @if (error()) { <div class="alert alert-danger" role="alert">{{ error() }} <button class="btn btn-outline-secondary" (click)="load()">Tentar novamente</button></div> }
      @if (!loading() && !error()) {
        @if (items().length) {
          <div class="table-responsive"><table class="table align-middle"><thead><tr><th>Código</th><th>Descrição</th><th>Situação</th></tr></thead><tbody>
            @for (item of items(); track item.id) { <tr><td><a [routerLink]="['/incidents', item.id]">{{ item.code }}</a></td><td>{{ item.description }}</td><td>{{ item.completed ? 'Concluído' : 'Em andamento' }}</td></tr> }
          </tbody></table></div>
        } @else { <p>Nenhum Incidente cadastrado.</p> }
      }
    </main>`
})
export class Incidents implements OnInit {
  private readonly service = inject(IncidentService);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = signal<IncidentModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => { this.error.set('Nao foi possivel carregar os Incidentes.'); this.loading.set(false); }
    });
  }
}