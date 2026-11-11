import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';

function authorize(admin: boolean) {
  const session = inject(AuthenticationService);
  const router = inject(Router);
  const decide = () => session.blocked() ? router.parseUrl('/access')
    : admin && session.user()?.role !== 'ADMIN' ? router.parseUrl('/admin') : true;
  return session.state() === 'checking'
    ? toObservable(session.state).pipe(filter(state => state !== 'checking'), take(1), map(decide))
    : decide();
}

export const accessGuard: CanActivateFn = () => authorize(false);
export const adminGuard: CanActivateFn = () => authorize(true);