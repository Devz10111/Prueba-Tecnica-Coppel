import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';

import {
  CambioEstadoRequest,
  Disponibilidad,
  EstadoReserva,
  Espacio,
  ReservaModificacionRequest,
  ReservaResponse,
  ReservaResumen,
} from '../../../core/models';
import { AdminReservaService } from '../../../core/services/admin-reserva.service';
import { AuthService } from '../../../core/services/auth.service';
import { EspacioService } from '../../../core/services/espacio.service';
import { obtenerMensajeError } from '../../../core/utils/error.utils';
import {
  fechaLocal,
  formatearFechaHora,
  formatearFechaLarga,
  formatearHoraCorta,
} from '../../../core/utils/fecha.utils';
import { horaAMinutos } from '../../../core/utils/hora.utils';
import {
  fechaNoPasada,
  mensajesReglasHorario,
} from '../../../core/utils/reserva-validation.utils';

interface Notificacion {
  tipo: 'exito' | 'error';
  mensaje: string;
}

/** Panel para consultar y administrar las reservas existentes. */
@Component({
  selector: 'app-reservas-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './reservas.html',
  styleUrl: './reservas.css',
})
export class ReservasAdmin implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reservasApi = inject(AdminReservaService);
  private readonly espaciosApi = inject(EspacioService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Evita que una respuesta vieja reemplace la disponibilidad más reciente. */
  private solicitudDisponibilidad = 0;

  protected readonly usuario = this.auth.usuarioActual;
  protected readonly estados: EstadoReserva[] = [
    'PENDIENTE',
    'APROBADA',
    'RECHAZADA',
    'CANCELADA',
  ];

  protected readonly reservas = signal<ReservaResumen[]>([]);
  protected readonly detalle = signal<ReservaResponse | null>(null);
  protected readonly folioSeleccionado = signal<string | null>(null);
  protected readonly espacios = signal<Espacio[]>([]);
  protected readonly filtroEstado = signal<EstadoReserva | ''>('');
  protected readonly busqueda = signal('');

  protected readonly cargando = signal(false);
  protected readonly cargandoDetalle = signal(false);
  protected readonly cargandoEspacios = signal(false);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly errorDetalle = signal<string | null>(null);
  protected readonly errorEspacios = signal<string | null>(null);
  protected readonly notificacion = signal<Notificacion | null>(null);
  protected readonly enAccion = signal(false);

  protected readonly mostrarRechazo = signal(false);
  protected readonly comentarioRechazo = signal('');
  protected readonly editando = signal(false);
  protected readonly disponibilidadEdicion = signal<Disponibilidad | null>(null);
  protected readonly cargandoDisponibilidad = signal(false);
  protected readonly errorDisponibilidad = signal<string | null>(null);

  /** Formulario de horario, con las mismas reglas base que la reserva pública. */
  protected readonly formularioEdicion = this.fb.group({
    espacioId: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control('', [Validators.required, fechaNoPasada]),
    horaInicio: this.fb.control('', Validators.required),
    horaFin: this.fb.control('', Validators.required),
  });

  /** Aplica la búsqueda del folio en el navegador sobre el resultado filtrado por API. */
  protected readonly reservasVisibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return texto
      ? this.reservas().filter((reserva) =>
          reserva.folio.toLowerCase().includes(texto),
        )
      : this.reservas();
  });

  protected readonly hoy = fechaLocal(new Date());
  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly fechaHora = formatearFechaHora;
  protected readonly horaCorta = formatearHoraCorta;

  ngOnInit(): void {
    this.cargarReservas();
    this.cargarEspacios();

    // Cada cambio de espacio o fecha actualiza las franjas para validar traslapes.
    this.formularioEdicion.controls.espacioId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarDisponibilidadEdicion());
    this.formularioEdicion.controls.fecha.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarDisponibilidadEdicion());
    this.formularioEdicion.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorDisponibilidad.set(null));
  }

  /** Carga la tabla y envía el estado seleccionado como query param. */
  protected cargarReservas(): void {
    this.cargando.set(true);
    this.errorLista.set(null);

    this.reservasApi
      .listar(this.filtroEstado())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (reservas) => this.reservas.set(reservas),
        error: (error: unknown) =>
          this.errorLista.set(obtenerMensajeError(error)),
      });
  }

  /** Cambia el filtro y vuelve a pedir la lista al servidor. */
  protected cambiarFiltro(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    if (
      valor === '' ||
      this.estados.includes(valor as EstadoReserva)
    ) {
      this.filtroEstado.set(valor as EstadoReserva | '');
      this.cargarReservas();
    }
  }

  /** Guarda el texto de búsqueda; el filtrado por folio es local e inmediato. */
  protected cambiarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  /** Obtiene el detalle completo (incluido el historial) al elegir una fila. */
  protected seleccionar(reserva: ReservaResumen): void {
    this.folioSeleccionado.set(reserva.folio);
    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    this.detalle.set(null);
    this.cancelarEdicion();
    this.mostrarRechazo.set(false);

    this.reservasApi
      .detalle(reserva.folio)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoDetalle.set(false)),
      )
      .subscribe({
        next: (detalle) => this.detalle.set(detalle),
        error: (error: unknown) =>
          this.errorDetalle.set(obtenerMensajeError(error)),
      });
  }

  /** Repite la consulta del detalle seleccionado si la petición falló. */
  protected reintentarDetalle(): void {
    const seleccionada = this.reservas().find(
      (reserva) => reserva.folio === this.folioSeleccionado(),
    );
    if (seleccionada) {
      this.seleccionar(seleccionada);
    }
  }

  /** Envía la aprobación solo para reservas pendientes. */
  protected aprobar(): void {
    const reserva = this.detalle();
    if (!reserva || reserva.estado !== 'PENDIENTE') {
      return;
    }

    this.ejecutarAccion(
      this.reservasApi.cambiarEstado(reserva.folio, { estado: 'APROBADA' }),
      'La reserva fue aprobada.',
    );
  }

  /** Abre el formulario del comentario opcional de rechazo. */
  protected abrirRechazo(): void {
    if (this.detalle()?.estado === 'PENDIENTE') {
      this.comentarioRechazo.set('');
      this.mostrarRechazo.set(true);
    }
  }

  /** Envía el rechazo y solo incluye el comentario si tiene contenido. */
  protected rechazar(): void {
    const reserva = this.detalle();
    if (!reserva || reserva.estado !== 'PENDIENTE') {
      return;
    }

    const comentario = this.comentarioRechazo().trim();
    const cambio: CambioEstadoRequest = {
      estado: 'RECHAZADA',
      ...(comentario ? { comentario } : {}),
    };

    this.ejecutarAccion(
      this.reservasApi.cambiarEstado(reserva.folio, cambio),
      'La reserva fue rechazada.',
    );
  }

  /** Conserva el comentario opcional mientras se edita el campo. */
  protected actualizarComentario(evento: Event): void {
    this.comentarioRechazo.set(
      (evento.target as HTMLTextAreaElement).value,
    );
  }

  /** Prepara el formulario con la ubicación y el horario actuales. */
  protected iniciarModificacion(): void {
    const reserva = this.detalle();
    if (!reserva || !this.puedeModificar(reserva.estado)) {
      return;
    }

    this.formularioEdicion.setValue(
      {
        espacioId: reserva.espacioId,
        fecha: reserva.fecha,
        horaInicio: this.horaCorta(reserva.horaInicio),
        horaFin: this.horaCorta(reserva.horaFin),
      },
      { emitEvent: false },
    );
    this.editando.set(true);
    this.cargarDisponibilidadEdicion();
  }

  /** Cierra el formulario de edición y descarta su estado de disponibilidad. */
  protected cancelarEdicion(): void {
    this.editando.set(false);
    this.disponibilidadEdicion.set(null);
    this.errorDisponibilidad.set(null);
    this.cargandoDisponibilidad.set(false);
    this.solicitudDisponibilidad += 1;
  }

  /** Actualiza la disponibilidad para el espacio y la fecha elegidos. */
  private cargarDisponibilidadEdicion(): void {
    const espacioId = this.formularioEdicion.controls.espacioId.value;
    const fecha = this.formularioEdicion.controls.fecha.value;
    const solicitud = ++this.solicitudDisponibilidad;

    this.disponibilidadEdicion.set(null);
    this.errorDisponibilidad.set(null);
    if (
      !this.editando() ||
      espacioId === null ||
      !fecha ||
      this.formularioEdicion.controls.fecha.invalid
    ) {
      this.cargandoDisponibilidad.set(false);
      return;
    }

    this.cargandoDisponibilidad.set(true);
    this.espaciosApi
      .disponibilidad(espacioId, fecha)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.cargandoDisponibilidad.set(false);
          }
        }),
      )
      .subscribe({
        next: (disponibilidad) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.disponibilidadEdicion.set(disponibilidad);
          }
        },
        error: (error: unknown) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.errorDisponibilidad.set(obtenerMensajeError(error));
          }
        },
      });
  }

  /** Devuelve las reglas temporales y conflictos para mostrar antes de guardar. */
  protected mensajesHorarioEdicion(): string[] {
    const valores = this.formularioEdicion.getRawValue();
    const mensajes = mensajesReglasHorario(
      valores.fecha,
      valores.horaInicio,
      valores.horaFin,
    );
    const inicio = horaAMinutos(valores.horaInicio);
    const fin = horaAMinutos(valores.horaFin);
    const espacioId = valores.espacioId;
    const disponibilidad = this.disponibilidadEdicion();

    if (
      inicio === null ||
      fin === null ||
      fin <= inicio ||
      espacioId === null ||
      !disponibilidad
    ) {
      return mensajes;
    }

    const reservaOriginal = this.detalle();
    const conflictos = disponibilidad.ocupados.filter((ocupacion) => {
      // Disponibilidad no incluye folio; se reconoce la franja propia por su horario exacto.
      const esFranjaOriginal =
        reservaOriginal !== null &&
        reservaOriginal.espacioId === espacioId &&
        reservaOriginal.fecha === valores.fecha &&
        this.horaCorta(reservaOriginal.horaInicio) ===
          this.horaCorta(ocupacion.horaInicio) &&
        this.horaCorta(reservaOriginal.horaFin) ===
          this.horaCorta(ocupacion.horaFin);
      if (esFranjaOriginal) {
        return false;
      }

      const ocupadoInicio = horaAMinutos(ocupacion.horaInicio);
      const ocupadoFin = horaAMinutos(ocupacion.horaFin);
      return (
        ocupadoInicio !== null &&
        ocupadoFin !== null &&
        inicio < ocupadoFin &&
        fin > ocupadoInicio
      );
    });

    if (conflictos.length > 0) {
      const franjas = conflictos
        .map(
          (ocupacion) =>
            `${this.horaCorta(ocupacion.horaInicio)}–${this.horaCorta(ocupacion.horaFin)}`,
        )
        .join(', ');
      mensajes.push(
        `El horario se traslapa con una reserva existente (${franjas}).`,
      );
    }
    return mensajes;
  }

  /** Envía cambios solo si el formulario y la disponibilidad son válidos. */
  protected guardarModificacion(): void {
    const reserva = this.detalle();
    if (!reserva || this.enAccion()) {
      return;
    }

    if (this.formularioEdicion.invalid) {
      this.formularioEdicion.markAllAsTouched();
      return;
    }

    const valores = this.formularioEdicion.getRawValue();
    if (
      valores.espacioId === null ||
      !valores.fecha ||
      !valores.horaInicio ||
      !valores.horaFin
    ) {
      return;
    }

    if (this.cargandoDisponibilidad() || !this.disponibilidadEdicion()) {
      this.errorDisponibilidad.set(
        'Espera a que se consulte la disponibilidad antes de guardar.',
      );
      return;
    }

    const mensajes = this.mensajesHorarioEdicion();
    if (mensajes.length > 0) {
      this.formularioEdicion.markAllAsTouched();
      this.errorDisponibilidad.set(mensajes.join(' '));
      return;
    }

    const cambios: ReservaModificacionRequest = {
      espacioId: valores.espacioId,
      fecha: valores.fecha,
      horaInicio: valores.horaInicio,
      horaFin: valores.horaFin,
    };
    this.ejecutarAccion(
      this.reservasApi.modificar(reserva.folio, cambios),
      'La reserva fue modificada.',
    );
  }

  /** Cancela con confirmación; solo ADMIN ve y puede ejecutar esta acción. */
  protected cancelarReserva(): void {
    const reserva = this.detalle();
    if (
      !reserva ||
      !this.puedeCancelar() ||
      !this.puedeModificar(reserva.estado) ||
      !window.confirm(`¿Cancelar la reserva ${reserva.folio}?`)
    ) {
      return;
    }

    this.ejecutarAccion(
      this.reservasApi.cancelar(reserva.folio),
      'La reserva fue cancelada.',
    );
  }

  /** Centraliza la notificación, actualización del detalle y recarga de tabla. */
  private ejecutarAccion(
    peticion: Observable<ReservaResponse>,
    mensajeExito: string,
  ): void {
    this.notificacion.set(null);
    this.enAccion.set(true);

    peticion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enAccion.set(false)),
      )
      .subscribe({
        next: (detalle) => {
          this.detalle.set(detalle);
          this.mostrarRechazo.set(false);
          this.cancelarEdicion();
          this.notificacion.set({ tipo: 'exito', mensaje: mensajeExito });
          this.cargarReservas();
        },
        error: (error: unknown) => {
          this.notificacion.set({
            tipo: 'error',
            mensaje: obtenerMensajeError(error),
          });
          this.cargarReservas();
        },
      });
  }

  protected puedeModificar(estado: EstadoReserva): boolean {
    return estado === 'PENDIENTE' || estado === 'APROBADA';
  }

  protected puedeCancelar(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  /** Reintenta la carga del catálogo desde el formulario de modificación. */
  protected reintentarCargaEspacios(): void {
    this.cargarEspacios();
  }

  protected puedeGuardarModificacion(): boolean {
    return (
      this.formularioEdicion.valid &&
      !this.enAccion() &&
      !this.cargandoEspacios() &&
      !this.errorEspacios() &&
      this.espacios().length > 0 &&
      !this.cargandoDisponibilidad() &&
      this.disponibilidadEdicion() !== null &&
      this.mensajesHorarioEdicion().length === 0
    );
  }

  protected claseEstado(estado: EstadoReserva): string {
    const clases: Record<EstadoReserva, string> = {
      PENDIENTE: 'text-bg-warning',
      APROBADA: 'text-bg-success',
      RECHAZADA: 'text-bg-danger',
      CANCELADA: 'text-bg-secondary',
    };
    return clases[estado];
  }

  protected etiquetaEstado(estado: EstadoReserva): string {
    const etiquetas: Record<EstadoReserva, string> = {
      PENDIENTE: 'Pendiente',
      APROBADA: 'Aprobada',
      RECHAZADA: 'Rechazada',
      CANCELADA: 'Cancelada',
    };
    return etiquetas[estado];
  }

  /** Carga los espacios disponibles para el selector de modificación. */
  private cargarEspacios(): void {
    this.cargandoEspacios.set(true);
    this.formularioEdicion.controls.espacioId.disable({ emitEvent: false });
    this.espaciosApi
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoEspacios.set(false)),
      )
      .subscribe({
        next: (espacios) => {
          this.espacios.set(espacios);
          if (espacios.length > 0) {
            this.formularioEdicion.controls.espacioId.enable({
              emitEvent: false,
            });
          }
        },
        error: (error: unknown) =>
          this.errorEspacios.set(obtenerMensajeError(error)),
      });
  }
}
