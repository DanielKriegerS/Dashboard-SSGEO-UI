import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin, Observable, Subscription } from 'rxjs';
import { IncidentService } from '../../services/incident';
import { PlanningBlockService } from '../../services/planning-block';
import { IncidentModel, IncidentTimeline, IncidentMilestones, IncidentBlock, IncidentActivityRequest } from '../../models/incident/IncidentModel';
import { PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { PlannerPlaceholderActions } from '../../core/layout/planner-placeholder-actions/planner-placeholder-actions';
import { PlannerPlaceholderSubmission } from '../../models/components/planner/PlannerPlaceholderSubmission';
import { getActivityDateRanges } from '../../shared/utils/planner-dates';
import { Activity } from '../../models/components/Activities';

@Component({
  selector: 'app-incident', imports: [ReactiveFormsModule, RouterLink, DatePipe, PlannerPlaceholderActions],
  templateUrl: './incident.html', styleUrl: './incident.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class Incident implements OnInit {
  private readonly service = inject(IncidentService);
  private readonly blockService = inject(PlanningBlockService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private loadSubscription?: Subscription;
  @ViewChild('actions') actions?: PlannerPlaceholderActions;
  readonly item = signal<IncidentModel | null>(null);
  readonly entries = signal<IncidentTimeline[]>([]);
  readonly milestones = signal<IncidentMilestones | null>(null);
  readonly dependencies = signal<IncidentBlock[]>([]);
  readonly blocks = signal<PlanningBlock[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly activityLabels = {
    ANALYSIS: 'Análise', DEVELOPMENT: 'Desenvolvimento', TESTING_TU: 'Testes Unitários', PASSAGE_TH: 'Passagem Homologação',
    HOMOLOGATION: 'Homologação', PRE_SWAP: 'Pré-SWAP', SWAP: 'SWAP', ADMINISTRATIVE_TASKS: 'Administrativo'
  };
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^INC[0-9]+$/), Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.maxLength(255)]]
  });

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.destroyRef.onDestroy(() => this.loadSubscription?.unsubscribe());
  }

  load() {
    this.loadSubscription?.unsubscribe();
    const id = this.route.snapshot.paramMap.get('id');
    this.error.set('');
    this.item.set(null);
    this.entries.set([]);
    this.milestones.set(null);
    this.dependencies.set([]);
    if (!id) { this.loading.set(false); this.form.reset(); return; }
    this.loading.set(true);
    this.loadSubscription = forkJoin({ item: this.service.getById(id), entries: this.service.getTimeline(id),
      milestones: this.service.getMilestones(id), dependencies: this.service.getBlocks(id), blocks: this.blockService.getAll()
    }).pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.item.set(result.item); this.entries.set(result.entries); this.milestones.set(result.milestones);
        this.dependencies.set(result.dependencies);
        this.blocks.set([...result.blocks, ...result.dependencies.map(block => ({ ...block, coatendId: null,
          owner: { kind: 'incident' as const, id } }))]);
        this.form.setValue({ code: result.item.code, description: result.item.description });
      },
      error: () => this.error.set('Nao foi possivel carregar o Incidente.')
    });
  }

  save() {
    if (this.busy() || this.form.invalid || !this.form.controls.description.value.trim()) { this.form.markAllAsTouched(); return; }
    const request = { ...this.form.getRawValue(), description: this.form.controls.description.value.trim() };
    const item = this.item();
    this.mutate(item ? this.service.update(item.id, request) : this.service.create(request), result => {
      this.router.navigate(['/incidents', result.id]);
      if (item) this.load();
    });
  }

  delete() {
    const item = this.item();
    if (!item || !window.confirm(`Excluir ${item.code}?`)) return;
    this.mutate(this.service.delete(item.id), () => this.router.navigate(['/incidents']));
  }

  confirm(milestone: 'TU' | 'SWAP', reopen = false) {
    const item = this.item();
    if (!item || !window.confirm(`${reopen ? 'Reabrir' : 'Confirmar'} ${milestone} de ${item.code}?`)) return;
    this.mutate(reopen ? this.service.reopenMilestone(item.id, milestone) : this.service.confirmMilestone(item.id, milestone), () => this.load());
  }

  openActivity(entry?: IncidentTimeline) {
    const item = this.item();
    if (!item || this.busy()) return;
    this.actions?.open({ type: 'activity', owner: { kind: 'incident', id: item.id }, activityId: entry?.id,
      activity: entry?.activity, startDate: entry?.startDate, endDate: entry?.endDate, developerId: entry?.developerId ?? undefined });
  }

  openBlock(block?: IncidentBlock) {
    const item = this.item();
    if (!item || this.busy()) return;
    this.actions?.open({ type: 'block', owner: { kind: 'incident', id: item.id }, blockType: 'DEPENDENCY',
      blockId: block?.id, startDate: block?.startDate, endDate: block?.endDate });
  }

  submit(command: PlannerPlaceholderSubmission) {
    const item = this.item();
    if (!item || command.owner?.kind !== 'incident' || command.owner.id !== item.id || this.busy()) return;
    if (command.type === 'block') {
      const request = { startDate: command.startDate ?? '', endDate: command.endDate ?? '' };
      this.mutate(command.blockId ? this.service.updateBlock(item.id, command.blockId, request) : this.service.createBlock(item.id, request), () => this.load());
      return;
    }
    if (command.type !== 'activity') return;
    const requests: IncidentActivityRequest[] = getActivityDateRanges(command.startDate ?? '', command.endDate ?? '', command.includeWeekends ?? true)
      .map(range => ({ activity: command.activity as Activity, ...range, developerId: command.developerId }));
    if (!requests.length) return;
    const operation: Observable<unknown> = command.activityId
      ? command.includeWeekends === undefined
        ? this.service.updateActivity(item.id, command.activityId, requests[0])
        : this.service.updatePeriods(item.id, command.activityId, requests)
      : this.service.createBatch(item.id, requests);
    this.mutate(operation, () => this.load());
  }

  deleteActivity(entry: IncidentTimeline) {
    const item = this.item();
    if (item && window.confirm('Excluir esta atividade?')) this.mutate(this.service.deleteActivity(item.id, entry.id), () => this.load());
  }

  private mutate<T>(operation: Observable<T>, onSuccess: (value: T) => void) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    operation.pipe(finalize(() => this.busy.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: onSuccess,
      error: () => this.error.set('Nao foi possivel salvar a alteracao. Confira os dados e tente novamente.')
    });
  }
}