import {
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UsuarioActualizarRequest, UsuarioCrearRequest } from '../models';
import { AdminUsuarioService } from './admin-usuario.service';

describe('AdminUsuarioService', () => {
  let service: AdminUsuarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsuarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista usuarios desde la URL de administración', () => {
    service.listar().subscribe((usuarios) => {
      expect(usuarios[0].email).toBe('ana@coppel.test');
    });

    const request = http.expectOne('http://localhost:8080/api/admin/usuarios');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 2,
        nombre: 'Ana',
        email: 'ana@coppel.test',
        departamento: 'Sistemas',
        rol: 'EMPLEADO',
      },
    ]);
  });

  it('envía los datos de alta al endpoint de administración', () => {
    const usuario: UsuarioCrearRequest = {
      nombre: 'Ana',
      email: 'ana@coppel.test',
      departamento: 'Sistemas',
      password: 'ClaveSegura123',
      rol: 'EMPLEADO',
    };

    service.crear(usuario).subscribe((respuesta) => {
      expect(respuesta.id).toBe(2);
    });

    const request = http.expectOne('http://localhost:8080/api/admin/usuarios');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(usuario);
    request.flush({
      id: 2,
      nombre: 'Ana',
      email: 'ana@coppel.test',
      departamento: 'Sistemas',
      rol: 'EMPLEADO',
    });
  });

  it('actualiza los datos de un usuario sin enviar su contraseña', () => {
    const usuario: UsuarioActualizarRequest = {
      nombre: 'Ana actualizada',
      email: 'ana@coppel.test',
      departamento: 'Finanzas',
      rol: 'JEFE_DEPARTAMENTO',
    };

    service.actualizar(2, usuario).subscribe((respuesta) => {
      expect(respuesta.departamento).toBe('Finanzas');
    });

    const request = http.expectOne('http://localhost:8080/api/admin/usuarios/2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(usuario);
    expect(request.request.body.password).toBeUndefined();
    request.flush({ id: 2, ...usuario });
  });

  it('elimina un usuario por su id', () => {
    service.eliminar(2).subscribe();

    const request = http.expectOne('http://localhost:8080/api/admin/usuarios/2');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
