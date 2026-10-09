import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PlanningBlock } from '../../../models/components/planner/PlanningBlock';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';

@Component({
  selector: 'app-planner-block-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planner-block-toolbar.html',
  styleUrls: ['./planner-block-toolbar.scss']
})
export class PlannerBlockToolbar {
  @Input() blocks: PlanningBlock[] = [];
  @Input() coatends: CoatendSummary[] = [];

  @Output() blockCreationRequested = new EventEmitter<void>();
  @Output() blockEditionRequested = new EventEmitter<PlanningBlock>();

  blocksExpanded = false;

  get conflictingActivityCount(): number {
    return new Set(
      this.blocks.flatMap(block => block.conflictingActivityIds ?? [])
    ).size;
  }

  blockScopeLabel(block: PlanningBlock): string {
    if (block.type === 'CORPORATE') {
      return 'Todo o planejamento';
    }

    const coatend = this.coatends.find(
      item => item.id === block.coatendId
    );

    return coatend
      ? `${coatend.coatendNumber} - ${coatend.description}`
      : `Coatend ${block.coatendId ?? 'não informado'}`;
  }

  openBlockCreation(): void {
    this.blockCreationRequested.emit();
  }

  openBlockEditor(block: PlanningBlock): void {
    this.blockEditionRequested.emit(block);
  }

  blockId(_index: number, block: PlanningBlock): string {
    return block.id;
  }
}