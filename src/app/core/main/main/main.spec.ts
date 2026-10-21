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
import { PlannerExportContextService } from '../../../shared/services/planner-export-context';
import { FeatureService } from '../../../services/feature';
import { provideRouter } from '@angular/router';

describe('Main', () => {
  let component: Main;
  let fixture: ComponentFixture<Main>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Main],
      providers: [
        provideRouter([]),
        { provide: FeatureService, useValue: { getAll: () => of([]), getPlanning: () => of({}) } },
        { provide: Quarter, useValue: { getAll: () => of([]) } },
        { provide: SprintService, useValue: { getAll: () => of([]) } },
        {
          provide: CoatendService,
          useValue: {
            getAll: () => of([]),
            getMilestones: () => of({ warnings: [] }),
            getPlannerData: () => of([])
          }
        },
        { provide: TimelineService, useValue: { getAll: () => of([]) } },
        { provide: TimelineMutationService, useValue: { update: () => of({}), updatePeriods: () => of([]) } },
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

  it('updates only working periods using the original ID without separate creation requests', () => {
    const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
    const updatePeriods = vi.spyOn(TestBed.inject(TimelineMutationService), 'updatePeriods');
    component.blocks = [{ id: 'b1', type: 'CORPORATE', coatendId: null,
      startDate: '2026-10-24', endDate: '2026-10-25', conflictingActivityIds: [] }];
    component.createPlannerItem({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-23', endDate: '2026-10-27', includeWeekends: false });
    expect(update).not.toHaveBeenCalled();
    expect(updatePeriods).toHaveBeenCalledExactlyOnceWith('a1', [
      { activity: Activity.SWAP, startDate: '2026-10-23', endDate: '2026-10-23', developerId: null },
      { activity: Activity.SWAP, startDate: '2026-10-26', endDate: '2026-10-27', developerId: null }
    ]);
  });

  it('does not put the Sprint creation action into a gap between registered Sprints', () => {
    const headers = component.buildSprintSummaryHeaders([
      { id: 's1', description: 'S1', coatendsCount: 0, startDate: '2026-10-23', endDate: '2026-10-23' },
      { id: 's2', description: 'S2', coatendsCount: 0, startDate: '2026-10-26', endDate: '2026-10-26' }
    ], ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26']);
    expect(headers).toEqual([
      { id: 's1', description: 'S1', colspan: 1 }, { id: '__empty__', description: '', colspan: 2 },
      { id: 's2', description: 'S2', colspan: 1 }
    ]);
  });

  it('announces the actual visible dates after changing day count or period', () => {
    component.days = ['2026-10-19', '2026-10-20', '2026-10-21'];
    const info = vi.spyOn(TestBed.inject(FeedbackService), 'info');
    component.applyDisplaySelection({ type: 'count', count: 2 });
    expect(info).toHaveBeenLastCalledWith('Exibição atualizada: 2 dia(s), de 19/10/2026 a 20/10/2026.');
    component.applyDisplaySelection({ type: 'period', startDate: '2026-10-20', endDate: '2026-10-21' });
    expect(info).toHaveBeenLastCalledWith('Exibição atualizada: 2 dia(s), de 20/10/2026 a 21/10/2026.');
    info.mockClear();
    component.applyDisplaySelection({ type: 'count', count: 0 });
    expect(info).not.toHaveBeenCalled();
  });

  it('allows editing and creating a past activity for a Coatend without a Sprint', async () => {
    component.coatendSummaries = [{ id: 'c1', description: 'Ativar tela de espera', coatendNumber: 8579 }];
    component.coatends = [];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const planner = component.plannerComponent!;
    planner.openStructureEditor('coatend', 'c1');
    expect(planner.placeholderActions?.request?.entityId).toBe('c1');
    planner.openActivityCreation('2026-10-13', 'c1');
    const modal = planner.placeholderActions!;
    modal.endDate = '2026-10-14';
    modal.developerId = 'd1';
    expect(modal.coatendId).toBe('c1');
    expect(modal.hasActivityDates).toBe(true);
    expect(modal.canSubmit).toBe(true);
    const submit = vi.spyOn(component, 'createPlannerItem').mockImplementation(() => {});
    modal.submit();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'activity', coatendId: 'c1', startDate: '2026-10-13', endDate: '2026-10-14', developerId: 'd1'
    }));
  });

  it('renders asynchronous Feature loading before the development-mode stability check', () => {
    const quarters = new Subject<QuarterSummary[]>();
    const features = new Subject<[]>();
    vi.spyOn(TestBed.inject(Quarter), 'getAll').mockReturnValue(quarters);
    vi.spyOn(TestBed.inject(FeatureService), 'getAll').mockReturnValue(features);
    component.loadPlannerData();
    quarters.next([]);
    quarters.complete();
    expect(component.featureLoading).toBe(true);
    expect(() => fixture.checkNoChanges()).not.toThrow();
    features.next([]);
    features.complete();
    expect(component.featureLoading).toBe(false);
    expect(() => fixture.checkNoChanges()).not.toThrow();
  });

  it('loads each Feature planning once and keeps it independent of Sprint grouping', () => {
    const service = TestBed.inject(FeatureService);
    vi.spyOn(service, 'getAll').mockReturnValue(of([{ id: 'f1', name: 'Entrega', description: null, coatends: [] }]));
    const phase = { plannedStart: null, plannedEnd: null, effectiveStart: null, confirmedAt: null,
      confirmed: false, estimatedPercent: null, unavailableReasons: ['NO_COATENDS'], limitations: [] };
    const planning = vi.spyOn(service, 'getPlanning').mockReturnValue(of({ id: 'f1', name: 'Entrega', description: null,
      referenceDate: '2026-10-09', zone: 'America/Sao_Paulo', development: phase, homologation: phase,
      coatends: [], warnings: [], pendingCoatendCount: 0 }));
    component.loadFeaturePlanning();
    expect(planning).toHaveBeenCalledTimes(1);
    expect(planning).toHaveBeenCalledWith('f1');
    expect(component.featurePlanning).toHaveLength(1);
  });

  it('keeps the existing planner visible and reports failed Feature loading', () => {
    vi.spyOn(TestBed.inject(FeatureService), 'getAll').mockReturnValue(throwError(() => ({ status: 500 })));
    const hierarchy = component.plannerHierarchy;
    component.loadFeaturePlanning();
    expect(component.plannerHierarchy).toBe(hierarchy);
    expect(component.featurePlanning).toEqual([]);
    expect(component.featureError).toContain('carregar');
  });

  it('should route toolbar creation and editing to the planner modal', async () => {
    component.days = ['2026-10-08'];
    const block = { id: 'b1', type: 'DEPENDENCY' as const, coatendId: 'c1', startDate: '2027-01-01',
      endDate: '2027-01-02', conflictingActivityIds: [] };
    component.blocks = [block];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const create: HTMLButtonElement = fixture.nativeElement.querySelector('app-planner-block-toolbar button');
    create.click();
    expect(component.plannerComponent?.placeholderActions?.request).toEqual({
      type: 'block', startDate: '2026-10-08'
    });
    const edit: HTMLButtonElement = fixture.nativeElement.querySelector('app-planner-block-toolbar .planner-block-list-item');
    edit.click();
    expect(component.plannerComponent?.placeholderActions?.request).toEqual(expect.objectContaining({
      type: 'block', blockId: 'b1', blockType: 'DEPENDENCY', coatendId: 'c1',
      startDate: '2027-01-01', endDate: '2027-01-02'
    }));
  });

  it('should publish the navigated window and clear export context when destroyed', () => {
    const context = TestBed.inject(PlannerExportContextService);
    component.days = ['2026-10-08', '2026-10-09', '2026-10-13'];
    component.applyDisplaySelection({ type: 'count', count: 2 });
    expect(context.visibleDays()).toEqual(component.visibleDays);
    expect(context.displaySelection()).toEqual(component.displaySelection);
    expect(context.canExport()).toBe(true);
    component.nextDays();
    expect(context.visibleDays()).toEqual(component.visibleDays);
    fixture.destroy();
    expect(context.canExport()).toBe(false);
    expect(context.visibleDays()).toEqual([]);
  });

  it.each(['CORPORATE', 'DEPENDENCY'] as const)('should reject activity creation and editing under %s', type => {
    component.blocks = [{ id: 'b1', type, coatendId: type === 'CORPORATE' ? null : 'c1', startDate: '2026-10-08',
      endDate: '2026-10-10', conflictingActivityIds: [] }];
    const create = vi.fn();
    Object.assign(TestBed.inject(TimelineService), { create });
    const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
    const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
    const item = { type: 'activity' as const, coatendId: 'c1', activity: Activity.HOMOLOGATION,
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

  it.each(['CORPORATE', 'DEPENDENCY'] as const)(
    'should apply corporate priority when creating and editing %s over the other type', type => {
      component.blocks = [{
        id: 'existing', type: type === 'CORPORATE' ? 'DEPENDENCY' : 'CORPORATE',
        coatendId: type === 'CORPORATE' ? 'c2' : null,
        startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: []
      }];
      const create = vi.spyOn(TestBed.inject(PlanningBlockService), 'create');
      const update = vi.spyOn(TestBed.inject(PlanningBlockService), 'update');
      const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
      const item = { type: 'block' as const, blockType: type, coatendId: 'c1',
        startDate: '2026-10-10', endDate: '2026-10-11' };
      component.createPlannerItem(item);
      component.createPlannerItem({ ...item, blockId: 'editing' });
      if (type === 'CORPORATE') {
        expect(create).toHaveBeenCalled();
        expect(update).toHaveBeenCalled();
      } else {
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('prioridade igual ou superior'));
      }
    }
  );

  it.each(['CORPORATE', 'DEPENDENCY'] as const)('should enforce priority when creating and editing %s over an existing activity', type => {
    component.timeline = [{ id: 'a1', activity: Activity.DEVELOPMENT, coatendId: 'c1',
      startDate: '2026-10-10', endDate: '2026-10-10', performerName: 'Dev', performerColor: '#123456' }];
    const service = TestBed.inject(PlanningBlockService);
    const create = vi.spyOn(service, 'create');
    const update = vi.spyOn(service, 'update');
    const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
    vi.spyOn(component, 'loadPlannerData').mockImplementation(() => {});
    const item = { type: 'block' as const, blockType: type, coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10' };
    component.createPlannerItem(item);
    component.createPlannerItem({ ...item, blockId: 'editing' });
    expect(create).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
    expect(component.loadPlannerData).toHaveBeenCalledTimes(2);
    expect(component.timeline[0].id).toBe('a1');
  });

  it('should preserve a first dependency block without blocking other coatends', () => {
    component.blocks = [{ id: 'bd', type: 'DEPENDENCY', coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }];
    const create = vi.spyOn(TestBed.inject(PlanningBlockService), 'create');
    const item = { type: 'block' as const, blockType: 'DEPENDENCY' as const,
      startDate: '2026-10-08', endDate: '2026-10-10' };
    component.createPlannerItem({ ...item, coatendId: 'c1' });
    expect(create).not.toHaveBeenCalled();
    component.createPlannerItem({ ...item, coatendId: 'c2' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('should allow dependency blocks where another coatend has an activity', () => {
    component.timeline = [{ id: 'a1', activity: Activity.HOMOLOGATION, coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10', performerName: 'TH', performerColor: '#123456' }];
    const create = vi.spyOn(TestBed.inject(PlanningBlockService), 'create');
    component.createPlannerItem({ type: 'block', blockType: 'DEPENDENCY', coatendId: 'c2',
      startDate: '2026-10-08', endDate: '2026-10-10' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('should allow changing the type of the edited block without conflicting with itself', () => {
    component.blocks = [{ id: 'b1', type: 'CORPORATE', coatendId: null,
      startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }];
    const update = vi.spyOn(TestBed.inject(PlanningBlockService), 'update');
    component.createPlannerItem({ type: 'block', blockId: 'b1', blockType: 'DEPENDENCY',
      coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10' });
    expect(update).toHaveBeenCalled();
  });

  it('should edit a dependency block and reload the trimmed timeline without an overlap warning', () => {
    const update = vi.spyOn(TestBed.inject(PlanningBlockService), 'update')
      .mockReturnValue(of({ id: 'b1', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08',
        endDate: '2026-10-10', conflictingActivityIds: [] }));
    const warning = vi.spyOn(TestBed.inject(FeedbackService), 'warning');
      const success = vi.spyOn(TestBed.inject(FeedbackService), 'success');
      const reload = vi.spyOn(component, 'loadPlannerData').mockImplementation(() => {});
    component.createPlannerItem({
      type: 'block', blockId: 'b1', blockType: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
    });
    expect(update).toHaveBeenCalledWith('b1', {
      type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-10'
    });
    expect(warning).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Bloqueio salvo com sucesso!');
    expect(reload).toHaveBeenCalledTimes(1);
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

  it.each(['move', 'resize'] as const)('updates the same activity without creating a record in %s mode', async mode => {
    component.coatendSummaries = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const create = vi.fn();
    const createBatch = vi.fn();
    Object.assign(TestBed.inject(TimelineService), { create, createBatch });
    const update = vi.spyOn(TestBed.inject(TimelineMutationService), 'update');
    const modal = component.plannerComponent!.placeholderActions!;
    modal.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-19', endDate: '2026-10-19' });
    modal.changeActivityEditMode(mode);
    if (mode === 'move') {
      modal.startDate = '2026-10-20';
    } else {
      modal.endDate = '2026-10-20';
    }
    modal.submit();
    expect(update).toHaveBeenCalledExactlyOnceWith('a1', {
      activity: Activity.DEVELOPMENT, developerId: 'd1',
      startDate: mode === 'move' ? '2026-10-20' : '2026-10-19', endDate: '2026-10-20'
    });
    expect(create).not.toHaveBeenCalled();
    expect(createBatch).not.toHaveBeenCalled();
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

  it('should stop both date sources at the inclusive quarter end', () => {
    component.quarters = [{
      id: 'q1', description: 'Quarter', sprintCount: 1,
      startDate: '2026-10-09', endDate: '2026-10-23'
    }];
    component.loadPlaceholderPlanner();
    expect(component.days).toHaveLength(15);
    expect(component.days.at(-1)).toBe('2026-10-23');
    expect(component.generateDaysFromQuarters([{
      id: 'c1', description: 'Coatend', coatendNumber: 1,
      quarterId: 'q1', quarterDescription: 'Quarter',
      quarterStartDate: '2026-10-09', quarterEndDate: '2026-10-23',
      sprintId: 's1', sprintDescription: 'Sprint',
      sprintStartDate: '2026-10-09', sprintEndDate: '2026-10-23'
    }])).toEqual(component.days);
    component.nextDays();
    expect(component.dayWindowStart).toBe(0);
  });

  it('should render only visible columns when navigating to a short last page', () => {
    component.days = component.generateDays(
      component.parseLocalDate('2026-10-09'), component.parseLocalDate('2026-10-25')
    );
    component.dayWindowSize = 15;
    component.updatePlannerWindow();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.planner-day-header')).toHaveLength(15);
    component.nextDays();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(component.visibleDays).toEqual(['2026-10-24', '2026-10-25']);
    expect(fixture.nativeElement.querySelectorAll('.planner-day-header')).toHaveLength(2);
    expect(component.plannerHierarchy[0].sprints[0].coatends[0].cells.map(cell => cell.date))
      .toEqual(component.visibleDays);
    component.previousDays();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(component.visibleDays.at(-1)).toBe('2026-10-23');
    expect(fixture.nativeElement.querySelectorAll('.planner-day-header')).toHaveLength(15);
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
