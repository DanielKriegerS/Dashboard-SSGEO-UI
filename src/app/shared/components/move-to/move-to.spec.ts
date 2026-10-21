import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoveTo } from './move-to';

describe('MoveTo', () => {
  let component: MoveTo;
  let fixture: ComponentFixture<MoveTo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveTo],
    }).compileComponents();

    fixture = TestBed.createComponent(MoveTo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts collapsed in page flow and disables moving without a destination', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('details')?.open).toBe(false);
    expect(element.querySelector('.position-fixed')).toBeNull();
    expect(element.querySelector('button')?.disabled).toBe(true);
    expect(element.querySelector('select')?.getAttribute('aria-label')).toBe('Mover para');
  });

  it('moves only to the selected destination and clears the selection', () => {
    component.moveFn = vi.fn();
    component.submit();
    expect(component.moveFn).not.toHaveBeenCalled();
    component.selectedId = 'sprint-2';
    component.submit();
    expect(component.moveFn).toHaveBeenCalledWith('sprint-2');
    expect(component.selectedId).toBe('');
  });
});
