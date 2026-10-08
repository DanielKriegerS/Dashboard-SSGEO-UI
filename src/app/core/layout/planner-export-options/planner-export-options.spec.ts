import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlannerExportOptions } from './planner-export-options';

describe('PlannerExportOptions', () => {
  let component: PlannerExportOptions;
  let fixture: ComponentFixture<PlannerExportOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PlannerExportOptions] }).compileComponents();
    fixture = TestBed.createComponent(PlannerExportOptions);
    component = fixture.componentInstance;
    component.quarters = [{ id: 'q1', description: 'Q1', sprintCount: 1 }];
    component.sprints = [{ id: 's1', description: 'S1', coatendsCount: 1 }];
    component.open({ type: 'count', count: 7 }, ['2026-10-08', '2026-10-09']);
    await fixture.whenStable();
  });

  it('should populate count from the applied display selection', () => {
    expect(component.mode).toBe('COUNT');
    expect(component.count).toBe(7);
    expect(component.startDate).toBe('2026-10-08');
  });

  it('should populate period from the current page and not mutate the display', () => {
    const selection = { type: 'period' as const, startDate: '2026-10-01', endDate: '2026-10-02' };
    component.open(selection, ['2026-10-08', '2026-10-09']);
    expect(component.mode).toBe('PERIOD');
    expect(component.startDate).toBe('2026-10-08');
    expect(component.endDate).toBe('2026-10-09');
    expect(selection.startDate).toBe('2026-10-01');
  });

  it.each(['COUNT', 'PERIOD', 'QUARTER', 'SPRINT'] as const)('should submit only fields for %s', mode => {
    component.mode = mode;
    const emit = vi.spyOn(component.exportRequested, 'emit');
    component.submit();
    const expected = {
      COUNT: { mode: 'COUNT', startDate: '2026-10-08', count: 7 },
      PERIOD: { mode: 'PERIOD', startDate: '2026-10-08', endDate: '2026-10-09' },
      QUARTER: { mode: 'QUARTER', quarterId: 'q1' },
      SPRINT: { mode: 'SPRINT', sprintId: 's1' }
    };
    expect(emit).toHaveBeenCalledExactlyOnceWith(expected[mode]);
  });

  it.each([0, -1, 1.5, 16384])('should reject invalid day count %s', count => {
    component.count = count;
    const emit = vi.spyOn(component.exportRequested, 'emit');
    component.submit();
    expect(component.validationMessage).not.toBe('');
    expect(emit).not.toHaveBeenCalled();
  });

  it('should enforce the inclusive XLSX day limit for periods', () => {
    component.mode = 'PERIOD';
    component.startDate = '2026-10-08';
    component.endDate = new Date(Date.parse(component.startDate) + 16382 * 86400000).toISOString().substring(0, 10);
    expect(component.validationMessage).toBe('');
    component.endDate = new Date(Date.parse(component.startDate) + 16383 * 86400000).toISOString().substring(0, 10);
    expect(component.validationMessage).not.toBe('');
  });

  it.each(['', '2026-10-07', '2026-02-30'])('should reject invalid period end %s', endDate => {
    component.mode = 'PERIOD';
    component.endDate = endDate;
    const emit = vi.spyOn(component.exportRequested, 'emit');
    component.submit();
    expect(emit).not.toHaveBeenCalled();
  });

  it.each(['QUARTER', 'SPRINT'] as const)('should not export %s with a missing selection', mode => {
    component.mode = mode;
    component.quarterId = '';
    component.sprintId = '';
    const emit = vi.spyOn(component.exportRequested, 'emit');
    component.submit();
    expect(emit).not.toHaveBeenCalled();
  });

  it('should prevent duplicate submission and closing while exporting', async () => {
    fixture.componentRef.setInput('exporting', true);
    await fixture.whenStable();
    const emit = vi.spyOn(component.exportRequested, 'emit');
    component.submit();
    component.close();
    expect(emit).not.toHaveBeenCalled();
    expect(component.opened).toBe(true);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Exportando...');
  });
});
