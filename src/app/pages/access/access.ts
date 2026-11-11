import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { AdmissionRequest, MembershipAccessService } from '../../services/membership-access';

@Component({
  selector: 'app-access',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './access.html',
  styleUrl: './access.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessPage {
  readonly auth = inject(AuthenticationService);
  private readonly service = inject(MembershipAccessService);
  readonly request = signal<AdmissionRequest | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/\S/)]] });

  constructor() { if (this.auth.state() === 'unassigned') { this.load(); } }

  load(): void {
    if (this.busy()) { return; }
    this.busy.set(true); this.error.set('');
    this.service.ownRequest().pipe(finalize(() => this.busy.set(false))).subscribe({
      next: request => this.request.set(request),
      error: () => this.error.set('Nao foi possivel consultar seu pedido. Tente novamente.')
    });
  }

  submit(): void {
    if (this.form.invalid || this.busy() || this.request()?.status === 'PENDING') { return; }
    this.busy.set(true); this.error.set('');
    this.service.request(this.form.controls.code.value.trim()).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: request => { this.request.set(request); this.form.reset(); },
      error: (error: HttpErrorResponse) => this.error.set(error.status === 429
        ? 'Limite de tentativas atingido. Aguarde antes de tentar novamente.'
        : 'Pedido nao enviado. Confira o codigo e seu acesso antes de tentar novamente.')
    });
  }
}