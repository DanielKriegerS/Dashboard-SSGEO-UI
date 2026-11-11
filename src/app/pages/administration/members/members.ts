import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin, Observable } from 'rxjs';
import { AuthenticationService } from '../../../services/authentication';
import { AdmissionRequest, MemberChange, MembershipAccessService, MembershipRole, OperationalGroup, SquadAccess, SquadMember } from '../../../services/membership-access';
import { ActivityStyle, ActivityStyleService, collectiveActivityLabels } from '../../../services/activity-style';

type Decision = { kind: 'approve'; request: AdmissionRequest; group: OperationalGroup }
  | { kind: 'reject'; request: AdmissionRequest }
  | { kind: 'member'; member: SquadMember; change: MemberChange }
  | { kind: 'style'; activity: string; color: string };

@Component({
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './members.html',
  styleUrl: './members.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembersPage {
  readonly auth = inject(AuthenticationService);
  private readonly service = inject(MembershipAccessService);
  private readonly stylesService = inject(ActivityStyleService);
  readonly styles = signal<ActivityStyle[]>([]);
  readonly activityLabels = collectiveActivityLabels;
  readonly squad = signal<SquadAccess | null>(null);
  readonly members = signal<SquadMember[]>([]);
  readonly pending = signal<AdmissionRequest[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editing = signal<string | null>(null);
  readonly decision = signal<Decision | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    role: ['MEMBER' as MembershipRole], operationalGroup: ['DESENVOLVEDORES' as OperationalGroup], active: [true]
  });

  constructor() { this.load(); }

  load(): void {
    if (this.busy() || this.auth.user()?.role !== 'ADMIN' || this.auth.blocked()) { return; }
    this.busy.set(true); this.error.set('');
    this.squad.set(null);
    forkJoin({ squad: this.service.squad(), members: this.service.members(), pending: this.service.pending(), styles: this.stylesService.getAll() })
      .pipe(finalize(() => this.busy.set(false))).subscribe({
        next: result => {
          this.squad.set(result.squad);
          this.members.set(result.members); this.pending.set(result.pending);
          this.styles.set(result.styles.filter(style => Object.hasOwn(this.activityLabels, style.activity) && style.color !== null));
        },
        error: () => this.error.set('Nao foi possivel consultar os membros e pedidos.')
      });
  }

  async copySquadCode(): Promise<void> {
    const squad = this.squad();
    if (!squad || this.busy() || this.auth.blocked() || this.auth.user()?.role !== 'ADMIN'
        || this.auth.user()?.squadId !== squad.id) { return; }
    this.error.set(''); this.notice.set('');
    try {
      await navigator.clipboard.writeText(squad.admissionCode);
      this.notice.set('Codigo da equipe copiado.');
    } catch {
      this.error.set('Nao foi possivel copiar. Selecione e copie o codigo exibido.');
    }
  }

  startEdit(member: SquadMember): void {
    this.form.setValue({ role: member.role, operationalGroup: member.operationalGroup, active: member.active });
    this.editing.set(member.id); this.decision.set(null);
  }

  prepareMember(member: SquadMember): void {
    if (this.busy()) { return; }
    this.decision.set({ kind: 'member', member, change: this.form.getRawValue() });
  }

  approve(request: AdmissionRequest, group: string): void {
    if (group !== 'DESENVOLVEDORES' && group !== 'ADMINISTRATIVO' && group !== 'SWAP') { return; }
    this.decision.set({ kind: 'approve', request, group });
  }

  reject(request: AdmissionRequest): void { this.decision.set({ kind: 'reject', request }); }

  prepareStyle(activity: string, color: string): void {
    if (this.busy() || !Object.hasOwn(this.activityLabels, activity) || !/^#[0-9a-f]{6}$/i.test(color)) { return; }
    this.decision.set({ kind: 'style', activity, color });
  }

  apply(): void {
    const decision = this.decision();
    if (!decision || this.busy() || this.auth.user()?.role !== 'ADMIN' || this.auth.blocked()) { return; }
    let operation: Observable<unknown>;
    if (decision.kind === 'approve') { operation = this.service.approve(decision.request.id, decision.group); }
    else if (decision.kind === 'reject') { operation = this.service.reject(decision.request.id); }
    else if (decision.kind === 'style') { operation = this.stylesService.update(decision.activity, decision.color); }
    else { operation = this.service.change(decision.member.id, decision.change); }
    this.busy.set(true); this.error.set(''); this.notice.set('');
    operation.subscribe({
      next: () => {
        this.decision.set(null); this.editing.set(null); this.notice.set('Alteracao registrada.');
        this.busy.set(false);
        if (decision.kind === 'member' && decision.member.userId === this.auth.user()?.userId) {
          this.auth.refresh().subscribe(() => this.load());
        } else { this.load(); }
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(error.status === 409
          ? 'Conflito: o ultimo admin ativo e vinculos existentes sao protegidos. Atualize os dados antes de tentar novamente.'
          : 'Alteracao nao confirmada. Confira o estado atual antes de tentar novamente.');
      }
    });
  }
}