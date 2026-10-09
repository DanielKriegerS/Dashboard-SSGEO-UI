import { BlockType } from './PlanningBlock';

export interface PlannerEntries{
    id: string;
    activity: string;
    startDate: string;
    endDate: string;
    developerId?: string;
    developerName?: string;
    developerColor?: string;
    performerName: string;
    performerColor: string;
    blockType?: BlockType;
    hasConflict?: boolean;
  }