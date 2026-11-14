package com.coppel.reservas.dto;

import com.coppel.reservas.model.EstadoReserva;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos para aprobar o rechazar una reserva. */
public record CambioEstadoRequest(

        @NotNull(message = "El estado es obligatorio")
        EstadoReserva estado,

        @Size(max = 300, message = "El comentario no puede exceder 300 caracteres")
        String comentario
) { }