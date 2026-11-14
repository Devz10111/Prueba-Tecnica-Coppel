package com.coppel.reservas.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos que envía el empleado para solicitar una reserva.
 * No incluye folio, estado ni fecha de creación: esos los decide el sistema.
 */
public record ReservaRequest(

        // Id del espacio elegido en el PASO 1 (por ejemplo, 3 = Auditorio)
        @NotNull(message = "Debes seleccionar un espacio")
        Long espacioId,

        // Día de la reserva (PASO 2). No se permiten fechas pasadas.
        @NotNull(message = "La fecha es obligatoria")
        @FutureOrPresent(message = "La fecha no puede ser anterior a hoy")
        LocalDate fecha,

        // Hora de inicio y de fin (PASO 2)
        @NotNull(message = "La hora de inicio es obligatoria")
        LocalTime horaInicio,

        @NotNull(message = "La hora de fin es obligatoria")
        LocalTime horaFin,

        // Datos del solicitante (PASO 3)
        @NotBlank(message = "El nombre del solicitante es obligatorio")
        @Size(max = 120, message = "El nombre no puede exceder 120 caracteres")
        String solicitante,

        @NotBlank(message = "El departamento es obligatorio")
        @Size(max = 120, message = "El departamento no puede exceder 120 caracteres")
        String departamento,

        @NotBlank(message = "La descripción del evento es obligatoria")
        @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
        String descripcion
) { }