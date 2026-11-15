import { Routes } from '@angular/router';

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
      {
        path: 'admin/login',
        component: Login,
        title: 'Acceso administrador | Grupo Coppel',
      },
      {
        path: 'admin',
        component: Panel,
        title: 'Panel de administración | Grupo Coppel',
      },
    ],
  },

  // Cualquier URL desconocida regresa a la pantalla principal.
  { path: '**', redirectTo: '' },
];
