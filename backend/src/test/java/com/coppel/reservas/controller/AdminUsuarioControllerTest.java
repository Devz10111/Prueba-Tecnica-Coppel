package com.coppel.reservas.controller;

import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.HistorialCambio;
import com.coppel.reservas.model.Reserva;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.HistorialCambioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import com.coppel.reservas.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
class AdminUsuarioControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EspacioRepository espacioRepository;
    @Autowired private ReservaRepository reservaRepository;
    @Autowired private HistorialCambioRepository historialCambioRepository;
    @Autowired private EntityManager entityManager;

    private static final String CORREO_PRUEBA = "usuario.creado.test@coppel.test";
    private static final String CUERPO_USUARIO = """
            {
              "nombre": "Usuario de prueba",
              "email": "%s",
              "departamento": "Sistemas",
              "password": "ClaveSegura123",
              "rol": "EMPLEADO"
            }
            """.formatted(CORREO_PRUEBA);

    @Test
    void adminPuedeCrearUsuarioYListarloSinExponerContrasena() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(CORREO_PRUEBA))
                .andExpect(jsonPath("$.departamento").value("Sistemas"))
                .andExpect(jsonPath("$.rol").value("EMPLEADO"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        mockMvc.perform(get("/api/admin/usuarios")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(CORREO_PRUEBA)))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("ClaveSegura123"))));

        org.assertj.core.api.Assertions.assertThat(
                usuarioRepository.findByEmail(CORREO_PRUEBA)).isPresent();
    }

    @Test
    void adminPuedeEditarUsuarioSinModificarSuContrasena() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isCreated());

        var usuario = usuarioRepository.findByEmail(CORREO_PRUEBA).orElseThrow();
        String hashOriginal = usuario.getPasswordHash();

        mockMvc.perform(put("/api/admin/usuarios/{id}", usuario.getId())
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "Nombre actualizado",
                                  "email": "actualizado@coppel.test",
                                  "departamento": "Finanzas",
                                  "rol": "JEFE_DEPARTAMENTO"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Nombre actualizado"))
                .andExpect(jsonPath("$.email").value("actualizado@coppel.test"))
                .andExpect(jsonPath("$.departamento").value("Finanzas"))
                .andExpect(jsonPath("$.rol").value("JEFE_DEPARTAMENTO"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        var actualizado = usuarioRepository.findById(usuario.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(actualizado.getPasswordHash()).isEqualTo(hashOriginal);
    }

    @Test
    void adminPuedeEliminarUsuarioConservandoReservasEHistorial() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .with(user("admin@coppel.test").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isCreated());

        Usuario usuario = usuarioRepository.findByEmail(CORREO_PRUEBA).orElseThrow();
        Espacio espacio = espacioRepository.findAll().getFirst();
        Reserva reserva = new Reserva();
        reserva.setFolio("BORRADO-" + System.nanoTime());
        reserva.setEspacio(espacio);
        reserva.setUsuario(usuario);
        reserva.setFecha(LocalDate.now().plusDays(2));
        reserva.setHoraInicio(LocalTime.of(10, 0));
        reserva.setHoraFin(LocalTime.of(11, 0));
        reserva.setSolicitante(usuario.getNombre());
        reserva.setDepartamento("Sistemas");
        reserva.setDescripcion("Reserva que debe conservarse");
        reserva.setEstado(EstadoReserva.PENDIENTE);
        Reserva reservaGuardada = reservaRepository.saveAndFlush(reserva);
        HistorialCambio cambio = historialCambioRepository.saveAndFlush(
                new HistorialCambio(reservaGuardada, usuario, "CREADA", "Reserva de prueba"));

        mockMvc.perform(delete("/api/admin/usuarios/{id}", usuario.getId())
                        .with(user("admin@coppel.test").roles("ADMIN")))
                .andExpect(status().isNoContent());

        entityManager.clear();
        org.assertj.core.api.Assertions.assertThat(usuarioRepository.findById(usuario.getId())).isEmpty();
        org.assertj.core.api.Assertions.assertThat(reservaRepository.findById(reservaGuardada.getId()))
                .get()
                .extracting(Reserva::getUsuario)
                .isNull();
        org.assertj.core.api.Assertions.assertThat(historialCambioRepository.findById(cambio.getId()))
                .get()
                .extracting(HistorialCambio::getUsuario)
                .isNull();
    }

    @Test
    void adminNoPuedeEliminarSuPropiaCuenta() throws Exception {
        Usuario admin = usuarioRepository.findByEmail("admin@coppel.test").orElseThrow();

        mockMvc.perform(delete("/api/admin/usuarios/{id}", admin.getId())
                        .with(user(admin.getEmail()).roles("ADMIN")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(
                        "No puedes eliminar la cuenta con la que iniciaste sesión."));

        org.assertj.core.api.Assertions.assertThat(usuarioRepository.findById(admin.getId())).isPresent();
    }

    @Test
    void correoDuplicadoDevuelveConflicto() throws Exception {
        mockMvc.perform(post("/api/admin/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/usuarios")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(
                        "Ya existe una cuenta con ese correo electrónico."));
    }

    @Test
    void jefeDeDepartamentoNoPuedeAdministrarUsuarios() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios")
                        .with(user("jefe").roles("JEFE_DEPARTAMENTO")))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/usuarios/1")
                        .with(user("jefe").roles("JEFE_DEPARTAMENTO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nombre": "No autorizado",
                                  "email": "no-autorizado@coppel.test",
                                  "departamento": "Finanzas",
                                  "rol": "ADMIN"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/usuarios/1")
                        .with(user("jefe").roles("JEFE_DEPARTAMENTO")))
                .andExpect(status().isForbidden());
    }

    @Test
    void usuariosNoSePuedenConsultarSinAutenticacion() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/admin/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO_USUARIO))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/admin/usuarios/1"))
                .andExpect(status().isUnauthorized());
    }
}
