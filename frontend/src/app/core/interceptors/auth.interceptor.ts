import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/**
 * Evita que varias peticiones protegidas que fallan al mismo tiempo
 * disparen varias redirecciones al login.
 */
let redireccionEnCurso = false;

/**
 * Indica si una URL pertenece al portal de administración.
 *
 * Se compara solo la ruta (sin dominio ni query params) para que funcione
 * tanto con URLs absolutas como relativas:
 * - http://localhost:8080/api/admin/reservas
 * - /api/admin/reservas
 */
function esPeticionAdmin(url: string): boolean {
  try {
    const origenApi = new URL(API_CONFIG.baseUrl).origin;
    const urlPeticion = new URL(url, API_CONFIG.baseUrl);
    const ruta = urlPeticion.pathname;

    return (
      urlPeticion.origin === origenApi &&
      (ruta === '/api/admin' || ruta.startsWith('/api/admin/'))
    );
  } catch {
    return false;
  }
}

/**
 * Interceptor funcional de autenticación.
 *
 * Responsabilidades:
 * 1. Agregar "Authorization: Bearer <token>" SOLO a las peticiones que van
 *    a /api/admin. Las rutas públicas (reservas, espacios, login) no llevan
 *    el token.
 * 2. Si una petición protegida responde 401, cerrar la sesión y llevar al
 *    login con un aviso de sesión expirada.
 */
export const authInterceptor: HttpInterceptorFn = (peticion, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Las rutas públicas pasan sin token y sin manejo especial de 401.
  if (!esPeticionAdmin(peticion.url)) {
    return next(peticion);
  }

  // Se clona la petición para no modificar el objeto original.
  const token = auth.obtenerToken();
  const peticionConToken = token
    ? peticion.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : peticion;

  return next(peticionConToken).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();

        if (!redireccionEnCurso) {
          redireccionEnCurso = true;

          const queryParams: Record<string, string> = {
            motivo: 'sesion-expirada',
          };

          // Se conserva la pantalla protegida para volver después del login.
          if (
            router.url.startsWith('/admin') &&
            !router.url.startsWith('/admin/login')
          ) {
            queryParams['returnUrl'] = router.url;
          }

          void router
            .navigate(['/admin/login'], { queryParams, replaceUrl: true })
            .finally(() => {
              redireccionEnCurso = false;
            });
        }
      }

      // El error se vuelve a lanzar para que el componente que hizo la
      // petición también pueda reaccionar si lo necesita.
      return throwError(() => error);
    }),
  );
};
