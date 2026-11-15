import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { AuthService } from '../services/auth.service';

let redireccionEnCurso = false;

function rutaApi(url: string): URL | null {
  try {
    const urlApi = new URL(API_CONFIG.baseUrl);
    const destino = new URL(url, API_CONFIG.baseUrl);
    return destino.origin === urlApi.origin && destino.pathname.startsWith('/api/')
      ? destino
      : null;
  } catch {
    return null;
  }
}

function esPublica(url: URL, metodo: string): boolean {
  return (
    (url.pathname === '/api/auth/login' && metodo === 'POST') ||
    (url.pathname === '/api/espacios' || url.pathname.startsWith('/api/espacios/')) &&
      metodo === 'GET'
  );
}

export const authInterceptor: HttpInterceptorFn = (peticion, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const urlApi = rutaApi(peticion.url);

  if (!urlApi || esPublica(urlApi, peticion.method.toUpperCase())) {
    return next(peticion);
  }

  const token = auth.obtenerToken();
  const peticionAutenticada = token
    ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : peticion;

  return next(peticionAutenticada).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        auth.mostrarAviso('Tu sesión expiró o ya no es válida. Inicia sesión nuevamente.');

        if (!redireccionEnCurso && !router.url.startsWith('/login')) {
          redireccionEnCurso = true;
          void router
            .navigate(['/login'], {
              queryParams: {
                motivo: 'sesion-expirada',
                returnUrl: router.url.startsWith('/') ? router.url : '/',
              },
              replaceUrl: true,
            })
            .finally(() => {
              redireccionEnCurso = false;
            });
        }
      } else if (error instanceof HttpErrorResponse && error.status === 429) {
        auth.mostrarAviso('Demasiados intentos, espera un minuto.');
      }

      return throwError(() => error);
    }),
  );
};
