import { TestBed } from '@angular/core/testing';

import { PlannerExportContextService } from './planner-export-context';

describe('PlannerExportContextService', () => {
  let service: PlannerExportContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlannerExportContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.canExport()).toBe(false);
  });

  it('should copy the current window and selection without sharing mutable inputs', () => {
    const days = ['2026-10-15', '2026-10-16'];
    const selection = { type: 'period' as const, startDate: days[0], endDate: days[1] };
    service.update(days, selection);
    days.push('2026-10-17');
    selection.startDate = '2026-10-01';
    expect(service.visibleDays()).toEqual(['2026-10-15', '2026-10-16']);
    expect(service.displaySelection()).toEqual({
      type: 'period', startDate: '2026-10-15', endDate: '2026-10-16'
    });
    expect(service.canExport()).toBe(true);
  });

  it('should clear stale context when leaving the planner', () => {
    service.update(['2026-10-15'], { type: 'count', count: 1 });
    service.clear();
    expect(service.visibleDays()).toEqual([]);
    expect(service.displaySelection()).toEqual({ type: 'count', count: 15 });
    expect(service.canExport()).toBe(false);
  });
});
