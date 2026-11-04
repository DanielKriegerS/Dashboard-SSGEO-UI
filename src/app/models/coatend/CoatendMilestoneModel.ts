import { MilestoneWarning } from '../feature/FeaturePlanningModel';
import { CoatendSummary } from './CoatendSummary';
import { IncidentModel } from '../incident/IncidentModel';

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

export interface SwapDateOption {
  date: string;
  confirmed: CoatendSummary[];
  pending: CoatendSummary[];
  confirmedIncidents?: IncidentModel[];
  pendingIncidents?: IncidentModel[];
}