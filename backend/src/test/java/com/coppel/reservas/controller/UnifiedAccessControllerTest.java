package com.coppel.reservas.controller;

import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.Reserva;
import com.coppel.reservas.model.Rol;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import com.coppel.reservas.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UnifiedAccessControllerTest {

    private static final String EMAIL = "unified.employee@coppel.test";
    private static final String PASSWORD = "Empleado123!";

    @Autowired private MockMvc mockMvc;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EspacioRepository espacioRepository;
    @Autowired private ReservaRepository reservaRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Usuario empleado;

    @BeforeEach
    void prepararEmpleado() {
        empleado = usuarioRepository.findByEmail(EMAIL).orElseGet(() ->
                usuarioRepository.save(new Usuario(
                        "Empleado de prueba", EMAIL, "Sistemas", passwordEncoder.encode(PASSWORD), Rol.EMPLEADO)));
    }

    @Test
    void loginAceptaCuentaDeEmpleadoYDevuelveDatosDePerfil() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.departamento").value("Sistemas"))
                .andExpect(jsonPath("$.rol").value("EMPLEADO"));
    }

    @Test
    void loginAceptaCuentaAdminYRegistroPublicoNoEstaDisponible() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@coppel.test","password":"Admin123!"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@coppel.test"))
                .andExpect(jsonPath("$.rol").value("ADMIN"));

        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void crearReservaSinSesionDevuelve401() throws Exception {
        mockMvc.perform(post("/api/reservas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoReserva()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void empleadoPuedeCrearReservaYVerSoloLasPropiasEnMias() throws Exception {
        mockMvc.perform(post("/api/reservas")
                        .with(user(EMAIL).roles("EMPLEADO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpoReserva()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.solicitante").value(empleado.getNombre()))
                .andExpect(jsonPath("$.departamento").value("Sistemas"));

        mockMvc.perform(get("/api/reservas/mias").with(user(EMAIL).roles("EMPLEADO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].solicitante").value(empleado.getNombre()));
    }

    @Test
    void empleadoNoPuedeConsultarReservaAjenaNiEntrarAlPanel() throws Exception {
        Espacio espacio = espacioRepository.findAll().getFirst();
        Usuario otroEmpleado = usuarioRepository.save(new Usuario(
                "Otro empleado", "otro-" + UUID.randomUUID() + "@coppel.test",
                "Finanzas", passwordEncoder.encode(PASSWORD), Rol.EMPLEADO));
        Reserva reservaAjena = new Reserva();
        reservaAjena.setFolio("2026009999");
        reservaAjena.setEspacio(espacio);
        reservaAjena.setUsuario(otroEmpleado);
        reservaAjena.setFecha(LocalDate.now().plusDays(2000));
        reservaAjena.setHoraInicio(LocalTime.of(10, 0));
        reservaAjena.setHoraFin(LocalTime.of(11, 0));
        reservaAjena.setSolicitante(otroEmpleado.getNombre());
        reservaAjena.setDepartamento(otroEmpleado.getDepartamento());
        reservaAjena.setDescripcion("Prueba");
        reservaAjena.setEstado(EstadoReserva.PENDIENTE);
        reservaRepository.save(reservaAjena);

        mockMvc.perform(get("/api/reservas/{folio}", reservaAjena.getFolio())
                        .with(user(EMAIL).roles("EMPLEADO")))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/admin/reservas").with(user(EMAIL).roles("EMPLEADO")))
                .andExpect(status().isForbidden());
    }

    private String cuerpoReserva() {
        LocalDate fechaUnica = LocalDate.now().plusDays(1000L + Math.abs(EMAIL.hashCode() % 1000));
        return """
                {
                  "espacioId": %d,
                  "fecha": "%s",
                  "horaInicio": "10:00",
                  "horaFin": "11:00",
                  "solicitante": "Valor ignorado",
                  "departamento": "Valor ignorado",
                  "descripcion": "Reserva autenticada"
                }
                """.formatted(espacioRepository.findAll().getFirst().getId(), fechaUnica);
    }
}
