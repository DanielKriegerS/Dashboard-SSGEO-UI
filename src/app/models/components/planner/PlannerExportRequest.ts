export type PlannerExportRequest =
  | { mode: 'COUNT'; startDate: string; count: number }
  | { mode: 'PERIOD'; startDate: string; endDate: string }
  | { mode: 'QUARTER'; quarterId: string }
  | { mode: 'SPRINT'; sprintId: string };
