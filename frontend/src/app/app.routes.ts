import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { Panel } from './features/admin/panel/panel';
import { Login } from './features/auth/login/login';
import { Calendario } from './features/calendario/calendario';
import { Consulta } from './features/consulta/consulta';
import { Inicio } from './features/inicio/inicio';
import { Reserva } from './features/reserva/reserva';
import { Layout } from './shared/components/layout/layout';

/**
 * Rutas de la aplicación.
 *
 * La primera ruta usa Layout como "ruta padre": el navbar, el contenedor
 * y el footer se muestran una sola vez, y el router pinta la pantalla hija
 * dentro de su <router-outlet>.
 *
 * `title` cambia automáticamente el título de la pestaña del navegador.
 */
export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        component: Inicio,
        title: 'Reserva de Espacios | Grupo Coppel',
      },
      {
        path: 'reservar',
        component: Reserva,
        title: 'Nueva reserva | Grupo Coppel',
      },
      {
        path: 'consultar',
        component: Consulta,
        title: 'Consultar reserva | Grupo Coppel',
      },
      {
        path: 'consultar/:folio',
        component: Consulta,
        title: 'Consultar reserva | Grupo Coppel',
      },
      {
        path: 'calendario',
        component: Calendario,
        title: 'Disponibilidad de espacios | Grupo Coppel',
      },
      // El login es público: queda fuera del guard.
      {
        path: 'admin/login',
        component: Login,
        title: 'Acceso administrador | Grupo Coppel',
      },
      {
        // Ruta padre sin componente: solo agrupa las rutas protegidas.
        // El guard se ejecuta antes de entrar a cualquier hija.
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            component: Panel,
            title: 'Panel de administración | Grupo Coppel',
          },
          {
            path: 'reservas',
            loadComponent: () =>
              import('./features/admin/reservas/reservas').then(
                (modulo) => modulo.ReservasAdmin,
              ),
            title: 'Gestión de reservas | Grupo Coppel',
          },
          // Cualquier ruta desconocida dentro de /admin regresa al panel.
          { path: '**', redirectTo: '' },
        ],
      },
    ],
  },

  // Cualquier URL desconocida regresa a la pantalla principal.
  { path: '**', redirectTo: '' },
];
