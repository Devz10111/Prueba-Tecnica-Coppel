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

    spyOnProperty(router, 'url', 'get').and.returnValue('/admin');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    controller.verify();
  });

  it('agrega el token solo a las peticiones de /api/admin', () => {
    http.get(`${API}/api/admin/reservas`).subscribe();
    http.get(`${API}/api/espacios`).subscribe();

    const peticionAdmin = controller.expectOne(`${API}/api/admin/reservas`);
    const peticionPublica = controller.expectOne(`${API}/api/espacios`);

    expect(peticionAdmin.request.headers.get('Authorization')).toBe(
      'Bearer token-de-prueba',
    );
    expect(peticionPublica.request.headers.has('Authorization')).toBeFalse();

    peticionAdmin.flush([]);
    peticionPublica.flush([]);
  });

  it('cierra la sesión y redirige al login cuando /api/admin responde 401', async () => {
    http
      .get(`${API}/api/admin/reservas`)
      .subscribe({ error: () => undefined });

    const peticion = controller.expectOne(`${API}/api/admin/reservas`);
    peticion.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/admin/login'], {
      queryParams: {
        motivo: 'sesion-expirada',
        returnUrl: '/admin',
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
});
