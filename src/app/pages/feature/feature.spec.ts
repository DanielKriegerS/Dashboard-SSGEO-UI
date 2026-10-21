import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Feature } from './feature';
import { Features } from '../features/features';
import { FeatureService } from '../../services/feature';
import { CoatendService } from '../../services/coatend';

describe('Feature administration', () => {
  const feature = { id: 'f1', name: 'Entrega', description: null, coatends: [{ id: 'c1', description: 'Coatend', coatendNumber: 1, featureId: 'f1', weight: null }] };
  const phase = { plannedStart: null, plannedEnd: null, effectiveStart: null, confirmedAt: null,
    confirmed: false, estimatedPercent: null, unavailableReasons: ['MISSING_WEIGHT'], limitations: [] };
  const service = {
    getAll: vi.fn(() => of([feature])), getById: vi.fn(() => of(feature)),
    getPlanning: vi.fn(() => of({ id: 'f1', referenceDate: '2026-10-09', zone: 'America/Sao_Paulo', development: phase, homologation: phase, warnings: [], coatends: [], pendingCoatendCount: 0 })),
    create: vi.fn(() => of(feature)), update: vi.fn(() => of(feature)), delete: vi.fn(() => of(void 0)),
    link: vi.fn(() => of({})), unlink: vi.fn(() => of(void 0))
  };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'f1']]) } } },
      { provide: FeatureService, useValue: service },
      { provide: CoatendService, useValue: { getAll: () => of([{ id: 'c1', description: 'Coatend', coatendNumber: 1 }]) } }
    ] });
  });

  it('renders unavailable progress without inventing a percentage', async () => {
    const fixture = TestBed.createComponent(Feature);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Indisponivel');
    expect(fixture.nativeElement.textContent).toContain('Peso nao informado');
    expect(fixture.nativeElement.textContent).toContain('Conclusao nao confirmada');
  });

  it('keeps the Feature and error visible after deletion conflict', async () => {
    service.delete.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    const fixture = TestBed.createComponent(Feature);
    const component = fixture.componentInstance;
    component.confirmingDelete.set(true);
    component.remove();
    await fixture.whenStable();
    expect(component.feature()).toEqual(feature);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Desvincule');
  });

  it('requires explicit deletion and waits for success before navigation', () => {
    const pending = new Subject<undefined>();
    service.delete.mockReturnValueOnce(pending);
    const component = TestBed.createComponent(Feature).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.remove();
    expect(service.delete).not.toHaveBeenCalled();
    component.confirmingDelete.set(true);
    component.remove();
    expect(component.saving()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    pending.next(undefined); pending.complete();
    expect(navigate).toHaveBeenCalledWith(['/admin/features']);
  });

  it('saves optional weight, rejects zero and uses explicit unlink', () => {
    const component = TestBed.createComponent(Feature).componentInstance;
    component.linkForm.setValue({ coatendId: 'c1', weight: 0 });
    component.saveLink();
    expect(service.link).not.toHaveBeenCalled();
    component.linkForm.controls.weight.setValue(null);
    component.saveLink();
    expect(service.link).toHaveBeenCalledWith('f1', 'c1', null);
    component.unlink();
    expect(service.unlink).not.toHaveBeenCalled();
    component.confirmingUnlink.set('c1');
    component.unlink();
    expect(service.unlink).toHaveBeenCalledWith('f1', 'c1');
  });

  it('retains entered metadata after save failure', () => {
    service.update.mockReturnValueOnce(throwError(() => ({ status: 400 })));
    const component = TestBed.createComponent(Feature).componentInstance;
    component.form.setValue({ name: 'Alterada', description: 'Descricao' });
    component.save();
    expect(component.form.getRawValue().name).toBe('Alterada');
    expect(component.error()).toContain('mantidos');
  });

  it('renders empty and failed list states', async () => {
    service.getAll.mockReturnValueOnce(of([]));
    const fixture = TestBed.createComponent(Features);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma Feature');
    service.getAll.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    fixture.componentInstance.load();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('carregar');
  });
});