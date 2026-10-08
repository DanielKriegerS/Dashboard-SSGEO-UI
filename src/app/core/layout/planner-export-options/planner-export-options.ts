import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlannerExportRequest } from '../../../models/components/planner/PlannerExportRequest';
import { PlannerDisplaySelection } from '../../../models/components/planner/PlannerDisplaySelection';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { SprintSummary } from '../../../models/sprint/SprintSummary';

@Component({
  selector: 'app-planner-export-options',
  imports: [CommonModule, FormsModule],
  templateUrl: './planner-export-options.html',
  styleUrl: '../planner-placeholder-actions/planner-placeholder-actions.scss'
})
export class PlannerExportOptions {
  @Input() quarters: QuarterSummary[] = [];
  @Input() sprints: SprintSummary[] = [];
  @Input() exporting = false;
  @Output() exportRequested = new EventEmitter<PlannerExportRequest>();

  opened = false;
  mode: PlannerExportRequest['mode'] = 'COUNT';
  startDate = '';
  endDate = '';
  count = 15;
  quarterId = '';
  sprintId = '';

  open(selection: PlannerDisplaySelection, visibleDays: string[]): void {
    this.mode = selection.type === 'count' ? 'COUNT' : 'PERIOD';
    this.startDate = visibleDays[0] ?? '';
    this.endDate = visibleDays[visibleDays.length - 1] ?? '';
    this.count = selection.type === 'count' ? selection.count : visibleDays.length;
    this.quarterId = this.quarters.length === 1 ? this.quarters[0].id : '';
    this.sprintId = this.sprints.length === 1 ? this.sprints[0].id : '';
    this.opened = true;
  }

  close(): void {
    if (!this.exporting) {
      this.opened = false;
    }
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  get validationMessage(): string {
    if (this.mode === 'QUARTER') {
      return this.quarters.some(quarter => quarter.id === this.quarterId)
        ? '' : 'Selecione um Quarter para exportar.';
    }
    if (this.mode === 'SPRINT') {
      return this.sprints.some(sprint => sprint.id === this.sprintId)
        ? '' : 'Selecione uma Sprint para exportar.';
    }
    if (!this.isValidDate(this.startDate)) {
      return 'Informe uma data início válida.';
    }
    if (this.mode === 'COUNT') {
      return Number.isSafeInteger(this.count) && this.count > 0 && this.count <= 16383
        ? '' : 'Informe uma quantidade inteira entre 1 e 16.383 dias.';
    }
    if (!this.isValidDate(this.endDate) || this.endDate < this.startDate) {
      return 'Informe uma data fim igual ou posterior à data início.';
    }
    const days = (Date.parse(this.endDate) - Date.parse(this.startDate)) / 86400000 + 1;
    return days <= 16383 ? '' : 'O Excel permite exportar no máximo 16.383 dias.';
  }

  submit(): void {
    if (this.exporting || this.validationMessage) {
      return;
    }
    switch (this.mode) {
      case 'COUNT':
        this.exportRequested.emit({ mode: this.mode, startDate: this.startDate, count: this.count });
        break;
      case 'PERIOD':
        this.exportRequested.emit({ mode: this.mode, startDate: this.startDate, endDate: this.endDate });
        break;
      case 'QUARTER':
        this.exportRequested.emit({ mode: this.mode, quarterId: this.quarterId });
        break;
      case 'SPRINT':
        this.exportRequested.emit({ mode: this.mode, sprintId: this.sprintId });
        break;
    }
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString().substring(0, 10) === value;
  }
}
