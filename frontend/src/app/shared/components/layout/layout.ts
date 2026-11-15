import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
  /**
   * Controla si el menú de navegación está abierto en teléfonos y tabletas.
   * Es un "signal": Angular avisa automáticamente a la plantilla cuando cambia.
   */
  protected readonly menuAbierto = signal(false);

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
}
