import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Pantalla temporal del login de administración.
 * Se reemplazará por el formulario reactivo conectado a AuthService.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <section class="text-center py-5">
      <i class="bi bi-shield-lock display-5 text-primary"></i>
      <h1 class="h3 fw-bold mt-3">Acceso administrador</h1>
      <p class="text-secondary mb-4">
        Este módulo está en construcción. Aquí se implementará el inicio de sesión.
      </p>
      <a class="btn btn-outline-primary" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class Login {}
