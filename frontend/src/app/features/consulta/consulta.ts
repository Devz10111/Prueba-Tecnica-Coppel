import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EstadoReserva, ReservaResponse } from '../../core/models';
import { ReservaService } from '../../core/services/reserva.service';
import { obtenerMensajeError } from '../../core/utils/error.utils';
import {
  formatearFechaLarga,
  formatearFechaHora,
  formatearHoraCorta,
} from '../../core/utils/fecha.utils';

/**
 * Pantalla "Consultar reserva".
 *
 * Acepta dos formas de entrada:
 * 1. Escribir el folio en el formulario y presionar Buscar.
 * 2. Abrir directamente /consultar/{folio}; el folio se toma de la URL.
 */
@Component({
  selector: 'app-consulta',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './consulta.html',
  styleUrl: './consulta.css',
})
export class Consulta implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly reservaService = inject(ReservaService);
  private readonly destroyRef = inject(DestroyRef);

  /** Solo acepta dígitos: la API usa folios numéricos. */
  protected readonly form = this.fb.nonNullable.group({
    folio: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  protected readonly folio = this.form.controls.folio;
  protected readonly reserva = signal<ReservaResponse | null>(null);
  protected readonly buscando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly noEncontrada = signal(false);

  protected readonly fechaLarga = formatearFechaLarga;
  protected readonly horaCorta = formatearHoraCorta;
  protected readonly fechaHora = formatearFechaHora;

  ngOnInit(): void {
    // Si el usuario pega letras, se eliminan automáticamente.
    this.folio.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        const limpio = valor.replace(/\D/g, '');
        if (valor !== limpio) {
          this.folio.setValue(limpio, { emitEvent: false });
        }
      });

    // Permite entrar directamente a /consultar/2026000001.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((parametros) => {
        const folioUrl = (parametros.get('folio') ?? '').trim();
        if (!folioUrl) {
          return;
        }

        if (!/^\d+$/.test(folioUrl)) {
          this.error.set('El folio de la dirección solo puede contener dígitos.');
          this.noEncontrada.set(false);
          return;
        }

        this.folio.setValue(folioUrl, { emitEvent: false });
        this.buscar(folioUrl);
      });
  }

  /** Busca una reserva por folio y refleja el folio en la URL. */
  protected buscar(folioParam?: string): void {
    const folio = (folioParam ?? this.folio.value).replace(/\D/g, '').trim();
    if (!folio) {
      this.folio.markAsTouched();
      return;
    }

    this.folio.setValue(folio, { emitEvent: false });
    this.location.replaceState(`/consultar/${folio}`);

    this.buscando.set(true);
    this.error.set(null);
    this.noEncontrada.set(false);
    this.reserva.set(null);

    this.reservaService
      .consultarPorFolio(folio)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.buscando.set(false)),
      )
      .subscribe({
        next: (reserva) => this.reserva.set(reserva),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.noEncontrada.set(true);
            this.error.set(
              `No encontramos una reserva con el folio ${folio}. Revisa el número e intenta de nuevo.`,
            );
            return;
          }

          this.error.set(obtenerMensajeError(error));
        },
      });
  }

  /** Limpia la consulta para escribir otro folio. */
  protected limpiar(): void {
    this.form.reset({ folio: '' });
    this.reserva.set(null);
    this.error.set(null);
    this.noEncontrada.set(false);
    this.location.replaceState('/consultar');
  }

  protected puedeBuscar(): boolean {
    return this.folio.valid && !this.buscando();
  }

  protected errorFolio(): string | null {
    if (!this.folio.touched || this.folio.valid) {
      return null;
    }
    if (this.folio.hasError('required')) {
      return 'Escribe el folio de la reserva.';
    }
    if (this.folio.hasError('pattern')) {
      return 'El folio solo puede contener dígitos.';
    }
    return 'Revisa el folio.';
  }

  /** Color de la insignia según el estado de la reserva. */
  protected claseEstado(estado: EstadoReserva): string {
    const clases: Record<EstadoReserva, string> = {
      PENDIENTE: 'text-bg-warning',
      APROBADA: 'text-bg-success',
      RECHAZADA: 'text-bg-danger',
      CANCELADA: 'text-bg-secondary',
    };
    return clases[estado];
  }

  /** Color del punto de la línea de tiempo según la acción. */
  protected claseAccion(accion: string): string {
    switch (accion) {
      case 'APROBADA':
        return 'accion-aprobada';
      case 'RECHAZADA':
        return 'accion-rechazada';
      case 'CANCELADA':
        return 'accion-cancelada';
      case 'MODIFICADA':
        return 'accion-modificada';
      default:
        return 'accion-creada';
    }
  }
}
