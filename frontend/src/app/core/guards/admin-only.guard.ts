import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Restringe acciones de gestión de usuarios al rol ADMIN. */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.obtenerRol() === 'ADMIN'
    ? true
    : router.createUrlTree(['/']);
};
