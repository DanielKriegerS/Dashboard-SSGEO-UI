import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ExportToolbar } from './export-toolbar';
import { PlannerExportService } from '../../../services/planner-export';
import { FeedbackService } from '../../../services/feedback';
import { CoatendService } from '../../../services/coatend';
import { SwapDateOption } from '../../../models/coatend/CoatendMilestoneModel';
import { SwapDocumentService } from '../../../services/swap-document';

describe('ExportToolbar', () => {
  let component: ExportToolbar;
  let fixture: ComponentFixture<ExportToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportToolbar],
      providers: [
        { provide: PlannerExportService, useValue: { export: () => of(new Blob(['xlsx'])) } },
        { provide: CoatendService, useValue: { getSwapDates: () => of([]) } },
        { provide: SwapDocumentService, useValue: { generate: () => of({ fileName: 'swap.docx', documentBase64: 'UEs=', review: 'Revisao' }) } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportToolbar);
    component = fixture.componentInstance;
    component.exportContext.update(['2026-10-15', '2026-10-16'], {
      type: 'period', startDate: '2026-10-15', endDate: '2026-10-16'
    });
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => { dialog.open = true; });
    dialog.close = vi.fn(() => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the chooser before either export modal', () => {
    component.openGenerationOptions();
    expect(component.activeDialog()).toBe('choose');
    expect(component.exportOptions?.opened).toBe(false);

    component.openExportOptions();
    expect(component.activeDialog()).toBeNull();
    expect(component.exportOptions?.opened).toBe(true);
  });

  it('opens and closes SWAP without opening Excel or calling its API', () => {
    const exportFile = vi.spyOn(TestBed.inject(PlannerExportService), 'export');
    component.openGenerationOptions();
    component.openSwapOptions();
    expect(component.activeDialog()).toBe('swap');
    expect(component.exportOptions?.opened).toBe(false);
    expect(exportFile).not.toHaveBeenCalled();

    component.closeGenerationDialog();
    expect(component.activeDialog()).toBeNull();
  });

  it('allows opening SWAP without a visible planner period', () => {
    component.exportContext.update([], { type: 'count', count: 15 });
    component.openGenerationOptions();
    component.openExportOptions();
    expect(component.activeDialog()).toBe('choose');
    expect(component.exportOptions?.opened).toBe(false);
    component.openSwapOptions();
    expect(component.activeDialog()).toBe('swap');
  });

  it('does not open a new dialog during an Excel export', () => {
    component.exporting = true;
    component.openGenerationOptions();
    component.openSwapOptions();
    expect(component.activeDialog()).toBeNull();
  });

  it('routes actual button clicks to separate Excel and SWAP dialogs', async () => {
    const exportFile = vi.spyOn(TestBed.inject(PlannerExportService), 'export');
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.planner-export-button')!.click();
    await fixture.whenStable();
    const dialog = root.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toContain('Exportar / Gerar');
    expect(dialog.querySelectorAll('.generation-option')).toHaveLength(2);
    dialog.querySelectorAll<HTMLButtonElement>('.generation-option')[1].click();
    await fixture.whenStable();
    expect(dialog.querySelector('h2')?.textContent).toContain('Gerar documento de SWAP');
    expect(dialog.querySelector('select')?.disabled).toBe(true);
    expect(dialog.querySelector<HTMLButtonElement>('.btn-primary')?.disabled).toBe(true);
    expect(component.exportOptions?.opened).toBe(false);
    dialog.querySelector<HTMLButtonElement>('.generation-back-button')!.click();
    await fixture.whenStable();
    expect(dialog.querySelector('h2')?.textContent).toContain('Exportar / Gerar');
    dialog.querySelector<HTMLButtonElement>('.generation-option')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(component.exportOptions?.opened).toBe(true);
    expect(root.querySelector('[aria-labelledby="planner-export-title"]')).not.toBeNull();
    expect(exportFile).not.toHaveBeenCalled();
  });

  it('closes on Escape without opening Excel or generating a file', async () => {
    component.openGenerationOptions();
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(component.activeDialog()).toBeNull();
    expect(component.exportOptions?.opened).toBe(false);
  });

  it('keeps the chooser open on internal clicks and closes on the backdrop', async () => {
    component.openGenerationOptions();
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100, right: 600, top: 100, bottom: 400
    } as DOMRect);
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 120, clientY: 120, bubbles: true }));
    expect(dialog.open).toBe(true);
    dialog.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    expect(dialog.open).toBe(false);
  });

  it('disables only Excel when no planner period is available', async () => {
    component.exportContext.clear();
    component.openGenerationOptions();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector<HTMLButtonElement>('.planner-export-button')?.disabled).toBe(false);
    const options = root.querySelectorAll<HTMLButtonElement>('.generation-option');
    expect(options[0].disabled).toBe(true);
    expect(options[1].disabled).toBe(false);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Nenhum período');
  });

  it('should open export options using the current navigated context', () => {
    component.openExportOptions();
    expect(component.exportOptions?.opened).toBe(true);
    expect(component.exportOptions?.mode).toBe('PERIOD');
    expect(component.exportOptions?.startDate).toBe('2026-10-15');
    expect(component.exportOptions?.endDate).toBe('2026-10-16');
  });

  it('loads dates only when entering SWAP and displays confirmed and disabled pending options', async () => {
    const dates: SwapDateOption[] = [
      { date: '2026-10-23', confirmed: [], pending: [{ id: 'p1', coatendNumber: 2, description: 'Pendente' }] },
      { date: '2026-10-26', confirmed: [{ id: 'c1', coatendNumber: 1, description: 'Confirmada' }], pending: [] }
    ];
    const load = vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(of(dates));
    component.openGenerationOptions();
    expect(load).not.toHaveBeenCalled();
    component.openSwapOptions();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('#swap-export-date') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.querySelector<HTMLOptionElement>('[value="2026-10-23"]')?.disabled).toBe(true);
    expect(select.querySelector<HTMLOptionElement>('[value="2026-10-26"]')?.disabled).toBe(false);
    expect(component.selectedSwap()).toBeNull();
    expect(load).toHaveBeenCalledOnce();
  });

  it('shows the selected planned date and only confirmed Coatends as included, with pending exclusions', async () => {
    vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(of([{
      date: '2026-10-26',
      confirmed: [{ id: 'c1', coatendNumber: 8579, description: 'Confirmada para implantacao' }],
      pending: [{ id: 'p1', coatendNumber: 8753, description: 'Ainda sem confirmacao' }]
    }]));
    component.openSwapOptions();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '2026-10-26';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#swap-selection-title').textContent).toContain('26/10/2026');
    expect(component.selectedSwap()?.confirmed.map(coatend => coatend.id)).toEqual(['c1']);
    expect(fixture.nativeElement.querySelector('.generation-coatends').textContent).toContain('8579');
    expect(fixture.nativeElement.querySelector('.generation-warning').textContent).toContain('fora do documento');
    expect(fixture.nativeElement.querySelector('.generation-pending-coatends').textContent).toContain('8753');
    expect(fixture.nativeElement.querySelector('.btn-primary').disabled).toBe(true);
    component.selectSwapDate('2026-11-01');
    expect(component.selectedSwap()).toBeNull();
  });

  it('shows pending-only dates but rejects selecting them even through a direct call', async () => {
    vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(of([{
      date: '2026-10-26', confirmed: [], pending: [{ id: 'p1', coatendNumber: 1, description: 'Pendente' }]
    }]));
    component.openSwapOptions();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    expect(select.querySelector<HTMLOptionElement>('[value="2026-10-26"]')?.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Nenhuma data possui SWAP confirmado');
    component.selectSwapDate('2026-10-26');
    expect(component.selectedSwapDate()).toBe('');
    expect(component.selectedSwap()).toBeNull();
  });

  it('shows loading and cancels the request when leaving SWAP', async () => {
    const response = new Subject<SwapDateOption[]>();
    vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(response);
    component.openSwapOptions();
    await fixture.whenStable();
    expect(component.swapLoading()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Consultando');
    expect(response.observed).toBe(true);
    component.openGenerationOptions();
    expect(response.observed).toBe(false);
    expect(component.swapLoading()).toBe(false);
    response.next([{ date: '2026-10-26', confirmed: [], pending: [] }]);
    expect(component.swapDates()).toEqual([]);
  });

  it('clears old selection and supports retry after a query error', async () => {
    const load = vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates')
      .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
      .mockReturnValueOnce(of([]));
    component.openSwapOptions();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Não foi possível consultar');
    expect(component.swapDates()).toEqual([]);
    expect(component.selectedSwap()).toBeNull();
    const retry = [...fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>]
      .find(button => button.textContent?.includes('Tentar novamente'))!;
    retry.click();
    await fixture.whenStable();
    expect(component.swapError()).toBe('');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Nenhuma data');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('fetches fresh dates and resets selection every time SWAP is reopened', () => {
    const load = vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(of([{
      date: '2026-10-26', confirmed: [{ id: 'c1', coatendNumber: 1, description: 'Confirmada' }], pending: []
    }]));
    component.openSwapOptions();
    component.selectSwapDate('2026-10-26');
    expect(component.selectedSwap()).not.toBeNull();
    component.closeGenerationDialog();
    component.openSwapOptions();
    expect(component.selectedSwap()).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  describe('SWAP document generation', () => {
    const selection: SwapDateOption = {
      date: '2026-11-18',
      confirmed: [{ id: 'c1', coatendNumber: 8579, description: 'Descricao confirmada' }],
      pending: [{ id: 'p1', coatendNumber: 8753, description: 'Descricao pendente' }]
    };
    const document = { fileName: 'swap.docx', documentBase64: 'UEs=', review: '# Revisao\n- [ ] Conferir fontes' };

    beforeEach(() => {
      vi.spyOn(TestBed.inject(CoatendService), 'getSwapDates').mockReturnValue(of([selection]));
      component.openSwapOptions();
      component.selectSwapDate(selection.date);
      component.swapFiles.set([new File(['xlsx'], 'alteracoesCOATEND8579.xlsx')]);
    });

    afterEach(() => {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
    });

    it('rejects missing, extra, ambiguous and duplicate filenames before generating', async () => {
      const generate = vi.spyOn(TestBed.inject(SwapDocumentService), 'generate');
      for (const files of [[], [new File(['xlsx'], 'COATEND8753.xlsx')],
        [new File(['xlsx'], 'COATEND8579_COATEND8753.xlsx')],
        [new File(['a'], 'COATEND8579.xlsx'), new File(['b'], 'COATEND8579.xlsx')]]) {
        component.swapFiles.set(files);
        expect(component.swapFileError()).not.toBe('');
        await component.generateSwap();
      }
      expect(generate).not.toHaveBeenCalled();
    });

    it('keeps the native file count synchronized when removing selected files', async () => {
      const first = new File(['first'], 'COATEND8579.xlsx');
      const second = new File(['second'], 'COATEND8753.xlsx');
      await fixture.whenStable();
      const input = fixture.nativeElement.querySelector('#swap-upload') as HTMLInputElement;
      Object.defineProperty(input, 'files', { configurable: true, writable: true, value: [first, second] });
      vi.stubGlobal('DataTransfer', class {
        readonly files: File[] = [];
        readonly items = { add: (file: File) => this.files.push(file) };
      });
      try {
        component.onSwapFilesSelected({ target: input } as unknown as Event);
        expect(input.files?.length).toBe(2);
        component.removeSwapFile(second);
        expect(input.files?.length).toBe(1);
        expect(input.files?.[0]).toBe(first);
        expect(component.swapFiles()).toEqual([first]);
        expect(component.swapFileError()).toBe('');
        component.removeSwapFile(first);
        expect(input.files?.length).toBe(0);
        expect(component.swapFiles()).toEqual([]);
        expect(component.swapFileError()).not.toBe('');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('does not upload or generate when the destination picker is cancelled', async () => {
      const generate = vi.spyOn(TestBed.inject(SwapDocumentService), 'generate');
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true, value: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
      });
      await component.generateSwap();
      expect(generate).not.toHaveBeenCalled();
      expect(component.swapGenerating()).toBe(false);
      expect(component.swapGenerationError()).toBe('');
      expect(component.swapFiles()).toHaveLength(1);
    });

    it('generates once, writes the document and exposes the separate review', async () => {
      const response = new Subject<typeof document>();
      const generate = vi.spyOn(TestBed.inject(SwapDocumentService), 'generate').mockReturnValue(response);
      const write = vi.fn().mockResolvedValue(undefined);
      const close = vi.fn().mockResolvedValue(undefined);
      const picker = vi.fn().mockResolvedValue({ name: 'swap.docx', createWritable: vi.fn().mockResolvedValue({ write, close }) });
      Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker });
      const operation = component.generateSwap();
      await Promise.resolve();
      await component.generateSwap();
      expect(generate).toHaveBeenCalledOnce();
      expect(component.swapGenerating()).toBe(true);
      component.closeGenerationDialog();
      expect(component.activeDialog()).toBe('swap');
      response.next(document);
      response.complete();
      await operation;
      await fixture.whenStable();
      expect(write).toHaveBeenCalledOnce();
      expect(close).toHaveBeenCalledOnce();
      expect(component.swapSaved()).toBe(true);
      expect(component.swapFiles()).toEqual([]);
      expect(component.swapResult()?.review).toBe(document.review);
      expect(fixture.nativeElement.querySelector('.generation-result pre').textContent).toBe(document.review);
      await component.saveGeneratedSwap();
      expect(generate).toHaveBeenCalledOnce();
      expect(write).toHaveBeenCalledTimes(2);
    });

    it('retains the generated document for retry when saving fails', async () => {
      const generate = vi.spyOn(TestBed.inject(SwapDocumentService), 'generate').mockReturnValue(of(document));
      const abort = vi.fn().mockResolvedValue(undefined);
      const destination = { name: 'swap.docx', createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockRejectedValue(new Error('Disk unavailable')), close: vi.fn(), abort
      }) };
      Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue(destination) });
      await component.generateSwap();
      expect(abort).toHaveBeenCalledOnce();
      expect(component.swapSaved()).toBe(false);
      expect(component.swapResult()).toEqual(document);
      expect(component.swapGenerationError()).toContain('não foi possível salvá-lo');
      expect(generate).toHaveBeenCalledOnce();
    });

    it('shows server validation feedback without saving a document', async () => {
      const destination = { name: 'swap.docx', createWritable: vi.fn() };
      Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: vi.fn().mockResolvedValue(destination) });
      vi.spyOn(TestBed.inject(SwapDocumentService), 'generate').mockReturnValue(
        throwError(() => ({ error: { message: 'Atualize as datas de SWAP.' } }))
      );
      await component.generateSwap();
      expect(destination.createWritable).not.toHaveBeenCalled();
      expect(component.swapResult()).toBeNull();
      expect(component.swapGenerationError()).toBe('Atualize as datas de SWAP.');
    });
  });

  it('should download the backend blob once and release the URL', async () => {
    const response = new Subject<Blob>();
    const exportFile = vi.spyOn(TestBed.inject(PlannerExportService), 'export').mockReturnValue(response);
    const createObjectURL = vi.fn().mockReturnValue('blob:planner-test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('planner.xlsx');
      expect(this.href).toBe('blob:planner-test');
      expect(this.isConnected).toBe(true);
    });
    try {
      const request = { mode: 'QUARTER' as const, quarterId: 'q1' };
      component.openExportOptions();
      component.exportPlanner({ request, destination: null });
      component.exportPlanner({ request, destination: null });
      expect(component.exporting).toBe(true);
      expect(exportFile).toHaveBeenCalledExactlyOnceWith(request);
      const blob = new Blob(['backend workbook']);
      response.next(blob);
      response.complete();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(click).toHaveBeenCalledOnce();
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(component.exporting).toBe(false);
      expect(component.exportOptions?.opened).toBe(false);
      expect(fixture.nativeElement.ownerDocument.querySelector('a[download="planner.xlsx"]')).toBeNull();
      await new Promise(resolve => setTimeout(resolve, 5));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:planner-test');
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('should write the exported workbook to the selected destination', async () => {
    const blob = new Blob(['backend workbook']);
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const destination = {
      name: 'relatorio.xlsx',
      createWritable: vi.fn().mockResolvedValue({ write, close })
    };
    vi.spyOn(TestBed.inject(PlannerExportService), 'export').mockReturnValue(of(blob));

    component.exportPlanner({ request: { mode: 'SPRINT', sprintId: 's1' }, destination });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(destination.createWritable).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledExactlyOnceWith(blob);
    expect(close).toHaveBeenCalledOnce();
  });

  it('chooses, requests, writes and closes the modal on the first export submission', async () => {
    const response = new Subject<Blob>();
    const exportFile = vi.spyOn(TestBed.inject(PlannerExportService), 'export').mockReturnValue(response);
    let finishWrite!: () => void;
    const write = vi.fn().mockReturnValue(new Promise<void>(resolve => { finishWrite = resolve; }));
    const close = vi.fn().mockResolvedValue(undefined);
    const destination = { name: 'primeiro-clique.xlsx', createWritable: vi.fn().mockResolvedValue({ write, close }) };
    const picker = vi.fn().mockResolvedValue(destination);
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: picker });
    try {
      component.openExportOptions();
      await component.exportOptions!.submit();
      fixture.detectChanges();
      expect(picker).toHaveBeenCalledOnce();
      expect(exportFile).toHaveBeenCalledExactlyOnceWith({ mode: 'PERIOD', startDate: '2026-10-15', endDate: '2026-10-16' });
      expect(component.exportOptions!.exporting).toBe(true);
      const blob = new Blob(['complete workbook']);
      response.next(blob);
      response.complete();
      await Promise.resolve();
      await Promise.resolve();
      expect(write).toHaveBeenCalledExactlyOnceWith(blob);
      expect(component.exportOptions!.opened).toBe(true);
      expect(close).not.toHaveBeenCalled();
      finishWrite();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(close).toHaveBeenCalledOnce();
      expect(component.exporting).toBe(false);
      expect(component.exportOptions!.opened).toBe(false);
    } finally {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker;
    }
  });

  it('should keep export options open for retry after a server error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const feedback = vi.spyOn(TestBed.inject(FeedbackService), 'error');
    vi.spyOn(TestBed.inject(PlannerExportService), 'export')
      .mockReturnValue(throwError(() => new Error('Export failed')));
    try {
      component.openExportOptions();
      component.exportPlanner({ request: { mode: 'SPRINT', sprintId: 's1' }, destination: null });
      expect(component.exporting).toBe(false);
      expect(component.exportOptions?.opened).toBe(true);
      expect(feedback).toHaveBeenCalledWith('Não foi possível exportar o planner. Tente novamente.');
    } finally {
      log.mockRestore();
    }
  });
});
