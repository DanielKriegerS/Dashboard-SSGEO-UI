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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
