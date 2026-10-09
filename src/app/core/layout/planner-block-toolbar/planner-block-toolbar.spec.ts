import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlannerBlockToolbar } from './planner-block-toolbar';

describe('PlannerBlockToolbar', () => {
  let component: PlannerBlockToolbar;
  let fixture: ComponentFixture<PlannerBlockToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlannerBlockToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(PlannerBlockToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request global block creation without planning structures', () => {
    const requested = vi.spyOn(component.blockCreationRequested, 'emit');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-block-toolbar button');
    button.click();
    expect(requested).toHaveBeenCalledExactlyOnceWith();
  });

  it('should list blocks independently of the visible period and request editing', async () => {
    const block = { id: 'b1', type: 'DEPENDENCY' as const, coatendId: 'c1', startDate: '2027-01-01',
      endDate: '2027-01-02', conflictingActivityIds: ['a1'] };
    fixture.componentRef.setInput('blocks', [block, { ...block, id: 'b2' }]);
    fixture.componentRef.setInput('coatends', [{ id: 'c1', coatendNumber: 42, description: 'Test' }]);
    await fixture.whenStable();
    expect(component.conflictingActivityCount).toBe(1);
    const notice: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(notice.textContent).toContain('1 atividade(s)');
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-block-toolbar button:nth-child(2)');
    const list: HTMLElement = fixture.nativeElement.querySelector('#planner-block-list');
    expect(list.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(list.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const button: HTMLButtonElement = list.querySelector('button')!;
    expect(button.textContent).toContain('42 - Test');
    const requested = vi.spyOn(component.blockEditionRequested, 'emit');
    button.click();
    expect(requested).toHaveBeenCalledExactlyOnceWith(block);
  });
});
