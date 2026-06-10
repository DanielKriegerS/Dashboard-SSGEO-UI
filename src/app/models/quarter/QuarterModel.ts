import { SprintSummary } from "../sprint/SprintSummary";

export interface QuarterModel {
  id: string;
  description: string;
  sprints?: SprintSummary[];
  startDate?: string;
  endDate?: string;
}