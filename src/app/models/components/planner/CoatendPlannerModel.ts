export interface CoatendPlannerModel {
  id: string;
  description: string;
  coatendNumber: number;

  sprintId: string;
  sprintDescription: string;
  sprintStartDate: string;
  sprintEndDate: string;

  quarterId: string;
  quarterDescription: string;

  quarterStartDate: string;
  quarterEndDate: string;
}