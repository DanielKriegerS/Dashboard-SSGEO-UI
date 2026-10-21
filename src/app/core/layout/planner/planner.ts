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
import { getWeekendDayName, getHolidayName, getNonWorkingDayLabel } from '../../../shared/utils/planner-dates';
import { PlanningBlock } from '../../../models/components/planner/PlanningBlock';
import { TimelineModel } from '../../../models/timeline/TimelineModel';
import { buildPlannerBlockEntries, getVisiblePlannerEntries } from '../../../shared/utils/planner-blocks';
import { RouterLink } from '@angular/router';
import { FeaturePhase, FeaturePlanningModel, MilestoneWarning } from '../../../models/feature/FeaturePlanningModel';
import { featureReason, milestoneWarningLabel } from '../../../shared/utils/feature-labels';

interface FeatureSegment {
  start: string;
  colspan: number;
  kind: 'development' | 'homologation' | null;
  phase: FeaturePhase | null;
}

@Component({
  selector: 'app-planner',
  imports: [CommonModule, PlannerPlaceholderActions, RouterLink],
  templateUrl: './planner.html',
  styleUrls: ['./planner.scss'],
})
export class Planner {
  readonly weekendDayName = getWeekendDayName;
  readonly holidayName = getHolidayName;
  readonly nonWorkingDayLabel = getNonWorkingDayLabel;
  readonly visibleEntries = getVisiblePlannerEntries;
  readonly featureReason = featureReason;
  readonly warningLabel = milestoneWarningLabel;
  @Input() featurePlanning: FeaturePlanningModel[] = [];
  @Input() milestoneWarnings: MilestoneWarning[] = [];

  warningsFor(coatendId: string | null): MilestoneWarning[] {
    return this.milestoneWarnings.filter(warning => warning.coatendId === coatendId);
  }

  phaseOnDay(phase: FeaturePhase, day: string): boolean {
    return !!phase.plannedStart && !!phase.plannedEnd && day >= phase.plannedStart && day <= phase.plannedEnd;
  }

  featureRows(): { feature: FeaturePlanningModel; segments: FeatureSegment[] }[] {
    return this.featurePlanning.map(feature => {
      const segments: FeatureSegment[] = [];
      for (const day of this.days) {
        const kind = this.phaseOnDay(feature.development, day) ? 'development'
          : this.phaseOnDay(feature.homologation, day) ? 'homologation' : null;
        const previous = segments[segments.length - 1];
        if (kind && previous && previous.kind === kind) {
          previous.colspan++;
        } else {
          segments.push({ start: day, colspan: 1, kind, phase: kind ? feature[kind] : null });
        }
      }
      return { feature, segments };
    });
  }

  phaseTitle(feature: FeaturePlanningModel, phase: FeaturePhase, kind: 'development' | 'homologation'): string {
    const label = kind === 'development' ? 'Desenvolvimento + TU' : 'Homologacao ate SWAP';
    const estimate = phase.estimatedPercent === null ? 'Estimativa indisponivel'
      : `${phase.estimatedPercent.toFixed(2)}% estimado`;
    const reasons = [...phase.unavailableReasons, ...phase.limitations].map(reason => this.featureReason(reason));
    return [feature.name, label, estimate, phase.confirmed ? 'Confirmado' : 'Nao confirmado',
      `${phase.plannedStart} a ${phase.plannedEnd}`,
      phase.effectiveStart ? `Inicio efetivo: ${phase.effectiveStart}` : '', ...reasons].filter(Boolean).join(' | ');
  }

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
  @ViewChild('plannerComponent')
  plannerComponent?: Planner;

  globalBlockEntries(day: string): PlannerEntries[] {
    return getVisiblePlannerEntries(buildPlannerBlockEntries(this.blocks, day, null, this.timeline));
  }

  entryId(_index: number, entry: PlannerEntries): string {
    return entry.id;
  }

  isPlaceholderHeader(header: PlannerHeader, type: PlannerPlaceholderType): boolean {
    return header.id.toLowerCase().startsWith(`placeholder-${type}`);
  }

  get lastSprintId(): string | undefined {
    return this.sprints.reduce<SprintSummary | undefined>((latest, sprint) =>
      !latest || (sprint.endDate ?? '') >= (latest.endDate ?? '') ? sprint : latest,
      undefined)?.id;
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