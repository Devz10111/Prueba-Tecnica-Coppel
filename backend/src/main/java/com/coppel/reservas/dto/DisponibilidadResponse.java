package com.coppel.reservas.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Disponibilidad de un espacio en una fecha: horario de atención y franjas ocupadas. */
public record DisponibilidadResponse(
        Long espacioId,
        String espacio,
        LocalDate fecha,
        LocalTime horaApertura,
        LocalTime horaCierre,
        List<OcupacionResponse> ocupados
) { }