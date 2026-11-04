import { BlockType } from './PlanningBlock';
import { PlannerItemRef } from './PlannerItemRef';

export type PlannerPlaceholderType = 'quarter' | 'sprint' | 'coatend' | 'incident' | 'activity' | 'block';

export interface PlannerPlaceholderRequest {
  type: PlannerPlaceholderType;
  entityId?: string;
  coatendNumber?: number;
  activityId?: string;
  blockId?: string;
  blockType?: BlockType;
  description?: string;
  quarterId?: string;
  sprintId?: string;
  coatendId?: string;
  owner?: PlannerItemRef;
  code?: string;
  activity?: string;
  developerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PlannerPlaceholderSubmission extends PlannerPlaceholderRequest {
  includeWeekends?: boolean;
  startDate?: string;
  endDate?: string;
  coatendNumber?: number;
}
