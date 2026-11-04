import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { EMPTY, of, Subject } from 'rxjs';
import { Incident } from './incident';
import { IncidentService } from '../../services/incident';
import { PlanningBlockService } from '../../services/planning-block';
import { DeveloperService } from '../../services/developer-service';

describe('Incident page', () => {
  const service = { create: vi.fn(), update: vi.fn() };
  beforeEach(async () => {
    service.create.mockReset(); service.update.mockReset();
    const paramMap = convertToParamMap({});
    await TestBed.configureTestingModule({ imports: [Incident], providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(paramMap), snapshot: { paramMap } } },
      { provide: IncidentService, useValue: service },
      { provide: PlanningBlockService, useValue: { getAll: () => of([]) } },
      { provide: DeveloperService, useValue: { getAll: () => of([]) } }
    ] }).compileComponents();
  });

  it('creates an avulso Incident preserving code and prevents duplicate submission', async () => {
    const pending = new Subject<{ id: string; code: string; description: string; completed: boolean }>();
    service.create.mockReturnValue(pending);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Incident);
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({ code: 'INC001769649', description: 'Incident' });
    fixture.componentInstance.save();
    fixture.componentInstance.save();
    expect(service.create).toHaveBeenCalledExactlyOnceWith({ code: 'INC001769649', description: 'Incident' });
    expect(fixture.componentInstance.busy()).toBe(true);
    pending.next({ id: 'i1', code: 'INC001769649', description: 'Incident', completed: false }); pending.complete();
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/incidents', 'i1']);
  });

  it('does not navigate on cancelled commands and restores busy state', async () => {
    service.create.mockReturnValue(EMPTY);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Incident);
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({ code: 'INC1', description: 'Incident' });
    fixture.componentInstance.save();
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects invalid codes and blank descriptions before HTTP', async () => {
    const fixture = TestBed.createComponent(Incident);
    await fixture.whenStable();
    fixture.componentInstance.form.setValue({ code: 'bad', description: 'Incident' });
    fixture.componentInstance.save();
    fixture.componentInstance.form.setValue({ code: 'INC1', description: ' ' });
    fixture.componentInstance.save();
    expect(service.create).not.toHaveBeenCalled();
  });
});