import { PlannerFilters } from '../../models/components/planner/PlannerFilters';
import { PlannerItemKind } from '../../models/components/planner/PlannerItemRef';

export function matchesPlannerFilters(kind: PlannerItemKind, completed: boolean | null, filters: PlannerFilters): boolean {
  return (filters.type === 'all' || filters.type === kind)
    && (filters.status === 'all' || completed !== null && completed === (filters.status === 'completed'));
}