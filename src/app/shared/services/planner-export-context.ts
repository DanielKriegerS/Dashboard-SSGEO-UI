import { Injectable, computed, signal } from '@angular/core';

import { PlannerDisplaySelection } from '../../models/components/planner/PlannerDisplaySelection';

@Injectable({
  providedIn: 'root'
})
export class PlannerExportContextService {
  private readonly visibleDaysState = signal<string[]>([]);

  private readonly displaySelectionState =
    signal<PlannerDisplaySelection>({
      type: 'count',
      count: 15
    });

  readonly visibleDays = this.visibleDaysState.asReadonly();
  readonly displaySelection = this.displaySelectionState.asReadonly();

  readonly canExport = computed(
    () => this.visibleDaysState().length > 0
  );

  update(
    visibleDays: string[],
    displaySelection: PlannerDisplaySelection
  ): void {
    this.visibleDaysState.set([...visibleDays]);
    this.displaySelectionState.set({ ...displaySelection });
  }

  clear(): void {
    this.visibleDaysState.set([]);
    this.displaySelectionState.set({
      type: 'count',
      count: 15
    });
  }
}