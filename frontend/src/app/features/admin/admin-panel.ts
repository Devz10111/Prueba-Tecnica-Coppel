import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Marco compartido del módulo: mantiene visibles sus pestañas al cambiar ruta. */
@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-panel.html',
})
export class AdminPanel {
  private readonly auth = inject(AuthService);

  protected readonly puedeAdministrarUsuarios = computed(
    () => this.auth.usuarioActual()?.rol === 'ADMIN',
  );
}
