import { MilestoneWarning } from '../feature/FeaturePlanningModel';

export interface MilestoneState {
  plannedEnd: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  unavailableReason: string | null;
}

export interface CoatendMilestoneModel {
  coatendId: string;
  referenceDate: string;
  zone: string;
  tu: MilestoneState;
  swap: MilestoneState;
  warnings: MilestoneWarning[];
}