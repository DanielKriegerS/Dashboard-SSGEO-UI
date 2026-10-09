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
import { getWeekendDayName } from '../../../shared/utils/planner-dates';
import { PlanningBlock } from '../../../models/components/planner/PlanningBlock';
import { TimelineModel } from '../../../models/timeline/TimelineModel';
import { buildPlannerBlockEntries } from '../../../shared/utils/planner-blocks';

@Component({
  selector: 'app-planner',
  imports: [CommonModule, PlannerPlaceholderActions],
  templateUrl: './planner.html',
  styleUrls: ['./planner.scss'],
})
export class Planner {
  readonly weekendDayName = getWeekendDayName;

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
  @Input() blocks: PlanningBlock[] = [];
  @Input() timeline: TimelineModel[] = [];
  blocksExpanded = false;

  get conflictingActivityCount(): number {
    return new Set(this.blocks.flatMap(block => block.conflictingActivityIds)).size;
  }

  blockScopeLabel(block: PlanningBlock): string {
    if (block.type === 'CORPORATE') {
      return 'Todo o planejamento';
    }
    const coatend = this.coatends.find(item => item.id === block.coatendId);
    return coatend ? `${coatend.coatendNumber} - ${coatend.description}` : `Coatend ${block.coatendId}`;
  }

  openBlockCreation(): void {
    this.openPlaceholder({ type: 'block', startDate: this.days[0] });
  }

  openBlockEditor(block: PlanningBlock): void {
    this.openPlaceholder({
      type: 'block', blockId: block.id, blockType: block.type,
      coatendId: block.coatendId ?? undefined,
      startDate: block.startDate, endDate: block.endDate
    });
  }

  globalBlockEntries(day: string): PlannerEntries[] {
    return buildPlannerBlockEntries(this.blocks, day, null, this.timeline);
  }

  entryId(_index: number, entry: PlannerEntries): string {
    return entry.id;
  }

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
    if (entry.blockType) {
      this.placeholderActions?.open({
        type: 'block', blockId: entry.id, blockType: entry.blockType,
        startDate: entry.startDate, endDate: entry.endDate,
        coatendId: entry.blockType === 'DEPENDENCY' ? coatendId ?? undefined : undefined
      });
      return;
    }
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

  entryLabel(entry: PlannerEntries): string {
    return entry.blockType === 'CORPORATE' ? 'BC'
      : entry.blockType === 'DEPENDENCY' ? 'BD' : this.getShortActivity(entry.activity);
  }

  entryTitle(entry: PlannerEntries): string {
    const label = entry.blockType === 'CORPORATE' ? 'bloqueio corporativo (global)'
      : entry.blockType === 'DEPENDENCY' ? 'bloqueio de dependência' : 'atividade: ' + entry.activity;
    return 'Editar ' + label + (entry.hasConflict ? ' — conflito com bloqueio' : '');
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