import { PlannerCell } from "./PlannerCell";

export interface PlannerRow {
  coatendId: string | null;
  coatendDescription: string;
  cells: PlannerCell[];
  isPlaceholder?: boolean;
  activityPlaceholderDate?: string;
  sprintId?: string | null;
  quarterId?: string | null;
}
