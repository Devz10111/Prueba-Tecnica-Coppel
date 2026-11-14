package com.coppel.reservas.dto;

import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.Reserva;

import java.time.LocalTime;

/** Franja ocupada de un espacio. No expone datos del solicitante (es información pública). */
public record OcupacionResponse(LocalTime horaInicio, LocalTime horaFin, EstadoReserva estado) {

    public static OcupacionResponse desde(Reserva r) {
        return new OcupacionResponse(r.getHoraInicio(), r.getHoraFin(), r.getEstado());
    }
}