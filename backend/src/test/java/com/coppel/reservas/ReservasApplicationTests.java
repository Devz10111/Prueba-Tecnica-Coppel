package com.coppel.reservas.service;

import com.coppel.reservas.dto.CambioEstadoRequest;
import com.coppel.reservas.dto.ReservaModificacionRequest;
import com.coppel.reservas.dto.ReservaRequest;
import com.coppel.reservas.dto.ReservaResponse;
import com.coppel.reservas.exception.ConflictoException;
import com.coppel.reservas.exception.RecursoNoEncontradoException;
import com.coppel.reservas.exception.ReglaNegocioException;
import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.HistorialCambio;
import com.coppel.reservas.model.Reserva;
import com.coppel.reservas.model.Rol;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.HistorialCambioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import com.coppel.reservas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de la lógica de negocio de las reservas.
 * Los repositorios son "mocks": objetos simulados que devuelven lo que cada prueba indica,
 * así no se necesita base de datos.
 */
@ExtendWith(MockitoExtension.class)
class ReservaServiceTest {

    @Mock private ReservaRepository reservaRepository;
    @Mock private EspacioRepository espacioRepository;
    @Mock private HistorialCambioRepository historialRepository;
    @Mock private UsuarioRepository usuarioRepository;

    // Crea el servicio real e inyecta los mocks de arriba
    @InjectMocks private ReservaService service;

    // Datos de apoyo: una fecha futura para que pase la validación de "fecha pasada"
    private final LocalDate fecha = LocalDate.now().plusDays(3);
    private final LocalTime inicio = LocalTime.of(10, 0);
    private final LocalTime fin = LocalTime.of(11, 0);

    // ---------- Métodos de apoyo para armar datos de prueba ----------

    private Espacio espacio() {
        Espacio e = new Espacio("Sala de reuniones pequeña", 8, "Sala de prueba");
        e.setId(1L);
        return e;
    }

    private ReservaRequest solicitud(LocalTime horaInicio, LocalTime horaFin) {
        return new ReservaRequest(1L, fecha, horaInicio, horaFin,
                "Jose Vargas", "Sistemas", "Prueba de reserva");
    }

    private Reserva reserva(EstadoReserva estado) {
        Reserva r = new Reserva();
        r.setId(7L);
        r.setFolio("2026000007");
        r.setEspacio(espacio());
        r.setFecha(fecha);
        r.setHoraInicio(inicio);
        r.setHoraFin(fin);
        r.setSolicitante("Jose Vargas");
        r.setDepartamento("Sistemas");
        r.setDescripcion("Prueba de reserva");
        r.setEstado(estado);
        return r;
    }

    private Usuario admin() {
        return new Usuario("Administrador de Reservas", "admin@coppel.test", "hash", Rol.ADMIN);
    }

    // =====================================================================
    // Crear reserva (CU1)
    // =====================================================================

