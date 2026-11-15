import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'estaAutenticado',
      'mostrarAviso',
    ]);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  function ejecutar(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('permite continuar si existe sesión', () => {
    auth.estaAutenticado.and.returnValue(true);
    expect(ejecutar('/reservar')).toBeTrue();
  });

  it('manda al login con returnUrl y aviso si falta sesión', () => {
    auth.estaAutenticado.and.returnValue(false);
    const resultado = ejecutar('/consultar/202600000192');

    expect(auth.mostrarAviso).toHaveBeenCalledWith('Inicia sesión para continuar.');
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(resultado as UrlTree)).toBe(
      '/login?returnUrl=%2Fconsultar%2F202600000192',
    );
  });
});
