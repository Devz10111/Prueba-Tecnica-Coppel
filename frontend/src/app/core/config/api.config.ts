/**
 * Configuración central de la API.
 *
 * La URL del backend se define UNA SOLA VEZ en este archivo.
 * Los servicios que consuman la API deben importar API_CONFIG desde aquí
 * en lugar de escribir la URL a mano en cada uno.
 *
 * Ejemplo de uso dentro de un servicio:
 *
 *   import { API_CONFIG } from '../config/api.config';
 *
 *   this.http.get(`${API_CONFIG.baseUrl}/api/espacios`);
 */
export const API_CONFIG = {
  baseUrl: 'http://localhost:8080',
} as const;
