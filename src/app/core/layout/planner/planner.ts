import { Component, Input } from '@angular/core';
import { PlannerRow } from '../../../models/components/planner/PlannerRow';
import { CommonModule } from '@angular/common';
import { PlannerQuarterGroup } from '../../../models/components/planner/PlannerQuarterGroup';
import { PlannerHeader } from '../../../models/components/planner/PlannerHeader';

@Component({
  selector: 'app-planner',
  imports: [CommonModule],
  templateUrl: './planner.html',
  styleUrl: './planner.scss',
})
export class Planner {
  
  @Input() hierarchy: PlannerQuarterGroup[] = [];
  @Input() days: string[] = [];

  @Input() quarterHeaders: PlannerHeader[] = [];
  @Input() sprintHeaders: PlannerHeader[] = [];

  getShortActivity(activity?: string) {
    if (!activity) return '';

    const map: any = {
      DEVELOPMENT: 'De',
      TESTING_TU: 'Tu',
      PASSAGE_TH: 'Th',
      HOMOLOGATION: 'Ho',
      ADMINISTRATIVE_TASKS: 'Ad',
      PRE_SWAP: 'Ps',
      SWAP: 'Sw'
    };

    return map[activity] || activity.substring(0, 2);
  }

  getTextColor(backgroundColor?: string): string {
    if (!backgroundColor) {
      return '#ffffff';
    }

    const hex = backgroundColor.replace('#', '');

    if (hex.length !== 6) {
      return '#ffffff';
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 150 ? '#000000' : '#ffffff';
  }
}