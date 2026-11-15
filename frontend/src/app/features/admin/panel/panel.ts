import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pantalla temporal del panel de administración.
 * Se reemplazará por el listado y la gestión de reservas.
 */
@Component({
  selector: 'app-panel',
  imports: [RouterLink],
  template: `
    <section class="text-center py-5">
      <i class="bi bi-speedometer2 display-5 text-primary"></i>
      <h1 class="h3 fw-bold mt-3">Panel de administración</h1>
      <p class="text-secondary mb-4">
        Este módulo está en construcción. Aquí se gestionarán las reservas.
      </p>
      <a class="btn btn-outline-primary me-2" routerLink="/admin/reservas">
        <i class="bi bi-list-check me-1"></i>Gestionar reservas
      </a>
      <a class="btn btn-outline-secondary" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class Panel {}
