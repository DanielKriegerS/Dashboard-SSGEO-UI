import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FeatureService } from '../../services/feature';
import { FeatureModel } from '../../models/feature/FeatureModel';

@Component({
  imports: [RouterLink],
  templateUrl: './features.html',
  styleUrl: './features.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Features {
  private readonly service = inject(FeatureService);
  readonly features = signal<FeatureModel[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.getAll().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: features => this.features.set(features),
      error: () => this.error.set('Nao foi possivel carregar as Features.')
    });
  }
}