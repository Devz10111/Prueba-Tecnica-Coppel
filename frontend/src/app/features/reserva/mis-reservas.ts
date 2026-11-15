import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { EstadoReserva, ReservaResumen } from '../../core/models';
import { ReservaService } from '../../core/services/reserva.service';
import { obtenerMensajeError } from '../../core/utils/error.utils';

@Component({
  selector: 'app-mis-reservas',
  imports: [RouterLink],
  templateUrl: './mis-reservas.html',
})
export class MisReservas implements OnInit {
  private readonly reservasService = inject(ReservaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly reservas = signal<ReservaResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reservasService
      .listarMias()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (reservas) => this.reservas.set(reservas),
        error: (error: unknown) => this.error.set(obtenerMensajeError(error)),
      });
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
}
