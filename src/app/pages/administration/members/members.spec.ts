import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthenticationService, CurrentUser } from '../../../services/authentication';
import { MembershipAccessService, SquadMember, AdmissionRequest } from '../../../services/membership-access';
import { MembersPage } from './members';
import { ActivityStyleService } from '../../../services/activity-style';

describe('MembersPage', () => {
  const member: SquadMember = { id: 'member', userId: 'other', name: 'Pessoa', role: 'MEMBER', operationalGroup: 'SWAP', active: true, accountActive: true };
  const request: AdmissionRequest = { id: 'request', userId: 'candidate', squadId: 'squad', name: 'Candidata', status: 'PENDING', requestedAt: '2026-11-10T10:00:00Z', decidedAt: null };
  let service: { squad: ReturnType<typeof vi.fn>; changeSquad: ReturnType<typeof vi.fn>; members: ReturnType<typeof vi.fn>; pending: ReturnType<typeof vi.fn>; change: ReturnType<typeof vi.fn>; approve: ReturnType<typeof vi.fn>; reject: ReturnType<typeof vi.fn> };
  const user = signal<CurrentUser>({ userId: 'admin', name: 'Admin', role: 'ADMIN', accessState: 'ACTIVE', squadId: 'squad' });
  let stylesService: { getAll: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let routeData: { section?: string };
  beforeEach(() => {
    routeData = {};
    user.set({ userId: 'admin', name: 'Admin', role: 'ADMIN', accessState: 'ACTIVE', squadId: 'squad' });
    stylesService = { getAll: vi.fn(() => of([{ activity: 'HOMOLOGATION', color: '#123456' }, { activity: 'ANALYSIS', color: null }])), update: vi.fn(() => of({ activity: 'HOMOLOGATION', color: '#abcdef' })) };
    service = { squad: vi.fn(() => of({ id: 'squad', name: 'Equipe DEV', admissionCode: 'CODE-DEV' })), changeSquad: vi.fn(() => of({ id: 'squad', name: 'Nova equipe', admissionCode: 'SSGEO' })), members: vi.fn(() => of([member])), pending: vi.fn(() => of([request])), change: vi.fn(() => of(member)), approve: vi.fn(() => of(request)), reject: vi.fn(() => of(request)) };
    TestBed.configureTestingModule({ imports: [MembersPage], providers: [
      { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } },
      { provide: MembershipAccessService, useValue: service },
      { provide: ActivityStyleService, useValue: stylesService },
      { provide: AuthenticationService, useValue: { user, blocked: () => false, refresh: () => of(user()) } }
    ] });
  });
  it('requires explicit confirmation and sends only the selected request/group', () => {
    const fixture = TestBed.createComponent(MembersPage);
    fixture.componentInstance.approve(request, 'ADMINISTRATIVO');
    expect(service.approve).not.toHaveBeenCalled();
    fixture.componentInstance.apply();
    expect(service.approve).toHaveBeenCalledExactlyOnceWith('request', 'ADMINISTRATIVO');
    expect(fixture.componentInstance.decision()).toBeNull();
  });
  it('reviews squad changes before sending and blocks stale squad context', () => {
    routeData.section = 'team';
    const fixture = TestBed.createComponent(MembersPage);
    fixture.componentInstance.startSquadEdit(fixture.componentInstance.squad()!);
    fixture.componentInstance.squadForm.setValue({ name: 'Nova equipe', admissionCode: 'SSGEO' });
    fixture.componentInstance.prepareSquad();
    expect(service.changeSquad).not.toHaveBeenCalled();
    user.update(value => ({ ...value, squadId: 'other-squad' }));
    fixture.componentInstance.apply();
    expect(service.changeSquad).not.toHaveBeenCalled();
    user.update(value => ({ ...value, squadId: 'squad' }));
    fixture.componentInstance.apply();
    expect(service.changeSquad).toHaveBeenCalledExactlyOnceWith({ name: 'Nova equipe', admissionCode: 'SSGEO' });
  });
  it('keeps squad edits available when the code is already in use', () => {
    routeData.section = 'team';
    service.changeSquad.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SQUAD_CODE_EXISTS' } })));
    const fixture = TestBed.createComponent(MembersPage);
    fixture.componentInstance.startSquadEdit(fixture.componentInstance.squad()!);
    fixture.componentInstance.squadForm.setValue({ name: 'Nova equipe', admissionCode: 'SSGEO' });
    fixture.componentInstance.prepareSquad();
    fixture.componentInstance.apply();
    expect(fixture.componentInstance.editingSquad()).toBe(true);
    expect(fixture.componentInstance.error()).toContain('Codigo de equipe em uso');
  });
  it('retains the editor on a last-admin conflict without retrying', async () => {
    service.change.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(MembersPage);
    fixture.componentInstance.startEdit(member);
    fixture.componentInstance.form.patchValue({ active: false, role: 'ADMIN' });
    fixture.componentInstance.prepareMember(member);
    fixture.componentInstance.apply();
    await fixture.whenStable();
    expect(service.change).toHaveBeenCalledExactlyOnceWith('member', { role: 'ADMIN', operationalGroup: 'SWAP', active: false });
    expect(fixture.componentInstance.editing()).toBe('member');
    expect(fixture.nativeElement.textContent).toContain('ultimo admin');
  });
  it('never loads privileged data or submits decisions for MEMBER', async () => {
    user.update(value => ({ ...value, role: 'MEMBER' }));
    const fixture = TestBed.createComponent(MembersPage);
    fixture.componentInstance.reject(request); fixture.componentInstance.apply();
    await fixture.whenStable();
    expect(service.members).not.toHaveBeenCalled();
    expect(service.squad).not.toHaveBeenCalled();
    expect(stylesService.getAll).not.toHaveBeenCalled();
    fixture.componentInstance.prepareStyle('HOMOLOGATION', '#abcdef'); fixture.componentInstance.apply();
    expect(stylesService.update).not.toHaveBeenCalled();
    expect(service.reject).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('CODE-DEV');
  });

  it('displays the own squad code with an accessible copy button', async () => {
    routeData.section = 'team';
    const fixture = TestBed.createComponent(MembersPage);
    await fixture.whenStable();
    expect(service.squad).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.squad-code-line code').textContent).toBe('CODE-DEV');
    expect(fixture.nativeElement.querySelector('[aria-label="Copiar codigo da equipe"]')).not.toBeNull();
  });

  it.each([true, false])('handles clipboard availability and failure (success=%s)', async success => {
    routeData.section = 'team';
    const fixture = TestBed.createComponent(MembersPage);
    const previous = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = success ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new Error('Denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await fixture.componentInstance.copySquadCode();
      expect(writeText).toHaveBeenCalledExactlyOnceWith('CODE-DEV');
      expect(success ? fixture.componentInstance.notice() : fixture.componentInstance.error())
        .toContain(success ? 'copiado' : 'Selecione e copie');
    } finally {
      if (previous) Object.defineProperty(navigator, 'clipboard', previous);
      else delete (navigator as { clipboard?: Clipboard }).clipboard;
    }
  });

  it('hides the old squad code after a session squad change', async () => {
    routeData.section = 'team';
    const fixture = TestBed.createComponent(MembersPage);
    await fixture.whenStable();
    user.update(value => ({ ...value, squadId: 'other-squad' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.squad-code-line')).toBeNull();
    await fixture.componentInstance.copySquadCode();
    expect(fixture.componentInstance.notice()).toBe('');
  });

  it('keeps controls busy until the post-mutation refresh completes', () => {
    const fixture = TestBed.createComponent(MembersPage);
    const refreshed = new Subject<SquadMember[]>();
    service.members.mockReturnValue(refreshed);
    fixture.componentInstance.approve(request, 'SWAP'); fixture.componentInstance.apply();
    expect(fixture.componentInstance.busy()).toBe(true);
    fixture.componentInstance.reject(request); fixture.componentInstance.apply();
    expect(service.reject).not.toHaveBeenCalled();
    refreshed.next([member]); refreshed.complete();
    expect(fixture.componentInstance.busy()).toBe(false);
  });

  it('changes collective colors only after confirmation and leaves individual styles out', () => {
    routeData.section = 'team';
    const fixture = TestBed.createComponent(MembersPage);
    expect(fixture.componentInstance.styles()).toEqual([{ activity: 'HOMOLOGATION', color: '#123456' }]);
    fixture.componentInstance.prepareStyle('ANALYSIS', '#abcdef');
    expect(fixture.componentInstance.decision()).toBeNull();
    fixture.componentInstance.prepareStyle('HOMOLOGATION', '#abcdef');
    expect(stylesService.update).not.toHaveBeenCalled();
    fixture.componentInstance.apply();
    expect(stylesService.update).toHaveBeenCalledExactlyOnceWith('HOMOLOGATION', '#abcdef');
  });

  it.each([false, true])('separates content and queries between screens (team=%s)', async team => {
    routeData.section = team ? 'team' : undefined;
    const fixture = TestBed.createComponent(MembersPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe(team ? 'Manutenção Equipe' : 'Pedidos e Membros');
    expect(!!fixture.nativeElement.querySelector('#requests-title')).toBe(!team);
    expect(!!fixture.nativeElement.querySelector('#members-title')).toBe(!team);
    expect(!!fixture.nativeElement.querySelector('#squad-title')).toBe(team);
    expect(!!fixture.nativeElement.querySelector('#colors-title')).toBe(team);
    expect(service.members.mock.calls.length).toBe(team ? 0 : 1);
    expect(service.pending.mock.calls.length).toBe(team ? 0 : 1);
    expect(service.squad.mock.calls.length).toBe(team ? 1 : 0);
    expect(stylesService.getAll.mock.calls.length).toBe(team ? 1 : 0);
  });
});