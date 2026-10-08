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
