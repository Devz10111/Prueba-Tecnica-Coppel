package com.coppel.reservas.dto;

import com.coppel.reservas.model.HistorialCambio;

import java.time.LocalDateTime;

/**
 * Un cambio del historial tal como se muestra al cliente.
 * Solo expone el nombre de quien lo hizo, nunca la entidad Usuario completa
 * (que incluye el hash de la contraseña).
 */
public record CambioResponse(
        String accion,          // Qué pasó: "CREADA", "APROBADA", etc.
        String detalle,         // Explicación más detallada
        LocalDateTime fecha,    // Cuándo ocurrió
        String usuario          // Nombre de quien lo hizo
) {

    /**
     * Convierte una entidad HistorialCambio en este DTO.
     * Es "static": se llama sin crear un objeto antes, así:
     *     CambioResponse.desde(cambio)
     */
    public static CambioResponse desde(HistorialCambio cambio) {

        // Operador ternario:  condición ? valorSiVerdadero : valorSiFalso
        // Si el cambio tiene usuario, usamos su nombre.
        // Si es null (lo creó el empleado, que no tiene cuenta), mostramos "Solicitante".
        String quien = (cambio.getUsuario() != null)
                ? cambio.getUsuario().getNombre()
                : "Solicitante";

        return new CambioResponse(
                cambio.getAccion(),
                cambio.getDetalle(),
                cambio.getFecha(),
                quien
        );
    }
}