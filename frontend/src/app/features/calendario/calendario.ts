import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { Disponibilidad, Espacio, Ocupacion } from '../../core/models';
import { EspacioService } from '../../core/services/espacio.service';
import { obtenerMensajeError } from '../../core/utils/error.utils';
import {
  fechaLocal,
  formatearFechaLarga,
  formatearHoraCorta,
  sumarDias,
} from '../../core/utils/fecha.utils';
import {
  horaAMinutos,
  minutosAHora,
  rangosSeTraslapan,
} from '../../core/utils/hora.utils';

/**
 * Una franja de 30 minutos dentro de la vista diaria.
 * `ocupacion` es null cuando la franja está libre.
 */
interface FranjaCalendario {
  /** Hora inicial de la franja, por ejemplo "08:00". */
  inicio: string;
  /** Hora final de la franja, por ejemplo "08:30". */
  fin: string;
  /** Reserva que ocupa la franja (PENDIENTE o APROBADA), o null si está libre. */
  ocupacion: Ocupacion | null;
}

/**
 * Pantalla "Disponibilidad de espacios".
 *
 * Muestra un día completo (08:00 a 20:00) en bloques de 30 minutos.
 * El usuario puede cambiar de espacio, de fecha y avanzar o retroceder un día.
 * Las franjas ocupadas se pintan según el estado de la reserva.
 */
