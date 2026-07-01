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

  getColor(devId?: string) {
    if (!devId) return '';

    return devId.endsWith('1')
      ? 'bg-primary text-white'
      : 'bg-danger text-white';
  }
}