package com.coppel.reservas.dto;

import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.Reserva;

import java.time.LocalDate;
import java.time.LocalTime;

/** Fila del listado de administración (sin historial, para que la lista sea liviana). */
public record ReservaResumenResponse(
        String folio,
        String espacio,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        EstadoReserva estado,
        String solicitante,
        String departamento
) {

    public static ReservaResumenResponse desde(Reserva r) {
        return new ReservaResumenResponse(
                r.getFolio(),
                r.getEspacio().getNombre(),
                r.getFecha(),
                r.getHoraInicio(),
                r.getHoraFin(),
                r.getEstado(),
                r.getSolicitante(),
                r.getDepartamento());
    }
}