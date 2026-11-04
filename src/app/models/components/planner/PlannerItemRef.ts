export type PlannerItemRef = { kind: 'coatend'; id: string } | { kind: 'incident'; id: string };
export type PlannerItemKind = PlannerItemRef['kind'];