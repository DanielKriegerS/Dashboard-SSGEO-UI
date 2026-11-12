import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { AdmissionRequest, MembershipAccessService, OperationalGroup, SquadCreationRequest } from '../../services/membership-access';

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
  readonly creation = signal<SquadCreationRequest | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/\S/)]] });
  readonly creationForm = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    admissionCode: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    operationalGroup: ['ADMINISTRATIVO' as OperationalGroup]
  });

  constructor() { if (this.auth.state() === 'unassigned') { this.load(); } }

  load(): void {
    if (this.busy()) { return; }
    this.busy.set(true); this.error.set('');
    forkJoin({ request: this.service.ownRequest(), creation: this.service.ownCreationRequest() })
      .pipe(finalize(() => this.busy.set(false))).subscribe({
      next: result => { this.request.set(result.request); this.creation.set(result.creation); },
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

  submitCreation(): void {
    if (this.creationForm.invalid || this.busy() || this.creation()?.status === 'PENDING') { return; }
    const form = this.creationForm.getRawValue();
    this.busy.set(true); this.error.set('');
    this.service.requestCreation({ ...form, name: form.name.trim(), admissionCode: form.admissionCode.trim() })
      .pipe(finalize(() => this.busy.set(false))).subscribe({
        next: request => this.creation.set(request),
        error: (error: HttpErrorResponse) => this.error.set(error.status === 409
          ? 'Pedido nao enviado. Confira se o codigo ja esta em uso ou se existe outro pedido pendente.'
          : 'Nao foi possivel solicitar a criacao da equipe.')
      });
  }
}