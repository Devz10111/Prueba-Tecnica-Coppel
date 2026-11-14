package com.coppel.reservas.dto;

import java.time.Instant;

/** Respuesta del login: el token y datos básicos del usuario. */
public record LoginResponse(
        String token,
        String tipo,        // Siempre "Bearer"
        Instant expiraEn,
        String nombre,
        String rol
) { }