import { PlannerRow } from "./PlannerRow";

export interface PlannerSprintGroup {
  sprintId: string;
  sprintDescription: string;
  coatends: PlannerRow[];
}