@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.html',
  styleUrl: './calendario.css',
})
export class Calendario implements OnInit {
  private readonly espacioService = inject(EspacioService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Catálogo de espacios que llena el selector. */
  protected readonly espacios = signal<Espacio[]>([]);
  protected readonly cargandoEspacios = signal(true);
  protected readonly errorEspacios = signal<string | null>(null);

  /** Espacio y fecha que se están consultando. */
  protected readonly espacioId = signal<number | null>(null);
  protected readonly fecha = signal(fechaLocal(new Date()));

  /** Respuesta de la API y estados de carga/error de la disponibilidad. */
  protected readonly disponibilidad = signal<Disponibilidad | null>(null);
  protected readonly cargandoDisponibilidad = signal(false);
  protected readonly errorDisponibilidad = signal<string | null>(null);
  protected readonly avisoFecha = signal<string | null>(null);

  /**
   * Número de la última consulta de disponibilidad.
   * Sirve para ignorar respuestas viejas si el usuario cambia de fecha rápido.
   */
  private solicitudDisponibilidad = 0;

  /** Funciones de formato expuestas a la plantilla. */
  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly horaCorta = formatearHoraCorta;

  /** Fecha de hoy en formato "YYYY-MM-DD" (límite inferior del selector). */
  protected get hoy(): string {
    return fechaLocal(new Date());
  }

  /** Espacio elegido, con nombre y capacidad para mostrarlo en el encabezado. */
  protected readonly espacioSeleccionado = computed<Espacio | null>(() => {
    const id = this.espacioId();
    return this.espacios().find((espacio) => espacio.id === id) ?? null;
  });

  /** Indica si se puede retroceder: no se permite ir antes de hoy. */
  protected readonly puedeDiaAnterior = computed(
    () => this.fecha() > fechaLocal(new Date()),
  );

  /**
   * Convierte las franjas ocupadas que devuelve la API en filas de 30 minutos.
   * Una reserva puede ocupar varias filas; cada fila sabe qué reserva la cruza.
   */
  protected readonly franjas = computed<FranjaCalendario[]>(() => {
    const datos = this.disponibilidad();
    if (!datos) {
      return [];
    }

    const apertura = horaAMinutos(datos.horaApertura);
    const cierre = horaAMinutos(datos.horaCierre);
    if (apertura === null || cierre === null || cierre <= apertura) {
      return [];
    }

    const resultado: FranjaCalendario[] = [];

    // Se avanza de 30 en 30 minutos desde la apertura hasta el cierre.
    for (let inicio = apertura; inicio + 30 <= cierre; inicio += 30) {
      const fin = inicio + 30;

      // Se busca una reserva activa que cruce esta franja.
      const ocupacion =
        datos.ocupados.find((reserva) => {
          const reservaInicio = horaAMinutos(reserva.horaInicio);
          const reservaFin = horaAMinutos(reserva.horaFin);

          return (
            reservaInicio !== null &&
            reservaFin !== null &&
            rangosSeTraslapan(inicio, fin, reservaInicio, reservaFin)
          );
        }) ?? null;

      resultado.push({
        inicio: minutosAHora(inicio),
        fin: minutosAHora(fin),
        ocupacion,
      });
    }

    return resultado;
  });

  /** Cantidad de bloques ocupados y libres para el resumen superior. */
  protected readonly bloquesOcupados = computed(
    () => this.franjas().filter((franja) => franja.ocupacion !== null).length,
  );

  protected readonly bloquesLibres = computed(
    () => this.franjas().length - this.bloquesOcupados(),
  );

  /** Al iniciar se cargan los espacios; el primero se selecciona por defecto. */
  ngOnInit(): void {
    this.cargarEspacios();
  }

  /** GET /api/espacios para llenar el selector de espacios. */
  protected cargarEspacios(): void {
    this.cargandoEspacios.set(true);
    this.errorEspacios.set(null);

    this.espacioService
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoEspacios.set(false)),
      )
      .subscribe({
        next: (espacios) => {
          this.espacios.set(espacios);

          if (espacios.length === 0) {
            return;
          }

          // Si el espacio actual ya no existe, se usa el primero del catálogo.
          const actual = this.espacioId();
          const existe = espacios.some((espacio) => espacio.id === actual);
          if (!existe) {
            this.espacioId.set(espacios[0].id);
          }

          this.cargarDisponibilidad();
        },
        error: (error: unknown) =>
          this.errorEspacios.set(obtenerMensajeError(error)),
      });
  }

  /** Cambia el espacio seleccionado y vuelve a consultar la disponibilidad. */
  protected cambiarEspacio(evento: Event): void {
    const valor = Number((evento.target as HTMLSelectElement).value);
    if (!Number.isInteger(valor) || valor <= 0) {
      return;
    }

    this.espacioId.set(valor);
    this.cargarDisponibilidad();
  }

  /** Cambia la fecha escrita en el selector y valida que no sea pasada. */
  protected cambiarFecha(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const valor = input.value;

    if (!valor) {
      this.avisoFecha.set('Selecciona una fecha válida.');
      input.value = this.fecha();
      return;
    }

    if (valor < this.hoy) {
      this.avisoFecha.set('No puedes consultar una fecha anterior a hoy.');
      input.value = this.hoy;
      this.fecha.set(this.hoy);
    } else {
      this.avisoFecha.set(null);
      this.fecha.set(valor);
    }

    this.cargarDisponibilidad();
  }

  /** Retrocede un día, sin permitir fechas anteriores a hoy. */
  protected irDiaAnterior(): void {
    if (!this.puedeDiaAnterior()) {
      return;
    }

    this.fecha.set(sumarDias(this.fecha(), -1));
    this.avisoFecha.set(null);
    this.cargarDisponibilidad();
  }

  /** Avanza un día y consulta la disponibilidad de la nueva fecha. */
  protected irDiaSiguiente(): void {
    this.fecha.set(sumarDias(this.fecha(), 1));
    this.avisoFecha.set(null);
    this.cargarDisponibilidad();
  }

  /** GET /api/espacios/{id}/disponibilidad?fecha=YYYY-MM-DD */
  protected cargarDisponibilidad(): void {
    const espacioId = this.espacioId();
    if (espacioId === null) {
      return;
    }

    // Cada consulta recibe un número; solo la última puede actualizar la pantalla.
    this.solicitudDisponibilidad += 1;
    const solicitud = this.solicitudDisponibilidad;

    this.cargandoDisponibilidad.set(true);
    this.errorDisponibilidad.set(null);
    this.disponibilidad.set(null);

    this.espacioService
      .disponibilidad(espacioId, this.fecha())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.cargandoDisponibilidad.set(false);
          }
        }),
      )
      .subscribe({
        next: (datos) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.disponibilidad.set(datos);
          }
        },
        error: (error: unknown) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.errorDisponibilidad.set(obtenerMensajeError(error));
          }
        },
      });
  }

  /** Lleva al formulario con el espacio y la fecha ya seleccionados. */
  protected reservar(): void {
    const espacioId = this.espacioId();
    if (espacioId === null) {
      return;
    }

    this.router.navigate(['/reservar'], {
      queryParams: { espacioId, fecha: this.fecha() },
    });
  }

  /** Clase CSS que colorea la fila según esté libre, pendiente o aprobada. */
  protected claseFranja(ocupacion: Ocupacion | null): string {
    if (!ocupacion) {
      return 'franja-libre';
    }
    return ocupacion.estado === 'PENDIENTE'
      ? 'franja-pendiente'
      : 'franja-aprobada';
  }

  /** Clase de la insignia de Bootstrap según el estado de la reserva. */
  protected claseEstado(ocupacion: Ocupacion): string {
    return ocupacion.estado === 'PENDIENTE'
      ? 'text-bg-warning'
      : 'text-bg-success';
  }

  /** Texto accesible para lectores de pantalla en cada franja. */
  protected etiquetaFranja(franja: FranjaCalendario): string {
    const rango = `${franja.inicio} a ${franja.fin}`;
    return franja.ocupacion
      ? `${rango}: ocupado, ${franja.ocupacion.estado}`
      : `${rango}: libre`;
  }
}
