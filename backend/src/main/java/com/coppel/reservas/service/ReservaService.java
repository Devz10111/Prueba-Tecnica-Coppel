package com.coppel.reservas.service;

import com.coppel.reservas.dto.CambioEstadoRequest;
import com.coppel.reservas.dto.ReservaModificacionRequest;
import com.coppel.reservas.dto.ReservaRequest;
import com.coppel.reservas.dto.ReservaResponse;
import com.coppel.reservas.dto.ReservaResumenResponse;
import com.coppel.reservas.exception.ConflictoException;
import com.coppel.reservas.exception.RecursoNoEncontradoException;
import com.coppel.reservas.exception.ReglaNegocioException;
import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.HistorialCambio;
import com.coppel.reservas.model.Reserva;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.HistorialCambioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import com.coppel.reservas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.zip.CRC32;

/** Lógica de negocio de las reservas: validaciones, folio, historial y gestión del administrador. */
@Service
@RequiredArgsConstructor
public class ReservaService {

    // Reglas de negocio (supuestos propios, fáciles de cambiar aquí)
    public static final LocalTime HORA_APERTURA = LocalTime.of(8, 0);
    public static final LocalTime HORA_CIERRE = LocalTime.of(20, 0);
    private static final long DURACION_MINIMA_MINUTOS = 30;
    private static final String SAL_FOLIO = "coppel-reservas-folio-v1";

    // Solo las reservas en estos estados ocupan el espacio
    private static final List<EstadoReserva> ESTADOS_QUE_BLOQUEAN =
            List.of(EstadoReserva.PENDIENTE, EstadoReserva.APROBADA);

    private final ReservaRepository reservaRepository;
    private final EspacioRepository espacioRepository;
    private final HistorialCambioRepository historialRepository;
    private final UsuarioRepository usuarioRepository;

    // =====================================================================
    // PORTAL DEL EMPLEADO
    // =====================================================================

    /** CU1: registra una nueva solicitud y devuelve la reserva con su folio. */
    @Transactional
    public ReservaResponse crear(ReservaRequest req, String emailUsuario) {

        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró al usuario autenticado"));
        Espacio espacio = buscarEspacio(req.espacioId());

        validarHorario(req.fecha(), req.horaInicio(), req.horaFin());

        boolean ocupado = reservaRepository.existeSolapamiento(
                espacio.getId(), req.fecha(), req.horaInicio(), req.horaFin(),
                ESTADOS_QUE_BLOQUEAN, 0L);
        if (ocupado) {
            throw new ConflictoException(
                    "El espacio ya está reservado en ese horario. Elige otro horario u otro espacio.");
        }

        Reserva reserva = new Reserva();
        reserva.setEspacio(espacio);
        reserva.setFecha(req.fecha());
        reserva.setHoraInicio(req.horaInicio());
        reserva.setHoraFin(req.horaFin());
        reserva.setUsuario(usuario);
        reserva.setSolicitante(usuario.getNombre());
        reserva.setDepartamento(usuario.getDepartamento() == null || usuario.getDepartamento().isBlank()
                ? "Administración" : usuario.getDepartamento());
        reserva.setDescripcion(req.descripcion());
        // El estado nace PENDIENTE (valor por defecto de la entidad)

        // El folio se arma con el id, que solo existe después del primer guardado.
        // Se guarda con un folio temporal y se reemplaza enseguida (misma transacción).
        reserva.setFolio("TMP-" + UUID.randomUUID().toString().substring(0, 8));
        reserva = reservaRepository.save(reserva);
        reserva.setFolio(generarFolio(reserva));

        historialRepository.save(new HistorialCambio(
                reserva, usuario, "CREADA", "Solicitud creada por " + usuario.getNombre()));

        return armarRespuesta(reserva);
    }

    /** CU2: consulta una reserva por su folio (también la usa el administrador). */
    @Transactional(readOnly = true)
    public ReservaResponse consultarPorFolio(String folio) {
        return armarRespuesta(buscarPorFolio(folio));
    }

