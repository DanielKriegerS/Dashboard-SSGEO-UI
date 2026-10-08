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
    toggle.click();
    fixture.detectChanges();

    const body: HTMLElement = fixture.nativeElement.querySelector('.display-panel-body');
    expect(body.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(body.hidden).toBe(false);
    expect(component.count).toBe(10);
  });
});
