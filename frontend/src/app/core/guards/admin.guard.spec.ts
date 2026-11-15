import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'estaAutenticado',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });

    router = TestBed.inject(Router);
  });

  /** Ejecuta el guard dentro del contexto de inyección de Angular. */
  function ejecutar(url: string) {
    return TestBed.runInInjectionContext(() =>
      adminGuard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot,
      ),
    );
  }

  it('permite entrar a /admin cuando hay una sesión válida', () => {
    auth.estaAutenticado.and.returnValue(true);

    expect(ejecutar('/admin')).toBeTrue();
  });

  it('redirige al login cuando no hay sesión', () => {
    auth.estaAutenticado.and.returnValue(false);

    const resultado = ejecutar('/admin');

    expect(resultado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(resultado as UrlTree)).toBe(
      '/admin/login?returnUrl=%2Fadmin',
    );
  });

  it('guarda la ruta protegida en returnUrl', () => {
    auth.estaAutenticado.and.returnValue(false);

    const resultado = ejecutar('/admin/reservas');

    expect(resultado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(resultado as UrlTree)).toBe(
      '/admin/login?returnUrl=%2Fadmin%2Freservas',
    );
  });
});
