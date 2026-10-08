export type PlannerPlaceholderType = 'quarter' | 'sprint' | 'coatend' | 'activity';

export interface PlannerPlaceholderRequest {
  type: PlannerPlaceholderType;
  entityId?: string;
  coatendNumber?: number;
  activityId?: string;
  description?: string;
  quarterId?: string;
  sprintId?: string;
  coatendId?: string;
  activity?: string;
  developerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PlannerPlaceholderSubmission extends PlannerPlaceholderRequest {
  startDate?: string;
  endDate?: string;
  coatendNumber?: number;
}
