package com.coppel.reservas.dto;

import com.coppel.reservas.model.Rol;

/** Datos públicos de una cuenta administrativa; nunca incluye el hash de contraseña. */
public record UsuarioAdminResponse(
        Long id,
        String nombre,
        String email,
        String departamento,
        Rol rol
) { }
