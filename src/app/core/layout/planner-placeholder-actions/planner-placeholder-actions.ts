import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlannerMode } from '../../../models/components/planner/PlannerMode';
import {
  PlannerPlaceholderRequest,
  PlannerPlaceholderSubmission
} from '../../../models/components/planner/PlannerPlaceholderSubmission';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { SprintSummary } from '../../../models/sprint/SprintSummary';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';
import { DeveloperModel } from '../../../models/developer/DeveloperModel';
import {
  Activity,
  getActivityFixedExecutor,
  requiresActivityDeveloper
} from '../../../models/components/Activities';
import { DeveloperService } from '../../../services/developer-service';

@Component({
  selector: 'app-planner-placeholder-actions',
  imports: [CommonModule, FormsModule],
  templateUrl: './planner-placeholder-actions.html',
  styleUrl: './planner-placeholder-actions.scss',
})
export class PlannerPlaceholderActions {
  @Input() mode: PlannerMode = 'empty';
  @Input() hasCompleteStructure = false;
  @Input() quarters: QuarterSummary[] = [];
  @Input() sprints: SprintSummary[] = [];
  @Input() coatends: CoatendSummary[] = [];
  @Output() submitted = new EventEmitter<PlannerPlaceholderSubmission>();

  request: PlannerPlaceholderRequest | null = null;
  description = '';
  startDate = '';
  endDate = '';
  coatendNumber: number | null = null;
  quarterId = '';
  sprintId = '';
  activity: Activity = Activity.DEVELOPMENT;
  developerId = '';
  coatendId = '';
  developers: DeveloperModel[] = [];
  developerLoadError = '';

  readonly activities = Object.values(Activity);
  readonly activityLabels: Record<Activity, string> = {
    [Activity.DEVELOPMENT]: 'Desenvolvimento',
    [Activity.TESTING_TU]: 'Teste TU',
    [Activity.PASSAGE_TH]: 'Passagem TH',
    [Activity.HOMOLOGATION]: 'Homologação',
    [Activity.ADMINISTRATIVE_TASKS]: 'Administrativo',
    [Activity.PRE_SWAP]: 'Pré Swap',
    [Activity.SWAP]: 'Swap'
  };

  constructor(private developerService: DeveloperService) {}

  get isEditingActivity(): boolean {
    return this.request?.type === 'activity' && Boolean(this.request.activityId);
  }

  get isEditing(): boolean {
    return Boolean(this.request?.entityId || this.request?.activityId);
  }

  get developerRequired(): boolean {
    return requiresActivityDeveloper(this.activity);
  }

  get showDeveloperField(): boolean {
    return this.developerRequired;
  }

  get fixedExecutor(): string {
    return getActivityFixedExecutor(this.activity);
  }

  get itemName(): string {
    switch (this.request?.type) {
      case 'quarter': return 'Quarter';
      case 'sprint': return 'Sprint';
      case 'coatend': return 'Coatend';
      case 'activity': return 'Atividade';
      default: return 'Item';
    }
  }

  get canSubmit(): boolean {
    if (this.request?.entityId) {
      return true;
    }

    switch (this.request?.type) {
      case 'quarter':
        return true;
      case 'sprint':
        return this.quarters.some(quarter => quarter.id === this.quarterId);
      case 'coatend':
        return this.sprints.some(sprint => sprint.id === this.sprintId);
      case 'activity':
        return this.coatends.some(coatend => coatend.id === this.coatendId);
      default:
        return false;
    }
  }

  get quarterDateConflict(): boolean {
    return this.request?.type === 'quarter' &&
      this.hasDateRangeConflict(this.quarters);
  }

  get sprintDateConflict(): boolean {
    return this.request?.type === 'sprint' &&
      this.hasDateRangeConflict(this.sprints);
  }

  open(request: PlannerPlaceholderRequest): void {
    this.request = request;
    this.description = request.description ?? '';
    this.startDate = this.normalizeDate(request.startDate);
    this.endDate = this.normalizeDate(request.endDate);
    this.coatendNumber = request.coatendNumber ?? null;
    this.quarterId = request.quarterId ??
      (this.quarters.length === 1 ? this.quarters[0].id : '');
    this.sprintId = request.sprintId ??
      (this.sprints.length === 1 ? this.sprints[0].id : '');
    this.coatendId = request.coatendId ??
      (this.coatends.length === 1 ? this.coatends[0].id : '');
    this.activity = this.activities.find(activity => activity === request.activity) ??
      Activity.DEVELOPMENT;
    this.developerId = this.developerRequired ? request.developerId ?? '' : '';
    this.developerLoadError = '';

    if (request.type === 'activity') {
      this.loadDevelopers();
    }
  }

  close(): void {
    this.request = null;
  }

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onActivityChange(activity: string): void {
    const selectedActivity = this.activities.find(item => item === activity);
    if (!selectedActivity) {
      return;
    }

    this.activity = selectedActivity;

    if (!this.developerRequired) {
      this.developerId = '';
    }
  }

  submit(): void {
    if (
      !this.request ||
      !this.canSubmit ||
      this.quarterDateConflict ||
      this.sprintDateConflict
    ) {
      return;
    }

    const submission: PlannerPlaceholderSubmission = {
      ...this.request
    };

    switch (this.request.type) {
      case 'quarter':
      case 'sprint':
        submission.description = this.description.trim();
        submission.startDate = this.startDate;
        submission.endDate = this.endDate;
        if (this.request.type === 'sprint') {
          submission.quarterId = this.quarterId;
        }
        break;
      case 'coatend':
        submission.description = this.description.trim();
        submission.coatendNumber = this.coatendNumber ?? undefined;
        submission.sprintId = this.sprintId;
        break;
      case 'activity':
        submission.activity = this.activity;
        submission.startDate = this.startDate;
        submission.endDate = this.endDate;
        submission.developerId = this.developerRequired
          ? this.developerId || undefined
          : undefined;
        submission.coatendId = this.coatendId;
        break;
    }

    this.submitted.emit(submission);
    this.close();
  }

  private loadDevelopers(): void {
    this.developerService.getAll().subscribe({
      next: developers => {
        this.developers = developers;
      },
      error: error => {
        console.error('Erro ao carregar desenvolvedores para o planner:', error);
        this.developerLoadError = 'Não foi possível carregar os desenvolvedores.';
      }
    });
  }

  private normalizeDate(date?: string): string {
    return date?.substring(0, 10) ?? '';
  }

  private isValidDate(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);

    return parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day;
  }

  private hasDateRangeConflict(
    periods: Array<{ id: string; startDate?: string; endDate?: string }>
  ): boolean {
    if (!this.isValidDate(this.startDate) || !this.isValidDate(this.endDate)) {
      return false;
    }

    return periods.some(period => {
      if (period.id === this.request?.entityId) {
        return false;
      }

      const periodStart = this.normalizeDate(period.startDate);
      const periodEnd = this.normalizeDate(period.endDate);

      return this.isValidDate(periodStart) &&
        this.isValidDate(periodEnd) &&
        this.startDate <= periodEnd &&
        this.endDate >= periodStart;
    });
  }
}
