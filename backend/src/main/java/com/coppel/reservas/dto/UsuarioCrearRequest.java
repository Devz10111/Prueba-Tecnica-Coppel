package com.coppel.reservas.dto;

import com.coppel.reservas.model.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Datos necesarios para crear una cuenta desde el panel de administración. */
public record UsuarioCrearRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede exceder 120 caracteres")
        String nombre,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 120, message = "El correo no puede exceder 120 caracteres")
        String email,

        @Size(max = 120, message = "El departamento no puede exceder 120 caracteres")
        String departamento,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        String password,

        @NotNull(message = "Debes seleccionar un rol")
        Rol rol
) { }
