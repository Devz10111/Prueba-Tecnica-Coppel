package com.coppel.reservas.service;

import com.coppel.reservas.dto.ReservaRequest;
import com.coppel.reservas.dto.ReservaResponse;
import com.coppel.reservas.exception.ConflictoException;
import com.coppel.reservas.exception.RecursoNoEncontradoException;
import com.coppel.reservas.exception.ReglaNegocioException;
import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.HistorialCambio;
import com.coppel.reservas.model.Reserva;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.HistorialCambioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/** Lógica de negocio de las reservas: validaciones, folio e historial. */
@Service
@RequiredArgsConstructor
public class ReservaService {

    // Reglas de negocio (supuestos propios, fáciles de cambiar aquí)
    private static final LocalTime HORA_APERTURA = LocalTime.of(8, 0);
    private static final LocalTime HORA_CIERRE = LocalTime.of(20, 0);
    private static final long DURACION_MINIMA_MINUTOS = 30;

    // Solo las reservas en estos estados ocupan el espacio
    private static final List<EstadoReserva> ESTADOS_QUE_BLOQUEAN =
            List.of(EstadoReserva.PENDIENTE, EstadoReserva.APROBADA);

    private final ReservaRepository reservaRepository;
    private final EspacioRepository espacioRepository;
    private final HistorialCambioRepository historialRepository;

    /** CU1: registra una nueva solicitud y devuelve la reserva con su folio. */
    @Transactional
    public ReservaResponse crear(ReservaRequest req) {

        Espacio espacio = espacioRepository.findById(req.espacioId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el espacio con id " + req.espacioId()));

        validarHorario(req);

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
        reserva.setSolicitante(req.solicitante());
        reserva.setDepartamento(req.departamento());
        reserva.setDescripcion(req.descripcion());
        // El estado nace PENDIENTE (valor por defecto de la entidad)

        // El folio se arma con el id, que solo existe después del primer guardado.
        // Se guarda con un folio temporal y se reemplaza enseguida (misma transacción).
        reserva.setFolio("TMP-" + UUID.randomUUID().toString().substring(0, 8));
        reserva = reservaRepository.save(reserva);
        reserva.setFolio(generarFolio(reserva));

        historialRepository.save(new HistorialCambio(
                reserva, null, "CREADA", "Solicitud creada por " + req.solicitante()));

        return armarRespuesta(reserva);
    }

    /** CU2: consulta una reserva por su folio. */
    @Transactional(readOnly = true)
    public ReservaResponse consultarPorFolio(String folio) {
        Reserva reserva = reservaRepository.findByFolio(folio)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe una reserva con el folio " + folio));
        return armarRespuesta(reserva);
    }

    // ---------- Métodos auxiliares ----------

    private void validarHorario(ReservaRequest req) {
        if (!req.horaFin().isAfter(req.horaInicio())) {
            throw new ReglaNegocioException("La hora de fin debe ser posterior a la hora de inicio");
        }
        if (req.horaInicio().isBefore(HORA_APERTURA) || req.horaFin().isAfter(HORA_CIERRE)) {
            throw new ReglaNegocioException(
                    "Las reservas solo se permiten entre " + HORA_APERTURA + " y " + HORA_CIERRE);
        }
        if (Duration.between(req.horaInicio(), req.horaFin()).toMinutes() < DURACION_MINIMA_MINUTOS) {
            throw new ReglaNegocioException(
                    "La duración mínima de una reserva es de " + DURACION_MINIMA_MINUTOS + " minutos");
        }
        if (LocalDateTime.of(req.fecha(), req.horaInicio()).isBefore(LocalDateTime.now())) {
            throw new ReglaNegocioException("No se puede reservar en una fecha y hora que ya pasó");
        }
    }

    // Folio numérico: año + id con 6 dígitos. Ejemplo: 2026000123
    private String generarFolio(Reserva reserva) {
        return String.format("%d%06d", reserva.getFecha().getYear(), reserva.getId());
    }

    private ReservaResponse armarRespuesta(Reserva reserva) {
        List<HistorialCambio> cambios =
                historialRepository.findByReservaIdOrderByFechaAsc(reserva.getId());
        return ReservaResponse.desde(reserva, cambios);
    }
}