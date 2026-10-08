import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PlannerRow } from '../../../models/components/planner/PlannerRow';
import { PlannerCell } from '../../../models/components/planner/PlannerCell';
import { TimelineModel } from '../../../models/timeline/TimelineModel';
import { Planner } from "../../layout/planner/planner";
import { CoatendService } from '../../../services/coatend';
import { finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';
import { TimelineService } from '../../../services/timeline-service';
import { Quarter as QuarterService } from '../../../services/quarter';
import { PlannerQuarterGroup } from '../../../models/components/planner/PlannerQuarterGroup';
import { CoatendPlannerModel } from '../../../models/components/planner/CoatendPlannerModel';
import { PlannerEntries } from '../../../models/components/planner/PlannerEntries';
import { PlannerHeader } from '../../../models/components/planner/PlannerHeader';
import { PlannerDateSegment } from '../../../models/components/planner/PlannerDateSegment';
import { CommonModule, DOCUMENT } from '@angular/common';
import { SprintService } from '../../../services/sprint';
import { SprintSummary } from '../../../models/sprint/SprintSummary';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';
import { PlannerMode } from '../../../models/components/planner/PlannerMode';
import { PlannerPlaceholderSubmission } from '../../../models/components/planner/PlannerPlaceholderSubmission';
import { QuarterCreateModel } from '../../../models/quarter/QuarterCreateModel';
import { SprintCreateModel } from '../../../models/sprint/SprintCreateModel';
import { CoatendModel } from '../../../models/coatend/CoatendModel';
import { TimelineCreateModel } from '../../../models/timeline/TimelineCreateModel';
import { FeedbackService } from '../../../services/feedback';
import { TimelineService as TimelineMutationService } from '../../../services/timeline';
import { PlannerDisplayOptions } from '../../layout/planner-display-options/planner-display-options';
import { PlannerDisplaySelection } from '../../../models/components/planner/PlannerDisplaySelection';
import { requiresActivityDeveloper } from '../../../models/components/Activities';
import { PlannerExportService } from '../../../services/planner-export';
import { PlannerExportRequest } from '../../../models/components/planner/PlannerExportRequest';
import { PlannerExportOptions } from '../../layout/planner-export-options/planner-export-options';

@Component({
  selector: 'app-main',
  imports: [Planner, CommonModule, PlannerDisplayOptions, PlannerExportOptions],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit{
  @ViewChild(PlannerExportOptions) exportOptions?: PlannerExportOptions;
  private readonly document = inject(DOCUMENT);
  private readonly plannerExportService = inject(PlannerExportService);
  exporting = false;
  plannerData: PlannerRow[] = [];
  plannerHierarchy: PlannerQuarterGroup[] = [];
  
  days: string[] = [];
  visibleDays: string[] = [];

  quarterHeaders: PlannerHeader[] = [];
  sprintHeaders: PlannerHeader[] = [];

  timeline: TimelineModel[] = [];
  quarters: QuarterSummary[] = [];
  sprints: SprintSummary[] = [];
  coatends: CoatendPlannerModel[] = [];
  coatendSummaries: CoatendSummary[] = [];

  dayWindowStart = 0;
  dayWindowSize = 15;
  displaySelection: PlannerDisplaySelection = { type: 'count', count: 15 };
  private readonly defaultPlaceholderDays = 15;

  mode: PlannerMode = 'empty';

  get hasCompleteStructure(): boolean {
    return this.coatends.some(coatend =>
      Boolean(coatend.id && coatend.sprintId && coatend.quarterId) &&
      this.coatendSummaries.some(summary =>
        this.normalizeId(summary.id) === this.normalizeId(coatend.id)
      ) &&
      this.sprints.some(sprint =>
        this.normalizeId(sprint.id) === this.normalizeId(coatend.sprintId)
      ) &&
      this.quarters.some(quarter =>
        this.normalizeId(quarter.id) === this.normalizeId(coatend.quarterId)
      )
    );
  }

  constructor(
    private title: Title, 
    private meta: Meta,
    private coatendService : CoatendService,
    private timelineService : TimelineService,
    private timelineMutationService: TimelineMutationService,
    private quarterService: QuarterService,
    private sprintService: SprintService,
    private feedback: FeedbackService,
    private cdr: ChangeDetectorRef
  ) {
      this.title.setTitle('Planner Squad');
      this.meta.addTags([
        { name: 'description', content: 'Planejamento de atividades da squad' }
    ]);
  }

  ngOnInit() {
    this.loadPlannerData();
  }

  openExportOptions(): void {
    this.exportOptions?.open(this.displaySelection, this.visibleDays);
  }

  exportPlanner(request: PlannerExportRequest): void {
    if (this.exporting) {
      return;
    }
    this.exporting = true;
    this.plannerExportService.export(request).pipe(
      tap(blob => this.downloadPlannerFile(blob)),
      finalize(() => {
        this.exporting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        if (this.exportOptions) {
          this.exportOptions.opened = false;
        }
      },
      error: error => {
        console.error('Erro ao exportar planner:', error);
        this.feedback.error('Não foi possível exportar o planner. Tente novamente.');
      }
    });
  }

  private downloadPlannerFile(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    try {
      link.href = url;
      link.download = 'planner.xlsx';
      this.document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }

  loadPlannerData(): void {
    forkJoin({
      quarters: this.quarterService.getAll(),
      sprints: this.sprintService.getAll(),
      coatendSummaries: this.coatendService.getAll()
    }).pipe(
      switchMap(structure => {
        const initialData = {
          ...structure,
          coatends: [] as CoatendPlannerModel[],
          timeline: [] as TimelineModel[]
        };

        if (
          !structure.quarters.length &&
          !structure.sprints.length &&
          !structure.coatendSummaries.length
        ) {
          return of(initialData);
        }

        return this.coatendService.getPlannerData().pipe(
          switchMap(coatends => {
            const mode = this.resolvePlannerMode(
              structure.quarters,
              structure.sprints,
              structure.coatendSummaries,
              coatends
            );

            if (mode !== 'structured' && !structure.coatendSummaries.length) {
              return of({ ...initialData, coatends });
            }

            return this.timelineService.getAll().pipe(
              map(timeline => ({ ...initialData, coatends, timeline }))
            );
          })
        );
      })
    ).subscribe({
      next: (res) => {
        this.quarters = res.quarters;
        this.sprints = res.sprints;
        this.coatendSummaries = res.coatendSummaries;
        this.coatends = res.coatends;
        this.timeline = res.timeline;

        this.mode = this.resolvePlannerMode(
          this.quarters,
          this.sprints,
          this.coatendSummaries,
          this.coatends
        );

        if (this.mode === 'structured') {
          this.loadStructuredPlanner();
        } else {
          this.loadPlaceholderPlanner();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar planner:', err);
        this.feedback.error('Não foi possível atualizar os dados do planner.');
      }
    });
  }

  createPlannerItem(item: PlannerPlaceholderSubmission): void {
    if (item.entityId) {
      this.updateStructureFromPlanner(item);
      return;
    }

    switch (item.type) {
      case 'quarter':
        this.createQuarterFromPlanner(item);
        break;
      case 'sprint':
        this.createSprintFromPlanner(item);
        break;
      case 'coatend':
        this.createCoatendFromPlanner(item);
        break;
      case 'activity':
        if (item.activityId) {
          this.updateActivityFromPlanner(item);
        } else {
          this.createActivityFromPlanner(item);
        }

        break;
    }
  }

  private updateStructureFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (!item.entityId || !item.description?.trim()) {
      this.feedback.warning('Informe uma descrição válida.');
      return;
    }

    let operation: Observable<unknown>;
    const description = item.description.trim();

    if (item.type === 'quarter' || item.type === 'sprint') {
      if (!this.hasValidDateRange(item.startDate, item.endDate)) {
        this.feedback.warning('Informe um período válido.');
        return;
      }

      const periods = item.type === 'quarter' ? this.quarters : this.sprints;
      if (periods.some(period =>
        period.id !== item.entityId &&
        period.startDate && period.endDate &&
        item.startDate! <= this.normalizeDate(period.endDate) &&
        item.endDate! >= this.normalizeDate(period.startDate)
      )) {
        this.feedback.warning('O período informado se sobrepõe ao de outro item.');
        return;
      }

      const payload = {
        description,
        startDate: `${this.normalizeDate(item.startDate)}T00:00:00`,
        endDate: `${this.normalizeDate(item.endDate)}T00:00:00`
      };
      operation = item.type === 'quarter'
        ? this.quarterService.update(item.entityId, payload)
        : this.sprintService.update(item.entityId, payload);
    } else if (item.type === 'coatend') {
      if (!Number.isInteger(item.coatendNumber) || (item.coatendNumber ?? 0) < 1) {
        this.feedback.warning('Informe um número inteiro positivo para a Coatend.');
        return;
      }

      operation = this.coatendService.update(item.entityId, {
        description,
        coatendNumber: item.coatendNumber
      });
    } else {
      this.feedback.error('Tipo de item inválido para edição da estrutura.');
      return;
    }

    operation.subscribe({
      next: () => this.onPlannerItemSaved('Item atualizado com sucesso!'),
      error: error => {
        console.error('Erro ao atualizar estrutura do planner:', error);
        this.feedback.error('Não foi possível atualizar o item. Tente novamente.');
      }
    });
  }

  private createQuarterFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (!item.description?.trim() || !this.hasValidDateRange(item.startDate, item.endDate)) {
      this.feedback.warning('Informe uma descrição e um período válido para o Quarter.');
      return;
    }

    const payload: QuarterCreateModel = {
      description: item.description.trim(),
      startDate: item.startDate!,
      endDate: item.endDate!
    };

    this.quarterService.create(payload).subscribe({
      next: () => this.onPlannerItemSaved('Quarter criado com sucesso!'),
      error: error => this.onPlannerItemSaveFailed('Quarter', error)
    });
  }

  private createSprintFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (
      !item.description?.trim() ||
      !this.hasValidDateRange(item.startDate, item.endDate) ||
      !this.quarters.some(quarter => quarter.id === item.quarterId)
    ) {
      this.feedback.warning('Informe os dados da Sprint e selecione um Quarter válido.');
      return;
    }

    const payload: SprintCreateModel = {
      description: item.description.trim(),
      startDate: item.startDate!,
      endDate: item.endDate!
    };

    this.sprintService.create(payload).subscribe({
      next: sprint => {
        if (!sprint?.id) {
          this.feedback.error('A Sprint foi criada, mas não foi possível obter seu ID para associá-la ao Quarter.');
          this.loadPlannerData();
          return;
        }

        this.sprintService.updateSprintQuarter(sprint.id, {
          quarterId: item.quarterId!
        }).subscribe({
          next: () => this.onPlannerItemSaved('Sprint criada e associada ao Quarter.'),
          error: error => {
            console.error('Erro ao associar Sprint ao Quarter:', error);
            this.feedback.error('A Sprint foi criada, mas não foi possível associá-la ao Quarter.');
            this.loadPlannerData();
          }
        });
      },
      error: error => this.onPlannerItemSaveFailed('Sprint', error)
    });
  }

  private createCoatendFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (
      !item.description?.trim() ||
      !Number.isInteger(item.coatendNumber) ||
      (item.coatendNumber ?? 0) < 1 ||
      !this.sprints.some(sprint => sprint.id === item.sprintId)
    ) {
      this.feedback.warning('Informe os dados da Coatend e selecione uma Sprint válida.');
      return;
    }

    const payload: CoatendModel = {
      description: item.description.trim(),
      coatendNumber: item.coatendNumber
    };

    this.coatendService.create(payload).subscribe({
      next: coatend => {
        if (!coatend?.id) {
          this.feedback.error('A Coatend foi criada, mas não foi possível obter seu ID para associá-la à Sprint.');
          this.loadPlannerData();
          return;
        }

        this.coatendService.updateCoatendSprint(coatend.id, {
          sprintId: item.sprintId!
        }).subscribe({
          next: () => this.onPlannerItemSaved('Coatend criada e associada à Sprint.'),
          error: error => {
            console.error('Erro ao associar Coatend à Sprint:', error);
            this.feedback.error('A Coatend foi criada, mas não foi possível associá-la à Sprint.');
            this.loadPlannerData();
          }
        });
      },
      error: error => this.onPlannerItemSaveFailed('Coatend', error)
    });
  }

  private createActivityFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (
      !item.coatendId ||
      !item.activity ||
      (requiresActivityDeveloper(item.activity) && !item.developerId) ||
      !this.hasValidDateRange(item.startDate, item.endDate)
    ) {
      this.feedback.warning('Informe a atividade, o desenvolvedor e um período válido.');
      return;
    }

    const payload: TimelineCreateModel = {
      activity: item.activity,
      startDate: item.startDate!,
      endDate: item.endDate!,
      developerId: requiresActivityDeveloper(item.activity) ? item.developerId : null
    };

    this.timelineService.create(item.coatendId, payload).subscribe({
      next: () => this.onPlannerItemSaved('Atividade criada com sucesso!'),
      error: error => this.onPlannerItemSaveFailed('Atividade', error)
    });
  }

  private updateActivityFromPlanner(item: PlannerPlaceholderSubmission): void {
    if (
      !item.activityId ||
      !item.coatendId ||
      !item.activity ||
      (requiresActivityDeveloper(item.activity) && !item.developerId) ||
      !this.hasValidDateRange(item.startDate, item.endDate)
    ) {
      this.feedback.warning('Informe a atividade e um período válido.');
      return;
    }

    const payload: TimelineCreateModel = {
      activity: item.activity,
      startDate: item.startDate!,
      endDate: item.endDate!,
      developerId: requiresActivityDeveloper(item.activity) ? item.developerId : null
    };

    this.timelineMutationService.update(item.activityId, payload).subscribe({
      next: () => this.onPlannerItemSaved('Atividade atualizada com sucesso!'),
      error: error => this.onPlannerItemSaveFailed('atividade', error, 'atualizar')
    });
  }

  private hasValidDateRange(startDate?: string, endDate?: string): boolean {
    return Boolean(startDate && endDate && startDate <= endDate);
  }

  private onPlannerItemSaved(message: string): void {
    this.feedback.success(message);
    this.loadPlannerData();
  }

  private onPlannerItemSaveFailed(
    itemName: string,
    error: unknown,
    action: 'criar' | 'atualizar' = 'criar'
  ): void {
    console.error(`Erro ao ${action} ${itemName} pelo planner:`, error);
    this.feedback.error(`Não foi possível ${action} ${itemName}. Tente novamente.`);
  }

  resolvePlannerMode(
    quarters: QuarterSummary[],
    sprints: SprintSummary[],
    coatendSummaries: CoatendSummary[],
    plannerCoatends: CoatendPlannerModel[]
  ): PlannerMode {
    if (!quarters.length && !sprints.length && !coatendSummaries.length) {
      return 'empty';
    }

    const quarterIds = new Set(quarters.map(q => this.normalizeId(q.id)));
    const sprintIds = new Set(sprints.map(s => this.normalizeId(s.id)));
    const coatendIds = new Set(
      coatendSummaries.map(coatend => this.normalizeId(coatend.id))
    );
    const associatedQuarterIds = new Set(
      plannerCoatends.map(coatend => this.normalizeId(coatend.quarterId))
    );
    const associatedSprintIds = new Set(
      plannerCoatends.map(coatend => this.normalizeId(coatend.sprintId))
    );
    const allCoatendsAssociated =
      plannerCoatends.length > 0 &&
      plannerCoatends.length === coatendSummaries.length &&
      plannerCoatends.every(coatend =>
        coatendIds.has(this.normalizeId(coatend.id)) &&
        quarterIds.has(this.normalizeId(coatend.quarterId)) &&
        sprintIds.has(this.normalizeId(coatend.sprintId))
      );
    const allStructuresAssociated =
      quarters.every(q => associatedQuarterIds.has(this.normalizeId(q.id))) &&
      sprints.every(s => associatedSprintIds.has(this.normalizeId(s.id)));

    return allCoatendsAssociated && allStructuresAssociated
      ? 'structured'
      : 'partial';
  }

  loadStructuredPlanner(): void {
    this.days = this.generateDaysFromQuarters(this.coatends);
    this.dayWindowStart = 0;
    this.restorePeriodWindow();

    this.updateVisibleStructuredPlanner();
  }


  updateVisibleStructuredPlanner(): void {
    this.visibleDays = this.days.slice(
      this.dayWindowStart,
      this.dayWindowStart + this.dayWindowSize
    );
    this.syncPeriodSelection();

    this.plannerData = this.buildPlannerData(
      this.timeline,
      this.coatends,
      this.visibleDays
    );

    this.plannerHierarchy = this.buildPlannerHierarchy(
      this.plannerData,
      this.coatends
    );

    this.quarterHeaders = this.buildQuarterHeaders(
      this.coatends,
      this.visibleDays
    );

    this.sprintHeaders = this.buildSprintHeaders(
      this.coatends,
      this.visibleDays
    );
  }

  loadPlaceholderPlanner(): void {
    const range = this.resolvePlaceholderDateRange();

    this.days = this.generateDays(range.start, range.end);
    this.dayWindowStart = 0;
    this.restorePeriodWindow();

    this.updateVisiblePlaceholderPlanner();
  }

  resolvePlaceholderDateRange(): { start: Date; end: Date } {
    const dates = [
      ...this.quarters.flatMap(q => [q.startDate, q.endDate]),
      ...this.sprints.flatMap(s => [s.startDate, s.endDate])
    ]
      .map(date => this.normalizeDate(date))
      .filter(date => this.isValidDate(date))
      .sort();

    if (dates.length > 0) {
      const end = this.parseLocalDate(dates[dates.length - 1]);
      end.setDate(end.getDate() + 1);

      return {
        start: this.parseLocalDate(dates[0]),
        end
      };
    }

    const start = new Date();
    const end = new Date();

    end.setDate(start.getDate() + Math.max(this.defaultPlaceholderDays, this.dayWindowSize) - 1);

    return {
      start,
      end
    };
  }

  updateVisiblePlaceholderPlanner(): void {
    this.visibleDays = this.days.slice(
      this.dayWindowStart,
      this.dayWindowStart + this.dayWindowSize
    );
    this.syncPeriodSelection();

    this.quarterHeaders = this.buildPlaceholderQuarterHeaders(this.visibleDays);
    this.sprintHeaders = this.buildPlaceholderSprintHeaders(this.visibleDays);
    this.plannerHierarchy = this.buildPlaceholderHierarchy(this.visibleDays);
  }

  buildPlaceholderQuarterHeaders(days: string[]): PlannerHeader[] {
    if (this.quarters.length > 0) {
      return this.buildQuarterSummaryHeaders(this.quarters, days);
    }

    return this.buildDateSegmentHeaders(
      days,
      [],
      'Quarter +',
      this.getFirstUncoveredDate(this.days, [])
    );
  }

  buildPlaceholderSprintHeaders(days: string[]): PlannerHeader[] {
    if (this.sprints.length > 0) {
      return this.buildSprintSummaryHeaders(this.sprints, days);
    }

    return this.buildDateSegmentHeaders(
      days,
      [],
      'Sprint +',
      this.getFirstUncoveredDate(this.days, [])
    );
  }

  buildQuarterSummaryHeaders(
    quarters: QuarterSummary[],
    visibleDays: string[]
  ): PlannerHeader[] {

    const segments: PlannerDateSegment[] = quarters
      .filter(q => this.isValidDate(this.normalizeDate(q.startDate)) &&
        this.isValidDate(this.normalizeDate(q.endDate)))
      .map(q => ({
        id: q.id,
        description: q.description,
        startDate: this.normalizeDate(q.startDate),
        endDate: this.normalizeDate(q.endDate)
      }));

    return this.buildDateSegmentHeaders(
      visibleDays,
      segments,
      'Quarter +',
      this.getFirstUncoveredDate(this.days, segments)
    );
  }

  buildSprintSummaryHeaders(
  sprints: SprintSummary[],
  visibleDays: string[]
): PlannerHeader[] {

  const segments: PlannerDateSegment[] = sprints
    .filter(s => this.isValidDate(this.normalizeDate(s.startDate)) &&
      this.isValidDate(this.normalizeDate(s.endDate)))
    .map(s => ({
      id: s.id,
      description: s.description,
      startDate: this.normalizeDate(s.startDate),
      endDate: this.normalizeDate(s.endDate)
    }));

  return this.buildDateSegmentHeaders(
    visibleDays,
    segments,
    'Sprint +',
    this.getFirstUncoveredDate(this.days, segments)
  );
  }

  buildPlaceholderHierarchy(days: string[]): PlannerQuarterGroup[] {
    const rows = this.buildPlannerData(this.timeline, this.coatendSummaries, days);
    this.plannerData = rows;

    const row: PlannerRow = {
      coatendId: null,
      coatendDescription: 'Coatend +',
      isPlaceholder: true,
      sprintId: null,
      quarterId: null,
      cells: days.map(day => ({
        date: day,
        entries: []
      }))
    };

    return [
      {
        quarterId: 'placeholder-quarter',
        quarterDescription: 'Quarter +',
        sprints: [
          {
            sprintId: 'placeholder-sprint',
            sprintDescription: 'Sprint +',
            coatends: [...rows, row]
          }
        ]
      }
    ];
  }

  nextDays(): void {
    const nextStart = this.dayWindowStart + this.dayWindowSize;

    if (nextStart >= this.days.length) {
      return;
    }

    this.dayWindowStart = nextStart;
    this.updatePlannerWindow();
    this.cdr.detectChanges();
  }

  previousDays(): void {
    if (this.dayWindowStart === 0) {
      return;
    }

    this.dayWindowStart = Math.max(
      this.dayWindowStart - this.dayWindowSize,
      0
    );

    this.updatePlannerWindow();
    this.cdr.detectChanges();
  }


  updatePlannerWindow(): void {
    if (this.mode === 'structured') {
      this.updateVisibleStructuredPlanner();
    } else {
      this.updateVisiblePlaceholderPlanner();
    }
  }

  changeDayWindowSize(value: string): void {
    const size = Number(value);
    if (!Number.isSafeInteger(size) || size < 1) {
      this.feedback.warning('Informe uma quantidade inteira e positiva de dias.');
      return;
    }

    this.dayWindowSize = size;
    this.displaySelection = { type: 'count', count: size };
    if (!this.quarters.length && !this.sprints.length && this.days.length) {
      const end = this.parseLocalDate(this.days[0]);
      end.setDate(end.getDate() + Math.max(this.defaultPlaceholderDays, size) - 1);
      this.days = this.generateDays(this.parseLocalDate(this.days[0]), end);
    }

    this.dayWindowStart = Math.min(
      this.dayWindowStart,
      Math.max(0, this.days.length - this.dayWindowSize)
    );

    if (this.days.length > 0) {
      this.updatePlannerWindow();
      this.cdr.detectChanges();
    }
  }

  applyDisplaySelection(selection: PlannerDisplaySelection): void {
    if (selection.type === 'count') {
      this.changeDayWindowSize(selection.count.toString());
      return;
    }

    const { startDate, endDate } = selection;
    if (
      !this.isValidDate(startDate) ||
      !this.isValidDate(endDate) ||
      startDate > endDate
    ) {
      this.feedback.warning('Informe um período válido para exibir os dias.');
      return;
    }

    const startIndex = this.days.indexOf(startDate);
    const endIndex = this.days.indexOf(endDate);
    if (startIndex < 0 || endIndex < 0) {
      this.feedback.warning('Escolha um período dentro das datas disponíveis no planner.');
      return;
    }

    this.displaySelection = selection;
    this.dayWindowStart = startIndex;
    this.dayWindowSize = endIndex - startIndex + 1;
    this.updatePlannerWindow();
    this.cdr.detectChanges();
  }

  private restorePeriodWindow(): void {
    if (this.displaySelection.type !== 'period' || !this.days.length) {
      return;
    }

    const startDate = this.displaySelection.startDate;
    const startIndex = this.days.findIndex(day => day >= startDate);
    this.dayWindowStart = startIndex >= 0 ? startIndex : this.days.length - 1;
  }

  private syncPeriodSelection(): void {
    if (this.displaySelection.type === 'period' && this.visibleDays.length) {
      const startDate = this.visibleDays[0];
      const endDate = this.visibleDays[this.visibleDays.length - 1];
      if (
        startDate !== this.displaySelection.startDate ||
        endDate !== this.displaySelection.endDate
      ) {
        this.displaySelection = { type: 'period', startDate, endDate };
      }
    }
  }

  buildPlannerHierarchy(
    plannerRows: PlannerRow[],
    coatends: CoatendPlannerModel[]
  ): PlannerQuarterGroup[] {

    const result: PlannerQuarterGroup[] = [];

    const sortedCoatends = [...coatends].sort((a, b) => {
      const quarterCompare = this.toDateKey(a.quarterStartDate) - this.toDateKey(b.quarterStartDate);
      if (quarterCompare !== 0) return quarterCompare;

      const sprintCompare = this.toDateKey(a.sprintStartDate) - this.toDateKey(b.sprintStartDate);
      if (sprintCompare !== 0) return sprintCompare;

      return a.coatendNumber - b.coatendNumber;
    });

    for (const coatend of sortedCoatends) {
      const row = plannerRows.find(r => r.coatendId === coatend.id);
      if (!row) continue;

      const sprintId = coatend.sprintId;
      const sprintDesc = coatend.sprintDescription;

      const quarterId = coatend.quarterId;
      const quarterDesc = coatend.quarterDescription;

      let quarter = result.find(q => q.quarterId === quarterId);

      if (!quarter) {
        quarter = {
          quarterId,
          quarterDescription: quarterDesc,
          sprints: []
        };
        result.push(quarter);
      }

      let sprint = quarter.sprints.find(s => s.sprintId === sprintId);

      if (!sprint) {
        sprint = {
          sprintId,
          sprintDescription: sprintDesc,
          coatends: []
        };
        quarter.sprints.push(sprint);
      }

      sprint.coatends.push(row);
    }

    return result;
  }

  buildPlannerData(
    timeline: TimelineModel[],
    coatends: CoatendSummary[],
    days: string[]
  ): PlannerRow[] {

    const rows: PlannerRow[] = [];

    for (const coatend of coatends) {

      const coatendTimeline = timeline.filter(t =>
        t.coatendId?.toString().trim().toLowerCase() ===
        coatend.id?.toString().trim().toLowerCase()
      );

      const cells: PlannerCell[] = days.map(day => {

        const dayKey = this.toDateKey(day);

        const rawEntries = coatendTimeline.filter(t => {
          const startKey = this.toDateKey(t.startDate);
          const endKey = this.toDateKey(t.endDate);

          return dayKey >= startKey && dayKey <= endKey;
        });

        const entries: PlannerEntries[] = rawEntries.map(t => ({
          id: t.id,
          activity: t.activity,
          startDate: this.normalizeDate(t.startDate),
          endDate: this.normalizeDate(t.endDate),
          developerId: t.developerId,
          developerName: t.developerName,
          developerColor: t.developerColor,          
          performerName: t.performerName,
          performerColor: t.performerColor
        }));

        return {
          date: day,
          entries
        };
      });

      rows.push({
        coatendId: coatend.id,
        coatendDescription: `${coatend.coatendNumber} - ${coatend.description}`,
        cells
      });
    }

    return rows;
  }

 toDateKey(date: string): number {
    return Number(this.normalizeDate(date).replace(/-/g, ''));
  }

  generateDaysFromQuarters(coatends: CoatendPlannerModel[]): string[] {
    if (!coatends.length) {
      return [];
    }

    const quarterDates = coatends.flatMap(c => [
      this.normalizeDate(c.quarterStartDate),
      this.normalizeDate(c.quarterEndDate)
    ]);

    const sortedDates = [...quarterDates].sort();

    const min = sortedDates[0];
    const max = sortedDates[sortedDates.length - 1];

    const end = this.parseLocalDate(max);
    end.setDate(end.getDate() + 1);

    return this.generateDays(this.parseLocalDate(min), end);
  }

  generateDays(start: Date, end: Date): string[] {

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {

      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');

      dates.push(`${year}-${month}-${day}`); 

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  buildQuarterHeaders(
    coatends: CoatendPlannerModel[],
    visibleDays: string[]
  ): PlannerHeader[] {
    const quarters = this.getUniqueQuarters(coatends);

    return this.buildDateSegmentHeaders(
      visibleDays,
      quarters,
      'Quarter +',
      this.getFirstUncoveredDate(this.days, quarters)
    );
  }

buildSprintHeaders(
  coatends: CoatendPlannerModel[],
  visibleDays: string[]
): PlannerHeader[] {
  const sprints = this.getUniqueSprints(coatends);

  return this.buildDateSegmentHeaders(
    visibleDays,
    sprints,
    'Sprint +',
    this.getFirstUncoveredDate(this.days, sprints)
  );
}

buildDateSegmentHeaders(
  visibleDays: string[],
  segments: PlannerDateSegment[],
  placeholderDescription = '',
  placeholderDate?: string
): PlannerHeader[] {
  const headers: PlannerHeader[] = [];

  if (!visibleDays.length) {
    return headers;
  }

  const placeholderId = placeholderDescription
    ? `placeholder-${placeholderDescription.toLowerCase().replace(/\W+/g, '-')}`
    : '__empty__';
  let currentHeader: PlannerHeader | null = null;

  for (const day of visibleDays) {
    const dayKey = this.toDateKey(day);

    const segment = segments.find(s => {
      const startKey = this.toDateKey(s.startDate);
      const endKey = this.toDateKey(s.endDate);

      return dayKey >= startKey && dayKey <= endKey;
    });

    const isPlaceholder = !segment && day === placeholderDate;
    const id = segment ? segment.id : isPlaceholder ? placeholderId : '__empty__';
    const description = segment
      ? segment.description
      : isPlaceholder
        ? placeholderDescription
        : '';

    if (!currentHeader) {
      currentHeader = {
        id,
        description,
        colspan: 1
      };

      continue;
    }

    if (this.normalizeId(currentHeader.id) === this.normalizeId(id)) {
      currentHeader.colspan++;
    } else {
      headers.push(currentHeader);

      currentHeader = {
        id,
        description,
        colspan: 1
      };
    }
  }

  if (currentHeader) {
    headers.push(currentHeader);
  }

  return headers;
  }

  private getFirstUncoveredDate(
    days: string[],
    segments: PlannerDateSegment[]
  ): string | undefined {
    return days.find(day => !segments.some(segment => {
      const startKey = this.toDateKey(segment.startDate);
      const endKey = this.toDateKey(segment.endDate);
      const dayKey = this.toDateKey(day);

      return dayKey >= startKey && dayKey <= endKey;
    }));
  }

  getUniqueQuarters(coatends: CoatendPlannerModel[]): PlannerDateSegment[] {
    
    const map = new Map<string, PlannerDateSegment>();

    for (const coatend of coatends) {
      const quarterKey = this.normalizeId(coatend.quarterId);

      if (!map.has(quarterKey)) {
        map.set(quarterKey, {
          id: coatend.quarterId,
          description: coatend.quarterDescription,
          startDate: this.normalizeDate(coatend.quarterStartDate),
          endDate: this.normalizeDate(coatend.quarterEndDate)
        });
      }
    }

    
    return Array.from(map.values()).sort(
      (a, b) => this.toDateKey(a.startDate) - this.toDateKey(b.startDate)
    );
  }

    getUniqueSprints(coatends: CoatendPlannerModel[]): PlannerDateSegment[] {
    
    const map = new Map<string, PlannerDateSegment>();

    for (const coatend of coatends) {
      const sprintKey = this.normalizeId(coatend.sprintId);

      if (!map.has(sprintKey)) {
        map.set(sprintKey, {
          id: coatend.sprintId,
          description: coatend.sprintDescription,
          startDate: this.normalizeDate(coatend.sprintStartDate),
          endDate: this.normalizeDate(coatend.sprintEndDate)
        });
      }
    }
    
    return Array.from(map.values()).sort(
      (a, b) => this.toDateKey(a.startDate) - this.toDateKey(b.startDate)
    );
  }


  normalizeDate(date?: string): string {
    return date?.substring(0, 10) ?? '';
  }

  normalizeId(id?: string): string {
    return (id ?? '').toString().trim().toLowerCase();
  }

  parseLocalDate(date: string): Date {
    const normalized = this.normalizeDate(date);
    const [year, month, day] = normalized.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  isValidDate(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);

    return parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day;
  }
}
