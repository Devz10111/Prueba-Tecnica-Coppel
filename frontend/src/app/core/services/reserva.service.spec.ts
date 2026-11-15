import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReservaRequest, ReservaResponse } from '../models';
import { ReservaService } from './reserva.service';

const API = 'http://localhost:8080';
const SOLICITUD: ReservaRequest = {
  espacioId: 1,
  fecha: '2099-01-15',
  horaInicio: '10:00',
  horaFin: '11:00',
  solicitante: 'Ana Pérez',
  departamento: 'Sistemas',
  descripcion: 'Reunión de planeación',
};

const RESPUESTA: ReservaResponse = {
  folio: '2099000123',
  espacioId: 1,
  espacio: 'Sala de reuniones pequeña',
  capacidadEspacio: 8,
  fecha: '2099-01-15',
  horaInicio: '10:00:00',
  horaFin: '11:00:00',
  duracionMinutos: 60,
  solicitante: 'Ana Pérez',
  departamento: 'Sistemas',
  descripcion: 'Reunión de planeación',
  estado: 'PENDIENTE',
  creadaEn: '2099-01-01T10:00:00',
  historial: [],
};

describe('ReservaService', () => {
  let servicio: ReservaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(ReservaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía la creación a la URL correcta con el cuerpo esperado', () => {
    servicio.crear(SOLICITUD).subscribe();

    const peticion = http.expectOne(`${API}/api/reservas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(SOLICITUD);

    peticion.flush(RESPUESTA, { status: 201, statusText: 'Created' });
  });

  it('consulta una reserva por folio en la URL correcta', () => {
    servicio.consultarPorFolio('2099000123').subscribe();

    const peticion = http.expectOne(`${API}/api/reservas/2099000123`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(RESPUESTA);
  });

  it('propaga un error 409 al crear una reserva con horario ocupado', () => {
    let errorRecibido: HttpErrorResponse | undefined;

    servicio.crear(SOLICITUD).subscribe({
      error: (error: HttpErrorResponse) => {
        errorRecibido = error;
      },
    });

    const peticion = http.expectOne(`${API}/api/reservas`);
    peticion.flush(
      {
        status: 409,
        error: 'Conflict',
        mensaje: 'El espacio ya está reservado en ese horario.',
        detalles: [],
        fecha: '2099-01-01T10:00:00',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(errorRecibido?.status).toBe(409);
    expect(errorRecibido?.error.mensaje).toContain('ya está reservado');
  });
});
