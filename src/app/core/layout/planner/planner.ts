import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { PlannerRow } from '../../../models/components/planner/PlannerRow';
import { CommonModule } from '@angular/common';
import { PlannerQuarterGroup } from '../../../models/components/planner/PlannerQuarterGroup';
import { PlannerHeader } from '../../../models/components/planner/PlannerHeader';
import { PlannerPlaceholderActions } from "../planner-placeholder-actions/planner-placeholder-actions";
import { PlannerMode } from '../../../models/components/planner/PlannerMode';
import { QuarterSummary } from '../../../models/quarter/QuarterSummary';
import { SprintSummary } from '../../../models/sprint/SprintSummary';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';
import {
  PlannerPlaceholderRequest,
  PlannerPlaceholderSubmission,
  PlannerPlaceholderType
} from '../../../models/components/planner/PlannerPlaceholderSubmission';
import { PlannerEntries } from '../../../models/components/planner/PlannerEntries';

@Component({
  selector: 'app-planner',
  imports: [CommonModule, PlannerPlaceholderActions],
  templateUrl: './planner.html',
  styleUrl: './planner.scss',
})
export class Planner {

  @ViewChild('placeholderActions') placeholderActions?: PlannerPlaceholderActions;
  @Output() placeholderSubmitted = new EventEmitter<PlannerPlaceholderSubmission>();
  
  @Input() hierarchy: PlannerQuarterGroup[] = [];
  @Input() days: string[] = [];

  @Input() quarterHeaders: PlannerHeader[] = [];
  @Input() sprintHeaders: PlannerHeader[] = [];
  @Input() mode: PlannerMode = 'empty';
  @Input() hasCompleteStructure = false;
  @Input() quarters: QuarterSummary[] = [];
  @Input() sprints: SprintSummary[] = [];
  @Input() coatends: CoatendSummary[] = [];

  isPlaceholderHeader(header: PlannerHeader, type: PlannerPlaceholderType): boolean {
    return header.id.toLowerCase().startsWith(`placeholder-${type}`);
  }

  openPlaceholder(request: PlannerPlaceholderRequest): void {
    this.placeholderActions?.open(request);
  }

  openActivityCreation(date: string, coatendId: string | null): void {
    this.openPlaceholder({
      type: 'activity',
      coatendId: coatendId ?? undefined,
      startDate: date
    });
  }

  onActivityCellKeydown(event: KeyboardEvent, date: string, coatendId: string | null): void {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    this.openActivityCreation(date, coatendId);
  }

  openStructureEditor(type: 'quarter' | 'sprint' | 'coatend', id: string): void {
    const item = type === 'quarter'
      ? this.quarters.find(quarter => quarter.id === id)
      : type === 'sprint'
        ? this.sprints.find(sprint => sprint.id === id)
        : this.coatends.find(coatend => coatend.id === id);

    if (!item) {
      console.error(`Item do planner não encontrado para edição: ${type}, ${id}`);
      return;
    }

    this.openPlaceholder({
      type,
      entityId: item.id,
      description: item.description,
      ...('startDate' in item ? { startDate: item.startDate, endDate: item.endDate } : {}),
      ...('coatendNumber' in item ? { coatendNumber: item.coatendNumber } : {})
    });
  }

  openActivityEditor(entry: PlannerEntries, coatendId: string | null): void {
    if (!coatendId) {
      return;
    }

    this.placeholderActions?.open({
      type: 'activity',
      activityId: entry.id,
      activity: entry.activity,
      startDate: entry.startDate,
      endDate: entry.endDate,
      developerId: entry.developerId,
      coatendId
    });
  }

  getShortActivity(activity?: string) {
    if (!activity) return '';

    const map: any = {
      DEVELOPMENT: 'De',
      TESTING_TU: 'Tu',
      PASSAGE_TH: 'Ph',
      HOMOLOGATION: 'Th',
      ADMINISTRATIVE_TASKS: 'Ad',
      PRE_SWAP: 'Ps',
      SWAP: 'Sw'
    };

    return map[activity] || activity.substring(0, 2);
  }

  safeColor(color?: string): string {
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return '#000000';
    }

    return color;
  }


  getTextColor(backgroundColor?: string): string {
    
  const safe = this.safeColor(backgroundColor);
  const hex = safe.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150 ? '#000000' : '#ffffff';

  }
}