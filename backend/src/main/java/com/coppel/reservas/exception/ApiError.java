package com.coppel.reservas.exception;

import java.time.LocalDateTime;
import java.util.List;

/** Formato único de todos los errores que devuelve la API. */
public record ApiError(
        int status,              // Código HTTP (400, 404, 409...)
        String error,            // Nombre del código ("Bad Request", "Not Found"...)
        String mensaje,          // Explicación para el usuario
        List<String> detalles,   // Lista de campos inválidos (solo en validaciones)
        LocalDateTime fecha      // Momento del error
) { }