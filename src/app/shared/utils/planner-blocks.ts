import { PlanningBlock } from '../../models/components/planner/PlanningBlock';
import { PlannerEntries } from '../../models/components/planner/PlannerEntries';
import { TimelineModel } from '../../models/timeline/TimelineModel';
import { Activity } from '../../models/components/Activities';

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
    && block.startDate.substring(0, 10) <= endDate && block.endDate.substring(0, 10) >= startDate
    && (block.type === 'DEPENDENCY' || activity === Activity.PRE_SWAP || activity === Activity.SWAP));
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
