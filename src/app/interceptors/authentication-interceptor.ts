import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuthenticationService } from '../services/authentication';

export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${API_URL}/`)) { return next(request); }
  const session = inject(AuthenticationService);
  const admission = session.state() === 'unassigned' && (
    (request.method === 'GET' && request.url === `${API_URL}/admission-requests/me`) ||
    (request.method === 'POST' && request.url === `${API_URL}/admission-requests`) ||
    (request.method === 'GET' && request.url === `${API_URL}/squad-creation-requests/me`) ||
    (request.method === 'POST' && request.url === `${API_URL}/squad-creation-requests`)
  );
  const globalAdministration = session.state() === 'unassigned' && (
    (request.method === 'GET' && (request.url === `${API_URL}/global-administration/status`
      || request.url === `${API_URL}/global-administration/squad-creation-requests`)) ||
    (request.method === 'POST' && new RegExp(`^${API_URL}/global-administration/squad-creation-requests/[a-zA-Z0-9-]+/(approve|reject)$`).test(request.url))
  );
  if (session.blocked() && !admission && !globalAdministration) {
    return throwError(() => new HttpErrorResponse({ status: 401, error: { code: 'SESSION_UNAVAILABLE' } }));
  }
  const scoped = request.clone({ setHeaders: session.contextHeaders() });
  const safe = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const operation = safe ? next(scoped) : session.csrf().pipe(
    switchMap(token => next(scoped.clone({ setHeaders: { [token.headerName]: token.token } })))
  );
  return operation.pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401) { session.expire(); }
    if (error.status === 409 && (error.error?.code === 'SESSION_CONTEXT_CHANGED'
        || error.headers.get('X-Session-Context') === 'changed')) { session.contextChanged(); }
    return throwError(() => error);
  }));
};