package com.coppel.reservas.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/** Actualiza la restricción PostgreSQL del enum Rol al añadir tipos de cuenta. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UsuarioRoleSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public UsuarioRoleSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> definiciones = jdbcTemplate.query(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
                        + "WHERE conname = ? AND conrelid = 'usuarios'::regclass",
                (resultado, fila) -> resultado.getString(1),
                "usuarios_rol_check");

        if (!definiciones.isEmpty() && definiciones.getFirst().contains("'EMPLEADO'")) {
            return;
        }

        jdbcTemplate.execute(
                "ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check");
        jdbcTemplate.execute("""
                ALTER TABLE usuarios
                ADD CONSTRAINT usuarios_rol_check
                CHECK (rol IN ('ADMIN', 'JEFE_DEPARTAMENTO', 'EMPLEADO'))
                """);
    }
}
