/**
 * Utilidades para trabajar con horas en formato "HH:mm" o "HH:mm:ss".
 * Varias pantallas necesitan comparar horarios sin depender de una librería.
 */

/**
 * Convierte una hora a minutos desde la medianoche.
 * Ejemplo: "09:30" devuelve 570.
 * Devuelve null si el texto no tiene un formato válido.
 */
export function horaAMinutos(hora: string | null | undefined): number | null {
  if (!hora) {
    return null;
  }

  // Se aceptan "HH:mm" y "HH:mm:ss"; solo importan las horas y los minutos.
  const coincidencia = /^(\d{2}):(\d{2})/.exec(hora);
  if (!coincidencia) {
    return null;
  }

  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2]);

  if (horas > 23 || minutos > 59) {
    return null;
  }

  return horas * 60 + minutos;
}

/**
 * Convierte minutos desde la medianoche a una hora "HH:mm".
 * Ejemplo: 570 devuelve "09:30".
 */
export function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const restantes = minutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(restantes).padStart(2, '0')}`;
}

/**
 * Indica si dos rangos de tiempo se traslapan.
 *
 * Los extremos se consideran abiertos: un rango que termina a las 10:00
 * no se traslapa con otro que empieza a las 10:00.
 */
export function rangosSeTraslapan(
  inicioA: number,
  finA: number,
  inicioB: number,
  finB: number,
): boolean {
  return inicioA < finB && finA > inicioB;
}
