import { BlockRequest, PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { PlannerEntries } from '../../models/components/planner/PlannerEntries';
import { TimelineModel } from '../../models/timeline/TimelineModel';

export function blockAppliesToCoatend(block: PlanningBlock, coatendId: string | null): boolean {
  return block.type === 'CORPORATE' || Boolean(coatendId && block.coatendId
    && block.coatendId.trim().toLowerCase() === coatendId.trim().toLowerCase());
}

export function getActivityBlockingBlocks(
  blocks: PlanningBlock[], activity: string, coatendId: string,
  startDate: string, endDate: string
): PlanningBlock[] {
  if (!activity || !coatendId || !startDate || !endDate || endDate < startDate) {
    return [];
  }
  return blocks.filter(block => blockAppliesToCoatend(block, coatendId)
    && block.startDate.substring(0, 10) <= endDate && block.endDate.substring(0, 10) >= startDate);
}

export function getBlockOccupancyConflicts(
  blocks: PlanningBlock[], timeline: TimelineModel[], request: BlockRequest, excludedBlockId?: string
): { blocks: PlanningBlock[]; activities: TimelineModel[] } {
  if (!request.startDate || !request.endDate || request.endDate < request.startDate
    || (request.type === 'DEPENDENCY' && !request.coatendId)) {
    return { blocks: [], activities: [] };
  }
  return {
    blocks: blocks.filter(block => block.id !== excludedBlockId
      && (request.type !== 'CORPORATE' || block.type === 'CORPORATE')
      && (request.type === 'CORPORATE' || blockAppliesToCoatend(block, request.coatendId))
      && block.startDate.substring(0, 10) <= request.endDate && block.endDate.substring(0, 10) >= request.startDate),
    activities: []
  };
}

export function getVisiblePlannerEntries(entries: PlannerEntries[]): PlannerEntries[] {
  const corporate = entries.filter(entry => entry.blockType === 'CORPORATE');
  if (corporate.length) {
    return corporate;
  }
  const dependency = entries.filter(entry => entry.blockType === 'DEPENDENCY');
  return dependency.length ? dependency : entries;
}

export function buildPlannerBlockEntries(
  blocks: PlanningBlock[], day: string, coatendId: string | null, timeline: TimelineModel[]
): PlannerEntries[] {
  return blocks.filter(block => blockAppliesToCoatend(block, coatendId)
    && day >= block.startDate.substring(0, 10) && day <= block.endDate.substring(0, 10)
  ).map(block => ({
    id: block.id,
    activity: '',
    blockType: block.type,
    startDate: block.startDate,
    endDate: block.endDate,
    performerName: block.type === 'CORPORATE' ? 'Bloqueio corporativo' : 'Bloqueio de dependência',
    performerColor: block.type === 'CORPORATE' ? '#334155' : '#b91c1c',
    hasConflict: timeline.some(entry => block.conflictingActivityIds.includes(entry.id)
      && (coatendId === null || entry.coatendId?.trim().toLowerCase() === coatendId.trim().toLowerCase())
      && day >= entry.startDate.substring(0, 10) && day <= entry.endDate.substring(0, 10))
  }));
}
