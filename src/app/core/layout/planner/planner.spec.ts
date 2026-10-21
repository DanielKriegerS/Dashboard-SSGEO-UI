import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Planner } from './planner';
import { DeveloperService } from '../../../services/developer-service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('Planner', () => {
  let component: Planner;
  let fixture: ComponentFixture<Planner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Planner],
      providers: [provideRouter([]), { provide: DeveloperService, useValue: { getAll: () => of([]) } }]
    }).compileComponents();

    fixture = TestBed.createComponent(Planner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a single Sprint add action after the last header and no hyphen in date gaps', async () => {
    fixture.componentRef.setInput('days', ['2026-10-23', '2026-10-24', '2026-10-26']);
    fixture.componentRef.setInput('sprints', [{ id: 's1', description: 'S1' }, { id: 's2', description: 'S2' }]);
    fixture.componentRef.setInput('sprintHeaders', [
      { id: 's1', description: 'S1', colspan: 1 },
      { id: '__empty__', description: '', colspan: 1 },
      { id: 's2', description: 'S2', colspan: 1 }
    ]);
    await fixture.whenStable();
    const headers: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('.planner-sprint-header');
    expect(headers[0].querySelector('[aria-label="Adicionar Sprint"]')).toBeNull();
    expect(headers[1].textContent?.trim()).toBe('');
    expect(headers[2].querySelector('[aria-label="Adicionar Sprint"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Adicionar Sprint"]')).toHaveLength(1);
    const open = vi.spyOn(component, 'openPlaceholder');
    headers[2].querySelector<HTMLButtonElement>('[aria-label="Adicionar Sprint"]')!.click();
    expect(open).toHaveBeenCalledWith({ type: 'sprint' });
  });

  it('does not put the add action after S1 when the last registered Sprint is outside the window', async () => {
    fixture.componentRef.setInput('sprints', [
      { id: 's6', description: 'S6', endDate: '2026-12-31' },
      { id: 's1', description: 'S1', endDate: '2026-10-23' }
    ]);
    fixture.componentRef.setInput('days', ['2026-10-23']);
    fixture.componentRef.setInput('sprintHeaders', [{ id: 's1', description: 'S1', colspan: 1 }]);
    await fixture.whenStable();
    expect(component.lastSprintId).toBe('s6');
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Adicionar Sprint"]')).toHaveLength(0);
    fixture.componentRef.setInput('sprintHeaders', [{ id: 's6', description: 'S6', colspan: 1 }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Adicionar Sprint"]')).toHaveLength(1);
  });

  it('renders continuous phase bars with server estimates, no summary column and clipped inclusive dates', async () => {
    const phase = { plannedStart: '2026-10-08', plannedEnd: '2026-10-10', effectiveStart: null,
      confirmedAt: null, confirmed: false, estimatedPercent: 100, unavailableReasons: [], limitations: [] };
    fixture.componentRef.setInput('days', ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-16', '2026-10-17']);
    fixture.componentRef.setInput('featurePlanning', [{ id: 'f1', name: 'Entrega', description: null,
      referenceDate: '2026-10-09', zone: 'America/Sao_Paulo', development: phase,
      homologation: { ...phase, plannedStart: '2026-10-12', plannedEnd: '2026-10-15', estimatedPercent: null, unavailableReasons: ['MISSING_WEIGHT'] },
      coatends: [], warnings: [], pendingCoatendCount: 0 }]);
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('.planner-feature-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('100%');
    expect(rows[0].querySelector('.planner-feature-development .planner-feature-name').textContent.trim()).toBe('Desenvolvimento + TU');
    expect(rows[0].querySelector('.planner-feature-homologation .planner-feature-name').textContent.trim()).toBe('Homologação');
    expect(rows[0].querySelector('th').textContent.trim()).toBe('Entrega');
    expect(rows[0].textContent).toContain('Indisponivel');
    expect(rows[0].querySelector('.planner-feature-development').colSpan).toBe(2);
    expect(rows[0].querySelector('.planner-feature-homologation').colSpan).toBe(2);
    expect(rows[0].querySelector('.planner-feature-development a').title).toContain('Nao confirmado');
    expect(rows[0].querySelector('.planner-feature-homologation a').title).toContain('Peso nao informado');
    expect(rows[0].querySelector('a').getAttribute('href')).toBe('/admin/features/f1');
    const cells: HTMLTableCellElement[] = Array.from(rows[0].querySelectorAll('td'));
    expect(cells.reduce((total, cell) => total + cell.colSpan, 0)).toBe(7);
    expect(cells.filter(cell => !cell.querySelector('a')).every(cell => cell.colSpan === 1)).toBe(true);
  });

  it('keeps distinct named rows for visible, future and unplanned Features without inventing bars', async () => {
    fixture.componentRef.setInput('days', ['2026-10-09']);
    const phase = { plannedStart: '2026-11-01', plannedEnd: '2026-11-03', effectiveStart: null,
      confirmedAt: null, confirmed: false, estimatedPercent: 0, unavailableReasons: [], limitations: [] };
    const future = { id: 'f1', name: 'Futura', description: null, referenceDate: '2026-10-09',
      zone: 'America/Sao_Paulo', development: phase, homologation: { ...phase, plannedStart: null, plannedEnd: null },
      coatends: [], warnings: [], pendingCoatendCount: 0 };
    fixture.componentRef.setInput('featurePlanning', [
      { ...future, id: 'f0', name: 'Atual', development: { ...phase, plannedStart: '2026-10-09', plannedEnd: '2026-10-09' } },
      future,
      { ...future, id: 'f2', name: 'Sem previsao', development: { ...phase, plannedStart: null, plannedEnd: null } }
    ]);
    await fixture.whenStable();
    const rows: HTMLTableRowElement[] = Array.from(fixture.nativeElement.querySelectorAll('.planner-feature-row'));
    expect(rows.map(row => row.querySelector('th')?.textContent?.trim())).toEqual(['Atual', 'Futura', 'Sem previsao']);
    expect(rows[0].querySelectorAll('.planner-feature-phase')).toHaveLength(1);
    expect(rows[1].querySelectorAll('.planner-feature-phase')).toHaveLength(0);
    expect(rows[2].querySelectorAll('.planner-feature-phase')).toHaveLength(0);
    expect(rows[1].querySelector('th a')?.getAttribute('href')).toBe('/admin/features/f1');
    expect(component.featureRows()).toHaveLength(3);
    expect(phase.plannedStart).toBe('2026-11-01');
  });

  it('renders persistent milestone details without hiding activity cells', async () => {
    await renderRow();
    const id = component.hierarchy[0].sprints[0].coatends[0].coatendId;
    fixture.componentRef.setInput('milestoneWarnings', [{ coatendId: id, coatendNumber: 1,
      description: 'Coatend', milestone: 'TU', code: 'CONFIRMATION_PENDING', plannedEnd: '2026-10-08',
      closedWorkingDaysPastDue: 1, unavailableReason: null }]);
    await fixture.whenStable();
    const details = fixture.nativeElement.querySelector('.planner-milestone-warning');
    expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent.trim()).toBe('!');
    expect(details.querySelector('summary').getAttribute('aria-label')).toContain('1 aviso');
    expect(details.textContent).toContain('confirmacao pendente');
    expect(fixture.nativeElement.querySelectorAll('.planner-entry').length).toBeGreaterThan(0);
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

  it('renders one global add-Coatend action after all Sprints, including an empty Sprint', async () => {
    fixture.componentRef.setInput('mode', 'structured');
    await renderRow();
    const quarter = component.hierarchy[0];
    const sprint = quarter.sprints[0];
    fixture.componentRef.setInput('hierarchy', [{ ...quarter, sprints: [sprint,
      { ...sprint, sprintId: 's2', coatends: sprint.coatends.map(row => ({ ...row, coatendId: 'c2' })) },
      { ...sprint, sprintId: 's3', coatends: [{ coatendId: null, coatendDescription: '', isPlaceholder: true, cells: sprint.coatends[0].cells }] }
    ] }]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.planner-coatend-cell .planner-add-placeholder');
    expect(buttons).toHaveLength(1);
    expect(element.querySelector('tbody tr:last-child')?.classList.contains('planner-placeholder-row')).toBe(true);
    buttons[0].click();
    expect(component.placeholderActions?.request?.type).toBe('coatend');
    expect(component.placeholderActions?.request?.sprintId).toBeUndefined();
  });

  it('should identify blocks and conflicting activities independently', () => {
    const entry = { id: 'a1', activity: 'SWAP', startDate: '2026-10-08', endDate: '2026-10-10',
      performerName: 'Swap', performerColor: '#dc3545', hasConflict: true };
    expect(component.entryLabel(entry)).toBe('Sw');
    expect(component.entryTitle(entry)).toContain('conflito com bloqueio');
    expect(component.entryLabel({ ...entry, blockType: 'CORPORATE' })).toBe('BC');
    expect(component.entryLabel({ ...entry, blockType: 'DEPENDENCY' })).toBe('BD');
  });

  it('should render only the highest priority entry and reveal preserved records outside corporate dates', async () => {
    await renderRow();
    const cell = component.hierarchy[0].sprints[0].coatends[0].cells[1];
    cell.entries.push({ id: 'bd', activity: '', blockType: 'DEPENDENCY', startDate: '2026-10-09',
      endDate: '2026-10-09', performerName: 'Dependency', performerColor: '#b91c1c' });
    cell.entries.push({ id: 'bc', activity: '', blockType: 'CORPORATE', startDate: '2026-10-09',
      endDate: '2026-10-09', performerName: 'Corporate', performerColor: '#334155' });
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.planner-entry')).toHaveLength(1);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.planner-entry');
    expect(button.textContent.trim()).toBe('BC');
    button.click();
    expect(component.placeholderActions?.request?.blockId).toBe('bc');
    expect(cell.entries).toHaveLength(3);
    cell.entries = cell.entries.filter(entry => entry.id !== 'bc');
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.planner-entry').textContent.trim()).toBe('BD');
    cell.entries = cell.entries.filter(entry => entry.id !== 'bd');
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.planner-entry').textContent.trim()).toBe('De');
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

  it.each(['empty', 'partial', 'structured'])('should mark holidays and keep their cells clickable in %s mode', async mode => {
    fixture.componentRef.setInput('mode', mode);
    await renderRow(['2026-10-12', '2026-10-13']);
    const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.planner-day-header'));
    expect(headers[0].classList.contains('planner-weekend-header')).toBe(true);
    expect(headers[0].querySelector('.planner-weekend-label')?.textContent).toBe('Feriado');
    expect(headers[0].title).toBe('Nossa Senhora Aparecida');
    expect(headers[1].classList.contains('planner-weekend-header')).toBe(false);
    const cells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.planner-day-cell'));
    expect(cells[0].classList.contains('planner-weekend-cell')).toBe(true);
    expect(cells[0].getAttribute('aria-label')).toContain('Feriado');
    expect(cells[1].classList.contains('planner-weekend-cell')).toBe(false);
    if (mode === 'structured') {
      expect(cells[2].classList.contains('planner-weekend-cell')).toBe(true);
    }
    cells[0].click();
    await fixture.whenStable();
    expect(component.placeholderActions?.startDate).toBe('2026-10-12');
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
