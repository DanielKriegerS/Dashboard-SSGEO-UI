import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PlannerPlaceholderActions } from './planner-placeholder-actions';
import { DeveloperService } from '../../../services/developer-service';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { Activity } from '../../../models/components/Activities';

describe('PlannerPlaceholderActions', () => {
  let component: PlannerPlaceholderActions;
  let fixture: ComponentFixture<PlannerPlaceholderActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannerPlaceholderActions],
      providers: [
        { provide: DeveloperService, useValue: { getAll: () => of([]) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlannerPlaceholderActions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([undefined, 'a1'])('should prevent saving a blocked activity when activity ID is %s', async activityId => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.blocks = [{
      id: 'b1', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08',
      endDate: '2026-10-10', conflictingActivityIds: []
    }];
    component.open({ type: 'activity', activityId, coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-10', endDate: '2026-10-11' });
    component.includeWeekends = true;
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(component.canSubmit).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Não é possível salvar');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).not.toHaveBeenCalled();
    component.startDate = '2026-10-11';
    expect(component.canSubmit).toBe(true);
  });

  it('should allow non-swap activities through corporate blocks and other coatends through dependency blocks', () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.blocks = [
      { id: 'bc', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] },
      { id: 'bd', type: 'DEPENDENCY', coatendId: 'c2', startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }
    ];
    component.open({ type: 'activity', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-08', endDate: '2026-10-09' });
    expect(component.canSubmit).toBe(true);
    component.blocks[1].coatendId = 'c1';
    expect(component.canSubmit).toBe(false);
  });

  it('should preserve the selected coatend when switching from dependency block to activity', () => {
    component.open({ type: 'block', coatendId: 'c1', startDate: '2026-10-08' });
    component.coatendId = 'c2';
    component.changeRecordType('activity');
    expect(component.request?.coatendId).toBe('c2');
  });

  it('should switch a selected cell to a global block without requiring a developer', () => {
    component.open({ type: 'activity', coatendId: 'c1', startDate: '2026-10-08' });
    component.changeRecordType('block');
    component.endDate = '2026-10-10';
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'block', blockType: 'CORPORATE', startDate: '2026-10-08', endDate: '2026-10-10', coatendId: undefined
    }));
  });

  it('should require a coatend and valid dates for a dependency block', () => {
    component.open({ type: 'block', blockType: 'DEPENDENCY', startDate: '2026-10-08', endDate: '2026-10-10' });
    expect(component.canSubmit).toBe(false);
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.coatendId = 'c1';
    expect(component.canSubmit).toBe(true);
    component.endDate = '2026-10-07';
    expect(component.canSubmit).toBe(false);
  });

  it('should preserve the block ID when editing and not change it into an activity', () => {
    component.open({ type: 'block', blockId: 'b1', blockType: 'CORPORATE', startDate: '2026-10-08', endDate: '2026-10-10' });
    component.changeRecordType('activity');
    expect(component.request?.type).toBe('block');
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ blockId: 'b1', blockType: 'CORPORATE' }));
  });

  it.each([
    ['2026-10-10', 'sábado'],
    ['2026-10-11', 'domingo']
  ])('should warn on %s without blocking activity submission', async (date, weekday) => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.open({
      type: 'activity', coatendId: 'c1', activity: Activity.SWAP,
      startDate: date, endDate: date
    });
    component.includeWeekends = true;
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.planner-weekend-warning').textContent).toContain(weekday);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(false);
    const emit = vi.spyOn(component.submitted, 'emit');
    button.click();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ startDate: date, endDate: date }));
  });

  it('should update the warning when a range spans or stops spanning a weekend', () => {
    component.open({ type: 'activity', startDate: '2026-10-09', endDate: '2026-10-12' });
    component.includeWeekends = true;
    expect(component.activityWeekendWarning).toContain('período inclui');
    component.endDate = '2026-10-09';
    expect(component.activityWeekendWarning).toBe('');
    component.startDate = '2026-10-11';
    component.endDate = '2026-10-11';
    expect(component.activityWeekendWarning).toContain('domingo');
    component.startDate = '2026-10-12';
    component.endDate = '2026-10-12';
    expect(component.activityWeekendWarning).toBe('');
  });

  it('should default to working days and submit the selected inclusion option', async () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.open({ type: 'activity', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-09', endDate: '2026-10-15' });
    expect(component.includeWeekends).toBe(false);
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ includeWeekends: false }));
    component.open({ type: 'activity', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-10', endDate: '2026-10-12' });
    expect(component.canSubmit).toBe(false);
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('[name="includeWeekends"]');
    checkbox.click();
    await fixture.whenStable();
    expect(component.canSubmit).toBe(true);
    component.submit();
    expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ includeWeekends: true }));
  });

  it('should ignore blocks on excluded dates', () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.blocks = [{ id: 'b1', type: 'DEPENDENCY', coatendId: 'c1', startDate: '2026-10-10',
      endDate: '2026-10-12', conflictingActivityIds: [] }];
    component.open({ type: 'activity', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-09', endDate: '2026-10-15' });
    expect(component.canSubmit).toBe(true);
    component.includeWeekends = true;
    expect(component.canSubmit).toBe(false);
  });

  it('should warn when editing a weekend activity but not other planner entities', () => {
    component.open({ type: 'activity', activityId: 'a1', startDate: '2026-10-10', endDate: '2026-10-10' });
    expect(component.activityWeekendWarning).toContain('sábado');
    component.open({ type: 'quarter', startDate: '2026-10-10', endDate: '2026-10-11' });
    expect(component.activityWeekendWarning).toBe('');
  });

  it.each([
    [Activity.HOMOLOGATION, 'Homologação'],
    [Activity.ADMINISTRATIVE_TASKS, 'Administrativo'],
    [Activity.PRE_SWAP, 'Equipe Swap'],
    [Activity.SWAP, 'Equipe Swap']
  ])('should show the predefined executor for %s when creating or editing', async (activity, executor) => {
    for (const activityId of [undefined, 'activity-1']) {
      component.open({ type: 'activity', activityId, coatendId: 'coatend-1' });
      component.developerId = 'developer-1';
      component.onActivityChange(activity);
      fixture.changeDetectorRef.markForCheck();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.developerRequired).toBe(false);
      expect(component.developerId).toBe('');
      expect(component.fixedExecutor).toBe(executor);
      expect(fixture.nativeElement.querySelector('[name="developerId"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[name="startDate"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[name="endDate"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('input[disabled]').value).toBe(executor);
    }
  });

  it.each([Activity.DEVELOPMENT, Activity.TESTING_TU, Activity.PASSAGE_TH])(
    'should require a developer for %s',
    activity => {
      component.open({ type: 'activity', coatendId: 'coatend-1' });
      component.onActivityChange(activity);
      expect(component.developerRequired).toBe(true);
      expect(component.showDeveloperField).toBe(true);
    }
  );

  it('should flag a quarter date range that overlaps an existing quarter', () => {
    const quarter: QuarterSummary = {
      id: 'quarter-1',
      description: 'Quarter 1',
      sprintCount: 0,
      startDate: '2026-01-01',
      endDate: '2026-03-31'
    };

    component.quarters = [quarter];
    component.open({ type: 'quarter' });
    component.startDate = '2026-03-01';
    component.endDate = '2026-04-30';

    expect(component.quarterDateConflict).toBe(true);
  });

  it('should allow a quarter date range that does not overlap existing quarters', () => {
    component.quarters = [{
      id: 'quarter-1',
      description: 'Quarter 1',
      sprintCount: 0,
      startDate: '2026-01-01',
      endDate: '2026-03-31'
    }];
    component.open({ type: 'quarter' });
    component.startDate = '2026-04-01';
    component.endDate = '2026-06-30';

    expect(component.quarterDateConflict).toBe(false);
  });

  it('should flag a sprint date range that overlaps an existing sprint', () => {
    component.sprints = [{
      id: 'sprint-1',
      description: 'Sprint 1',
      coatendsCount: 0,
      startDate: '2026-01-01',
      endDate: '2026-01-15'
    }];
    component.open({ type: 'sprint' });
    component.startDate = '2026-01-15';
    component.endDate = '2026-01-20';

    expect(component.sprintDateConflict).toBe(true);
  });

  it('should allow a sprint date range that does not overlap existing sprints', () => {
    component.sprints = [{
      id: 'sprint-1',
      description: 'Sprint 1',
      coatendsCount: 0,
      startDate: '2026-01-01',
      endDate: '2026-01-15'
    }];
    component.open({ type: 'sprint' });
    component.startDate = '2026-01-16';
    component.endDate = '2026-01-20';

    expect(component.sprintDateConflict).toBe(false);
  });

  it('should allow keeping the dates of the quarter being edited', () => {
    component.quarters = [{
      id: 'quarter-1',
      description: 'Quarter 1',
      sprintCount: 0,
      startDate: '2026-01-01',
      endDate: '2026-03-31'
    }];
    component.open({
      type: 'quarter',
      entityId: 'quarter-1',
      description: 'Quarter 1',
      startDate: '2026-01-01',
      endDate: '2026-03-31'
    });

    expect(component.isEditing).toBe(true);
    expect(component.quarterDateConflict).toBe(false);
    expect(component.description).toBe('Quarter 1');
  });

  it('should prefill the coatend number and allow editing without changing its sprint', () => {
    component.open({
      type: 'coatend',
      entityId: 'coatend-1',
      description: 'Coatend',
      coatendNumber: 42
    });

    expect(component.coatendNumber).toBe(42);
    expect(component.canSubmit).toBe(true);
  });

  it('should ignore the edited sprint but still detect overlaps with another sprint', () => {
    component.sprints = [
      {
        id: 'sprint-1', description: 'Sprint 1', coatendsCount: 0,
        startDate: '2026-01-01', endDate: '2026-01-15'
      },
      {
        id: 'sprint-2', description: 'Sprint 2', coatendsCount: 0,
        startDate: '2026-01-16', endDate: '2026-01-30'
      }
    ];
    component.open({
      type: 'sprint',
      entityId: 'sprint-1',
      description: 'Sprint 1',
      startDate: '2026-01-01',
      endDate: '2026-01-15'
    });

    expect(component.sprintDateConflict).toBe(false);
    component.endDate = '2026-01-16';
    expect(component.sprintDateConflict).toBe(true);
  });
});
