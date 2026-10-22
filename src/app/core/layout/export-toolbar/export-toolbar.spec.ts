import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { ExportToolbar } from './export-toolbar';
import { PlannerExportService } from '../../../services/planner-export';
import { FeedbackService } from '../../../services/feedback';

describe('ExportToolbar', () => {
  let component: ExportToolbar;
  let fixture: ComponentFixture<ExportToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportToolbar],
      providers: [{ provide: PlannerExportService, useValue: { export: () => of(new Blob(['xlsx'])) } }],
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
