import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  Disponibilidad,
  Espacio,
  ReservaRequest,
  ReservaResponse,
} from '../../core/models';
import { EspacioService } from '../../core/services/espacio.service';
import { ReservaService } from '../../core/services/reserva.service';
import { obtenerMensajeError } from '../../core/utils/error.utils';

/** Devuelve la fecha local en formato "YYYY-MM-DD" (sin desfase por zona horaria). */
function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Validador: la fecha no puede ser anterior a hoy. */
function fechaNoPasada(control: AbstractControl): ValidationErrors | null {
  const valor = typeof control.value === 'string' ? control.value : '';
  if (!valor) {
    return null;
  }
  return valor < fechaLocal(new Date()) ? { fechaPasada: true } : null;
}

/** Validador: el texto no puede quedar vacío ni contener solo espacios. */
function textoNoVacio(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as unknown;
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    return { textoVacio: true };
  }
  return null;
}

/** Convierte una hora "HH:mm" o "HH:mm:ss" a minutos desde medianoche. */
function aMinutos(hora: string | null): number | null {
  if (!hora) {
    return null;
  }

  const coincidencia = /^(\d{2}):(\d{2})/.exec(hora);
  if (!coincidencia) {
    return null;
  }

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);

  if (horas > 23 || minutos > 59) {
    return null;
  }

  return horas * 60 + minutos;
}

/**
 * Formulario de reserva en 4 pasos.
 *
 * El formulario completo vive en un solo FormGroup; los pasos solo muestran
 * una parte distinta. Así los datos se conservan al ir y volver con
 * Anterior/Siguiente sin necesidad de copiarlos entre pantallas.
 */
