import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const API = 'http://localhost:8080';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'obtenerToken',
      'logout',
      'mostrarAviso',
    ]);
    auth.obtenerToken.and.returnValue('token-de-prueba');

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    spyOnProperty(router, 'url', 'get').and.returnValue('/reservar');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    controller.verify();
  });

  it('agrega el token a las rutas de API protegidas, excepto a los endpoints públicos', () => {
    http.get(`${API}/api/admin/reservas`).subscribe();
    http.get(`${API}/api/espacios`).subscribe();
    http.get(`${API}/api/reservas/mias`).subscribe();
    http.post(`${API}/api/auth/login`, {}).subscribe();

    const peticionAdmin = controller.expectOne(`${API}/api/admin/reservas`);
    const peticionPublica = controller.expectOne(`${API}/api/espacios`);
    const peticionReservas = controller.expectOne(`${API}/api/reservas/mias`);
    const peticionLogin = controller.expectOne(`${API}/api/auth/login`);

    expect(peticionAdmin.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba',
    );
    expect(peticionReservas.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba',
    );
    expect(peticionPublica.request.headers.has('Authorization')).toBeFalse();
    expect(peticionLogin.request.headers.has('Authorization')).toBeFalse();

    peticionAdmin.flush([]);
    peticionPublica.flush([]);
    peticionReservas.flush([]);
    peticionLogin.flush({});
  });

  it('cierra la sesión y redirige al login cuando una ruta protegida responde 401', async () => {
    http
      .get(`${API}/api/reservas/mias`)
      .subscribe({ error: () => undefined });

    const peticion = controller.expectOne(`${API}/api/reservas/mias`);
    peticion.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(auth.mostrarAviso).toHaveBeenCalledWith(
      'Tu sesión expiró o ya no es válida. Inicia sesión nuevamente.',
    );
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: {
        motivo: 'sesion-expirada',
        returnUrl: '/reservar',
      },
      replaceUrl: true,
    });

    // Deja que se resuelva la promesa de navegación y se libere el bloqueo.
    await Promise.resolve();
  });

  it('no cierra la sesión si un endpoint público responde 401', () => {
    http
      .get(`${API}/api/espacios`)
      .subscribe({ error: () => undefined });

    const peticion = controller.expectOne(`${API}/api/espacios`);
    peticion.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('no envía el token a otro dominio aunque use una ruta /api/admin', () => {
    http.get('https://externo.test/api/admin/reservas').subscribe();

    const peticion = controller.expectOne(
      'https://externo.test/api/admin/reservas',
    );

    expect(peticion.request.headers.has('Authorization')).toBeFalse();
    peticion.flush([]);
  });

  it('muestra el aviso de espera cuando la API responde 429', () => {
    http.get(`${API}/api/reservas/mias`).subscribe({ error: () => undefined });
    controller.expectOne(`${API}/api/reservas/mias`).flush(
      {},
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(auth.mostrarAviso).toHaveBeenCalledWith(
      'Demasiados intentos, espera un minuto.',
    );
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
