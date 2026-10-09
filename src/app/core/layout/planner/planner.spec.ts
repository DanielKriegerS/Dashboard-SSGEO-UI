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

  it('should create a global block directly without planning structures', async () => {
    fixture.componentRef.setInput('days', ['2026-10-08']);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-block-toolbar button');
    button.click();
    expect(component.placeholderActions?.request).toEqual({ type: 'block', startDate: '2026-10-08' });
  });

  it('should list blocks outside the visible period and open them for editing', async () => {
    const block = { id: 'b1', type: 'DEPENDENCY' as const, coatendId: 'c1', startDate: '2027-01-01',
      endDate: '2027-01-02', conflictingActivityIds: ['a1'] };
    fixture.componentRef.setInput('blocks', [block, { ...block, id: 'b2' }]);
    fixture.componentRef.setInput('coatends', [{ id: 'c1', coatendNumber: 42, description: 'Test' }]);
    await fixture.whenStable();
    expect(component.conflictingActivityCount).toBe(1);
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-block-toolbar button:nth-child(2)');
    toggle.click();
    await fixture.whenStable();
    const list: HTMLElement = fixture.nativeElement.querySelector('#planner-block-list');
    expect(list.hidden).toBe(false);
    const button: HTMLButtonElement = list.querySelector('button')!;
    expect(button.textContent).toContain('42 - Test');
    button.click();
    expect(component.placeholderActions?.request?.blockId).toBe('b1');
    expect(component.placeholderActions?.startDate).toBe('2027-01-01');
  });

  it('should render and edit global blocks in the structured add-coatend row', async () => {
    fixture.componentRef.setInput('mode', 'structured');
    fixture.componentRef.setInput('blocks', [{
      id: 'b1', type: 'CORPORATE', coatendId: null, startDate: '2026-10-08',
      endDate: '2026-10-09', conflictingActivityIds: []
    }]);
    await renderRow();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('tr.planner-placeholder-row .planner-block-entry');
    expect(button.textContent).toContain('BC');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tr.planner-placeholder-row .planner-block-entry')).toBe(button);
    const create = vi.spyOn(component, 'openActivityCreation');
    button.click();
    expect(create).not.toHaveBeenCalled();
    expect(component.placeholderActions?.request?.blockId).toBe('b1');
    expect(component.placeholderActions?.request?.coatendId).toBeUndefined();
  });

  it('should edit a global block without turning it into an activity', () => {
    component.openActivityEditor({ id: 'b1', activity: '', blockType: 'CORPORATE', startDate: '2026-10-08',
      endDate: '2026-10-10', performerName: 'Corporate', performerColor: '#334155' }, 'c1');
    expect(component.placeholderActions?.request).toEqual(expect.objectContaining({
      type: 'block', blockId: 'b1', blockType: 'CORPORATE', coatendId: undefined
    }));
    expect(component.placeholderActions?.request?.activityId).toBeUndefined();
  });

  it('should identify blocks and conflicting activities independently', () => {
    const entry = { id: 'a1', activity: 'SWAP', startDate: '2026-10-08', endDate: '2026-10-10',
      performerName: 'Swap', performerColor: '#dc3545', hasConflict: true };
    expect(component.entryLabel(entry)).toBe('Sw');
    expect(component.entryTitle(entry)).toContain('conflito com bloqueio');
    expect(component.entryLabel({ ...entry, blockType: 'CORPORATE' })).toBe('BC');
    expect(component.entryLabel({ ...entry, blockType: 'DEPENDENCY' })).toBe('BD');
  });

  async function renderRow(days = ['2026-10-08', '2026-10-09']): Promise<void> {
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('hierarchy', [{
      quarterId: 'q1', quarterDescription: 'Q1',
      sprints: [{
        sprintId: 's1', sprintDescription: 'S1',
        coatends: [{
          coatendId: 'c1', coatendDescription: '1 - Coatend',
          cells: [
            { date: days[0], entries: [] },
            { date: days[1], entries: [{
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

  it.each(['empty', 'partial', 'structured'])('should mark weekend headers and occupied or empty cells in %s mode', async mode => {
    fixture.componentRef.setInput('mode', mode);
    await renderRow(['2026-10-10', '2026-10-11']);
    const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.planner-day-header'));
    expect(headers.map(header => header.querySelector('.planner-weekend-label')?.textContent))
      .toEqual(['Sábado', 'Domingo']);
    expect(headers.every(header => header.classList.contains('planner-weekend-header'))).toBe(true);
    const cells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.planner-day-cell'));
    expect(cells.every(cell => cell.classList.contains('planner-weekend-cell'))).toBe(true);
    expect(cells.length).toBe(mode === 'structured' ? 4 : 2);
    cells[0].click();
    await fixture.whenStable();
    expect(component.placeholderActions?.startDate).toBe('2026-10-10');
    expect(component.placeholderActions?.includeWeekends).toBe(false);
    expect(component.placeholderActions?.activityWeekendWarning).toBe('');
    component.placeholderActions!.includeWeekends = true;
    expect(component.placeholderActions?.activityWeekendWarning).toContain('sábado');
  });

  it('should not mark weekdays as weekends', async () => {
    await renderRow();
    expect(fixture.nativeElement.querySelector('.planner-weekend-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.planner-weekend-cell')).toBeNull();
  });

  it('should keep the structured weekend placeholder row clickable', async () => {
    fixture.componentRef.setInput('mode', 'structured');
    await renderRow(['2026-10-10', '2026-10-11']);
    const cell: HTMLElement = fixture.nativeElement.querySelectorAll('.planner-day-cell')[3];
    cell.click();
    await fixture.whenStable();
    expect(component.placeholderActions?.startDate).toBe('2026-10-11');
    expect(component.placeholderActions?.includeWeekends).toBe(false);
    expect(component.placeholderActions?.activityWeekendWarning).toBe('');
    component.placeholderActions!.includeWeekends = true;
    expect(component.placeholderActions?.activityWeekendWarning).toContain('domingo');
  });
});
