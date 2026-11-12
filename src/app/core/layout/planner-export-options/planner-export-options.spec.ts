import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlannerExportOptions } from './planner-export-options';

describe('PlannerExportOptions', () => {
  let component: PlannerExportOptions;
  let fixture: ComponentFixture<PlannerExportOptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PlannerExportOptions] }).compileComponents();
    fixture = TestBed.createComponent(PlannerExportOptions);
    component = fixture.componentInstance;
    component.quarters = [{ id: 'q1', description: 'Q1', sprintCount: 1, startDate: '2026-01-01T00:00:00' }];
    component.sprints = [{ id: 's1', description: 'S1', coatendsCount: 1, quarterId: 'q1', startDate: '2026-01-01T00:00:00' }];
    component.open({ type: 'count', count: 7 }, ['2026-10-08', '2026-10-09']);
    await fixture.whenStable();
  });

  it('should populate count from the applied display selection', () => {
    expect(component.mode).toBe('COUNT');
    expect(component.count).toBe(7);
    expect(component.startDate).toBe('2026-10-08');
  });

  it('returns to the chooser without exporting a file', () => {
    const back = vi.spyOn(component.backRequested, 'emit');
    const exported = vi.spyOn(component.exportRequested, 'emit');
    component.returnToGenerationOptions();
    expect(component.opened).toBe(false);
    expect(back).toHaveBeenCalledOnce();
    expect(exported).not.toHaveBeenCalled();
  });

  it('blocks returning while choosing a destination or exporting', () => {
    const back = vi.spyOn(component.backRequested, 'emit');
    component.choosingDestination.set(true);
    component.returnToGenerationOptions();
    expect(component.opened).toBe(true);
    component.choosingDestination.set(false);
    component.exporting = true;
    component.returnToGenerationOptions();
    expect(component.opened).toBe(true);
    expect(back).not.toHaveBeenCalled();
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
    const names = {
      COUNT: 'planner_2026-10-08_7-dias.xlsx', PERIOD: 'planner_2026-10-08_2026-10-09.xlsx',
      QUARTER: 'planner_Q1_2026.xlsx', SPRINT: 'planner_S1_Q1_2026.xlsx'
    };
    expect(emit).toHaveBeenCalledExactlyOnceWith({ request: expected[mode], destination: null, fileName: names[mode] });
  });

  it('should let the user choose a destination file', async () => {
    const destination = { name: 'relatorio.xlsx', createWritable: vi.fn() };
    const picker = vi.fn().mockResolvedValue(destination);
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker });
    try {
      await component.chooseDownloadPath();
      expect(component.destination).toBe(destination);
      expect(picker).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ suggestedName: 'planner_2026-10-08_7-dias.xlsx' }));
    } finally {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
    }
  });

  it('does not request export when the destination picker is cancelled', async () => {
    const picker = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker });
    try {
      const emit = vi.spyOn(component.exportRequested, 'emit');
      await component.submit();
      expect(picker).toHaveBeenCalledOnce();
      expect(emit).not.toHaveBeenCalled();
      expect(component.opened).toBe(true);
      expect(component.choosingDestination()).toBe(false);
      expect(component.destinationError).toBe('');
    } finally {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
    }
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

  it('disambiguates repeated quarters and sprints using the actual parent quarter and its year', async () => {
    component.quarters.push({ id: 'q1-next', description: 'Q1', sprintCount: 1, startDate: '2027-01-01T00:00:00' });
    component.sprints.push({ id: 's1-next', description: 'S1', coatendsCount: 1, quarterId: 'q1-next', startDate: '2026-12-31T23:00:00' });
    const modeSelect = fixture.nativeElement.querySelector('[name="mode"]') as HTMLSelectElement;
    modeSelect.value = 'QUARTER';
    modeSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(Array.from(fixture.nativeElement.querySelectorAll('[name="quarterId"] option') as NodeListOf<HTMLOptionElement>)
      .map(option => option.textContent)).toEqual(['Selecione um Quarter', 'Q1 | 2026', 'Q1 | 2027']);
    modeSelect.value = 'SPRINT';
    modeSelect.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(Array.from(fixture.nativeElement.querySelectorAll('[name="sprintId"] option') as NodeListOf<HTMLOptionElement>)
      .map(option => option.textContent)).toEqual(['Selecione uma Sprint', 'S1 | Q1 | 2026', 'S1 | Q1 | 2027']);
  });

  it('marks missing quarter or date explicitly instead of guessing the current year', () => {
    expect(component.quarterLabel({ id: 'empty', description: 'Q1', sprintCount: 0 })).toBe('Q1 | Ano não informado');
    expect(component.sprintLabel({ id: 'orphan', description: 'S1', coatendsCount: 0, startDate: '2025-12-01' }))
      .toBe('S1 | Sem Quarter | 2025');
  });

  it.each(['Relatório equipe', 'Relatório equipe.xlsx', 'Relatório equipe.XLSX'])('exports a custom file name and preserves XLSX extension (%s)', async name => {
    component.fileName = name;
    const emit = vi.spyOn(component.exportRequested, 'emit');
    await component.submit();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'Relatório equipe.xlsx' }));
  });

  it('uses the edited name in the native save dialog', async () => {
    component.fileName = 'Entrega novembro';
    const picker = vi.fn().mockResolvedValue({ name: 'Outro nome.xlsx', createWritable: vi.fn() });
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker });
    try {
      await component.submit();
      expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: 'Entrega novembro.xlsx' }));
    } finally {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
    }
  });

  it.each(['pasta/arquivo', 'pasta\\arquivo', 'nome:arquivo', 'CON', '.xlsx'])('rejects invalid file names (%s)', async name => {
    component.fileName = name;
    const emit = vi.spyOn(component.exportRequested, 'emit');
    await component.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(component.validationMessage).toContain('nome de arquivo válido');
  });

  it('updates automatic names without overriding a custom name and resets on reopen', () => {
    component.mode = 'QUARTER';
    expect(component.resolvedFileName).toBe('planner_Q1_2026.xlsx');
    component.mode = 'SPRINT';
    expect(component.resolvedFileName).toBe('planner_S1_Q1_2026.xlsx');
    component.fileName = 'Entrega';
    component.mode = 'PERIOD';
    expect(component.resolvedFileName).toBe('Entrega.xlsx');
    component.open({ type: 'count', count: 2 }, ['2026-11-01']);
    expect(component.resolvedFileName).toBe('planner_2026-11-01_2-dias.xlsx');
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
