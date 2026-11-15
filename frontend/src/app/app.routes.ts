import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { adminOnlyGuard } from './core/guards/admin-only.guard';
import { authGuard } from './core/guards/auth.guard';
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
        loadComponent: () =>
          import('./features/inicio/inicio').then((modulo) => modulo.Inicio),
        title: 'Reserva de Espacios | Grupo Coppel',
      },
      {
        path: 'reservar',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/reserva/reserva').then((modulo) => modulo.Reserva),
        title: 'Nueva reserva | Grupo Coppel',
      },
      {
        path: 'consultar',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/consulta/consulta').then((modulo) => modulo.Consulta),
        title: 'Consultar reserva | Grupo Coppel',
      },
      {
        path: 'consultar/:folio',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/consulta/consulta').then((modulo) => modulo.Consulta),
        title: 'Consultar reserva | Grupo Coppel',
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario').then(
            (modulo) => modulo.Calendario,
          ),
        title: 'Disponibilidad de espacios | Grupo Coppel',
      },
      {
        path: 'mis-reservas',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/reserva/mis-reservas').then(
            (modulo) => modulo.MisReservas,
          ),
        title: 'Mis reservas | Grupo Coppel',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login').then((modulo) => modulo.Login),
        title: 'Iniciar sesión | Grupo Coppel',
      },
      {
        path: 'admin/login',
        redirectTo: '/login',
      },
      {
        // Ruta padre sin componente: solo agrupa las rutas protegidas.
        // El guard se ejecuta antes de entrar a cualquier hija.
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin-panel').then(
            (modulo) => modulo.AdminPanel,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'reservas',
          },
          {
            path: 'reservas',
            loadComponent: () =>
              import('./features/admin/reservas/reservas').then(
                (modulo) => modulo.ReservasAdmin,
              ),
            title: 'Gestión de reservas | Grupo Coppel',
          },
          {
            path: 'usuarios',
            canActivate: [adminOnlyGuard],
            loadComponent: () =>
              import('./features/admin/usuarios/usuarios').then(
                (modulo) => modulo.AdminUsuarios,
              ),
            title: 'Usuarios | Administración | Grupo Coppel',
          },
          // Cualquier ruta desconocida dentro de /admin regresa a la gestión.
          { path: '**', redirectTo: 'reservas' },
        ],
      },
    ],
  },

  // Cualquier URL desconocida regresa a la pantalla principal.
  { path: '**', redirectTo: '' },
];
