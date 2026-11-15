import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de la aplicación.
 *
 * No contiene la interfaz directamente: su único trabajo es dar salida
 * al router. La ruta padre (definida en app.routes.ts) carga el Layout
 * general con navbar, contenido y footer.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
