import { EstadoReserva } from './estado-reserva.model';

/**
 * Espacio corporativo que se puede reservar.
 * Coincide con el DTO EspacioResponse del backend.
 */
export interface Espacio {
  id: number;
  nombre: string;
  capacidad: number;
  descripcion: string;
}

/**
 * Franja horaria ocupada dentro de un espacio.
 * Coincide con el DTO OcupacionResponse del backend.
 *
 * Las horas llegan como texto con formato "HH:mm:ss" (por ejemplo "09:00:00").
 */
export interface Ocupacion {
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
}

/**
 * Disponibilidad de un espacio para una fecha concreta.
 * Coincide con el DTO DisponibilidadResponse del backend.
 *
 * - fecha: "YYYY-MM-DD" (por ejemplo "2026-11-20").
 * - horaApertura y horaCierre: "HH:mm:ss".
 */
export interface Disponibilidad {
  espacioId: number;
  espacio: string;
  fecha: string;
  horaApertura: string;
  horaCierre: string;
  ocupados: Ocupacion[];
}