    @Transactional(readOnly = true)
    public ReservaResponse consultarPorFolio(String folio, String emailUsuario, boolean puedeConsultarTodas) {
        Reserva reserva = buscarPorFolio(folio);
        if (!puedeConsultarTodas
                && (reserva.getUsuario() == null
                || !reserva.getUsuario().getEmail().equalsIgnoreCase(emailUsuario))) {
            throw new RecursoNoEncontradoException("No existe una reserva con el folio " + folio);
        }
        return armarRespuesta(reserva);
    }

    @Transactional(readOnly = true)
    public List<ReservaResumenResponse> listarMias(String emailUsuario) {
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontró al usuario autenticado"));
        return reservaRepository.listarPorUsuarioId(usuario.getId()).stream()
                .map(ReservaResumenResponse::desde)
                .toList();
    }

    // =====================================================================
    // PORTAL DE ADMINISTRACIÓN (CU3)
    // =====================================================================

    /** Lista todas las reservas; si se indica un estado, solo las de ese estado. */
    @Transactional(readOnly = true)
    public List<ReservaResumenResponse> listar(EstadoReserva estado) {
        List<Reserva> reservas = (estado == null)
                ? reservaRepository.listarTodas()
                : reservaRepository.listarPorEstado(estado);
        return reservas.stream().map(ReservaResumenResponse::desde).toList();
    }

    /** Aprueba o rechaza una reserva pendiente. */
    @Transactional
    public ReservaResponse cambiarEstado(String folio, CambioEstadoRequest req, String emailAdmin) {
        Reserva reserva = buscarPorFolio(folio);
        Usuario admin = buscarUsuario(emailAdmin);

        if (req.estado() != EstadoReserva.APROBADA && req.estado() != EstadoReserva.RECHAZADA) {
            throw new ReglaNegocioException("Solo se puede cambiar el estado a APROBADA o RECHAZADA");
        }
        if (reserva.getEstado() != EstadoReserva.PENDIENTE) {
            throw new ConflictoException(
                    "Solo se pueden aprobar o rechazar reservas pendientes. Estado actual: "
                            + reserva.getEstado());
        }

        reserva.setEstado(req.estado());

        String comentario = (req.comentario() == null || req.comentario().isBlank())
                ? "" : ". Comentario: " + req.comentario();
        historialRepository.save(new HistorialCambio(
                reserva, admin, req.estado().name(), "Estado: PENDIENTE -> " + req.estado() + comentario));

        return armarRespuesta(reserva);
    }

    /** Modifica espacio, fecha u horario de una reserva pendiente o aprobada. */
    @Transactional
    public ReservaResponse modificar(String folio, ReservaModificacionRequest req, String emailAdmin) {
        Reserva reserva = buscarPorFolio(folio);
        Usuario admin = buscarUsuario(emailAdmin);

        if (!ESTADOS_QUE_BLOQUEAN.contains(reserva.getEstado())) {
            throw new ConflictoException(
                    "Solo se pueden modificar reservas pendientes o aprobadas. Estado actual: "
                            + reserva.getEstado());
        }

        Espacio espacio = buscarEspacio(req.espacioId());
        validarHorario(req.fecha(), req.horaInicio(), req.horaFin());

        // Se excluye la propia reserva para que no choque consigo misma
        boolean ocupado = reservaRepository.existeSolapamiento(
                espacio.getId(), req.fecha(), req.horaInicio(), req.horaFin(),
                ESTADOS_QUE_BLOQUEAN, reserva.getId());
        if (ocupado) {
            throw new ConflictoException(
                    "El espacio ya está reservado en ese horario. Elige otro horario u otro espacio.");
        }

        // Se arma el detalle con lo que realmente cambió
        List<String> cambios = new ArrayList<>();
        if (!reserva.getEspacio().getId().equals(espacio.getId())) {
            cambios.add("espacio: " + reserva.getEspacio().getNombre() + " -> " + espacio.getNombre());
        }
        if (!reserva.getFecha().equals(req.fecha())) {
            cambios.add("fecha: " + reserva.getFecha() + " -> " + req.fecha());
        }
        if (!reserva.getHoraInicio().equals(req.horaInicio())) {
            cambios.add("hora de inicio: " + reserva.getHoraInicio() + " -> " + req.horaInicio());
        }
        if (!reserva.getHoraFin().equals(req.horaFin())) {
            cambios.add("hora de fin: " + reserva.getHoraFin() + " -> " + req.horaFin());
        }
        if (cambios.isEmpty()) {
            throw new ReglaNegocioException("No hay cambios que aplicar: los datos son iguales a los actuales");
        }

        reserva.setEspacio(espacio);
        reserva.setFecha(req.fecha());
        reserva.setHoraInicio(req.horaInicio());
        reserva.setHoraFin(req.horaFin());

        historialRepository.save(new HistorialCambio(
                reserva, admin, "MODIFICADA", String.join("; ", cambios)));

        return armarRespuesta(reserva);
    }

