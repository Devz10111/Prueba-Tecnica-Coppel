import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Guard funcional del portal de administración.
 *
 * Se ejecuta antes de entrar a /admin y a cualquier ruta hija
 * (/admin/...). Si la sesión existe y el token no ha expirado, permite
 * la navegación. Si no hay sesión o ya expiró, devuelve un UrlTree que
 * redirige a /admin/login.
 *
 * Se guarda `state.url` en `returnUrl` para que, después de iniciar
 * sesión, el usuario regrese a la pantalla que intentaba abrir.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
