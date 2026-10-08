import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlannerDisplaySelection } from '../../../models/components/planner/PlannerDisplaySelection';

@Component({
  selector: 'app-planner-display-options',
  imports: [CommonModule, FormsModule],
  templateUrl: './planner-display-options.html',
  styleUrl: './planner-display-options.scss'
})
export class PlannerDisplayOptions implements OnChanges {
  @Input() selection: PlannerDisplaySelection = { type: 'count', count: 15 };
  @Input() minDate = '';
  @Input() maxDate = '';
  @Output() selectionApplied = new EventEmitter<PlannerDisplaySelection>();

  collapsed = false;
  displayType: PlannerDisplaySelection['type'] = 'count';
  count = 15;
  startDate = '';
  endDate = '';

  ngOnChanges(): void {
    this.displayType = this.selection.type;
    if (this.selection.type === 'count') {
      this.count = this.selection.count;
      this.startDate = this.minDate;
      this.endDate = this.maxDate;
    } else {
      this.startDate = this.selection.startDate;
      this.endDate = this.selection.endDate;
    }
  }

  get validationMessage(): string {
    if (this.displayType === 'count') {
      return Number.isSafeInteger(this.count) && this.count > 0
        ? ''
        : 'Informe uma quantidade inteira e positiva de dias.';
    }

    if (!this.startDate || !this.endDate) {
      return 'Informe as datas de início e fim.';
    }

    if (this.startDate > this.endDate) {
      return 'A data fim deve ser igual ou posterior à data início.';
    }

    if (this.startDate < this.minDate || this.endDate > this.maxDate) {
      return 'Escolha um período dentro das datas disponíveis no planner.';
    }

    return '';
  }

  apply(): void {
    if (this.validationMessage || !this.minDate || !this.maxDate) {
      return;
    }

    this.selectionApplied.emit(this.displayType === 'count'
      ? { type: 'count', count: this.count }
      : { type: 'period', startDate: this.startDate, endDate: this.endDate });
  }
}
