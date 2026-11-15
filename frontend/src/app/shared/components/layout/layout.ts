import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { RolUsuario } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Layout general de la aplicación.
 *
 * Contiene los elementos que se repiten en todas las pantallas:
 * - Barra de navegación superior.
 * - Contenedor central donde el Router muestra la pantalla activa.
 * - Pie de página.
 *
 * La estructura usa flexbox de Bootstrap (d-flex flex-column min-vh-100)
 * para que el pie quede abajo aunque la pantalla tenga poco contenido.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Controla si el menú de navegación está abierto en teléfonos y tabletas.
   * Es un "signal": Angular avisa automáticamente a la plantilla cuando cambia.
   */
  protected readonly menuAbierto = signal(false);

  /**
   * Usuario de la sesión actual. Es el signal de AuthService, así que el
   * navbar cambia solo al iniciar o cerrar sesión.
   */
  protected readonly usuario = this.auth.usuarioActual;

  /** Año actual mostrado en el pie de página. */
  protected readonly anioActual = new Date().getFullYear();

  /** Abre o cierra el menú móvil. */
  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  /** Cierra el menú al navegar a otra pantalla. */
  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  /**
   * Cierra la sesión y lleva al login.
   * El token se borra en AuthService; el navbar se actualiza por el signal.
   */
  protected cerrarSesion(): void {
    this.cerrarMenu();
    this.auth.logout();
    void this.router.navigate(['/admin/login']);
  }

  /** Texto legible del rol para mostrarlo en la barra. */
  protected rolTexto(rol: RolUsuario): string {
    return rol === 'ADMIN' ? 'Administrador' : 'Jefe de departamento';
  }
}
