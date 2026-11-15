/**
 * Utilidades de formato de fechas y horas compartidas por varias pantallas.
 * El backend envía fechas como "YYYY-MM-DD" y horas como "HH:mm:ss".
 */

/** Formatea "YYYY-MM-DD" como "Viernes, 20 de noviembre de 2026". */
export function formatearFechaLarga(fecha: string | null): string {
  if (!fecha) {
    return '—';
  }

  const partes = fecha.split('-').map(Number);
  if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) {
    return fecha;
  }

  const [anio, mes, dia] = partes;
  const formateador = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const texto = formateador.format(new Date(anio, mes - 1, dia));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Convierte "HH:mm:ss" en "HH:mm" para mostrarlo. */
export function formatearHoraCorta(
  hora: string | null | undefined,
): string {
  return hora ? hora.slice(0, 5) : '—';
}

/** Formatea un LocalDateTime ISO (por ejemplo "2026-11-20T10:15:00"). */
export function formatearFechaHora(valor: string | null): string {
  if (!valor) {
    return '—';
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}
