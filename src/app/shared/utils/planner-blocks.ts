import { BlockRequest, PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { PlannerEntries } from '../../models/components/planner/PlannerEntries';
import { TimelineModel } from '../../models/timeline/TimelineModel';
import { PlannerItemRef } from '../../models/components/planner/PlannerItemRef';

export function blockAppliesToCoatend(block: PlanningBlock, coatendId: string | null): boolean {
  return blockAppliesToItem(block, coatendId ? { kind: 'coatend', id: coatendId } : null);
}

export function blockAppliesToItem(block: PlanningBlock, owner: PlannerItemRef | null): boolean {
  if (block.type === 'CORPORATE') return true;
  const target = block.owner ?? (block.coatendId ? { kind: 'coatend' as const, id: block.coatendId } : null);
  return Boolean(owner && target && target.kind === owner.kind && target.id.toLowerCase() === owner.id.toLowerCase());
}

export function getActivityBlockingBlocks(
  blocks: PlanningBlock[], activity: string, coatendId: string | PlannerItemRef,
  startDate: string, endDate: string
): PlanningBlock[] {
  if (!activity || !coatendId || !startDate || !endDate || endDate < startDate) {
    return [];
  }
  const owner = typeof coatendId === 'string' ? { kind: 'coatend' as const, id: coatendId } : coatendId;
  return blocks.filter(block => blockAppliesToItem(block, owner)
    && block.startDate.substring(0, 10) <= endDate && block.endDate.substring(0, 10) >= startDate);
}

export function getBlockOccupancyConflicts(
  blocks: PlanningBlock[], timeline: TimelineModel[], request: BlockRequest, excludedBlockId?: string
): { blocks: PlanningBlock[]; activities: TimelineModel[] } {
  if (!request.startDate || !request.endDate || request.endDate < request.startDate
    || (request.type === 'DEPENDENCY' && !request.coatendId && !request.owner)) {
    return { blocks: [], activities: [] };
  }
  return {
    blocks: blocks.filter(block => block.id !== excludedBlockId
      && (request.type !== 'CORPORATE' || block.type === 'CORPORATE')
      && (request.type === 'CORPORATE' || blockAppliesToItem(block, request.owner ?? (request.coatendId ? { kind: 'coatend', id: request.coatendId } : null)))
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
  blocks: PlanningBlock[], day: string, coatendId: string | PlannerItemRef | null, timeline: TimelineModel[]
): PlannerEntries[] {
  const owner = typeof coatendId === 'string' ? { kind: 'coatend' as const, id: coatendId } : coatendId;
  return blocks.filter(block => blockAppliesToItem(block, owner)
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
      && (owner === null || owner.kind === 'coatend' && entry.coatendId?.trim().toLowerCase() === owner.id.trim().toLowerCase())
      && day >= entry.startDate.substring(0, 10) && day <= entry.endDate.substring(0, 10))
  }));
}
