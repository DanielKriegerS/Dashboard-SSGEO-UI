import { matchesPlannerFilters } from './planner-items';
import { PlannerFilters } from '../../models/components/planner/PlannerFilters';

describe('planner item filters', () => {
  for (const type of ['all', 'coatend', 'incident'] as const) {
    for (const status of ['all', 'open', 'completed'] as const) {
      it(`projects ${type}/${status} without changing the source`, () => {
        const source = [{ kind: 'coatend' as const, completed: false }, { kind: 'coatend' as const, completed: true },
          { kind: 'incident' as const, completed: false }, { kind: 'incident' as const, completed: true }];
        const filters: PlannerFilters = { type, status };
        const expected = source.filter(item => (type === 'all' || type === item.kind)
          && (status === 'all' || item.completed === (status === 'completed')));
        expect(source.filter(item => matchesPlannerFilters(item.kind, item.completed, filters))).toEqual(expected);
        expect(source).toHaveLength(4);
      });
    }
  }
  it('does not classify unavailable status as open or completed', () => {
    expect(matchesPlannerFilters('coatend', null, { type: 'all', status: 'all' })).toBe(true);
    expect(matchesPlannerFilters('coatend', null, { type: 'all', status: 'open' })).toBe(false);
    expect(matchesPlannerFilters('coatend', null, { type: 'all', status: 'completed' })).toBe(false);
  });
});