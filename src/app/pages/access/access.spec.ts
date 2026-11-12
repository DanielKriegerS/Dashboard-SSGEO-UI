import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { AdmissionRequest, MembershipAccessService } from '../../services/membership-access';
import { AccessPage } from './access';

describe('AccessPage', () => {
  const pending: AdmissionRequest = { id: 'request', userId: 'user', squadId: 'squad', name: 'Pessoa', status: 'PENDING', requestedAt: '2026-11-10T10:00:00Z', decidedAt: null };
  let service: { ownRequest: ReturnType<typeof vi.fn>; request: ReturnType<typeof vi.fn>; ownCreationRequest: ReturnType<typeof vi.fn>; requestCreation: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    service = { ownRequest: vi.fn(() => of(null)), request: vi.fn(() => of(pending)), ownCreationRequest: vi.fn(() => of(null)), requestCreation: vi.fn(() => of({ status: 'PENDING' })) };
    TestBed.configureTestingModule({ imports: [AccessPage], providers: [
      { provide: MembershipAccessService, useValue: service },
      { provide: AuthenticationService, useValue: { state: () => 'unassigned' } }
    ] });
  });
  it('submits a code without granting membership and clears it only on success', async () => {
    const fixture = TestBed.createComponent(AccessPage);
    fixture.componentInstance.form.controls.code.setValue('  opaque-code  ');
    fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(service.request).toHaveBeenCalledWith('opaque-code');
    expect(fixture.componentInstance.form.controls.code.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Pedido pendente');
    expect(fixture.nativeElement.querySelector('#admission-code')).toBeNull();
    fixture.componentInstance.submit();
    expect(service.request).toHaveBeenCalledOnce();
  });
  it('retains the code on a throttled request and permits an explicit retry', async () => {
    service.request.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    const fixture = TestBed.createComponent(AccessPage);
    fixture.componentInstance.form.controls.code.setValue('opaque');
    fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.code.value).toBe('opaque');
    expect(fixture.nativeElement.textContent).toContain('Limite de tentativas');
    expect(fixture.componentInstance.busy()).toBe(false);
  });
  it('shows a rejected request without exposing a Squad catalog', async () => {
    service.ownRequest.mockReturnValue(of({ ...pending, status: 'REJECTED' }));
    const fixture = TestBed.createComponent(AccessPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Pedido rejeitado');
    expect(fixture.nativeElement.querySelector('#admission-code')).not.toBeNull();
  });
  it('submits a creation request without granting access', () => {
    const fixture = TestBed.createComponent(AccessPage);
    fixture.componentInstance.creationForm.setValue({ name: 'Equipe Nova', admissionCode: 'NOVA', operationalGroup: 'SWAP' });
    fixture.componentInstance.submitCreation();
    expect(service.requestCreation).toHaveBeenCalledExactlyOnceWith({ name: 'Equipe Nova', admissionCode: 'NOVA', operationalGroup: 'SWAP' });
    expect(fixture.componentInstance.creation()?.status).toBe('PENDING');
  });
});