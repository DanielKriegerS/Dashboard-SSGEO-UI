import { Activity } from '../../models/components/Activities';
import { PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { buildPlannerBlockEntries, getActivityBlockingBlocks } from './planner-blocks';

describe('planner block rules', () => {
  const corporate: PlanningBlock = {
    id: 'bc', type: 'CORPORATE', coatendId: null,
    startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: ['a1']
  };
  const dependency: PlanningBlock = { ...corporate, id: 'bd', type: 'DEPENDENCY', coatendId: 'c1' };

  it.each(Object.values(Activity))('should prohibit %s according to block type', activity => {
    expect(getActivityBlockingBlocks([corporate], activity, 'c1', '2026-10-08', '2026-10-08'))
      .toHaveLength(activity === Activity.PRE_SWAP || activity === Activity.SWAP ? 1 : 0);
    expect(getActivityBlockingBlocks([dependency], activity, 'c1', '2026-10-08', '2026-10-08')).toHaveLength(1);
    expect(getActivityBlockingBlocks([dependency], activity, 'c2', '2026-10-08', '2026-10-08')).toHaveLength(0);
  });

  it.each([
    ['2026-10-07', '2026-10-08', 1],
    ['2026-10-10', '2026-10-11', 1],
    ['2026-10-07', '2026-10-11', 1],
    ['2026-10-07', '2026-10-07', 0],
    ['2026-10-11', '2026-10-11', 0]
  ])('should use inclusive intersection for %s to %s', (start, end, count) => {
    expect(getActivityBlockingBlocks([corporate], Activity.SWAP, 'c1', start, end)).toHaveLength(count);
  });

  it('should keep a global marker in an unassigned row without showing dependency blocks', () => {
    const entries = buildPlannerBlockEntries([corporate, dependency], '2026-10-08', null, []);
    expect(entries.map(entry => entry.id)).toEqual(['bc']);
    expect(entries[0].hasConflict).toBe(false);
  });

  it('should show conflicts only on the affected coatend and day', () => {
    const timeline = [{
      id: 'a1', activity: Activity.SWAP, coatendId: 'c1', startDate: '2026-10-08', endDate: '2026-10-08',
      performerName: 'Swap', performerColor: '#123456'
    }];
    expect(buildPlannerBlockEntries([corporate], '2026-10-08', 'c1', timeline)[0].hasConflict).toBe(true);
    expect(buildPlannerBlockEntries([corporate], '2026-10-08', 'c2', timeline)[0].hasConflict).toBe(false);
    expect(buildPlannerBlockEntries([corporate], '2026-10-09', 'c1', timeline)[0].hasConflict).toBe(false);
  });
});
