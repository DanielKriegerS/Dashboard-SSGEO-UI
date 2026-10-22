import { CommonModule, DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  Input,
  signal,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, firstValueFrom, from, Subscription, switchMap } from 'rxjs';
import { SwapDocumentResult, SwapDocumentService } from '../../../services/swap-document';
import { SwapDateOption } from '../../../models/coatend/CoatendMilestoneModel';
import { CoatendService } from '../../../services/coatend';
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
  readonly swapDates = signal<SwapDateOption[]>([]);
  readonly swapLoading = signal(false);
  readonly swapError = signal('');
  readonly selectedSwapDate = signal('');
  readonly swapFiles = signal<File[]>([]);
  readonly swapGenerating = signal(false);
  readonly swapGenerationError = signal('');
  readonly swapResult = signal<SwapDocumentResult | null>(null);
  readonly swapSaved = signal(false);
  readonly selectedSwap = computed(() => this.swapDates().find(option =>
    option.date === this.selectedSwapDate() && option.confirmed.length > 0
  ) ?? null);
  readonly hasConfirmedSwap = computed(() => this.swapDates().some(option => option.confirmed.length > 0));
  readonly swapFileError = computed(() => {
    const selected = this.selectedSwap();
    const files = this.swapFiles();
    if (!selected) return '';
    if (!files.length) return 'Envie as planilhas das COATENDs confirmadas.';
    if (files.length > 20 || files.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) {
      return 'Limite de 20 arquivos e 50 MB no total.';
    }
    const expected = new Set(selected.confirmed.map(coatend => coatend.coatendNumber));
    const uploaded = new Set<number>();
    const names = new Set<string>();
    for (const file of files) {
      const name = file.name.toLowerCase();
      const matches = [...file.name.matchAll(/COATEND[ _-]?(\d+)/gi)];
      if (!name.endsWith('.xlsx') || !file.size || file.size > 10 * 1024 * 1024 || names.has(name)) {
        return `Arquivo inválido ou duplicado: ${file.name}. Use XLSX de até 10 MB.`;
      }
      names.add(name);
      if (matches.length !== 1) return `Número de COATEND ausente ou ambíguo: ${file.name}.`;
      const number = Number(matches[0][1]);
      if (!expected.has(number)) return `COATEND-${number} não pertence à seleção: ${file.name}.`;
      uploaded.add(number);
    }
    const missing = [...expected].filter(number => !uploaded.has(number));
    return missing.length ? `Faltam planilhas das COATENDs: ${missing.join(', ')}.` : '';
  });

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly coatendService = inject(CoatendService);
  private readonly swapDocumentService = inject(SwapDocumentService);
  private swapRequest?: Subscription;
  private readonly plannerExportService = inject(PlannerExportService);
  private readonly feedback = inject(FeedbackService);
  private readonly cdr = inject(ChangeDetectorRef);

  openGenerationOptions(): void {
    if (this.swapGenerating()) return;
    this.resetSwapResult();
    this.swapRequest?.unsubscribe();
    this.showGenerationDialog('choose');
  }

  openSwapOptions(): void {
    if (this.exporting || this.swapGenerating() || this.exportOptions?.opened) {
      return;
    }
    this.showGenerationDialog('swap');
    this.loadSwapDates();
  }

  loadSwapDates(): void {
    if (this.activeDialog() !== 'swap' || this.swapGenerating()) {
      return;
    }
    this.swapRequest?.unsubscribe();
    this.resetSwapResult();
    this.swapDates.set([]);
    this.selectedSwapDate.set('');
    this.swapError.set('');
    this.swapLoading.set(true);
    this.swapRequest = this.coatendService.getSwapDates().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.swapLoading.set(false))
    ).subscribe({
      next: dates => this.swapDates.set(dates),
      error: () => this.swapError.set('Não foi possível consultar as datas de SWAP. Tente novamente.')
    });
  }

  selectSwapDate(date: string): void {
    if (this.swapGenerating()) return;
    this.resetSwapResult();
    const eligible = this.swapDates().some(option => option.date === date && option.confirmed.length > 0);
    this.selectedSwapDate.set(eligible ? date : '');
  }

  closeGenerationDialog(): void {
    if (this.swapGenerating()) return;
    this.resetSwapResult();
    this.swapRequest?.unsubscribe();
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
    if (this.exporting || this.swapGenerating() || this.exportOptions?.opened) {
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

    if (this.exporting || this.swapGenerating() || !visibleDays.length) {
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

  onSwapFilesSelected(event: Event): void {
    if (this.swapGenerating()) return;
    const input = event.target as HTMLInputElement;
    this.swapFiles.set(Array.from(input.files ?? []));
    this.swapGenerationError.set('');
    this.swapResult.set(null);
    this.swapSaved.set(false);
  }

  removeSwapFile(file: File): void {
    if (!this.swapGenerating()) {
      this.swapFiles.update(files => files.filter(candidate => candidate !== file));
      const input = this.generationDialog?.nativeElement.querySelector<HTMLInputElement>('#swap-upload');
      if (input) {
        const selection = new DataTransfer();
        for (const remaining of this.swapFiles()) selection.items.add(remaining);
        input.files = selection.files;
      }
      this.swapGenerationError.set('');
    }
  }

  async generateSwap(): Promise<void> {
    const selected = this.selectedSwap();
    if (!selected || this.swapLoading() || this.swapGenerating() || this.swapFileError()) return;
    this.swapGenerating.set(true);
    this.swapGenerationError.set('');
    this.swapResult.set(null);
    this.swapSaved.set(false);
    try {
      const date = selected.date.split('-').reverse().join('.');
      const destination = await this.chooseSwapDestination(`Preparação de Implantação - ${date}.docx`);
      const result = await firstValueFrom(this.swapDocumentService.generate(selected, this.swapFiles()).pipe(
        takeUntilDestroyed(this.destroyRef)
      ));
      this.swapResult.set(result);
      const bytes = Uint8Array.from(atob(result.documentBase64), character => character.charCodeAt(0));
      await this.savePlannerFile(new Blob([bytes.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }), destination, result.fileName);
      this.swapSaved.set(true);
      this.swapFiles.set([]);
      const input = this.document.querySelector<HTMLInputElement>('#swap-upload');
      if (input) input.value = '';
    } catch (error) {
      if (!this.isCancelled(error)) {
        const message = error !== null && typeof error === 'object' && 'error' in error
          ? (error.error as { message?: string } | null)?.message : null;
        this.swapGenerationError.set(message || (this.swapResult()
          ? 'Documento gerado, mas não foi possível salvá-lo. Tente salvar novamente.'
          : 'Não foi possível gerar o documento SWAP. Confira as planilhas e tente novamente.'));
      }
    } finally {
      this.swapGenerating.set(false);
    }
  }

  async saveGeneratedSwap(): Promise<void> {
    const result = this.swapResult();
    if (!result || this.swapGenerating()) return;
    this.swapGenerating.set(true);
    try {
      const destination = await this.chooseSwapDestination(result.fileName);
      const bytes = Uint8Array.from(atob(result.documentBase64), character => character.charCodeAt(0));
      await this.savePlannerFile(new Blob([bytes.buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }), destination, result.fileName);
      this.swapSaved.set(true);
      this.swapGenerationError.set('');
    } catch (error) {
      if (!this.isCancelled(error)) this.swapGenerationError.set('Não foi possível salvar o documento. Tente novamente.');
    } finally {
      this.swapGenerating.set(false);
    }
  }

  async downloadSwapReview(): Promise<void> {
    const result = this.swapResult();
    if (result) {
      await this.savePlannerFile(new Blob([result.review], { type: 'text/markdown;charset=utf-8' }), null,
        result.fileName.replace(/\.docx$/i, '_revisao.md'));
    }
  }

  private resetSwapResult(): void {
    this.swapFiles.set([]);
    const input = this.generationDialog?.nativeElement.querySelector<HTMLInputElement>('#swap-upload');
    if (input) input.value = '';
    this.swapResult.set(null);
    this.swapSaved.set(false);
    this.swapGenerationError.set('');
  }

  private isCancelled(error: unknown): boolean {
    return error !== null && typeof error === 'object' && 'name' in error && error.name === 'AbortError';
  }

  private chooseSwapDestination(name: string): Promise<PlannerExportFileHandle | null> {
    const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<PlannerExportFileHandle> }).showSaveFilePicker;
    return picker ? picker.call(window, {
      suggestedName: name,
      types: [{ description: 'Documento Word', accept: {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
      } }]
    }) : Promise.resolve(null);
  }

  private async savePlannerFile(blob: Blob, destination: PlannerExportFileHandle | null, fileName = 'planner.xlsx'): Promise<void> {
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
      link.download = fileName;

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