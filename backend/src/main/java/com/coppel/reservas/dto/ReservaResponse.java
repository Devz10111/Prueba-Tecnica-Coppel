package com.coppel.reservas.dto;

import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.HistorialCambio;
import com.coppel.reservas.model.Reserva;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Reserva tal como la devuelve la API, con su historial de cambios. */
public record ReservaResponse(
        String folio,
        Long espacioId,
        String espacio,
        Integer capacidadEspacio,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        long duracionMinutos,
        String solicitante,
        String departamento,
        String descripcion,
        EstadoReserva estado,
        LocalDateTime creadaEn,
        List<CambioResponse> historial
) {

    // Convierte la entidad Reserva y su historial en el DTO de respuesta
    public static ReservaResponse desde(Reserva r, List<HistorialCambio> cambios) {
        return new ReservaResponse(
                r.getFolio(),
                r.getEspacio().getId(),
                r.getEspacio().getNombre(),
                r.getEspacio().getCapacidad(),
                r.getFecha(),
                r.getHoraInicio(),
                r.getHoraFin(),
                r.getDuracionMinutos(),
                r.getSolicitante(),
                r.getDepartamento(),
                r.getDescripcion(),
                r.getEstado(),
                r.getCreadaEn(),
                cambios.stream().map(CambioResponse::desde).toList()
        );
    }
}