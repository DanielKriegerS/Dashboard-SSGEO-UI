import { Activity } from '../../models/components/Activities';
import { PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { buildPlannerBlockEntries, getActivityBlockingBlocks, getBlockOccupancyConflicts, getVisiblePlannerEntries } from './planner-blocks';

describe('planner block rules', () => {
  const corporate: PlanningBlock = {
    id: 'bc', type: 'CORPORATE', coatendId: null,
    startDate: '2026-10-08', endDate: '2026-10-10', conflictingActivityIds: ['a1']
  };
  const dependency: PlanningBlock = { ...corporate, id: 'bd', type: 'DEPENDENCY', coatendId: 'c1' };

  it('should allow both block types over activities but reject equal or higher priority blocks', () => {
    const timeline = [{ id: 'a1', activity: Activity.SWAP, coatendId: 'c1',
      startDate: '2026-10-08', endDate: '2026-10-08', performerName: 'Swap', performerColor: '#123456' }];
    const request = { type: 'CORPORATE' as const, coatendId: null,
      startDate: '2026-10-08', endDate: '2026-10-10' };
    expect(getBlockOccupancyConflicts([dependency], timeline, request)).toEqual({ blocks: [], activities: [] });
    expect(getBlockOccupancyConflicts([corporate, dependency], timeline, request).blocks).toEqual([corporate]);
    expect(getBlockOccupancyConflicts([corporate], timeline, request, corporate.id).blocks).toEqual([]);
    const conflicts = getBlockOccupancyConflicts([corporate, dependency], timeline,
      { ...request, type: 'DEPENDENCY', coatendId: 'c1' });
    expect(conflicts.blocks).toHaveLength(2);
    expect(conflicts.activities).toEqual([]);
    expect(getBlockOccupancyConflicts([], timeline,
      { ...request, type: 'DEPENDENCY', coatendId: 'c1' })).toEqual({ blocks: [], activities: [] });
  });

  it('should display BC above BD above activities without mutating the source entries', () => {
    const activity = { id: 'a1', activity: Activity.SWAP, startDate: '2026-10-08', endDate: '2026-10-10',
      performerName: 'Swap', performerColor: '#123456' };
    const blocks = buildPlannerBlockEntries([dependency, corporate], '2026-10-08', 'c1', []);
    const entries = [activity, ...blocks];
    expect(getVisiblePlannerEntries(entries).map(entry => entry.id)).toEqual(['bc']);
    expect(getVisiblePlannerEntries(entries.filter(entry => entry.id !== 'bc')).map(entry => entry.id)).toEqual(['bd']);
    expect(getVisiblePlannerEntries([activity])).toEqual([activity]);
    expect(entries).toHaveLength(3);
  });

  it.each(Object.values(Activity))('should prohibit %s according to block type', activity => {
    expect(getActivityBlockingBlocks([corporate], activity, 'c1', '2026-10-08', '2026-10-08'))
      .toHaveLength(1);
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
