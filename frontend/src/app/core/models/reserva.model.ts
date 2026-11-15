import { EstadoReserva } from './estado-reserva.model';

/**
 * Datos que el formulario envía para crear una reserva.
 * Coincide con el DTO ReservaRequest del backend.
 *
 * En la PETICIÓN las horas usan formato "HH:mm" (por ejemplo "09:00").
 * En las RESPUESTAS el backend las devuelve como "HH:mm:ss".
 */
export interface ReservaRequest {
  espacioId: number;
  fecha: string;       // "YYYY-MM-DD"
  horaInicio: string;  // "HH:mm"
  horaFin: string;     // "HH:mm"
  solicitante: string;
  departamento: string;
  descripcion: string;
}

/**
 * Un movimiento del historial de una reserva.
 * Coincide con el DTO CambioResponse del backend.
 */
export interface CambioHistorial {
  accion: string;   // "CREADA", "APROBADA", "RECHAZADA", "MODIFICADA", "CANCELADA"...
  detalle: string;
  fecha: string;    // Fecha y hora en formato ISO
  usuario: string;  // Nombre de quien realizó el cambio
}

/**
 * Reserva completa devuelta por la API, con su historial.
 * Coincide con el DTO ReservaResponse del backend.
 */
export interface ReservaResponse {
  folio: string;
  espacioId: number;
  espacio: string;
  capacidadEspacio: number;
  fecha: string;            // "YYYY-MM-DD"
  horaInicio: string;       // "HH:mm:ss"
  horaFin: string;          // "HH:mm:ss"
  duracionMinutos: number;
  solicitante: string;
  departamento: string;
  descripcion: string;
  estado: EstadoReserva;
  creadaEn: string;         // Fecha y hora en formato ISO
  historial: CambioHistorial[];
}

/**
 * Fila del listado del panel de administración.
 * Coincide con el DTO ReservaResumenResponse del backend.
 * No incluye historial para que el listado sea ligero.
 */
export interface ReservaResumen {
  folio: string;
  espacio: string;
  fecha: string;       // "YYYY-MM-DD"
  horaInicio: string;  // "HH:mm:ss"
  horaFin: string;     // "HH:mm:ss"
  estado: EstadoReserva;
  solicitante: string;
  departamento: string;
}

/** Datos para aprobar o rechazar una reserva pendiente. */
export interface CambioEstadoRequest {
  estado: Extract<EstadoReserva, 'APROBADA' | 'RECHAZADA'>;
  comentario?: string;
}

/** Datos editables desde el panel de administración. */
export interface ReservaModificacionRequest {
  espacioId: number;
  fecha: string;      // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string;    // "HH:mm"
}
