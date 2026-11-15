import {
  HttpErrorResponse,
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LoginResponse } from '../models';
import { AuthService } from './auth.service';

const API = 'http://localhost:8080';

const RESPUESTA_LOGIN: LoginResponse = {
  token: 'token-de-prueba',
  tipo: 'Bearer',
  expiraEn: '2099-12-31T23:59:59',
  nombre: 'Administrador de Reservas',
  rol: 'ADMIN',
  email: 'admin@coppel.test',
  departamento: null,
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  /** Ejecuta un login simulado y devuelve la respuesta del backend. */
  function iniciarSesion(
    respuesta: LoginResponse = RESPUESTA_LOGIN,
  ): void {
    auth.login({ email: 'admin@coppel.test', password: 'Admin123!' }).subscribe();

    const peticion = http.expectOne(`${API}/api/auth/login`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      email: 'admin@coppel.test',
      password: 'Admin123!',
    });
    peticion.flush(respuesta);
  }

  it('guarda el token y el usuario después del login', () => {
    iniciarSesion();

    expect(auth.obtenerToken()).toBe('token-de-prueba');
    expect(auth.usuarioActual()).toEqual({
      nombre: 'Administrador de Reservas',
      rol: 'ADMIN',
      expiraEn: '2099-12-31T23:59:59',
      email: 'admin@coppel.test',
      departamento: null,
    });
    expect(auth.estaAutenticado()).toBeTrue();
    expect(auth.obtenerRol()).toBe('ADMIN');
  });

  it('propaga el error de login y no guarda una sesión', () => {
    let errorRecibido: HttpErrorResponse | undefined;

    auth
      .login({ email: 'admin@coppel.test', password: 'incorrecta' })
      .subscribe({
        error: (error: HttpErrorResponse) => {
          errorRecibido = error;
        },
      });

    const peticion = http.expectOne(`${API}/api/auth/login`);
    expect(peticion.request.method).toBe('POST');
    peticion.flush(
      {
        status: 401,
        error: 'Unauthorized',
        mensaje: 'Correo o contraseña incorrectos',
        detalles: [],
        fecha: '2026-11-14T10:00:00',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(errorRecibido?.status).toBe(401);
    expect(errorRecibido?.error.mensaje).toBe(
      'Correo o contraseña incorrectos',
    );
    expect(auth.obtenerToken()).toBeNull();
    expect(auth.usuarioActual()).toBeNull();
  });

  it('elimina la sesión al cerrar sesión', () => {
    iniciarSesion();

    auth.logout();

    expect(auth.obtenerToken()).toBeNull();
    expect(auth.usuarioActual()).toBeNull();
    expect(auth.estaAutenticado()).toBeFalse();
    expect(localStorage.getItem('coppel_token')).toBeNull();
    expect(localStorage.getItem('coppel_usuario')).toBeNull();
  });

  it('considera inválida una sesión con token expirado y la limpia', () => {
    iniciarSesion({
      ...RESPUESTA_LOGIN,
      expiraEn: '2000-01-01T00:00:00',
    });

    expect(auth.estaAutenticado()).toBeFalse();
    expect(auth.obtenerToken()).toBeNull();
    expect(auth.usuarioActual()).toBeNull();
  });

  it('limpia una sesión incompleta (token sin usuario)', () => {
    localStorage.setItem('coppel_token', 'token-huerfano');

    expect(auth.estaAutenticado()).toBeFalse();
    expect(localStorage.getItem('coppel_token')).toBeNull();
  });

  it('tolera un JSON dañado en el usuario guardado', () => {
    localStorage.setItem('coppel_token', 'token-de-prueba');
    localStorage.setItem('coppel_usuario', '{esto-no-es-json');

    expect(auth.obtenerUsuario()).toBeNull();
    expect(auth.usuarioActual()).toBeNull();
    expect(localStorage.getItem('coppel_token')).toBeNull();
    expect(localStorage.getItem('coppel_usuario')).toBeNull();
  });

  it('no restaura en la barra una sesión vencida que ya estaba guardada', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('coppel_token', 'token-vencido');
    localStorage.setItem(
      'coppel_usuario',
      JSON.stringify({
        nombre: 'Administrador',
        rol: 'ADMIN',
        expiraEn: '2000-01-01T00:00:00',
      }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    const authNuevo = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    expect(authNuevo.usuarioActual()).toBeNull();
    expect(authNuevo.obtenerToken()).toBeNull();
  });
});
