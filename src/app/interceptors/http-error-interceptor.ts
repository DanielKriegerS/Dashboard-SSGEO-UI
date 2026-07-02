import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { FeedbackService } from '../services/feedback';
import { catchError, throwError } from 'rxjs';
import rn from '@angular/common/locales/rn';
import { inject } from '@angular/core';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {

const feedback = inject(FeedbackService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractErrorMessage(error);

      feedback.error(message);

      return throwError(() => error);
    })
  );
};

function extractErrorMessage(error: HttpErrorResponse): string {
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
