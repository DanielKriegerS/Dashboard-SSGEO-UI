import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { AuthenticationService } from '../../services/authentication';
import { MembershipAccessService } from '../../services/membership-access';

function authorize(admin: boolean) {
  const session = inject(AuthenticationService);
  const router = inject(Router);
  const decide = () => session.blocked() ? router.parseUrl('/access')
    : admin && session.user()?.role !== 'ADMIN' ? router.parseUrl('/') : true;
  return session.state() === 'checking'
    ? toObservable(session.state).pipe(filter(state => state !== 'checking'), take(1), map(decide))
    : decide();
}

export const accessGuard: CanActivateFn = () => authorize(false);
export const adminGuard: CanActivateFn = () => authorize(true);
export const globalAdminGuard: CanActivateFn = () => {
  const session = inject(AuthenticationService);
  const router = inject(Router);
  const membership = inject(MembershipAccessService);
  const decide = () => {
    if (session.blocked() && session.state() !== 'unassigned') return of(router.parseUrl('/access'));
    return membership.globalStatus().pipe(
      map(result => result.globalAdmin ? true : router.parseUrl('/access')),
      catchError(() => of(router.parseUrl('/access')))
    );
  };
  return session.state() === 'checking'
    ? toObservable(session.state).pipe(filter(state => state !== 'checking'), take(1), switchMap(decide))
    : decide();
};