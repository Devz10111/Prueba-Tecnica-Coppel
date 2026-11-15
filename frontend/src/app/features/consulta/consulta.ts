import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pantalla temporal de "Consultar reserva".
 * Se reemplazará por la búsqueda por folio y el detalle con historial.
 */
@Component({
  selector: 'app-consulta',
  imports: [RouterLink],
  template: `
    <section class="text-center py-5">
      <i class="bi bi-search display-5 text-primary"></i>
      <h1 class="h3 fw-bold mt-3">Consultar reserva</h1>
      <p class="text-secondary mb-4">
        Este módulo está en construcción. Aquí se podrá buscar una reserva por folio.
      </p>
      <a class="btn btn-outline-primary" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class Consulta {}
