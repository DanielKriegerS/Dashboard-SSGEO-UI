import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Main } from './main';
import { Quarter } from '../../../services/quarter';
import { SprintService } from '../../../services/sprint';
import { CoatendService } from '../../../services/coatend';
import { TimelineService } from '../../../services/timeline-service';
import { TimelineService as TimelineMutationService } from '../../../services/timeline';
import { DeveloperService } from '../../../services/developer-service';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { SprintSummary } from '../../../models/sprint/SprintSummary';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';
import { CoatendPlannerModel } from '../../../models/components/planner/CoatendPlannerModel';
import { Activity } from '../../../models/components/Activities';
import { FeedbackService } from '../../../services/feedback';
import { PlannerExportService } from '../../../services/planner-export';
import { PlanningBlockService } from '../../../services/planning-block';
import { HttpErrorResponse } from '@angular/common/http';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        { provide: Quarter, useValue: { getAll: () => of([]) } },
        { provide: SprintService, useValue: { getAll: () => of([]) } },
        {
          provide: CoatendService,
          useValue: {
            getAll: () => of([]),
            getPlannerData: () => of([])
          }
        },
        { provide: TimelineService, useValue: { getAll: () => of([]) } },
        { provide: TimelineMutationService, useValue: { update: () => of({}) } },
        { provide: DeveloperService, useValue: { getAll: () => of([]) } },
        { provide: PlanningBlockService, useValue: {
          getAll: () => of([]),
          create: () => of({ id: 'b1', conflictingActivityIds: [] }),
          update: () => of({ id: 'b1', conflictingActivityIds: [] })
        } },
        { provide: PlannerExportService, useValue: { export: () => of(new Blob(['xlsx'])) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reject blocked activity creation and editing before sending requests', () => {
    component.blocks = [{ id: 'b1', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08',
      endDate: '2026-10-10', conflictingActivityIds: [] }];
    const create = vi.fn();
    Object.assign(TestBed.inject(TimelineService), { create });
    const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
    const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
    const item = { type: 'activity' as const, coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-10', endDate: '2026-10-11' };
    component.createPlannerItem(item);
    component.createPlannerItem({ ...item, activityId: 'a1' });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('impedida por um bloqueio'));
  });

  it('should create working periods atomically and ignore blocks on excluded days', () => {
    const createBatch = vi.fn(() => of([]));
    const create = vi.fn(() => of({}));
    Object.assign(TestBed.inject(TimelineService), { createBatch, create });
    component.blocks = [{ id: 'b1', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-10',
      endDate: '2026-10-12', conflictingActivityIds: [] }];
    component.createPlannerItem({ type: 'activity', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-09', endDate: '2026-10-15', includeWeekends: false });
    expect(createBatch).toHaveBeenCalledWith('c1', [
      { activity: Activity.SWAP, startDate: '2026-10-09', endDate: '2026-10-09', developerId: null },
      { activity: Activity.SWAP, startDate: '2026-10-13', endDate: '2026-10-15', developerId: null }
    ]);
    expect(create).not.toHaveBeenCalled();
  });

  it('should include every day when selected and avoid requests when there are no working days', () => {
    const createBatch = vi.fn(() => of([]));
    const create = vi.fn(() => of({}));
    Object.assign(TestBed.inject(TimelineService), { createBatch, create });
    const item = { type: 'activity' as const, coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-09', endDate: '2026-10-15' };
    component.createPlannerItem({ ...item, includeWeekends: true });
    expect(create).toHaveBeenCalledWith('c1', {
      activity: Activity.SWAP, startDate: item.startDate, endDate: item.endDate, developerId: null
    });
    component.createPlannerItem({ ...item, startDate: '2026-10-10', endDate: '2026-10-12', includeWeekends: false });
    expect(create).toHaveBeenCalledTimes(1);
    expect(createBatch).not.toHaveBeenCalled();
  });

  it('should create a global block without sending the selected coatend', () => {
    const create = vi.spyOn(TestBed.inject(PlanningBlockService), 'create');
    component.createPlannerItem({
      type: 'block', blockType: 'CORPORATE', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
    });
    expect(create).toHaveBeenCalledWith({
      type: 'CORPORATE', coatendId: null, startDate: '2026-10-08', endDate: '2026-10-10'
    });
  });

  it('should edit a dependency block and warn about preserved activity conflicts', () => {
    const update = vi.spyOn(TestBed.inject(PlanningBlockService), 'update')
      .mockReturnValue(of({ id: 'b1', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08',
        endDate: '2026-10-10', conflictingActivityIds: ['a1'] }));
    const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
    component.createPlannerItem({
      type: 'block', blockId: 'b1', blockType: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
    });
    expect(update).toHaveBeenCalledWith('b1', {
      type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
    });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('1 atividade(s) em conflito'));
  });

  it('should render corporate blocks on all rows and dependency blocks only on their coatend', () => {
    component.blocks = [
      { id: 'global', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: ['a1'] },
      { id: 'local', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-09', endDate: '2026-10-09', conflictingActivityIds: [] }
    ];
    const rows = component.buildPlannerData([
      { id: 'a1', activity: Activity.SWAP, coatendId: 'c1', startDate: '2026-10-07', endDate: '2026-10-09',
        performerName: 'Swap', performerColor: '#dc3545' }
    ], [
      { id: 'c1', description: 'First', coatendNumber: 1 },
      { id: 'c2', description: 'Second', coatendNumber: 2 }
    ], ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-11']);
    expect(rows[0].cells[0].entries[0].hasConflict).toBe(false);
    expect(rows[0].cells[1].entries.find(entry => entry.id === 'a1')?.hasConflict).toBe(true);
    expect(rows[0].cells[2].entries.map(entry => entry.id)).toEqual(['a1', 'global', 'local']);
    expect(rows[1].cells[2].entries.map(entry => entry.id)).toEqual(['global']);
    expect(rows[1].cells[2].entries[0].hasConflict).toBe(false);
    expect(rows[0].cells[3].entries).toEqual([]);
  });

  it('should load global blocks even when planning structures are empty', () => {
    vi.spyOn(TestBed.inject(PlanningBlockService), 'getAll').mockReturnValue(of([
      { id: 'b1', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }
    ]));
    component.loadPlannerData();
    expect(component.blocks[0].id).toBe('b1');
    const hierarchy = component.buildPlaceholderHierarchy(['2026-10-08']);
    expect(hierarchy[0].sprints[0].coatends[0].cells[0].entries[0].blockType).toBe('CORPORATE');
  });

  it('should surface the API reason when an activity is blocked', () => {
    vi.spyOn(TestBed.inject(TimelineMutationService), 'update').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Atividade impedida por bloqueio CORPORATE.' }
    })));
    const feedback = vi.spyOn(TestBed.inject(FeedbackService), 'error');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      component.createPlannerItem({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.SWAP,
        startDate: '2026-10-08', endDate: '2026-10-09' });
      expect(feedback).toHaveBeenCalledWith('Atividade impedida por bloqueio CORPORATE.');
    } finally {
      log.mockRestore();
    }
  });

  it('should open export options using the current navigated window', () => {
    component.visibleDays = ['2026-10-15', '2026-10-16'];
    component.displaySelection = { type: 'period', startDate: '2026-10-15', endDate: '2026-10-16' };
    component.openExportOptions();
    expect(component.exportOptions?.opened).toBe(true);
    expect(component.exportOptions?.mode).toBe('PERIOD');
    expect(component.exportOptions?.startDate).toBe('2026-10-15');
    expect(component.exportOptions?.endDate).toBe('2026-10-16');
  });

  it('should download the backend blob once and release the URL', async () => {
    const response = new Subject<Blob>();
    const exportFile = vi.spyOn(TestBed.inject(PlannerExportService), 'export').mockReturnValue(response);
    const createObjectURL = vi.fn().mockReturnValue('blob:planner-test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('planner.xlsx');
      expect(this.href).toBe('blob:planner-test');
      expect(this.isConnected).toBe(true);
    });
    try {
      const request = { mode: 'QUARTER' as const, quarterId: 'q1' };
      component.openExportOptions();
      component.exportPlanner(request);
      component.exportPlanner(request);
      expect(component.exporting).toBe(true);
      expect(exportFile).toHaveBeenCalledExactlyOnceWith(request);
      const blob = new Blob(['backend workbook']);
      response.next(blob);
      response.complete();
      expect(click).toHaveBeenCalledOnce();
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(component.exporting).toBe(false);
      expect(component.exportOptions?.opened).toBe(false);
      expect(fixture.nativeElement.ownerDocument.querySelector('a[download="planner.xlsx"]')).toBeNull();
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:planner-test');
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('should keep export options open for retry after a server error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feedback = vi.spyOn(TestBed.inject(FeedbackService), 'error');
    vi.spyOn(TestBed.inject(PlannerExportService), 'export')
      .mockReturnValue(throwError(() => new Error('Export failed')));
    try {
      component.openExportOptions();
      component.exportPlanner({ mode: 'SPRINT', sprintId: 's1' });
      expect(component.exporting).toBe(false);
      expect(component.exportOptions?.opened).toBe(true);
      expect(feedback).toHaveBeenCalledWith('Não foi possível exportar o planner. Tente novamente.');
    } finally {
      log.mockRestore();
    }
  });

  it('should report an activity update failure as editing, not creation', () => {
    vi.spyOn(TestBed.inject(TimelineMutationService), 'update')
      .mockReturnValue(throwError(() => new Error('API failed')));
    const feedback = vi.spyOn(TestBed.inject(FeedbackService), 'error');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      component.createPlannerItem({
        type: 'activity', activityId: 'activity-1', coatendId: 'coatend-1',
        activity: Activity.SWAP, startDate: '2026-10-08', endDate: '2026-10-09'
      });

      expect(feedback).toHaveBeenCalledWith('Não foi possível atualizar atividade. Tente novamente.');
      expect(log).toHaveBeenCalledWith('Erro ao atualizar atividade pelo planner:', expect.any(Error));
    } finally {
      log.mockRestore();
    }
  });

  it.each([
    Activity.HOMOLOGATION,
    Activity.ADMINISTRATIVE_TASKS,
    Activity.PRE_SWAP,
    Activity.SWAP
  ])('should create and edit %s with a null developer', activity => {
    const create = vi.fn().mockReturnValue(of({}));
    Object.assign(TestBed.inject(TimelineService), { create });
    const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
    const item = {
      type: 'activity' as const,
      coatendId: 'coatend-1',
      activity,
      developerId: 'stale-developer',
      startDate: '2026-10-08',
      endDate: '2026-10-09'
    };
    component.createPlannerItem(item);
    component.createPlannerItem({ ...item, activityId: 'activity-1' });

    const expectedPayload = {
      activity,
      startDate: item.startDate,
      endDate: item.endDate,
      developerId: null
    };
    expect(create).toHaveBeenCalledWith('coatend-1', expectedPayload);
    expect(update).toHaveBeenCalledWith('activity-1', expectedPayload);
  });

  it.each([Activity.DEVELOPMENT, Activity.TESTING_TU, Activity.PASSAGE_TH])(
    'should reject creation and editing of %s without a developer',
    activity => {
      const create = vi.fn();
      Object.assign(TestBed.inject(TimelineService), { create });
      const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
      const item = {
        type: 'activity' as const, coatendId: 'coatend-1', activity,
        startDate: '2026-10-08', endDate: '2026-10-09'
      };
      component.createPlannerItem(item);
      component.createPlannerItem({ ...item, activityId: 'activity-1' });
      expect(create).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    }
  );

  it('should select empty mode when no planner structures exist', () => {
    expect(component.resolvePlannerMode([], [], [], [])).toBe('empty');
  });

  it('should select partial mode when structures have no associations', () => {
    const quarter: QuarterSummary = {
      id: 'quarter-1',
      description: 'Quarter 1',
      sprintCount: 1
    };

    expect(component.resolvePlannerMode([quarter], [], [], [])).toBe('partial');
  });

  it('should select structured mode when every coatend links to a known sprint and quarter', () => {
    const quarter: QuarterSummary = {
      id: 'quarter-1',
      description: 'Quarter 1',
      sprintCount: 1
    };
    const sprint: SprintSummary = {
      id: 'sprint-1',
      description: 'Sprint 1',
      coatendsCount: 1
    };
    const coatend: CoatendSummary = {
      id: 'coatend-1',
      description: 'Coatend 1',
      coatendNumber: 1
    };
    const plannerCoatend: CoatendPlannerModel = {
      id: 'coatend-1',
      description: 'Coatend 1',
      coatendNumber: 1,
      sprintId: 'sprint-1',
      sprintDescription: 'Sprint 1',
      sprintStartDate: '2026-10-01',
      sprintEndDate: '2026-10-15',
      quarterId: 'quarter-1',
      quarterDescription: 'Quarter 1',
      quarterStartDate: '2026-10-01',
      quarterEndDate: '2026-10-31'
    };

    expect(component.resolvePlannerMode(
      [quarter],
      [sprint],
      [coatend],
      [plannerCoatend]
    )).toBe('structured');
  });

  it('should create a 15-day default window when structures have no dates', () => {
    component.quarters = [];
    component.sprints = [];
    const range = component.resolvePlaceholderDateRange();

    expect(component.generateDays(range.start, range.end)).toHaveLength(15);
  });

  it('should render existing coatends while the structure is partial', () => {
    component.coatendSummaries = [{
      id: 'coatend-1',
      coatendNumber: 42,
      description: 'Correção'
    }];
    component.mode = 'partial';
    component.loadPlaceholderPlanner();

    const rows = component.plannerHierarchy[0].sprints[0].coatends;
    expect(rows[0].coatendId).toBe('coatend-1');
    expect(rows[0].coatendDescription).toBe('42 - Correção');
    expect(rows[1].isPlaceholder).toBe(true);
  });

  it('should load coatends and their activities in partial mode', () => {
    const service = TestBed.inject(CoatendService);
    const getAll = vi.spyOn(service, 'getAll').mockReturnValue(of([{
      id: 'coatend-2',
      coatendNumber: 7,
      description: 'Nova Coatend'
    }]));
    const timeline = vi.spyOn(TestBed.inject(TimelineService), 'getAll');

    component.loadPlannerData();

    expect(getAll).toHaveBeenCalled();
    expect(timeline).toHaveBeenCalled();
    expect(component.mode).toBe('partial');
    expect(component.plannerHierarchy[0].sprints[0].coatends[0].coatendDescription)
      .toBe('7 - Nova Coatend');
  });

  it('should change the selected day count without depending on viewport width', () => {
    component.loadPlaceholderPlanner();
    component.changeDayWindowSize('30');
    expect(component.dayWindowSize).toBe(30);
    expect(component.visibleDays).toHaveLength(30);

    component.changeDayWindowSize('7');
    expect(component.dayWindowSize).toBe(7);
    expect(component.visibleDays).toHaveLength(7);
    expect(component.dayWindowStart).toBe(0);
  });

  it('should update a coatend rather than create it when editing', () => {
    const update = vi.fn().mockReturnValue(of({}));
    const service = TestBed.inject(CoatendService);
    Object.assign(service, { update });
    component.createPlannerItem({
      type: 'coatend',
      entityId: 'coatend-1',
      description: 'Atualizada',
      coatendNumber: 15
    });

    expect(update).toHaveBeenCalledWith('coatend-1', {
      description: 'Atualizada',
      coatendNumber: 15
    });
  });

  it('should display a newly created coatend after association and reload in partial mode', () => {
    component.sprints = [{
      id: 'sprint-1', description: 'Sprint', coatendsCount: 0
    }];
    const service = TestBed.inject(CoatendService);
    const created = { id: 'coatend-new', description: 'Nova', coatendNumber: 24 };
    const create = vi.fn().mockReturnValue(of(created));
    const associate = vi.fn().mockReturnValue(of({}));
    Object.assign(service, { create, updateCoatendSprint: associate });
    vi.spyOn(service, 'getAll').mockReturnValue(of([created]));

    component.createPlannerItem({
      type: 'coatend',
      sprintId: 'sprint-1',
      description: 'Nova',
      coatendNumber: 24
    });

    expect(create).toHaveBeenCalledWith({ description: 'Nova', coatendNumber: 24 });
    expect(associate).toHaveBeenCalledWith('coatend-new', { sprintId: 'sprint-1' });
    expect(component.plannerHierarchy[0].sprints[0].coatends[0].coatendDescription)
      .toBe('24 - Nova');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('24 - Nova');
  });

  it.each(['quarter', 'sprint'] as const)('should persist edits to a %s', type => {
    const update = vi.fn().mockReturnValue(of({}));
    const service = type === 'quarter'
      ? TestBed.inject(Quarter)
      : TestBed.inject(SprintService);
    Object.assign(service, { update });

    component.createPlannerItem({
      type,
      entityId: 'item-1',
      description: 'Editado',
      startDate: '2026-10-01',
      endDate: '2026-10-15'
    });

    expect(update).toHaveBeenCalledWith('item-1', {
      description: 'Editado',
      startDate: '2026-10-01T00:00:00',
      endDate: '2026-10-15T00:00:00'
    });
  });

  it('should hide the partial warning when one complete structure exists alongside incomplete items', () => {
    fixture.detectChanges();
    component.quarters = [{
      id: 'quarter-1', description: 'Quarter', sprintCount: 1
    }];
    component.sprints = [
      { id: 'sprint-1', description: 'Associada', coatendsCount: 1 },
      { id: 'sprint-2', description: 'Sem Quarter', coatendsCount: 0 }
    ];
    component.coatendSummaries = [
      { id: 'coatend-1', description: 'Associada', coatendNumber: 1 },
      { id: 'coatend-2', description: 'Sem Sprint', coatendNumber: 2 }
    ];
    component.coatends = [{
      id: 'coatend-1', description: 'Associada', coatendNumber: 1,
      sprintId: 'sprint-1', sprintDescription: 'Associada',
      sprintStartDate: '2026-10-01', sprintEndDate: '2026-10-15',
      quarterId: 'quarter-1', quarterDescription: 'Quarter',
      quarterStartDate: '2026-10-01', quarterEndDate: '2026-12-31'
    }];
    component.mode = component.resolvePlannerMode(
      component.quarters, component.sprints, component.coatendSummaries, component.coatends
    );
    component.loadPlaceholderPlanner();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(component.mode).toBe('partial');
    expect(component.hasCompleteStructure).toBe(true);
    expect(fixture.nativeElement.querySelector('.planner-partial-notice')).toBeNull();
    expect(component.plannerData).toHaveLength(2);
  });

  it('should keep the partial warning when no complete structure exists', () => {
    fixture.detectChanges();
    component.coatendSummaries = [{
      id: 'coatend-1', description: 'Sem associações', coatendNumber: 1
    }];
    component.mode = 'partial';
    component.loadPlaceholderPlanner();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(component.hasCompleteStructure).toBe(false);
    expect(fixture.nativeElement.querySelector('.planner-partial-notice')).not.toBeNull();
  });

  it('should display the selected period inclusively and keep arrow navigation', () => {
    component.days = component.generateDays(
      component.parseLocalDate('2026-10-01'),
      component.parseLocalDate('2026-10-31')
    );
    component.applyDisplaySelection({
      type: 'period', startDate: '2026-10-08', endDate: '2026-10-14'
    });
    expect(component.visibleDays).toHaveLength(7);
    expect(component.visibleDays[0]).toBe('2026-10-08');
    expect(component.visibleDays[6]).toBe('2026-10-14');
    component.nextDays();
    expect(component.visibleDays[0]).toBe('2026-10-15');
    expect(component.displaySelection).toEqual({
      type: 'period', startDate: '2026-10-15', endDate: '2026-10-21'
    });
    component.previousDays();
    expect(component.visibleDays[0]).toBe('2026-10-08');
  });

  it('should support selecting a single day and switching back to day count', () => {
    component.loadPlaceholderPlanner();
    const startDate = component.days[2];
    component.applyDisplaySelection({ type: 'period', startDate, endDate: startDate });
    expect(component.visibleDays).toEqual([startDate]);
    component.applyDisplaySelection({ type: 'count', count: 5 });
    expect(component.displaySelection).toEqual({ type: 'count', count: 5 });
    expect(component.visibleDays).toHaveLength(5);
  });

  it('should reject periods outside the available dates without changing the selection', () => {
    component.days = ['2026-10-08', '2026-10-09'];
    component.updatePlannerWindow();
    component.applyDisplaySelection({
      type: 'period', startDate: '2026-10-07', endDate: '2026-10-09'
    });
    expect(component.displaySelection.type).toBe('count');
    expect(component.visibleDays).toEqual(['2026-10-08', '2026-10-09']);
  });

  it('should preserve the chosen period when planner data is reloaded', () => {
    component.quarters = [{
      id: 'quarter-1', description: 'Quarter', sprintCount: 0,
      startDate: '2026-10-01', endDate: '2026-10-31'
    }];
    component.loadPlaceholderPlanner();
    component.applyDisplaySelection({
      type: 'period', startDate: '2026-10-08', endDate: '2026-10-14'
    });
    component.loadPlaceholderPlanner();
    expect(component.visibleDays[0]).toBe('2026-10-08');
    expect(component.visibleDays[6]).toBe('2026-10-14');
  });
});
