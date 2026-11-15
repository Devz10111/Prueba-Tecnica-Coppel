import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pantalla temporal de "Disponibilidad de espacios".
 * Se reemplazará por el calendario con las franjas ocupadas.
 */
@Component({
  selector: 'app-calendario',
  imports: [RouterLink],
  template: `
    <section class="text-center py-5">
      <i class="bi bi-calendar3 display-5 text-primary"></i>
      <h1 class="h3 fw-bold mt-3">Disponibilidad de espacios</h1>
      <p class="text-secondary mb-4">
        Este módulo está en construcción. Aquí se mostrará el calendario de disponibilidad.
      </p>
      <a class="btn btn-outline-primary" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class Calendario {}
