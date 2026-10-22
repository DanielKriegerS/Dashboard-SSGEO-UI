import { CommonModule, DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Injector,
  Input,
  signal,
  ViewChild
} from '@angular/core';
import { finalize, from, switchMap } from 'rxjs';
import { PlannerExportRequest } from '../../../models/components/planner/PlannerExportRequest';
import { FeedbackService } from '../../../services/feedback';
import { PlannerExportService } from '../../../services/planner-export';
import { PlannerExportFileHandle, PlannerExportOptions } from '../planner-export-options/planner-export-options';
import { PlannerExportContextService } from '../../../shared/services/planner-export-context';

@Component({
  selector: 'app-export-toolbar',
  imports: [
    CommonModule,
    PlannerExportOptions
  ],
  templateUrl: './export-toolbar.html',
  styleUrls: ['./export-toolbar.scss']
})
export class ExportToolbar {
  @Input() fullWidth = false;
  @Input() collapsed = false;

  @ViewChild(PlannerExportOptions)
  exportOptions?: PlannerExportOptions;

  @ViewChild('generationDialog', { static: true })
  generationDialog?: ElementRef<HTMLDialogElement>;

  readonly exportContext =
    inject(PlannerExportContextService);

  exporting = false;
  readonly activeDialog = signal<'choose' | 'swap' | null>(null);

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly plannerExportService = inject(PlannerExportService);
  private readonly feedback = inject(FeedbackService);
  private readonly cdr = inject(ChangeDetectorRef);

  openGenerationOptions(): void {
    this.showGenerationDialog('choose');
  }

  openSwapOptions(): void {
    this.showGenerationDialog('swap');
  }

  closeGenerationDialog(): void {
    this.generationDialog?.nativeElement.close();
    this.activeDialog.set(null);
  }

  closeOnBackdrop(event: MouseEvent): void {
    const dialog = this.generationDialog?.nativeElement;
    if (dialog && event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        this.closeGenerationDialog();
      }
    }
  }

  private showGenerationDialog(dialogType: 'choose' | 'swap'): void {
    if (this.exporting || this.exportOptions?.opened) {
      return;
    }
    this.activeDialog.set(dialogType);
    const dialog = this.generationDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    afterNextRender(() => {
      if (dialog?.open) {
        dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
      }
    }, { injector: this.injector });
  }

  openExportOptions(): void {
    const visibleDays = this.exportContext.visibleDays();
    const displaySelection =
      this.exportContext.displaySelection();

    if (this.exporting || !visibleDays.length) {
      return;
    }

    if (!this.exportOptions) {
      console.error(
        'PlannerExportOptions não foi encontrado no ExportToolbar.'
      );
      return;
    }

    this.closeGenerationDialog();
    this.exportOptions.open(
      displaySelection,
      visibleDays
    );
  }

  exportPlanner(selection: { request: PlannerExportRequest; destination: PlannerExportFileHandle | null }): void {
    if (this.exporting) {
      return;
    }

    this.exporting = true;
    this.cdr.markForCheck();

    this.plannerExportService.export(selection.request).pipe(
      switchMap(blob => from(this.savePlannerFile(blob, selection.destination))),
      finalize(() => {
        this.exporting = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.closeExportOptions();
      },
      error: error => {
        console.error('Erro ao exportar planner:', error);

        this.feedback.error(
          'Não foi possível exportar o planner. Tente novamente.'
        );
      }
    });
  }

  private closeExportOptions(): void {
    this.exportOptions?.completeExport();
  }

  private async savePlannerFile(blob: Blob, destination: PlannerExportFileHandle | null): Promise<void> {
    if (destination) {
      const writable = await destination.createWritable();
      try {
        await writable.write(blob);
        await writable.close();
      } catch (error) {
        await writable.abort?.();
        throw error;
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');

    try {
      link.href = url;
      link.download = 'planner.xlsx';

      this.document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    }
  }
}