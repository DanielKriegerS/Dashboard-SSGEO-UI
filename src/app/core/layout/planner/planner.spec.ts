import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Planner } from './planner';
import { DeveloperService } from '../../../services/developer-service';
import { of } from 'rxjs';

describe('Planner', () => {
  let component: Planner;
  let fixture: ComponentFixture<Planner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Planner],
      providers: [{ provide: DeveloperService, useValue: { getAll: () => of([]) } }]
    }).compileComponents();

    fixture = TestBed.createComponent(Planner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  async function renderRow(): Promise<void> {
    fixture.componentRef.setInput('hierarchy', [{
      quarterId: 'q1', quarterDescription: 'Q1',
      sprints: [{
        sprintId: 's1', sprintDescription: 'S1',
        coatends: [{
          coatendId: 'c1', coatendDescription: '1 - Coatend',
          cells: [
            { date: '2026-10-08', entries: [] },
            { date: '2026-10-09', entries: [{
              id: 'a1', activity: 'DEVELOPMENT',
              startDate: '2026-10-09', endDate: '2026-10-12',
              developerId: 'd1', performerName: 'Dev', performerColor: '#123456'
            }] }
          ]
        }]
      }]
    }]);
    await fixture.whenStable();
  }

  it.each([0, 1])('should open creation from cell %s with only its start date', async index => {
    await renderRow();
    const cell: HTMLElement = fixture.nativeElement.querySelectorAll('.planner-day-cell')[index];
    cell.click();
    await fixture.whenStable();

    expect(component.placeholderActions?.request?.activityId).toBeUndefined();
    expect(component.placeholderActions?.request?.coatendId).toBe('c1');
    expect(component.placeholderActions?.startDate).toBe(index === 0 ? '2026-10-08' : '2026-10-09');
    expect(component.placeholderActions?.endDate).toBe('');
  });

  it('should edit the activity without bubbling to cell creation', async () => {
    await renderRow();
    const create = vi.spyOn(component, 'openActivityCreation');
    const entry: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-entry');
    entry.click();
    await fixture.whenStable();

    expect(create).not.toHaveBeenCalled();
    expect(component.placeholderActions?.request?.activityId).toBe('a1');
    expect(component.placeholderActions?.endDate).toBe('2026-10-12');
  });

  it.each(['Enter', ' '])('should allow keyboard creation using %s', async key => {
    await renderRow();
    const cell: HTMLElement = fixture.nativeElement.querySelector('.planner-day-cell');
    cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(component.placeholderActions?.startDate).toBe('2026-10-08');
    expect(component.placeholderActions?.endDate).toBe('');
  });

  it('should not handle activity button key presses as cell creation', async () => {
    await renderRow();
    const create = vi.spyOn(component, 'openActivityCreation');
    const entry: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-entry');
    entry.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(create).not.toHaveBeenCalled();
  });
});
