import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estaAutenticado()) {
    auth.mostrarAviso('Inicia sesión para continuar.');
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const rol = auth.obtenerRol();
  if (rol === 'ADMIN' || rol === 'JEFE_DEPARTAMENTO') {
    return true;
  }

  auth.mostrarAviso('No tienes permisos para acceder al panel de administración.');
  return router.createUrlTree(['/']);
};
