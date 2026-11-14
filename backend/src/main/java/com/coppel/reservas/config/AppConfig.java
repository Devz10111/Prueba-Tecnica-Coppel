package com.coppel.reservas.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Clase de configuración: aquí se definen "beans", es decir, objetos que Spring
 * crea una sola vez y reparte a las demás clases que los necesiten.
 */
@Configuration  // Le indica a Spring que esta clase contiene definiciones de beans
public class AppConfig {

    /**
     * Cifrador de contraseñas con el algoritmo bcrypt.
     * bcrypt es de un solo sentido: convierte "Admin123!" en un hash
     * que no se puede revertir, y añade una "sal" aleatoria, así que la misma
     * contraseña genera hashes distintos cada vez.
     * Para validar un login se usa passwordEncoder.matches(texto, hash).
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}