import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
        { provide: DeveloperService, useValue: { getAll: () => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Main);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

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
