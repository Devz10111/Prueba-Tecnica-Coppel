package com.coppel.reservas.model;

/**
 * Posibles estados del ciclo de vida de una reserva.
 * Usar un enum evita errores de escritura y deja claro qué valores son válidos.
 */
public enum EstadoReserva {
    PENDIENTE,   // Recién creada por el empleado, espera revisión del administrador
    APROBADA,    // El administrador la autorizó
    RECHAZADA,   // El administrador la denegó
    CANCELADA    // Cancelada por un administrador (la acción DELETE de la API)
}