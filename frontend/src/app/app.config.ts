import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';

/**
 * Configuración global de la aplicación (el equivalente moderno a un NgModule raíz).
 *
 * Cada "provide..." registra un servicio de Angular en el inyector de dependencias:
 * - provideRouter: habilita la navegación entre pantallas usando las rutas de app.routes.ts.
 * - provideHttpClient: habilita HttpClient para poder consumir la API del backend
 *   y registra el interceptor que agrega el token a las rutas /api/admin.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
