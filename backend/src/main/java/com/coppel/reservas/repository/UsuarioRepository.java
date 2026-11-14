package com.coppel.reservas.repository;

import com.coppel.reservas.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Acceso a datos de la tabla "usuarios".
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Consulta derivada del nombre del método: Spring lo traduce a
    // SELECT * FROM usuarios WHERE email = ?
    // Se usará en el login para buscar al usuario por su correo.
    // Optional indica que puede no existir (evita trabajar con null).
    Optional<Usuario> findByEmail(String email);
}