    @Test
    void crear_conDatosValidos_generaFolioNumericoYQuedaPendiente() {
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));
        when(reservaRepository.existeSolapamiento(anyLong(), any(LocalDate.class),
                any(LocalTime.class), any(LocalTime.class), anyCollection(), anyLong())).thenReturn(false);
        // Simula que la base de datos asigna el id 7 al guardar
        when(reservaRepository.save(any(Reserva.class))).thenAnswer(inv -> {
            Reserva r = inv.getArgument(0);
            r.setId(7L);
            return r;
        });
        when(historialRepository.findByReservaIdOrderByFechaAsc(7L)).thenReturn(List.of());

        ReservaResponse respuesta = service.crear(solicitud(inicio, fin));

        // Folio = año de la reserva + id con 6 dígitos
        assertThat(respuesta.folio()).isEqualTo(String.format("%d%06d", fecha.getYear(), 7));
        assertThat(respuesta.estado()).isEqualTo(EstadoReserva.PENDIENTE);

        // Debe quedar registrada la acción CREADA en el historial
        ArgumentCaptor<HistorialCambio> captor = ArgumentCaptor.forClass(HistorialCambio.class);
        verify(historialRepository).save(captor.capture());
        assertThat(captor.getValue().getAccion()).isEqualTo("CREADA");
    }

    @Test
    void crear_conHorarioOcupado_lanzaConflictoYNoGuarda() {
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));
        when(reservaRepository.existeSolapamiento(anyLong(), any(LocalDate.class),
                any(LocalTime.class), any(LocalTime.class), anyCollection(), anyLong())).thenReturn(true);

        assertThatThrownBy(() -> service.crear(solicitud(inicio, fin)))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("ya está reservado");

        verify(reservaRepository, never()).save(any(Reserva.class));
    }

    @Test
    void crear_conEspacioInexistente_lanzaNoEncontrado() {
        when(espacioRepository.findById(99L)).thenReturn(Optional.empty());
        ReservaRequest peticion = new ReservaRequest(99L, fecha, inicio, fin,
                "Jose Vargas", "Sistemas", "Prueba de reserva");

        assertThatThrownBy(() -> service.crear(peticion))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("99");
    }

    @Test
    void crear_conHoraFinAnteriorAInicio_lanzaReglaNegocio() {
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));

        assertThatThrownBy(() -> service.crear(solicitud(LocalTime.of(12, 0), LocalTime.of(11, 0))))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("posterior");
    }

    @Test
    void crear_fueraDelHorarioDeAtencion_lanzaReglaNegocio() {
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));

        assertThatThrownBy(() -> service.crear(solicitud(LocalTime.of(6, 0), LocalTime.of(7, 0))))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("solo se permiten entre");
    }

    @Test
    void crear_conDuracionMenorAlMinimo_lanzaReglaNegocio() {
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));

        assertThatThrownBy(() -> service.crear(solicitud(LocalTime.of(10, 0), LocalTime.of(10, 15))))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("duración mínima");
    }

    // =====================================================================
    // Aprobar o rechazar
    // =====================================================================

    @Test
    void cambiarEstado_aprobarReservaPendiente_actualizaEstadoYRegistraHistorial() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.PENDIENTE)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));
        when(historialRepository.findByReservaIdOrderByFechaAsc(7L)).thenReturn(List.of());

        ReservaResponse respuesta = service.cambiarEstado("2026000007",
                new CambioEstadoRequest(EstadoReserva.APROBADA, "Autorizada"), "admin@coppel.test");

        assertThat(respuesta.estado()).isEqualTo(EstadoReserva.APROBADA);

        ArgumentCaptor<HistorialCambio> captor = ArgumentCaptor.forClass(HistorialCambio.class);
        verify(historialRepository).save(captor.capture());
        assertThat(captor.getValue().getAccion()).isEqualTo("APROBADA");
        assertThat(captor.getValue().getUsuario().getEmail()).isEqualTo("admin@coppel.test");
    }

    @Test
    void cambiarEstado_reservaYaAprobada_lanzaConflicto() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.APROBADA)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));

        assertThatThrownBy(() -> service.cambiarEstado("2026000007",
                new CambioEstadoRequest(EstadoReserva.RECHAZADA, null), "admin@coppel.test"))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("pendientes");
    }

    @Test
    void cambiarEstado_aUnEstadoNoPermitido_lanzaReglaNegocio() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.PENDIENTE)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));

        assertThatThrownBy(() -> service.cambiarEstado("2026000007",
                new CambioEstadoRequest(EstadoReserva.PENDIENTE, null), "admin@coppel.test"))
                .isInstanceOf(ReglaNegocioException.class);
    }

    // =====================================================================
    // Cancelar
    // =====================================================================

    @Test
    void cancelar_reservaAprobada_quedaCanceladaYSeRegistra() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.APROBADA)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));
        when(historialRepository.findByReservaIdOrderByFechaAsc(7L)).thenReturn(List.of());

        ReservaResponse respuesta = service.cancelar("2026000007", "admin@coppel.test");

        assertThat(respuesta.estado()).isEqualTo(EstadoReserva.CANCELADA);
        verify(historialRepository).save(any(HistorialCambio.class));
    }

    @Test
    void cancelar_reservaYaCancelada_lanzaConflicto() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.CANCELADA)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));

        assertThatThrownBy(() -> service.cancelar("2026000007", "admin@coppel.test"))
                .isInstanceOf(ConflictoException.class);
    }

    // =====================================================================
    // Modificar
    // =====================================================================

    @Test
    void modificar_aUnHorarioOcupado_lanzaConflicto() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.APROBADA)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));
        when(reservaRepository.existeSolapamiento(anyLong(), any(LocalDate.class),
                any(LocalTime.class), any(LocalTime.class), anyCollection(), anyLong())).thenReturn(true);

        ReservaModificacionRequest cambio =
                new ReservaModificacionRequest(1L, fecha, LocalTime.of(14, 0), LocalTime.of(15, 0));

        assertThatThrownBy(() -> service.modificar("2026000007", cambio, "admin@coppel.test"))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void modificar_sinCambiosReales_lanzaReglaNegocio() {
        when(reservaRepository.findByFolio("2026000007")).thenReturn(Optional.of(reserva(EstadoReserva.PENDIENTE)));
        when(usuarioRepository.findByEmail("admin@coppel.test")).thenReturn(Optional.of(admin()));
        when(espacioRepository.findById(1L)).thenReturn(Optional.of(espacio()));

        // Mismos datos que ya tiene la reserva
        ReservaModificacionRequest igual = new ReservaModificacionRequest(1L, fecha, inicio, fin);

        assertThatThrownBy(() -> service.modificar("2026000007", igual, "admin@coppel.test"))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("No hay cambios");
    }
}