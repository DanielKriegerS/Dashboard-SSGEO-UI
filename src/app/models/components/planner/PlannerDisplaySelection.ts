export type PlannerDisplaySelection =
  | { type: 'count'; count: number }
  | { type: 'period'; startDate: string; endDate: string };
