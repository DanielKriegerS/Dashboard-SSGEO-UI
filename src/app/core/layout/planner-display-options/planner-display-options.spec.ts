import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlannerDisplayOptions } from './planner-display-options';

describe('PlannerDisplayOptions', () => {
  let fixture: ComponentFixture<PlannerDisplayOptions>;
  let component: PlannerDisplayOptions;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannerDisplayOptions]
    }).compileComponents();

    fixture = TestBed.createComponent(PlannerDisplayOptions);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('minDate', '2026-10-01');
    fixture.componentRef.setInput('maxDate', '2026-10-31');
    await fixture.whenStable();
  });

  it('should emit a selected day count', () => {
    const emitted = vi.spyOn(component.selectionApplied, 'emit');
    component.count = 7;
    component.apply();
    expect(emitted).toHaveBeenCalledWith({ type: 'count', count: 7 });
  });

  it('should emit an inclusive selected period', () => {
    const emitted = vi.spyOn(component.selectionApplied, 'emit');
    component.displayType = 'period';
    component.startDate = '2026-10-08';
    component.endDate = '2026-10-14';
    component.apply();
    expect(emitted).toHaveBeenCalledWith({
      type: 'period', startDate: '2026-10-08', endDate: '2026-10-14'
    });
  });

  it.each([0, -1, 1.5])('should reject an invalid day count of %s', count => {
    const emitted = vi.spyOn(component.selectionApplied, 'emit');
    component.count = count;
    component.apply();
    expect(component.validationMessage).not.toBe('');
    expect(emitted).not.toHaveBeenCalled();
  });

  it.each([
    ['', '2026-10-10'],
    ['2026-10-15', '2026-10-10'],
    ['2026-09-30', '2026-10-10'],
    ['2026-10-01', '2026-11-01']
  ])('should reject an unavailable or invalid period %s to %s', (startDate, endDate) => {
    const emitted = vi.spyOn(component.selectionApplied, 'emit');
    component.displayType = 'period';
    component.startDate = startDate;
    component.endDate = endDate;
    component.apply();
    expect(component.validationMessage).not.toBe('');
    expect(emitted).not.toHaveBeenCalled();
  });

  it('should collapse upward without discarding the form values', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.display-panel-toggle');
    component.count = 10;
    const body: HTMLElement = fixture.nativeElement.querySelector('.display-panel-body');
    expect(body.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(body.hidden).toBe(false);
    expect(component.count).toBe(10);
    toggle.click();
    fixture.detectChanges();
    expect(body.hidden).toBe(true);
    expect(component.count).toBe(10);
  });

  it('emits type and completion filters from the same panel without applying a new period', async () => {
    const filters = vi.spyOn(component.filtersChanged, 'emit');
    const dates = vi.spyOn(component.selectionApplied, 'emit');
    fixture.nativeElement.querySelector('.display-panel-toggle').click();
    await fixture.whenStable();
    fixture.nativeElement.querySelectorAll('input[name="plannerType"]')[2].click();
    expect(filters).toHaveBeenLastCalledWith({ type: 'incident', status: 'all' });
    fixture.componentRef.setInput('filters', { type: 'incident', status: 'all' });
    await fixture.whenStable();
    fixture.nativeElement.querySelectorAll('input[name="plannerStatus"]')[2].click();
    expect(filters).toHaveBeenLastCalledWith({ type: 'incident', status: 'completed' });
    expect(dates).not.toHaveBeenCalled();
  });

  it('preserves draft dates when only type or completion changes', async () => {
    component.displayType = 'period';
    component.startDate = '2026-10-08';
    component.endDate = '2026-10-14';
    fixture.componentRef.setInput('filters', { type: 'incident', status: 'open' });
    await fixture.whenStable();
    expect(component.displayType).toBe('period');
    expect(component.startDate).toBe('2026-10-08');
    expect(component.endDate).toBe('2026-10-14');
  });
});
