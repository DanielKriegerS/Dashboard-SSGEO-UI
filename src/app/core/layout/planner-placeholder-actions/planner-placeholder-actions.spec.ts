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

  it('lets period adjustment exclude weekends, count working days and ignore weekend-only blocks', async () => {
    component.coatends = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    component.blocks = [{ id: 'b1', type: 'CORPORATE', coatendId: null,
      startDate: '2026-10-24', endDate: '2026-10-25', conflictingActivityIds: [] }];
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.SWAP,
      startDate: '2026-10-23', endDate: '2026-10-27' });
    component.changeActivityEditMode('resize');
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[name="includeWeekends"]')).toBeTruthy();
    expect(component.includeWeekends).toBe(true);
    expect(component.canSubmit).toBe(false);
    component.includeWeekends = false;
    expect(component.canSubmit).toBe(true);
    expect(component.activityDurationDays).toBe(3);
    expect(component.activityWeekendWarning).toBe('');
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      activityId: 'a1', includeWeekends: false, startDate: '2026-10-23', endDate: '2026-10-27'
    }));
  });

  it.each([undefined, 'a1'])('keeps the end on the start date when same-day is selected for %s', activityId => {
    component.open({ type: 'activity', activityId, startDate: '2026-10-19', endDate: '2026-10-23' });
    if (activityId) component.changeActivityEditMode('resize');
    component.sameDay = true;
    expect(component.endDate).toBe('2026-10-19');
    component.startDate = '2026-10-20';
    expect(component.endDate).toBe('2026-10-20');
    component.sameDay = false;
    expect(component.endDate).toBe('2026-10-23');
    component.close();
    component.open({ type: 'activity' });
    expect(component.sameDay).toBe(false);
  });

  it.each([
    ['2026-10-19', '2026-10-19', '2026-10-20', '2026-10-20', 1],
    ['2026-10-19', '2026-10-21', '2026-10-30', '2026-11-01', 3],
    ['2028-02-28', '2028-02-29', '2028-02-29', '2028-03-01', 2]
  ])('moves %s through %s to %s with the same inclusive duration', (start, end, target, expectedEnd, duration) => {
    component.coatends = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: start, endDate: end });
    component.startDate = target;
    component.endDate = '2026-12-31';
    expect(component.isMovingActivity).toBe(true);
    expect(component.endDate).toBe(expectedEnd);
    expect(component.activityDurationDays).toBe(duration);
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT, developerId: 'd1',
      startDate: target, endDate: expectedEnd
    }));
  });

  it('adjusts duration explicitly and restores the original duration when switching back to move', () => {
    component.coatends = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-19', endDate: '2026-10-19' });
    component.changeActivityEditMode('resize');
    component.endDate = '2026-10-20';
    expect(component.activityDurationDays).toBe(2);
    component.changeActivityEditMode('move');
    component.startDate = '2026-10-20';
    expect(component.endDate).toBe('2026-10-20');
    expect(component.activityDurationDays).toBe(1);
    component.changeActivityEditMode('resize');
    component.endDate = '2026-10-22';
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      activityId: 'a1', startDate: '2026-10-20', endDate: '2026-10-22'
    }));
  });

  it('checks blocks across the entire computed destination and rejects an empty start', () => {
    component.coatends = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    component.blocks = [{ id: 'bc1', type: 'CORPORATE', coatendId: null,
      startDate: '2026-10-21', endDate: '2026-10-21', conflictingActivityIds: [] }];
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-19', endDate: '2026-10-20' });
    expect(component.canSubmit).toBe(true);
    component.startDate = '2026-10-20';
    expect(component.endDate).toBe('2026-10-21');
    expect(component.blockingActivityBlocks.map(block => block.id)).toEqual(['bc1']);
    expect(component.canSubmit).toBe(false);
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).not.toHaveBeenCalled();
    component.startDate = '';
    expect(component.endDate).toBe('');
    expect(component.canSubmit).toBe(false);
  });

  it('restores the original activity and developer when returning to move', () => {
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-19', endDate: '2026-10-19' });
    component.changeActivityEditMode('resize');
    component.onActivityChange(Activity.SWAP);
    component.changeActivityEditMode('move');
    expect(component.activity).toBe(Activity.DEVELOPMENT);
    expect(component.developerId).toBe('d1');
  });

  it('distinguishes moving and resizing visually without exposing duplication', async () => {
    component.coatends = [{ id: 'c1', description: 'Coatend', coatendNumber: 8681 }];
    component.open({ type: 'activity', activityId: 'a1', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-19', endDate: '2026-10-19' });
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('h2')?.textContent).toBe('Mover atividade');
    expect(host.querySelector<HTMLInputElement>('input[name="endDate"]')?.readOnly).toBe(true);
    expect(host.querySelector<HTMLSelectElement>('select[name="activity"]')?.disabled).toBe(true);
    expect(host.querySelector<HTMLSelectElement>('select[name="developerId"]')?.disabled).toBe(true);
    expect(host.textContent).not.toContain('Duplicar');
    host.querySelector<HTMLInputElement>('input[value="resize"]')!.click();
    await fixture.whenStable();
    expect(host.querySelector('h2')?.textContent).toBe('Ajustar período');
    expect(host.querySelector<HTMLInputElement>('input[name="endDate"]')?.readOnly).toBe(false);
    expect(host.querySelector<HTMLSelectElement>('select[name="activity"]')?.disabled).toBe(false);
    expect(host.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Aplicar período');
    component.close();
    component.open({ type: 'activity', activityId: 'a2', startDate: '2026-10-21', endDate: '2026-10-21' });
    expect(component.activityEditMode()).toBe('move');
  });

  it('should require choosing an existing sprint without asking to register another', async () => {
    component.sprints = [
      { id: 's1', description: 'Sprint 1', coatendsCount: 0, startDate: '2026-10-01', endDate: '2026-10-15' },
      { id: 's2', description: 'Sprint 2', coatendsCount: 0, startDate: '2026-10-16', endDate: '2026-10-31' }
    ];
    component.open({ type: 'coatend' });
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(component.sprintId).toBe('');
    expect(component.canSubmit).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Cadastre uma Sprint');
    expect(fixture.nativeElement.querySelector('select[name="sprintId"]').options.length).toBe(3);
    component.sprintId = 's2';
    expect(component.canSubmit).toBe(true);
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

  it('should reject non-swap activities through corporate blocks but allow other dependency coatends', () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.blocks = [
      { id: 'bc', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] },
      { id: 'bd', type: 'DEPENDENCY', coatendId: 'c2', startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }
    ];
    component.open({ type: 'activity', coatendId: 'c1', activity: Activity.DEVELOPMENT,
      developerId: 'd1', startDate: '2026-10-08', endDate: '2026-10-09' });
    expect(component.canSubmit).toBe(false);
    component.blocks = [component.blocks[1]];
    expect(component.canSubmit).toBe(true);
    component.blocks[0].coatendId = 'c1';
    expect(component.canSubmit).toBe(false);
  });

  it('should allow dependency blocks over activities and submit removal to the backend', async () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.timeline = [{ id: 'a1', coatendId: 'c1', activity: Activity.HOMOLOGATION,
      startDate: '2026-10-09', endDate: '2026-10-09', performerName: 'TH', performerColor: '#123456' }];
    component.open({ type: 'block', blockType: 'DEPENDENCY', coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10' });
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(component.canSubmit).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ blockType: 'DEPENDENCY', coatendId: 'c1' }));
    expect(component.request).toBeNull();
  });

  it('should enable corporate submission over dependency and activities without removing source records', async () => {
    component.blocks = [{ id: 'bd', type: 'DEPENDENCY', coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }];
    component.timeline = [{ id: 'a1', coatendId: 'c1', activity: Activity.HOMOLOGATION,
      startDate: '2026-10-09', endDate: '2026-10-09', performerName: 'TH', performerColor: '#123456' }];
    component.open({ type: 'block', blockType: 'CORPORATE',
      startDate: '2026-10-08', endDate: '2026-10-10' });
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(component.canSubmit).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    const emit = vi.spyOn(component.submitted, 'emit');
    component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ blockType: 'CORPORATE' }));
    expect(component.timeline).toHaveLength(1);
    expect(component.blocks).toHaveLength(1);
  });

  it('should exclude its own block when editing but preserve a previously assigned block', () => {
    component.coatends = [{ id: 'c1', description: 'Test', coatendNumber: 1 }];
    component.blocks = [{ id: 'b1', type: 'CORPORATE', coatendId: null,
      startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: [] }];
    component.open({ type: 'block', blockType: 'DEPENDENCY', coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-10' });
    expect(component.canSubmit).toBe(false);
    component.open({ type: 'block', blockId: 'b1', blockType: 'CORPORATE',
      startDate: '2026-10-08', endDate: '2026-10-10' });
    expect(component.canSubmit).toBe(true);
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
