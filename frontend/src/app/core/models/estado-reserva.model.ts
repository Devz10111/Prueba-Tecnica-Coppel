/**
 * Estados posibles de una reserva.
 *
 * Se usa un "tipo unión" en lugar de un enum de TypeScript porque el backend
 * envía exactamente estos textos en el JSON. Así el editor autocompleta los
 * valores válidos y cualquier otro texto produce un error de compilación.
 */
export type EstadoReserva = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
