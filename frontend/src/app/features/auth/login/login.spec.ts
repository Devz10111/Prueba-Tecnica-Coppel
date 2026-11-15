import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginResponse } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

/** Respuesta simulada del backend para un login correcto. */
const RESPUESTA_LOGIN: LoginResponse = {
  token: 'token-de-prueba',
  tipo: 'Bearer',
  expiraEn: '2099-12-31T23:59:59',
  nombre: 'Administrador de Reservas',
  rol: 'ADMIN',
  email: 'admin@coppel.test',
  departamento: null,
};

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let componente: any;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let parametrosActuales: ParamMap;

  beforeEach(async () => {
    parametrosActuales = convertToParamMap({});

    // Se simula AuthService para probar el componente sin hacer HTTP real.
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'estaAutenticado',
      'obtenerRol',
      'consumirAviso',
      'logout',
    ]);
    auth.estaAutenticado.and.returnValue(false);
    auth.obtenerRol.and.returnValue(null);
    auth.consumirAviso.and.returnValue(null);
    auth.login.and.returnValue(of(RESPUESTA_LOGIN));

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: {
            // El getter permite cambiar los query params antes de crear
            // el componente en cada prueba.
            get snapshot() {
              return { queryParamMap: parametrosActuales };
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
  });

  /** Crea el componente con los query params indicados. */
  function crear(parametros: ParamMap = convertToParamMap({})): void {
    parametrosActuales = parametros;
    fixture = TestBed.createComponent(Login);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('crea el formulario vacío y sin errores visibles', () => {
    crear();

    expect(componente.form.value).toEqual({ email: '', password: '' });
    expect(componente.error()).toBeNull();
    expect(componente.aviso()).toBeNull();
  });

  it('no envía el formulario si está vacío y marca los campos', () => {
    crear();

    componente.iniciarSesion();
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    expect(componente.form.controls.email.touched).toBeTrue();
    expect(componente.form.controls.password.touched).toBeTrue();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('#email'),
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Escribe tu correo electrónico.',
    );
  });

  it('envía las credenciales sin espacios y navega a la gestión de reservas', () => {
    crear();

    componente.form.setValue({
      email: '  admin@coppel.test  ',
      password: 'Admin123!',
    });
    componente.iniciarSesion();

    expect(auth.login).toHaveBeenCalledOnceWith({
      email: 'admin@coppel.test',
      password: 'Admin123!',
    });
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/admin/reservas', {
      replaceUrl: true,
    });
  });

  it('respeta returnUrl cuando es una ruta interna', () => {
    crear(convertToParamMap({ returnUrl: '/admin/reservas' }));

    componente.form.setValue({
      email: 'admin@coppel.test',
      password: 'Admin123!',
    });
    componente.iniciarSesion();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/admin/reservas', {
      replaceUrl: true,
    });
  });

  it('ignora returnUrl externos', () => {
    crear(convertToParamMap({ returnUrl: 'https://sitio-externo.test' }));

    componente.form.setValue({
      email: 'admin@coppel.test',
      password: 'Admin123!',
    });
    componente.iniciarSesion();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/admin/reservas', {
      replaceUrl: true,
    });
  });

  it('muestra el mensaje de la API cuando las credenciales son incorrectas', () => {
    auth.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              status: 401,
              error: 'Unauthorized',
              mensaje: 'Correo o contraseña incorrectos',
              detalles: [],
              fecha: '2026-11-14T10:00:00',
            },
          }),
      ),
    );

    crear();
    componente.form.setValue({
      email: 'admin@coppel.test',
      password: 'incorrecta',
    });
    componente.iniciarSesion();
    fixture.detectChanges();

    expect(componente.error()).toBe('Correo o contraseña incorrectos');
    expect(fixture.nativeElement.textContent).toContain(
      'Correo o contraseña incorrectos',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('muestra el aviso cuando la sesión expiró', () => {
    crear(convertToParamMap({ motivo: 'sesion-expirada' }));
    fixture.detectChanges();

    expect(componente.aviso()).toBe(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  });

  it('redirige al panel si ya hay una sesión administrativa válida', () => {
    auth.estaAutenticado.and.returnValue(true);
    auth.obtenerRol.and.returnValue('ADMIN');

    crear(convertToParamMap({ returnUrl: '/admin' }));

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/admin/reservas', {
      replaceUrl: true,
    });
  });
});
