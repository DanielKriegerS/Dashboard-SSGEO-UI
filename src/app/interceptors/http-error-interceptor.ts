import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { FeedbackService } from '../services/feedback';
import { catchError, EMPTY, retry, tap, throwError, timer } from 'rxjs';
import { inject } from '@angular/core';
import { ConnectionState } from '../services/connection-state';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {

const feedback = inject(FeedbackService);
const connection = inject(ConnectionState);
const isUnavailable = (error: HttpErrorResponse) => [0, 502, 503, 504].includes(error.status);
const reportNotice = (event: HttpEvent<unknown>) => {
  if (!(event instanceof HttpResponse) || req.method === 'GET') { return; }
  const body: unknown[] = Array.isArray(event.body) ? event.body : [event.body];
  const notice = event.headers.get('X-Planning-Notice') || body.map(item => item && typeof item === 'object' && 'milestoneNotice' in item ? item.milestoneNotice : null)
    .find((message): message is string => typeof message === 'string' && !!message);
  if (notice) { feedback.info(notice); }
};

  return next(req).pipe(
    retry({
      count: req.method === 'GET' ? 2 : 0,
      delay: (error: HttpErrorResponse) => isUnavailable(error)
        ? timer(10000)
        : throwError(() => error)
    }),
    tap(reportNotice),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 409 && error.error?.code === 'MILESTONE_REPLAN_REQUIRED'
          && req.method !== 'GET' && /\/timeline(?:\/|$)/.test(req.url)
          && typeof error.error.revision === 'string' && !req.params.has('milestoneRevision')) {
        if (window.confirm(error.error.message)) {
          return next(req.clone({ setParams: { milestoneRevision: error.error.revision } })).pipe(
            tap(event => {
              if (event instanceof HttpResponse) { feedback.info('Planejamento atualizado. Marcos afetados reabertos para nova confirmação.'); }
            }),
            catchError((replanError: HttpErrorResponse) => {
              feedback.error(extractErrorMessage(replanError));
              return throwError(() => replanError);
            })
          );
        }
        feedback.info('Replanejamento cancelado. Nenhuma alteração foi salva.');
        return EMPTY;
      }
      if (req.method === 'GET' && isUnavailable(error)) {
        connection.unavailable.set(true);
      }
      const message = extractErrorMessage(error);

      feedback.error(message);

      return throwError(() => error);
    })
  );
};

function extractErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 401) { return 'Sessão indisponível. As edições não salvas permanecem nesta aba.'; }
  if (error.status === 403) { return 'Operação não autorizada. As edições não salvas foram mantidas.'; }
  if (error.error?.code === 'SESSION_CONTEXT_CHANGED') { return 'A conta ou o Squad mudou. O rascunho foi bloqueado.'; }
  if (error.error?.message) {
    return error.error.message;
  }

  if (typeof error.error === 'string') {
    return error.error;
  }

  if (error.status === 0) {
    return 'Não foi possível conectar ao servidor.';
  }

  if (error.status === 404) {
    return 'Recurso não encontrado.';
  }

  if (error.status === 400) {
    return 'Requisição inválida.';
  }

  if (error.status >= 500) {
    return 'Erro interno no servidor.';
  }

  return 'Ocorreu um erro inesperado.';
};
