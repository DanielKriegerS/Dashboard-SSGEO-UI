import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { MembershipAccessService, SquadCreationRequest } from '../../services/membership-access';
import { GlobalRequestsPage } from './global-requests';

describe('GlobalRequestsPage', () => {
  const request: SquadCreationRequest = { id: 'request', userId: 'user', requesterName: 'Pessoa', requesterEmail: 'person@example.test', name: 'Equipe',
    admissionCode: 'GEO', operationalGroup: 'SWAP', status: 'PENDING', requestedAt: '2026-11-11T10:00:00Z', squadId: null };
  const service = { globalRequests: vi.fn(() => of([request])), decideCreation: vi.fn(() => of(request)) };
  beforeEach(() => {
    service.globalRequests.mockClear(); service.decideCreation.mockClear();
    TestBed.configureTestingModule({ imports: [GlobalRequestsPage], providers: [
      { provide: MembershipAccessService, useValue: service },
      { provide: AuthenticationService, useValue: { blocked: () => false, state: () => 'active' } }
    ] });
  });
  it('requires confirmation before approving a request', () => {
    const fixture = TestBed.createComponent(GlobalRequestsPage);
    fixture.componentInstance.decision.set({ request, approve: true });
    expect(service.decideCreation).not.toHaveBeenCalled();
    fixture.componentInstance.apply();
    expect(service.decideCreation).toHaveBeenCalledExactlyOnceWith('request', true);
    expect(fixture.componentInstance.decision()).toBeNull();
  });
  it('loads and decides requests for an authenticated global administrator without a team', () => {
    TestBed.overrideProvider(AuthenticationService, { useValue: { blocked: () => true, state: () => 'unassigned' } });
    const fixture = TestBed.createComponent(GlobalRequestsPage);
    expect(service.globalRequests).toHaveBeenCalledOnce();
    fixture.componentInstance.decision.set({ request, approve: false });
    fixture.componentInstance.apply();
    expect(service.decideCreation).toHaveBeenCalledExactlyOnceWith('request', false);
  });
});