import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  ViewChild
} from '@angular/core';
import { finalize, tap } from 'rxjs';
import { PlannerDisplaySelection } from '../../../models/components/planner/PlannerDisplaySelection';
import { PlannerExportRequest } from '../../../models/components/planner/PlannerExportRequest';
import { FeedbackService } from '../../../services/feedback';
import { PlannerExportService } from '../../../services/planner-export';
import { PlannerExportOptions } from '../planner-export-options/planner-export-options';
import { PlannerExportContextService } from '../../../shared/services/planner-export-context';

@Component({
  selector: 'app-export-toolbar',
  standalone: true,
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

  readonly exportContext =
    inject(PlannerExportContextService);

  exporting = false;

  private readonly document = inject(DOCUMENT);
  private readonly plannerExportService = inject(PlannerExportService);
  private readonly feedback = inject(FeedbackService);
  private readonly cdr = inject(ChangeDetectorRef);

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

    this.exportOptions.open(
      displaySelection,
      visibleDays
    );
  }

  exportPlanner(request: PlannerExportRequest): void {
    if (this.exporting) {
      return;
    }

    this.exporting = true;

    this.plannerExportService.export(request).pipe(
      tap(blob => this.downloadPlannerFile(blob)),
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
    this.exportOptions?.close();
  }

  private downloadPlannerFile(blob: Blob): void {
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