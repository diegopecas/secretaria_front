// loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { NotificationService } from '../services/notification.service';
import { SpinnerService } from '../services/spinner.service';

// URLs que no deben mostrar spinner
const EXCLUDED_URLS = [
  '/api/auth/refresh',
  '/api/auth/check-session',
];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {

  
  const spinnerService = inject(SpinnerService);
  const notificationService = inject(NotificationService);
  
  // Verificar si la URL está excluida
  const shouldShowSpinner = !EXCLUDED_URLS.some(url => req.url.includes(url));
  

  
  if (shouldShowSpinner) {
    spinnerService.show();
  }

  return next(req).pipe(
    catchError((error) => {
      
      let errorMessage = 'Ocurrió un error inesperado';

      if (error.status === 0) {
        errorMessage = 'No hay conexión con el servidor.';
      } else if (error.status === 401) {
        return throwError(() => error);
      } else if (error.status === 403) {
        errorMessage = 'No tiene permisos para realizar esta acción.';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado.';
      } else if (error.status >= 400 && error.status < 500) {
        errorMessage = error.error?.message || 'Error en la solicitud.';
      } else if (error.status >= 500) {
        errorMessage = 'Error interno del servidor.';
      }

      notificationService.error(errorMessage);
      
      return throwError(() => error);
    }),
    finalize(() => {

      if (shouldShowSpinner) {

        spinnerService.hide();
      }
    })
  );
};