    /** Cancela una reserva (no se borra: queda con estado CANCELADA y su historial). */
    @Transactional
    public ReservaResponse cancelar(String folio, String emailAdmin) {
        Reserva reserva = buscarPorFolio(folio);
        Usuario admin = buscarUsuario(emailAdmin);

        if (!ESTADOS_QUE_BLOQUEAN.contains(reserva.getEstado())) {
            throw new ConflictoException(
                    "No se puede cancelar una reserva con estado " + reserva.getEstado());
        }

        EstadoReserva anterior = reserva.getEstado();
        reserva.setEstado(EstadoReserva.CANCELADA);

        historialRepository.save(new HistorialCambio(
                reserva, admin, "CANCELADA", "Cancelada por el administrador (estado anterior: " + anterior + ")"));

        return armarRespuesta(reserva);
    }

    // =====================================================================
    // Métodos auxiliares
    // =====================================================================

    private Reserva buscarPorFolio(String folio) {
        if (folio != null && folio.length() == 12 && !esChecksumValido(folio)) {
            throw new RecursoNoEncontradoException("No existe una reserva con el folio " + folio);
        }
        return reservaRepository.findByFolio(folio)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe una reserva con el folio " + folio));
    }

    private Espacio buscarEspacio(Long id) {
        return espacioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el espacio con id " + id));
    }

    private Usuario buscarUsuario(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró al usuario autenticado"));
    }

    private void validarHorario(LocalDate fecha, LocalTime inicio, LocalTime fin) {
        if (!fin.isAfter(inicio)) {
            throw new ReglaNegocioException("La hora de fin debe ser posterior a la hora de inicio");
        }
        if (inicio.isBefore(HORA_APERTURA) || fin.isAfter(HORA_CIERRE)) {
            throw new ReglaNegocioException(
                    "Las reservas solo se permiten entre " + HORA_APERTURA + " y " + HORA_CIERRE);
        }
        if (Duration.between(inicio, fin).toMinutes() < DURACION_MINIMA_MINUTOS) {
            throw new ReglaNegocioException(
                    "La duración mínima de una reserva es de " + DURACION_MINIMA_MINUTOS + " minutos");
        }
        if (LocalDateTime.of(fecha, inicio).isBefore(LocalDateTime.now())) {
            throw new ReglaNegocioException("No se puede reservar en una fecha y hora que ya pasó");
        }
    }

    // Los folios nuevos agregan dos dígitos de verificación; los folios históricos se conservan.
    private String generarFolio(Reserva reserva) {
        String id = String.format(Locale.ROOT, "%06d", reserva.getId());
        return String.format(Locale.ROOT, "%04d%s%s", reserva.getFecha().getYear(), id, checksum(id));
    }

    private boolean esChecksumValido(String folio) {
        String id = folio.substring(4, 10);
        return checksum(id).equals(folio.substring(10));
    }

    private String checksum(String id) {
        CRC32 crc = new CRC32();
        crc.update((id + ":" + SAL_FOLIO).getBytes(StandardCharsets.UTF_8));
        return String.format(Locale.ROOT, "%02d", crc.getValue() % 100);
    }

    private ReservaResponse armarRespuesta(Reserva reserva) {
        List<HistorialCambio> cambios =
                historialRepository.findByReservaIdOrderByFechaAsc(reserva.getId());
        return ReservaResponse.desde(reserva, cambios);
    }
}