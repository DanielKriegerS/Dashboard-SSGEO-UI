import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PlannerRow } from '../../../models/components/planner/PlannerRow';
import { CoatendCompleteModel } from '../../../models/coatend/CoatendCompleteModel';
import { PlannerCell } from '../../../models/components/planner/PlannerCell';
import { TimelineModel } from '../../../models/timeline/TimelineModel';
import { Planner } from "../../layout/planner/planner";
import { CoatendService } from '../../../services/coatend';
import { forkJoin } from 'rxjs';
import { TimelineService } from '../../../services/timeline-service';
import { CoatendSummary } from '../../../models/coatend/CoatendSummary';
import { PlannerQuarterGroup } from '../../../models/components/planner/PlannerQuarterGroup';
import { CoatendPlannerModel } from '../../../models/components/planner/CoatendPlannerModel';
import { PlannerEntries } from '../../../models/components/planner/PlannerEntries';
import { PlannerHeader } from '../../../models/components/planner/PlannerHeader';
import { PlannerDateSegment } from '../../../models/components/planner/PlannerDateSegment';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main',
  imports: [Planner, CommonModule],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit{  
  plannerData: PlannerRow[] = [];
  plannerHierarchy: PlannerQuarterGroup[] = [];
  
  days: string[] = [];
  visibleDays: string[] = [];

  quarterHeaders: PlannerHeader[] = [];
  sprintHeaders: PlannerHeader[] = [];

  timeline!: TimelineModel[];
  coatends!: CoatendPlannerModel[];

  dayWindowStart = 0;
  dayWindowSize = 15;

  constructor(
    private title: Title, 
    private meta: Meta,
    private coatendService : CoatendService,
    private timelineService : TimelineService,
    private cdr: ChangeDetectorRef
  ) {
      this.title.setTitle('Planner Squad');
      this.meta.addTags([
        { name: 'description', content: 'Planejamento de atividades da squad' }
    ]);
  }

  ngOnInit() {
    this.loadPlannerData();
  }


  loadPlannerData(): void {
    forkJoin({
      timeline: this.timelineService.getAll(),
      coatends: this.coatendService.getPlannerData()
    }).subscribe({
      next: (res) => {
        this.timeline = res.timeline ?? [];
        this.coatends = res.coatends ?? [];

        this.loadPlanner();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar dados do planner:', err);
      }
    });
  }

  loadPlanner(): void {
    this.days = this.generateDaysFromQuarters(this.coatends);
    this.dayWindowStart = 0;

    this.updateVisiblePlanner();
  }

  updateVisiblePlanner(): void {
    this.visibleDays = this.days.slice(
      this.dayWindowStart,
      this.dayWindowStart + this.dayWindowSize
    );

    this.plannerData = this.buildPlannerData(
      this.timeline,
      this.coatends,
      this.visibleDays
    );

    this.plannerHierarchy = this.buildPlannerHierarchy(
      this.plannerData,
      this.coatends
    );

    this.quarterHeaders = this.buildQuarterHeaders(
      this.coatends,
      this.visibleDays
    );

    this.sprintHeaders = this.buildSprintHeaders(
      this.coatends,
      this.visibleDays
    );
  }

  nextDays(): void {
    const nextStart = this.dayWindowStart + this.dayWindowSize;

    if (nextStart >= this.days.length) {
      return;
    }

    this.dayWindowStart = nextStart;
    this.updateVisiblePlanner();
    this.cdr.detectChanges();
  }

  previousDays(): void {
    if (this.dayWindowStart === 0) {
      return;
    }

    this.dayWindowStart = Math.max(
      this.dayWindowStart - this.dayWindowSize,
      0
    );

    this.updateVisiblePlanner();
    this.cdr.detectChanges();
  }

buildPlannerHierarchy(
    plannerRows: PlannerRow[],
    coatends: CoatendPlannerModel[]
  ): PlannerQuarterGroup[] {

    const result: PlannerQuarterGroup[] = [];

    const sortedCoatends = [...coatends].sort((a, b) => {
      const quarterCompare = this.toDateKey(a.quarterStartDate) - this.toDateKey(b.quarterStartDate);
      if (quarterCompare !== 0) return quarterCompare;

      const sprintCompare = this.toDateKey(a.sprintStartDate) - this.toDateKey(b.sprintStartDate);
      if (sprintCompare !== 0) return sprintCompare;

      return a.coatendNumber - b.coatendNumber;
    });

    for (const coatend of sortedCoatends) {
      const row = plannerRows.find(r => r.coatendId === coatend.id);
      if (!row) continue;

      const sprintId = coatend.sprintId;
      const sprintDesc = coatend.sprintDescription;

      const quarterId = coatend.quarterId;
      const quarterDesc = coatend.quarterDescription;

      let quarter = result.find(q => q.quarterId === quarterId);

      if (!quarter) {
        quarter = {
          quarterId,
          quarterDescription: quarterDesc,
          sprints: []
        };
        result.push(quarter);
      }

      let sprint = quarter.sprints.find(s => s.sprintId === sprintId);

      if (!sprint) {
        sprint = {
          sprintId,
          sprintDescription: sprintDesc,
          coatends: []
        };
        quarter.sprints.push(sprint);
      }

      sprint.coatends.push(row);
    }

    return result;
  }

  buildPlannerData(
    timeline: TimelineModel[],
    coatends: CoatendPlannerModel[],
    days: string[]
  ): PlannerRow[] {

    const rows: PlannerRow[] = [];

    for (const coatend of coatends) {

      const coatendTimeline = timeline.filter(t =>
        t.coatendId?.toString().trim().toLowerCase() ===
        coatend.id?.toString().trim().toLowerCase()
      );

      const cells: PlannerCell[] = days.map(day => {

        const dayKey = this.toDateKey(day);

        const rawEntries = coatendTimeline.filter(t => {
          const startKey = this.toDateKey(t.startDate);
          const endKey = this.toDateKey(t.endDate);

          return dayKey >= startKey && dayKey <= endKey;
        });

        const entries: PlannerEntries[] = rawEntries.map(t => ({
          activity: t.activity,
          developerId: t.developerId,
          developerName: t.developerName
        }));

        return {
          date: day,
          entries
        };
      });

      rows.push({
        coatendId: coatend.id,
        coatendDescription: coatend.description,
        cells
      });
    }

    return rows;
  }

 toDateKey(date: string): number {
    return Number(this.normalizeDate(date).replace(/-/g, ''));
  }

  generateDaysFromQuarters(coatends: CoatendPlannerModel[]): string[] {
    if (!coatends.length) {
      return [];
    }

    const quarterDates = coatends.flatMap(c => [
      this.normalizeDate(c.quarterStartDate),
      this.normalizeDate(c.quarterEndDate)
    ]);

    const sortedDates = [...quarterDates].sort();

    const min = sortedDates[0];
    const max = sortedDates[sortedDates.length - 1];

    return this.generateDays(
      this.parseLocalDate(min),
      this.parseLocalDate(max)
    );
  }

  generateDays(start: Date, end: Date): string[] {

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {

      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');

      dates.push(`${year}-${month}-${day}`); 

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  buildQuarterHeaders(
    coatends: CoatendPlannerModel[],
    visibleDays: string[]
  ): PlannerHeader[] {
    const quarters = this.getUniqueQuarters(coatends);

    return this.buildDateSegmentHeaders(
      visibleDays,
      quarters
    );
  }

buildSprintHeaders(
  coatends: CoatendPlannerModel[],
  visibleDays: string[]
): PlannerHeader[] {
  const sprints = this.getUniqueSprints(coatends);

  return this.buildDateSegmentHeaders(
    visibleDays,
    sprints
  );
}

buildDateSegmentHeaders(
  visibleDays: string[],
  segments: PlannerDateSegment[]
): PlannerHeader[] {
  const headers: PlannerHeader[] = [];

  if (!visibleDays.length) {
    return headers;
  }

  let currentHeader: PlannerHeader | null = null;

  for (const day of visibleDays) {
    const dayKey = this.toDateKey(day);

    const segment = segments.find(s => {
      const startKey = this.toDateKey(s.startDate);
      const endKey = this.toDateKey(s.endDate);

      return dayKey >= startKey && dayKey <= endKey;
    });

    const id = segment ? segment.id : '__empty__';
    const description = segment ? segment.description : '';

    if (!currentHeader) {
      currentHeader = {
        id,
        description,
        colspan: 1
      };

      continue;
    }

    if (this.normalizeId(currentHeader.id) === this.normalizeId(id)) {
      currentHeader.colspan++;
    } else {
      headers.push(currentHeader);

      currentHeader = {
        id,
        description,
        colspan: 1
      };
    }
  }

  if (currentHeader) {
    headers.push(currentHeader);
  }

  return headers;
  }

  getUniqueQuarters(coatends: CoatendPlannerModel[]): PlannerDateSegment[] {
    
    const map = new Map<string, PlannerDateSegment>();

    for (const coatend of coatends) {
      const quarterKey = this.normalizeId(coatend.quarterId);

      if (!map.has(quarterKey)) {
        map.set(quarterKey, {
          id: coatend.quarterId,
          description: coatend.quarterDescription,
          startDate: this.normalizeDate(coatend.quarterStartDate),
          endDate: this.normalizeDate(coatend.quarterEndDate)
        });
      }
    }

    
    return Array.from(map.values()).sort(
      (a, b) => this.toDateKey(a.startDate) - this.toDateKey(b.startDate)
    );
  }

    getUniqueSprints(coatends: CoatendPlannerModel[]): PlannerDateSegment[] {
    
    const map = new Map<string, PlannerDateSegment>();

    for (const coatend of coatends) {
      const sprintKey = this.normalizeId(coatend.sprintId);

      if (!map.has(sprintKey)) {
        map.set(sprintKey, {
          id: coatend.sprintId,
          description: coatend.sprintDescription,
          startDate: this.normalizeDate(coatend.sprintStartDate),
          endDate: this.normalizeDate(coatend.sprintEndDate)
        });
      }
    }
    
    return Array.from(map.values()).sort(
      (a, b) => this.toDateKey(a.startDate) - this.toDateKey(b.startDate)
    );
  }


  normalizeDate(date: string): string {
  return date.substring(0, 10);
  }

  normalizeId(id?: string): string {
    return (id ?? '').toString().trim().toLowerCase();
  }

  parseLocalDate(date: string): Date {
    const normalized = this.normalizeDate(date);
    const [year, month, day] = normalized.split('-').map(Number);

    return new Date(year, month - 1, day);
  }
}
