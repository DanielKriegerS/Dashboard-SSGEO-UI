import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CoatendFeature } from './coatend-feature';
import { FeatureService } from '../../services/feature';
import { CoatendService } from '../../services/coatend';
import { CoatendMilestoneModel } from '../../models/coatend/CoatendMilestoneModel';

describe('Coatend Feature and milestones', () => {
  const feature = { id: 'f1', name: 'Entrega', description: null, coatends: [{ id: 'c1', weight: null }] };
  const state: CoatendMilestoneModel = { coatendId: 'c1', referenceDate: '2026-10-09', zone: 'America/Sao_Paulo', warnings: [],
    tu: { plannedEnd: '2026-10-08', confirmedAt: null, confirmedBy: null, unavailableReason: null },
    swap: { plannedEnd: '2026-10-15', confirmedAt: null, confirmedBy: null, unavailableReason: null } };
  const features = { getAll: vi.fn(() => of([feature])), link: vi.fn(() => of({})), unlink: vi.fn(() => of(void 0)) };
  const coatends = { getMilestones: vi.fn(() => of(state)), confirmMilestone: vi.fn(() => of(state)) };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: FeatureService, useValue: features }, { provide: CoatendService, useValue: coatends }] });
  });

  async function render() {
    const fixture = TestBed.createComponent(CoatendFeature);
    fixture.componentRef.setInput('coatendId', 'c1');
    await fixture.whenStable();
    return fixture;
  }

  it('requires TU first and an explicit confirmation', async () => {
    const fixture = await render();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.find(button => button.textContent?.includes('Confirmar SWAP'))?.disabled).toBe(true);
    fixture.componentInstance.confirm();
    expect(coatends.confirmMilestone).not.toHaveBeenCalled();
    fixture.componentInstance.confirmation.set('TU');
    fixture.componentInstance.confirm();
    expect(coatends.confirmMilestone).toHaveBeenCalledWith('c1', 'TU');
  });

  it('does not mark completion after failed confirmation', async () => {
    coatends.confirmMilestone.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    const fixture = await render();
    const component = fixture.componentInstance;
    component.confirmation.set('TU');
    component.confirm();
    await fixture.whenStable();
    expect(component.milestones()?.tu.confirmedAt).toBeNull();
    expect(component.error()).toContain('conflito');
    expect(component.confirmation()).toBe('TU');
  });

  it('allows missing weight but rejects zero and negative weights', async () => {
    const component = (await render()).componentInstance;
    for (const weight of [0, -1]) {
      component.form.setValue({ featureId: 'f1', weight });
      component.saveLink();
    }
    expect(features.link).not.toHaveBeenCalled();
    component.form.controls.weight.setValue(null);
    component.saveLink();
    expect(features.link).toHaveBeenCalledWith('f1', 'c1', null);
  });

  it('requires unlink before transfer and keeps state after unlink failure', async () => {
    features.unlink.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    const component = (await render()).componentInstance;
    component.form.controls.featureId.setValue('f2');
    component.saveLink();
    expect(features.link).not.toHaveBeenCalled();
    expect(component.error()).toContain('Desvincule');
    component.confirmation.set('UNLINK');
    component.confirm();
    expect(features.unlink).toHaveBeenCalledWith('f1', 'c1');
    expect(component.currentFeature()?.id).toBe('f1');
  });

  it('shows a load error instead of assuming an empty or confirmed state', async () => {
    coatends.getMilestones.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const component = (await render()).componentInstance;
    expect(component.milestones()).toBeNull();
    expect(component.error()).toContain('carregar');
  });

  it('explains why milestones cannot be confirmed', async () => {
    coatends.getMilestones.mockReturnValueOnce(of({ ...state,
      tu: { ...state.tu, unavailableReason: 'MISSING_TU' },
      swap: { ...state.swap, unavailableReason: 'INVALID_SWAP_WINDOW' } }));
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('TU nao planejada');
    expect(fixture.nativeElement.textContent).toContain('Periodo de SWAP invalido');
    expect(fixture.nativeElement.textContent).toContain('Confirme a TU primeiro.');
  });
});