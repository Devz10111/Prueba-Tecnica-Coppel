import { AbstractControl, ValidationErrors } from '@angular/forms';

import { fechaLocal } from './fecha.utils';
import { horaAMinutos } from './hora.utils';

/** Validador compartido: impide seleccionar una fecha anterior a hoy. */
export function fechaNoPasada(
  control: AbstractControl,
): ValidationErrors | null {
  const valor = typeof control.value === 'string' ? control.value : '';
  if (!valor) {
    return null;
  }
  return valor < fechaLocal(new Date()) ? { fechaPasada: true } : null;
}

/**
 * Aplica las reglas de horario del formulario de reserva:
 * duración mínima, horario de apertura y que el inicio no haya pasado.
 */
export function mensajesReglasHorario(
  fecha: string | null,
  horaInicio: string | null,
  horaFin: string | null,
  ahora = new Date(),
): string[] {
  if (!horaInicio && !horaFin) {
    return [];
  }
  if (!horaInicio || !horaFin) {
    return ['Selecciona la hora de inicio y la hora de fin.'];
  }

  const inicio = horaAMinutos(horaInicio);
  const fin = horaAMinutos(horaFin);
  if (inicio === null || fin === null) {
    return ['Usa un formato de hora válido (HH:mm).'];
  }
  if (fin <= inicio) {
    return ['La hora de fin debe ser posterior a la hora de inicio.'];
  }

  const mensajes: string[] = [];
  if (fin - inicio < 30) {
    mensajes.push('La reserva debe durar al menos 30 minutos.');
  }
  if (inicio < 8 * 60 || fin > 20 * 60) {
    mensajes.push('El horario debe estar entre 08:00 y 20:00.');
  }
  if (
    fecha === fechaLocal(ahora) &&
    inicio <= ahora.getHours() * 60 + ahora.getMinutes()
  ) {
    mensajes.push(
      'La fecha y hora de inicio ya pasaron. Elige un horario futuro.',
    );
  }

  return mensajes;
}
