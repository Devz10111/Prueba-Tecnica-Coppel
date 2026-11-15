import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  Disponibilidad,
  Espacio,
  Ocupacion,
  ReservaResponse,
} from '../../core/models';
import { Reserva } from './reserva';
import { AuthService } from '../../core/services/auth.service';

const API = 'http://localhost:8080';
const FECHA = '2099-01-15';

const ESPACIOS: Espacio[] = [
  {
    id: 1,
    nombre: 'Sala de reuniones pequeña',
    capacidad: 8,
    descripcion: 'Sala para reuniones de equipo reducido',
  },
  {
    id: 2,
    nombre: 'Sala de reuniones grande',
    capacidad: 20,
    descripcion: 'Sala para reuniones de área o departamento',
  },
];

function disponibilidad(ocupados: Ocupacion[] = []): Disponibilidad {
  return {
    espacioId: 1,
    espacio: 'Sala de reuniones pequeña',
    fecha: FECHA,
    horaApertura: '08:00:00',
    horaCierre: '20:00:00',
    ocupados,
  };
}

const RESERVA_CREADA: ReservaResponse = {
  folio: '2099000123',
  espacioId: 1,
  espacio: 'Sala de reuniones pequeña',
  capacidadEspacio: 8,
  fecha: FECHA,
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

describe('Reserva', () => {
  let fixture: ComponentFixture<Reserva>;
  let componente: any;
  let http: HttpTestingController;

  beforeEach(async () => {
    const auth = {
      usuarioActual: signal({
        nombre: 'Ana Pérez',
        email: 'ana@coppel.test',
        departamento: 'Sistemas',
        rol: 'EMPLEADO' as const,
        expiraEn: '2099-12-31T23:59:59',
      }),
    };
    await TestBed.configureTestingModule({
      imports: [Reserva],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reserva);
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    // ngOnInit dispara la carga de espacios.
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  function prepararFormulario(ocupados: Ocupacion[] = []): void {
    http.expectOne(`${API}/api/espacios`).flush(ESPACIOS);
    fixture.detectChanges();

    componente.form.controls.espacioId.setValue(1);
    componente.form.controls.fecha.setValue(FECHA);

    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${FECHA}`)
      .flush(disponibilidad(ocupados));
  }

  function capturarReserva(): void {
    componente.form.controls.horaInicio.setValue('10:00');
    componente.form.controls.horaFin.setValue('11:00');
    componente.form.controls.descripcion.setValue('Reunión de planeación');
    componente.pasoActual.set(4);
    fixture.detectChanges();
  }

  it('carga los espacios y conserva la selección entre pasos', () => {
    http.expectOne(`${API}/api/espacios`).flush(ESPACIOS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Sala de reuniones pequeña',
    );

    componente.form.controls.espacioId.setValue(2);
    componente.siguiente();
    fixture.detectChanges();

    expect(componente.pasoActual()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain(
      'Sala de reuniones grande',
    );

    componente.anterior();
    fixture.detectChanges();

    expect(componente.pasoActual()).toBe(1);
    expect(componente.form.controls.espacioId.value).toBe(2);
  });

  it('valida duración, rango y traslapes en tiempo real', () => {
    prepararFormulario([
      { horaInicio: '09:00:00', horaFin: '10:00:00', estado: 'PENDIENTE' },
      { horaInicio: '11:00:00', horaFin: '12:00:00', estado: 'APROBADA' },
    ]);

    componente.form.controls.horaInicio.setValue('09:30');
    componente.form.controls.horaFin.setValue('10:30');

    expect(componente.mensajesHorario().join(' ')).toContain('traslapa');
    expect(componente.paso2Valido()).toBeFalse();

    componente.form.controls.horaInicio.setValue('10:00');
    componente.form.controls.horaFin.setValue('11:00');

    expect(componente.mensajesHorario()).toEqual([]);
    expect(componente.paso2Valido()).toBeTrue();

    componente.form.controls.horaInicio.setValue('11:30');
    componente.form.controls.horaFin.setValue('12:30');
    expect(componente.mensajesHorario().join(' ')).toContain('traslapa');
    expect(componente.paso2Valido()).toBeFalse();

    componente.form.controls.horaInicio.setValue('10:00');
    componente.form.controls.horaFin.setValue('10:15');
    expect(componente.mensajesHorario().join(' ')).toContain(
      'al menos 30 minutos',
    );

    componente.form.controls.horaFin.setValue('21:00');
    expect(componente.mensajesHorario().join(' ')).toContain(
      'entre 08:00 y 20:00',
    );

    componente.form.controls.horaInicio.setValue('11:00');
    componente.form.controls.horaFin.setValue('10:00');
    expect(componente.mensajesHorario().join(' ')).toContain(
      'posterior a la hora de inicio',
    );
  });

  it('valida la descripción del evento', () => {
    prepararFormulario();

    componente.form.controls.descripcion.setValue('a'.repeat(501));
    componente.form.controls.descripcion.markAsTouched();

    expect(componente.errorDescripcion()).toContain('500');
  });

  it('crea la reserva y muestra el folio', () => {
    prepararFormulario();
    capturarReserva();

    componente.confirmar();
    expect(componente.enviando()).toBeTrue();

    const peticion = http.expectOne(`${API}/api/reservas`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      espacioId: 1,
      fecha: FECHA,
      horaInicio: '10:00',
      horaFin: '11:00',
      descripcion: 'Reunión de planeación',
    });

    peticion.flush(RESERVA_CREADA, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(componente.enviando()).toBeFalse();
    expect(componente.reservaCreada()?.folio).toBe('2099000123');
    expect(fixture.nativeElement.textContent).toContain('Reserva exitosa');
    expect(fixture.nativeElement.textContent).toContain('2099000123');

    // El botón de la confirmación enlaza al folio dentro de la URL.
    expect(
      fixture.nativeElement.querySelector('a[href="/consultar/2099000123"]'),
    ).not.toBeNull();
  });

  it('muestra el error 409 de la API y permite volver al paso 2', () => {
    prepararFormulario();
    capturarReserva();

    componente.confirmar();

    http.expectOne(`${API}/api/reservas`).flush(
      {
        status: 409,
        error: 'Conflict',
        mensaje: 'El espacio ya está reservado en ese horario.',
        detalles: [],
        fecha: '2099-01-01T10:00:00',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(componente.errorEnvio()).toContain('ya está reservado');
    expect(componente.reservaCreada()).toBeNull();

    // El componente refresca la disponibilidad después del error.
    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${FECHA}`)
      .flush(disponibilidad());

    componente.volverAlPaso2();

    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${FECHA}`)
      .flush(disponibilidad());

    fixture.detectChanges();

    expect(componente.pasoActual()).toBe(2);
    expect(componente.errorEnvio()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Fecha y horario');
  });
});
