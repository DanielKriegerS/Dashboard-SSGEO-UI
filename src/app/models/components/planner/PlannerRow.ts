import { PlannerCell } from "./PlannerCell";

export interface PlannerRow {
  coatendId: string;
  coatendDescription: string;
  cells: PlannerCell[];
}
