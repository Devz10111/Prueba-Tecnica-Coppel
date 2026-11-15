import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pantalla temporal de "Nueva reserva".
 * Se reemplazará en un siguiente paso por el formulario de 4 pasos.
 */
@Component({
  selector: 'app-reserva',
  imports: [RouterLink],
  template: `
    <section class="text-center py-5">
      <i class="bi bi-calendar-plus display-5 text-primary"></i>
      <h1 class="h3 fw-bold mt-3">Nueva reserva</h1>
      <p class="text-secondary mb-4">
        Este módulo está en construcción. Aquí irá el formulario de 4 pasos.
      </p>
      <a class="btn btn-outline-primary" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class Reserva {}
