package com.coppel.reservas.config;

import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.Rol;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Carga los datos iniciales al arrancar la aplicación.
 * Al implementar CommandLineRunner, Spring ejecuta el método run()
 * automáticamente una vez que la aplicación terminó de iniciar.
 */
@Component              // Spring crea y administra esta clase
@RequiredArgsConstructor // Lombok: genera un constructor con los campos "final"
public class DataLoader implements CommandLineRunner {

    // Dependencias que Spring inyecta a través del constructor generado por Lombok
    // (inyección de dependencias: la clase no crea sus herramientas, las recibe).
    private final EspacioRepository espacioRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        // Solo se cargan si la tabla está vacía, para no duplicar datos
        // cada vez que se reinicia la aplicación.
        if (espacioRepository.count() == 0) {
            espacioRepository.saveAll(List.of(
                new Espacio("Sala de reuniones pequeña", 8, "Sala para reuniones de equipo reducido"),
                new Espacio("Sala de reuniones grande", 20, "Sala para reuniones de área o departamento"),
                new Espacio("Auditorio", 100, "Espacio para presentaciones y eventos masivos"),
                new Espacio("Área de descanso", 15, "Zona común para convivencias y descansos")
            ));
        }

        if (usuarioRepository.count() == 0) {
            // La contraseña se cifra ANTES de guardarla: en la base solo queda el hash.
            usuarioRepository.save(new Usuario(
                "Administrador de Reservas", "admin@coppel.test",
                passwordEncoder.encode("Admin123!"), Rol.ADMIN));

            usuarioRepository.save(new Usuario(
                "Jefe de Departamento", "jefe@coppel.test",
                passwordEncoder.encode("Jefe123!"), Rol.JEFE_DEPARTAMENTO));
        }
    }
}