@Component({
  selector: 'app-reserva',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reserva.html',
  styleUrl: './reserva.css',
})
export class Reserva implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly espacioService = inject(EspacioService);
  private readonly reservaService = inject(ReservaService);
  private readonly destroyRef = inject(DestroyRef);

  /** Número de la solicitud de disponibilidad más reciente (evita respuestas viejas). */
  private solicitudDisponibilidad = 0;

  protected readonly totalPasos = 4;

  /** Rótulos del indicador de progreso. */
  protected readonly pasos = [
    { numero: 1, titulo: 'Espacio', icono: 'bi-building' },
    { numero: 2, titulo: 'Fecha y hora', icono: 'bi-clock' },
    { numero: 3, titulo: 'Solicitante', icono: 'bi-person' },
    { numero: 4, titulo: 'Confirmar', icono: 'bi-check2-circle' },
  ] as const;

  protected readonly pasoActual = signal(1);
  protected readonly progreso = computed(() =>
    Math.min((this.pasoActual() / this.totalPasos) * 100, 100),
  );

  protected readonly espacios = signal<Espacio[]>([]);
  protected readonly cargandoEspacios = signal(true);
  protected readonly errorEspacios = signal<string | null>(null);

  protected readonly disponibilidad = signal<Disponibilidad | null>(null);
  protected readonly cargandoDisponibilidad = signal(false);
  protected readonly errorDisponibilidad = signal<string | null>(null);

  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly reservaCreada = signal<ReservaResponse | null>(null);

  protected readonly horaApertura = '08:00';
  protected readonly horaCierre = '20:00';
  protected readonly minimoMinutos = 30;

  /**
   * Un solo formulario para los 4 pasos.
   * Los validadores de formato se declaran aquí; las reglas que dependen de
   * la disponibilidad (traslapes) se revisan en métodos porque necesitan el
   * resultado de la API.
   */
  protected readonly form = this.fb.group({
    espacioId: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control('', [Validators.required, fechaNoPasada]),
    horaInicio: this.fb.control('', Validators.required),
    horaFin: this.fb.control('', Validators.required),
    solicitante: this.fb.control('', [
      Validators.required,
      Validators.maxLength(120),
      textoNoVacio,
    ]),
    departamento: this.fb.control('', [
      Validators.required,
      Validators.maxLength(120),
      textoNoVacio,
    ]),
    descripcion: this.fb.control('', [
      Validators.required,
      Validators.maxLength(500),
      textoNoVacio,
    ]),
  });

  /** Fecha mínima del selector (hoy). Se calcula cada vez para evitar desfases. */
  protected get hoy(): string {
    return fechaLocal(new Date());
  }

  /** Espacio elegido en el paso 1. */
  protected get espacioSeleccionado(): Espacio | null {
    const id = this.form.controls.espacioId.value;
    if (id === null) {
      return null;
    }
    return this.espacios().find((espacio) => espacio.id === id) ?? null;
  }

  /** Duración calculada a partir de las horas capturadas. */
  protected get duracionMinutos(): number {
    const inicio = aMinutos(this.form.controls.horaInicio.value);
    const fin = aMinutos(this.form.controls.horaFin.value);

    if (inicio === null || fin === null || fin <= inicio) {
      return 0;
    }
    return fin - inicio;
  }

  /** Duración en un texto amigable, por ejemplo "1 h 30 min". */
  protected get duracionTexto(): string {
    const minutos = this.duracionMinutos;
    if (minutos === 0) {
      return '—';
    }

    const horas = Math.floor(minutos / 60);
    const restantes = minutos % 60;

    if (horas === 0) {
      return `${restantes} min`;
    }
    return restantes === 0 ? `${horas} h` : `${horas} h ${restantes} min`;
  }

  ngOnInit(): void {
    this.cargarEspacios();

    // Cuando cambia la fecha o el espacio, se vuelve a consultar la disponibilidad.
    this.form.controls.fecha.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.actualizarDisponibilidad());

    this.form.controls.espacioId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.actualizarDisponibilidad());

    // Si el usuario corrige datos después de un error del servidor, se limpia el aviso.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.errorEnvio()) {
          this.errorEnvio.set(null);
        }
      });
  }

  /** GET /api/espacios para llenar las tarjetas del paso 1. */
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
        next: (espacios) => this.espacios.set(espacios),
        error: (error: unknown) =>
          this.errorEspacios.set(obtenerMensajeError(error)),
      });
  }

  /** Consulta las franjas ocupadas del espacio y fecha actuales. */
  protected actualizarDisponibilidad(): void {
    const espacioId = this.form.controls.espacioId.value;
    const fecha = this.form.controls.fecha.value;

    // Se invalida cualquier solicitud anterior que todavía esté en vuelo.
    this.solicitudDisponibilidad += 1;
    this.disponibilidad.set(null);
    this.errorDisponibilidad.set(null);

    if (
      espacioId === null ||
      !fecha ||
      this.form.controls.fecha.hasError('fechaPasada')
    ) {
      this.cargandoDisponibilidad.set(false);
      return;
    }

    const solicitud = this.solicitudDisponibilidad;
    this.cargandoDisponibilidad.set(true);

    this.espacioService
      .disponibilidad(espacioId, fecha)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          // Solo la solicitud más reciente puede apagar el indicador de carga.
          if (solicitud === this.solicitudDisponibilidad) {
            this.cargandoDisponibilidad.set(false);
          }
        }),
      )
      .subscribe({
        next: (disponibilidad) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.disponibilidad.set(disponibilidad);
          }
        },
        error: (error: unknown) => {
          if (solicitud === this.solicitudDisponibilidad) {
            this.errorDisponibilidad.set(obtenerMensajeError(error));
          }
        },
      });
  }

  protected paso1Valido(): boolean {
    const id = this.form.controls.espacioId.value;
    return id !== null && this.espacios().some((espacio) => espacio.id === id);
  }

  protected paso2Valido(): boolean {
    const { fecha, horaInicio, horaFin } = this.form.controls;

    if (fecha.invalid || horaInicio.invalid || horaFin.invalid) {
      return false;
    }
    if (this.mensajesHorario().length > 0) {
      return false;
    }
    if (this.cargandoDisponibilidad() || this.errorDisponibilidad()) {
      return false;
    }

    const disponibilidad = this.disponibilidad();
    return (
      disponibilidad !== null &&
      disponibilidad.espacioId === this.form.controls.espacioId.value &&
      disponibilidad.fecha === fecha.value
    );
  }

  protected paso3Valido(): boolean {
    const { solicitante, departamento, descripcion } = this.form.controls;
    return solicitante.valid && departamento.valid && descripcion.valid;
  }

  /** Habilita o deshabilita el botón Siguiente según el paso actual. */
  protected puedeAvanzar(): boolean {
    switch (this.pasoActual()) {
      case 1:
        return this.paso1Valido();
      case 2:
        return this.paso2Valido();
      case 3:
        return this.paso3Valido();
      default:
        return false;
    }
  }

  protected siguiente(): void {
    if (!this.puedeAvanzar() || this.pasoActual() >= this.totalPasos) {
      return;
    }

    const nuevoPaso = this.pasoActual() + 1;
    this.pasoActual.set(nuevoPaso);

    // Al entrar al paso 2 se refrescan las franjas ocupadas.
    if (nuevoPaso === 2) {
      this.actualizarDisponibilidad();
    }

    this.desplazarArriba();
  }

  protected anterior(): void {
    if (this.enviando() || this.pasoActual() <= 1) {
      return;
    }

    this.pasoActual.update((paso) => paso - 1);

    if (this.pasoActual() === 2) {
      this.actualizarDisponibilidad();
    }

    this.desplazarArriba();
  }

  /** Regresa al paso 2 después de un error del servidor (por ejemplo, un 409). */
  protected volverAlPaso2(): void {
    this.errorEnvio.set(null);
    this.pasoActual.set(2);
    this.actualizarDisponibilidad();
    this.desplazarArriba();
  }

  /** Confirma la reserva con POST /api/reservas. */
  protected confirmar(): void {
    if (this.enviando()) {
      return;
    }

    // Se vuelve a validar cada paso por si algo cambió mientras el usuario avanzaba.
    if (!this.paso1Valido()) {
      this.pasoActual.set(1);
      this.desplazarArriba();
      return;
    }
    if (!this.paso2Valido()) {
      this.pasoActual.set(2);
      this.actualizarDisponibilidad();
      this.desplazarArriba();
      return;
    }
    if (!this.paso3Valido()) {
      this.pasoActual.set(3);
      this.desplazarArriba();
      return;
    }

    const valores = this.form.getRawValue();
    if (
      valores.espacioId === null ||
      !valores.fecha ||
      !valores.horaInicio ||
      !valores.horaFin ||
      !valores.solicitante ||
      !valores.departamento ||
      !valores.descripcion
    ) {
      return;
    }

    const peticion: ReservaRequest = {
      espacioId: valores.espacioId,
      fecha: valores.fecha,
      horaInicio: valores.horaInicio.slice(0, 5),
      horaFin: valores.horaFin.slice(0, 5),
      solicitante: valores.solicitante.trim(),
      departamento: valores.departamento.trim(),
      descripcion: valores.descripcion.trim(),
    };

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.reservaService
      .crear(peticion)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (reserva) => {
          this.errorEnvio.set(null);
          this.reservaCreada.set(reserva);
          this.desplazarArriba();
        },
        error: (error: unknown) => {
          this.errorEnvio.set(obtenerMensajeError(error));
          // Se actualiza la disponibilidad para que el usuario vea el nuevo estado.
          this.actualizarDisponibilidad();
        },
      });
  }

  /** Limpia todo para capturar una nueva reserva. */
  protected nuevaReserva(): void {
    this.form.reset({
      espacioId: null,
      fecha: '',
      horaInicio: '',
      horaFin: '',
      solicitante: '',
      departamento: '',
      descripcion: '',
    });

    this.solicitudDisponibilidad += 1;
    this.disponibilidad.set(null);
    this.errorDisponibilidad.set(null);
    this.cargandoDisponibilidad.set(false);
    this.errorEnvio.set(null);
    this.reservaCreada.set(null);
    this.pasoActual.set(1);
    this.desplazarArriba();
  }

  /** Mensaje de la fecha (solo se muestra cuando el campo ya fue tocado). */
  protected errorFecha(): string | null {
    const control = this.form.controls.fecha;

    if (!control.value) {
      return control.touched ? 'Selecciona una fecha.' : null;
    }
    if (control.hasError('fechaPasada')) {
      return 'La fecha no puede ser anterior a hoy.';
    }
    return null;
  }

  /**
   * Reglas del paso 2 que dependen de varias horas y de la disponibilidad.
   * Devuelve todos los problemas encontrados para mostrarlos juntos.
   */
  protected mensajesHorario(): string[] {
    const inicioValor = this.form.controls.horaInicio.value;
    const finValor = this.form.controls.horaFin.value;

    if (!inicioValor && !finValor) {
      return [];
    }

    if (!inicioValor || !finValor) {
      return ['Selecciona la hora de inicio y la hora de fin.'];
    }

    const inicio = aMinutos(inicioValor);
    const fin = aMinutos(finValor);

    if (inicio === null || fin === null) {
      return ['Usa un formato de hora válido (HH:mm).'];
    }

    const apertura = aMinutos(this.horaApertura) ?? 8 * 60;
    const cierre = aMinutos(this.horaCierre) ?? 20 * 60;
    const mensajes: string[] = [];

    if (fin <= inicio) {
      mensajes.push('La hora de fin debe ser posterior a la hora de inicio.');
    } else {
      if (fin - inicio < this.minimoMinutos) {
        mensajes.push(
          `La reserva debe durar al menos ${this.minimoMinutos} minutos.`,
        );
      }

      if (inicio < apertura || fin > cierre) {
        mensajes.push(
          `El horario debe estar entre ${this.horaApertura} y ${this.horaCierre}.`,
        );
      }

      if (this.inicioEnPasado(inicio)) {
        mensajes.push(
          'La fecha y hora de inicio ya pasaron. Elige un horario futuro.',
        );
      }

      const disponibilidad = this.disponibilidad();
      if (disponibilidad) {
        const conflictos = disponibilidad.ocupados.filter((ocupacion) => {
          const ocupadoInicio = aMinutos(ocupacion.horaInicio);
          const ocupadoFin = aMinutos(ocupacion.horaFin);

          if (ocupadoInicio === null || ocupadoFin === null) {
            return false;
          }
          return inicio < ocupadoFin && fin > ocupadoInicio;
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
      }
    }

    return mensajes;
  }

  /** Valida que, si la fecha es hoy, la hora de inicio todavía no haya pasado. */
  private inicioEnPasado(inicio: number): boolean {
    const fecha = this.form.controls.fecha.value;
    if (!fecha || fecha !== fechaLocal(new Date())) {
      return false;
    }

    const ahora = new Date();
    return inicio <= ahora.getHours() * 60 + ahora.getMinutes();
  }

  /** Mensajes de validación de los campos del paso 3. */
  protected errorSolicitante(): string | null {
    return this.mensajeError(
      this.form.controls.solicitante,
      'El nombre del solicitante',
      120,
    );
  }

  protected errorDepartamento(): string | null {
    return this.mensajeError(
      this.form.controls.departamento,
      'El departamento',
      120,
    );
  }

  protected errorDescripcion(): string | null {
    return this.mensajeError(
      this.form.controls.descripcion,
      'La descripción',
      500,
    );
  }

  private mensajeError(
    control: AbstractControl,
    etiqueta: string,
    maximo: number,
  ): string | null {
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required') || control.hasError('textoVacio')) {
      return `${etiqueta} es obligatorio.`;
    }
    if (control.hasError('maxlength')) {
      return `${etiqueta} no puede exceder ${maximo} caracteres.`;
    }
    return 'Revisa este campo.';
  }

  /** Convierte "HH:mm:ss" en "HH:mm" para mostrarlo. */
  protected horaCorta(hora: string | null | undefined): string {
    return hora ? hora.slice(0, 5) : '—';
  }

  /** Formatea "YYYY-MM-DD" como "Viernes, 20 de noviembre de 2026". */
  protected fechaLarga(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }

    const partes = fecha.split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) {
      return fecha;
    }

    const [anio, mes, dia] = partes;
    const formateador = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const texto = formateador.format(new Date(anio, mes - 1, dia));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private desplazarArriba(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
