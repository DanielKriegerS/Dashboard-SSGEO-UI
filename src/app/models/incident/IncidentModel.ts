import { Activity } from '../components/Activities';
import { MilestoneState } from '../coatend/CoatendMilestoneModel';

export type IncidentActivity = Activity | 'ANALYSIS';
export interface IncidentRequest { code: string; description: string; }
export interface IncidentModel extends IncidentRequest { id: string; completed: boolean; }
export interface IncidentActivityRequest {
  activity: IncidentActivity;
  startDate: string;
  endDate: string;
  developerId?: string | null;
}
export interface IncidentTimeline extends IncidentActivityRequest {
  id: string;
  incidentId: string;
  developerName: string | null;
  developerColor: string | null;
  performerName: string;
  performerColor: string;
  milestoneNotice?: string | null;
}
export interface IncidentWarning {
  incidentId: string;
  description: string;
  code: string;
  milestone: 'TU' | 'SWAP';
  warningCode: string;
  plannedEnd: string | null;
  closedWorkingDaysPastDue: number | null;
  unavailableReason: string | null;
}
export interface IncidentMilestones {
  incidentId: string;
  referenceDate: string;
  zone: string;
  tu: MilestoneState;
  swap: MilestoneState;
  warnings: IncidentWarning[];
}
export interface IncidentBlockRequest { startDate: string; endDate: string; }
export interface IncidentBlock extends IncidentBlockRequest {
  id: string;
  type: 'DEPENDENCY';
  incidentId: string;
  conflictingActivityIds: string[];
}
export interface IncidentPlanningData {
  incident: IncidentModel;
  timeline: IncidentTimeline[];
  milestones: IncidentMilestones | null;
  blocks: IncidentBlock[];
  error?: string;
}