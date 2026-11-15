/**
 * Formato único de error que devuelve la API.
 * Coincide con el DTO ApiError del backend.
 *
 * Ejemplo de respuesta 400:
 * {
 *   "status": 400,
 *   "error": "Bad Request",
 *   "mensaje": "Hay datos inválidos en la solicitud",
 *   "detalles": ["solicitante: El nombre del solicitante es obligatorio"],
 *   "fecha": "2026-11-14T18:10:00"
 * }
 *
 * Importante: algunos errores de seguridad (401/403) pueden llegar con el
 * cuerpo vacío, por eso la utilidad de errores contempla ese caso.
 */
export interface ApiError {
  status: number;
  error: string;
  mensaje: string;
  detalles: string[];
  fecha: string;
}
