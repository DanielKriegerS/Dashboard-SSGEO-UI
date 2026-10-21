import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import { FeatureService } from '../../services/feature';
import { FeatureModel } from '../../models/feature/FeatureModel';
import { FeaturePlanningModel } from '../../models/feature/FeaturePlanningModel';
import { CoatendService } from '../../services/coatend';
import { CoatendSummary } from '../../models/coatend/CoatendSummary';
import { featureReason, milestoneWarningLabel } from '../../shared/utils/feature-labels';

@Component({
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './feature.html',
  styleUrl: '../features/features.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Feature {
  private readonly service = inject(FeatureService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly coatendService = inject(CoatendService);
  readonly planning = signal<FeaturePlanningModel | null>(null);
  readonly catalog = signal<FeatureModel[]>([]);
  readonly coatends = signal<CoatendSummary[]>([]);
  readonly confirmingUnlink = signal<string | null>(null);
  readonly availableCoatends = computed(() => this.coatends().filter(coatend =>
    !this.catalog().some(feature => feature.id !== this.id && feature.coatends.some(member => member.id === coatend.id))));
  readonly reasonLabel = featureReason;
  readonly warningLabel = milestoneWarningLabel;
  readonly linkForm = inject(FormBuilder).group({ coatendId: ['', Validators.required], weight: [null as number | null, Validators.min(Number.MIN_VALUE)] });
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly feature = signal<FeatureModel | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly confirmingDelete = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    description: ['']
  });

  constructor() { if (this.id) { this.load(); } }

  load(): void {
    if (!this.id) { return; }
    this.loading.set(true);
    this.error.set('');
    forkJoin({ feature: this.service.getById(this.id), catalog: this.service.getAll(),
      coatends: this.coatendService.getAll(), planning: this.service.getPlanning(this.id) })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.feature.set(result.feature);
        this.catalog.set(result.catalog);
        this.coatends.set(result.coatends);
        this.planning.set(result.planning);
        this.form.setValue({ name: result.feature.name, description: result.feature.description || '' });
      },
      error: () => this.error.set('Nao foi possivel carregar a Feature.')
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const request = { name: value.name.trim(), description: value.description.trim() || null };
    this.saving.set(true);
    this.error.set('');
    const operation = this.id ? this.service.update(this.id, request) : this.service.create(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: feature => {
        this.feature.set(feature);
        this.notice.set('Feature salva com sucesso.');
        if (!this.id) { this.router.navigate(['/admin/features', feature.id]); }
      },
      error: () => this.error.set('Nao foi possivel salvar. Os dados foram mantidos para nova tentativa.')
    });
  }

  remove(): void {
    if (!this.id || !this.confirmingDelete() || this.saving()) { return; }
    this.saving.set(true);
    this.error.set('');
    this.service.delete(this.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.router.navigate(['/admin/features']); },
      error: error => this.error.set(error.status === 409
        ? 'Esta Feature possui Coatends vinculadas. Desvincule-as antes de excluir.'
        : 'Nao foi possivel excluir a Feature. Nenhum item foi removido da tela.')
    });
  }

  selectCoatend(): void {
    const selected = this.feature()?.coatends.find(coatend => coatend.id === this.linkForm.controls.coatendId.value);
    this.linkForm.controls.weight.setValue(selected?.weight ?? null);
  }

  saveLink(): void {
    if (!this.id || this.linkForm.invalid || this.saving()) { this.linkForm.markAllAsTouched(); return; }
    const value = this.linkForm.getRawValue();
    this.updateLink(this.service.link(this.id, value.coatendId!, value.weight));
  }

  unlink(): void {
    const coatendId = this.confirmingUnlink();
    if (!this.id || !coatendId || this.saving()) { return; }
    this.updateLink(this.service.unlink(this.id, coatendId));
  }

  private updateLink(operation: Observable<unknown>): void {
    this.saving.set(true);
    this.error.set('');
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.confirmingUnlink.set(null);
        this.linkForm.reset({ coatendId: '', weight: null });
        this.notice.set('Vinculo atualizado. Indicadores recalculados pelo backend.');
        this.load();
      },
      error: error => this.error.set(error.status === 409 ? 'A Coatend pertence a outra Feature. Desvincule antes de transferir.' : 'Nao foi possivel atualizar o vinculo. Os dados foram mantidos.')
    });
  }
}