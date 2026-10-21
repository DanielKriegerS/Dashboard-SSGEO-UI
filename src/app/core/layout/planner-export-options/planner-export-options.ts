import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
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
  @Output() exportRequested = new EventEmitter<{
    request: PlannerExportRequest;
    destination: PlannerExportFileHandle | null;
  }>();

  opened = false;
  mode: PlannerExportRequest['mode'] = 'COUNT';
  startDate = '';
  endDate = '';
  count = 15;
  quarterId = '';
  sprintId = '';
  destination: PlannerExportFileHandle | null = null;
  destinationError = '';
  readonly choosingDestination = signal(false);

  get busy(): boolean {
    return this.exporting || this.choosingDestination();
  }

  get canChooseDownloadPath(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  }

  open(selection: PlannerDisplaySelection, visibleDays: string[]): void {
    this.destination = null;
    this.destinationError = '';
    this.mode = selection.type === 'count' ? 'COUNT' : 'PERIOD';
    this.startDate = visibleDays[0] ?? '';
    this.endDate = visibleDays[visibleDays.length - 1] ?? '';
    this.count = selection.type === 'count' ? selection.count : visibleDays.length;
    this.quarterId = this.quarters.length === 1 ? this.quarters[0].id : '';
    this.sprintId = this.sprints.length === 1 ? this.sprints[0].id : '';
    this.opened = true;
  }

  close(): void {
    if (!this.busy) {
      this.opened = false;
    }
  }

  completeExport(): void {
    this.opened = false;
    this.destination = null;
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

  async chooseDownloadPath(): Promise<void> {
    if (!this.canChooseDownloadPath || this.exporting) {
      return;
    }

    this.destinationError = '';
    try {
      const picker = (window as unknown as Window & {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<PlannerExportFileHandle>;
      }).showSaveFilePicker;
      this.destination = await picker.call(window, {
        suggestedName: 'planner.xlsx',
        types: [{
          description: 'Planilha Excel',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
        }]
      });
    } catch (error) {
      const cancelled = error !== null && typeof error === 'object'
        && 'name' in error && error.name === 'AbortError';
      if (!cancelled) {
        this.destinationError = 'Não foi possível selecionar o local do arquivo.';
      }
    }
  }

  async submit(): Promise<void> {
    if (this.busy || this.validationMessage) {
      return;
    }
    let request: PlannerExportRequest;
    switch (this.mode) {
      case 'COUNT':
        request = { mode: this.mode, startDate: this.startDate, count: this.count };
        break;
      case 'PERIOD':
        request = { mode: this.mode, startDate: this.startDate, endDate: this.endDate };
        break;
      case 'QUARTER':
        request = { mode: this.mode, quarterId: this.quarterId };
        break;
      case 'SPRINT':
        request = { mode: this.mode, sprintId: this.sprintId };
        break;
    }
    if (this.canChooseDownloadPath && !this.destination) {
      this.choosingDestination.set(true);
      try {
        await this.chooseDownloadPath();
      } finally {
        this.choosingDestination.set(false);
      }
      if (!this.destination) {
        return;
      }
    }
    this.emitExport(request);
  }

  private emitExport(request: PlannerExportRequest): void {
    this.exportRequested.emit({ request, destination: this.destination });
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString().substring(0, 10) === value;
  }
}

export interface PlannerExportFileHandle {
  readonly name: string;
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
    abort?(): Promise<void>;
  }>;
}
