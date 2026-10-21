export interface MilestoneWarning {
  coatendId: string;
  description: string;
  coatendNumber: number;
  milestone: 'TU' | 'SWAP';
  code: string;
  plannedEnd: string | null;
  closedWorkingDaysPastDue: number | null;
  unavailableReason: string | null;
}

export interface FeaturePhase {
  plannedStart: string | null;
  plannedEnd: string | null;
  effectiveStart: string | null;
  confirmedAt: string | null;
  confirmed: boolean;
  estimatedPercent: number | null;
  unavailableReasons: string[];
  limitations: string[];
}

export interface FeatureContribution {
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedWorkingDays: number;
  closedWorkingDays: number;
  estimatedPercent: number | null;
  confirmedAt: string | null;
  unavailableReasons: string[];
}

export interface FeatureContributor {
  id: string;
  description: string;
  coatendNumber: number;
  weight: number | null;
  development: FeatureContribution;
  homologation: FeatureContribution;
  warnings: MilestoneWarning[];
}

export interface FeaturePlanningModel {
  id: string;
  name: string;
  description: string | null;
  referenceDate: string;
  zone: string;
  development: FeaturePhase;
  homologation: FeaturePhase;
  coatends: FeatureContributor[];
  warnings: MilestoneWarning[];
  pendingCoatendCount: number;
}