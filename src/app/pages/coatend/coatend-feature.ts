import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, Observable } from 'rxjs';
import { CoatendService } from '../../services/coatend';
import { FeatureService } from '../../services/feature';
import { FeatureModel } from '../../models/feature/FeatureModel';
import { CoatendMilestoneModel } from '../../models/coatend/CoatendMilestoneModel';
import { featureReason } from '../../shared/utils/feature-labels';

@Component({
  selector: 'app-coatend-feature',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './coatend-feature.html',
  styleUrl: '../features/features.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoatendFeature {
  readonly coatendId = input.required<string>();
  private readonly featuresService = inject(FeatureService);
  private readonly coatendService = inject(CoatendService);
  readonly features = signal<FeatureModel[]>([]);
  readonly currentFeature = signal<FeatureModel | null>(null);
  readonly milestones = signal<CoatendMilestoneModel | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly confirmation = signal<'TU' | 'SWAP' | 'UNLINK' | null>(null);
  readonly reasonLabel = featureReason;
  readonly form = inject(FormBuilder).group({ featureId: ['', Validators.required], weight: [null as number | null, Validators.min(Number.MIN_VALUE)] });

  constructor() {
    effect(onCleanup => {
      const subscription = this.load();
      onCleanup(() => subscription.unsubscribe());
    });
  }

  load() {
    const id = this.coatendId();
    this.loading.set(true);
    this.error.set('');
    this.milestones.set(null);
    return forkJoin({ features: this.featuresService.getAll(), milestones: this.coatendService.getMilestones(id) })
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: result => {
          this.features.set(result.features);
          this.milestones.set(result.milestones);
          const current = result.features.find(feature => feature.coatends.some(coatend => coatend.id === id)) || null;
          this.currentFeature.set(current);
          const member = current?.coatends.find(coatend => coatend.id === id);
          this.form.setValue({ featureId: current?.id || '', weight: member?.weight ?? null });
        },
        error: () => this.error.set('Nao foi possivel carregar vinculo e marcos. Tente novamente.')
      });
  }

  saveLink(): void {
    if (this.form.invalid || this.busy() || this.loading()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (this.currentFeature() && value.featureId !== this.currentFeature()?.id) {
      this.error.set('Desvincule a Feature atual antes de transferir a Coatend.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.featuresService.link(value.featureId!, this.coatendId(), value.weight)
      .pipe(finalize(() => this.busy.set(false))).subscribe({
        next: () => { this.notice.set('Vinculo e peso salvos.'); this.load(); },
        error: error => this.error.set(error.status === 409 ? 'Vinculo alterado por outra operacao. Atualize e desvincule antes de transferir.' : 'Nao foi possivel salvar o vinculo.')
      });
  }

  confirm(): void {
    const action = this.confirmation();
    if (!action || this.busy() || this.loading()) { return; }
    const current = this.currentFeature();
    if (action === 'UNLINK' && !current) { return; }
    const operation: Observable<unknown> = action === 'UNLINK'
      ? this.featuresService.unlink(current!.id, this.coatendId())
      : this.coatendService.confirmMilestone(this.coatendId(), action);
    this.busy.set(true);
    this.error.set('');
    operation.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.confirmation.set(null);
        this.notice.set(action === 'UNLINK' ? 'Coatend desvinculada. Atividades e confirmacoes mantidas.' : `${action} confirmada.`);
        this.load();
      },
      error: error => this.error.set(error.status === 409 ? 'Confirmacao ou vinculo em conflito. Verifique TU e o planejamento atual.' : 'Nao foi possivel concluir. O estado anterior foi mantido.')
    });
  }
}