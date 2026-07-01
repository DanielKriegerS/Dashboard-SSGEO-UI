import { PlannerSprintGroup } from "./PlannerSprintGroup";

export interface PlannerQuarterGroup {
  quarterId: string;
  quarterDescription: string;
  sprints: PlannerSprintGroup[];
}
