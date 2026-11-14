package com.coppel.reservas.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Usuario con acceso al portal de administración.
 * Cada objeto Usuario es una fila de la tabla "usuarios".
 * Sus credenciales se usarán para el login con JWT.
 */
@Entity
@Table(name = "usuarios")
@Getter @Setter
@NoArgsConstructor
public class Usuario {

    // Clave primaria autoincremental, igual que en Espacio
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre completo de la persona
    @Column(nullable = false, length = 120)
    private String nombre;

    // Se usará como nombre de usuario para iniciar sesión.
    // unique = true evita que dos cuentas compartan el mismo correo.
    @Column(nullable = false, unique = true, length = 120)
    private String email;

    // name = "password_hash" fija el nombre de la columna en la base de datos
    // (por convención en SQL se usa snake_case, y en Java camelCase).
    // Aquí NUNCA se guarda la contraseña real, solo su hash cifrado con bcrypt.
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // @Enumerated(STRING) guarda el nombre del rol como texto ("ADMIN").
    // Si se usara ORDINAL se guardaría un número (0, 1) y, al reordenar
    // el enum en el futuro, los datos existentes quedarían mal interpretados.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    // Constructor de conveniencia (sin id, lo asigna la base de datos)
    public Usuario(String nombre, String email, String passwordHash, Rol rol) {
        this.nombre = nombre;
        this.email = email;
        this.passwordHash = passwordHash;
        this.rol = rol;
    }
}