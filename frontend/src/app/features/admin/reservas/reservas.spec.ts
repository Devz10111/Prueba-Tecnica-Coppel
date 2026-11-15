import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  Disponibilidad,
  Espacio,
  ReservaResponse,
  ReservaResumen,
} from '../../../core/models';
import { AdminReservaService } from '../../../core/services/admin-reserva.service';
import { AuthService } from '../../../core/services/auth.service';
import { EspacioService } from '../../../core/services/espacio.service';
import { ReservasAdmin } from './reservas';

const ESPACIOS: Espacio[] = [
  {
    id: 1,
    nombre: 'Sala pequeña',
    capacidad: 8,
    descripcion: 'Sala de prueba',
  },
];

const RESUMEN: ReservaResumen = {
  folio: '2026000001',
  espacio: 'Sala pequeña',
  fecha: '2099-12-01',
  horaInicio: '10:00:00',
  horaFin: '11:00:00',
  estado: 'PENDIENTE',
  solicitante: 'Ana Pérez',
  departamento: 'Ventas',
};

const DETALLE: ReservaResponse = {
  folio: RESUMEN.folio,
  espacioId: 1,
  espacio: RESUMEN.espacio,
  capacidadEspacio: 8,
  fecha: RESUMEN.fecha,
  horaInicio: RESUMEN.horaInicio,
  horaFin: RESUMEN.horaFin,
  duracionMinutos: 60,
  solicitante: RESUMEN.solicitante,
  departamento: RESUMEN.departamento,
  descripcion: 'Revisión de proyecto',
  estado: 'PENDIENTE',
  creadaEn: '2099-11-20T08:00:00',
  historial: [
    {
      accion: 'CREADA',
      detalle: 'Solicitud creada',
      fecha: '2099-11-20T08:00:00',
      usuario: 'Ana Pérez',
    },
  ],
};

function disponibilidad(
  ocupados: Disponibilidad['ocupados'] = [],
): Disponibilidad {
  return {
    espacioId: 1,
    espacio: 'Sala pequeña',
    fecha: RESUMEN.fecha,
    horaApertura: '08:00:00',
    horaCierre: '20:00:00',
    ocupados,
  };
}

describe('ReservasAdmin', () => {
  let fixture: ComponentFixture<ReservasAdmin>;
  let componente: any;
  let api: jasmine.SpyObj<AdminReservaService>;
  let espaciosApi: jasmine.SpyObj<EspacioService>;
  let rol: 'ADMIN' | 'JEFE_DEPARTAMENTO';

  beforeEach(async () => {
    rol = 'ADMIN';
    api = jasmine.createSpyObj<AdminReservaService>('AdminReservaService', [
      'listar',
      'detalle',
      'cambiarEstado',
      'modificar',
      'cancelar',
    ]);
    api.listar.and.returnValue(of([RESUMEN]));
    api.detalle.and.returnValue(of(DETALLE));
    api.cambiarEstado.and.returnValue(
      of({ ...DETALLE, estado: 'APROBADA' }),
    );
    api.modificar.and.returnValue(of(DETALLE));
    api.cancelar.and.returnValue(
      of({ ...DETALLE, estado: 'CANCELADA' }),
    );

    espaciosApi = jasmine.createSpyObj<EspacioService>(
      'EspacioService',
      ['listar', 'disponibilidad'],
    );
    espaciosApi.listar.and.returnValue(of(ESPACIOS));
    espaciosApi.disponibilidad.and.returnValue(of(disponibilidad()));

    await TestBed.configureTestingModule({
      imports: [ReservasAdmin],
      providers: [
        provideRouter([]),
        { provide: AdminReservaService, useValue: api },
        { provide: EspacioService, useValue: espaciosApi },
        {
          provide: AuthService,
          useValue: {
            usuarioActual: signal({
              nombre: 'Admin',
              rol,
              expiraEn: '2099-12-31T23:59:59',
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservasAdmin);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga y muestra reservas, y filtra el folio al escribir', () => {
    expect(api.listar).toHaveBeenCalledOnceWith('');
    expect(fixture.nativeElement.textContent).toContain(RESUMEN.folio);

    componente.cambiarBusqueda({
      target: { value: 'no-existe' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay reservas que coincidan',
    );
  });

  it('muestra historial y permite aprobar una reserva pendiente', () => {
    componente.seleccionar(RESUMEN);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Historial de cambios');
    expect(fixture.nativeElement.textContent).toContain('Solicitud creada');

    componente.aprobar();

    expect(api.cambiarEstado).toHaveBeenCalledOnceWith(RESUMEN.folio, {
      estado: 'APROBADA',
    });
    expect(componente.notificacion()?.tipo).toBe('exito');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('envía el comentario opcional al rechazar', () => {
    componente.seleccionar(RESUMEN);
    componente.comentarioRechazo.set('Horario no disponible');

    componente.rechazar();

    expect(api.cambiarEstado).toHaveBeenCalledOnceWith(RESUMEN.folio, {
      estado: 'RECHAZADA',
      comentario: 'Horario no disponible',
    });
  });

  it('oculta y bloquea la cancelación para JEFE_DEPARTAMENTO', () => {
    // Cambia el rol inicial del signal simulado para este caso.
    componente.usuario = signal({
      nombre: 'Jefatura',
      rol: 'JEFE_DEPARTAMENTO',
      expiraEn: '2099-12-31T23:59:59',
    });
    componente.seleccionar(RESUMEN);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cancelar reserva');
    componente.cancelarReserva();
    expect(api.cancelar).not.toHaveBeenCalled();
  });

  it('muestra el conflicto de disponibilidad y no envía una modificación traslapada', () => {
    espaciosApi.disponibilidad.and.returnValue(
      of(
        disponibilidad([
          { horaInicio: '10:00:00', horaFin: '11:00:00', estado: 'PENDIENTE' },
          { horaInicio: '11:30:00', horaFin: '12:30:00', estado: 'APROBADA' },
        ]),
      ),
    );
    componente.seleccionar(RESUMEN);
    componente.iniciarModificacion();
    componente.formularioEdicion.patchValue({
      horaInicio: '11:45',
      horaFin: '12:15',
    });
    fixture.detectChanges();

    expect(componente.mensajesHorarioEdicion()[0]).toContain(
      'se traslapa con una reserva existente',
    );
    expect(componente.puedeGuardarModificacion()).toBeFalse();
    componente.guardarModificacion();
    expect(api.modificar).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del backend y refresca la lista si una acción falla', () => {
    api.cambiarEstado.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              mensaje: 'La reserva ya no está pendiente',
              detalles: [],
            },
          }),
      ),
    );
    componente.seleccionar(RESUMEN);

    componente.aprobar();

    expect(componente.notificacion()?.tipo).toBe('error');
    expect(componente.notificacion()?.mensaje).toBe(
      'La reserva ya no está pendiente',
    );
    expect(api.listar).toHaveBeenCalledTimes(2);
  });
});
