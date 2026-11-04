import { PlannerItemRef } from './PlannerItemRef';

export type BlockType = 'CORPORATE' | 'DEPENDENCY';

export interface BlockRequest {
  type: BlockType;
  startDate: string;
  endDate: string;
  coatendId: string | null;
  owner?: PlannerItemRef;
}

export interface PlanningBlock extends BlockRequest {
  id: string;
  conflictingActivityIds: string[];
}