import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models';

/**
 * Mensajes por defecto para cuando la API no envía un cuerpo JSON utilizable.
 * El código 0 significa que la petición ni siquiera llegó al servidor.
 */
const MENSAJES_POR_DEFECTO: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
  400: 'La solicitud contiene datos inválidos.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
  409: 'La operación no se puede realizar en este momento.',
  500: 'Ocurrió un error interno en el servidor.',
};

/**
 * Convierte cualquier error HTTP en un mensaje legible para el usuario.
 *
 * Orden de búsqueda:
 * 1. Si la API envió un ApiError, usa "mensaje" y "detalles".
 * 2. Si el cuerpo está vacío (típico en 401/403 de seguridad), usa un mensaje según el status.
 * 3. Si el error no es HTTP, devuelve un mensaje genérico.
 *
 * @param error Error capturado por HttpClient (normalmente HttpErrorResponse).
 * @returns Texto listo para mostrar en un alert, toast o mensaje de formulario.
 */
export function obtenerMensajeError(error: unknown): string {
  // Errores que no vienen de HTTP (por ejemplo, un bug de JavaScript).
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  // status 0: problema de red, CORS o backend apagado.
  if (error.status === 0) {
    return MENSAJES_POR_DEFECTO[0];
  }

  const cuerpo = error.error as unknown;

  // La API respondió con el formato ApiError.
  if (cuerpo && typeof cuerpo === 'object') {
    const apiError = cuerpo as Partial<ApiError>;

    const mensaje =
      typeof apiError.mensaje === 'string' ? apiError.mensaje.trim() : '';

    const detalles = Array.isArray(apiError.detalles)
      ? apiError.detalles.filter(
          (detalle): detalle is string =>
            typeof detalle === 'string' && detalle.trim().length > 0,
        )
      : [];

    // Se combinan mensaje y detalles para que el usuario sepa qué corregir.
    if (mensaje && detalles.length > 0) {
      return `${mensaje}: ${detalles.join('; ')}`;
    }
    if (mensaje) {
      return mensaje;
    }
    if (detalles.length > 0) {
      return detalles.join('; ');
    }
  }

  // Algunos errores pueden llegar como texto plano.
  if (typeof cuerpo === 'string' && cuerpo.trim()) {
    return cuerpo.trim();
  }

  // Cuerpo vacío o desconocido: mensaje según el código HTTP.
  return (
    MENSAJES_POR_DEFECTO[error.status] ??
    `Ocurrió un error (HTTP ${error.status}). Intenta de nuevo.`
  );
}
