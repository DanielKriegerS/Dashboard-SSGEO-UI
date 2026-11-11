import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Developers } from './developers';
import { DeveloperService } from '../../services/developer-service';
import { FeedbackService } from '../../services/feedback';
import { of } from 'rxjs';

describe('Developers', () => {
  let component: Developers;
  let fixture: ComponentFixture<Developers>;
  const service = { getAll: vi.fn(() => of([{ id: 'legacy', name: 'Historico', color: '#123456', membershipId: null }])),
    getEligibleMembers: vi.fn(() => of([{ membershipId: 'eligible', displayName: 'Membro elegivel' }])),
    create: vi.fn(() => of({})), update: vi.fn(() => of({})), delete: vi.fn(() => of(undefined)) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Developers],
      providers: [{ provide: DeveloperService, useValue: service },
        { provide: FeedbackService, useValue: { success: vi.fn(), error: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(Developers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requires explicit eligible membership instead of matching a name', () => {
    component.createDeveloper({ id: '', name: 'Membro elegivel', color: '#123456' });
    expect(service.create).not.toHaveBeenCalled();
    component.selectedMembershipId = 'eligible';
    component.createDeveloper({ id: '', name: 'Nome de exibicao', color: '#123456' });
    expect(service.create).toHaveBeenCalledWith({ name: 'Nome de exibicao', color: '#123456', membershipId: 'eligible' });
  });

  it('links a legacy profile only after explicit selection and never relinks an existing identity', () => {
    const legacy = { id: 'legacy', name: 'Historico', color: '#123456' };
    component.startEdit(legacy); component.editingMembershipId = 'eligible'; component.updateDeveloper(legacy);
    expect(service.update).toHaveBeenCalledWith('legacy', { membershipId: 'eligible' });
    service.update.mockClear();
    const linked = { ...legacy, membershipId: 'existing' };
    component.startEdit(linked); component.editingMembershipId = 'eligible'; component.updateDeveloper(linked);
    expect(service.update).not.toHaveBeenCalled();
  });
});
