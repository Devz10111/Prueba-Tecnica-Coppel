package com.coppel.reservas.model;

/**
 * Roles de los usuarios que pueden entrar al portal de administración.
 * Los empleados que solo solicitan reservas no necesitan iniciar sesión.
 */
public enum Rol {
    ADMIN,              // Administrador de reservas
    JEFE_DEPARTAMENTO   // Jefe de departamento
}