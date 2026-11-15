package com.coppel.reservas.service;

import com.coppel.reservas.dto.DisponibilidadResponse;
import com.coppel.reservas.dto.EspacioResponse;
import com.coppel.reservas.dto.OcupacionResponse;
import com.coppel.reservas.exception.RecursoNoEncontradoException;
import com.coppel.reservas.model.Espacio;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.repository.EspacioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/** Consulta de espacios y de su disponibilidad. */
@Service
@RequiredArgsConstructor
public class EspacioService {

    private final EspacioRepository espacioRepository;
    private final ReservaRepository reservaRepository;

    // Lista los espacios ordenados por id (la consulta la genera Spring a partir
    // del nombre del método findAllByOrderByIdAsc del repositorio)
    @Transactional(readOnly = true)
    public List<EspacioResponse> listar() {
        return espacioRepository.findAllByOrderByIdAsc().stream()
                .map(EspacioResponse::desde)
                .toList();
    }

    // Horario de atención y franjas ocupadas de un espacio en una fecha
    @Transactional(readOnly = true)
    public DisponibilidadResponse disponibilidad(Long espacioId, LocalDate fecha) {
        Espacio espacio = espacioRepository.findById(espacioId)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el espacio con id " + espacioId));

        // Solo las reservas pendientes y aprobadas ocupan el espacio
        List<OcupacionResponse> ocupados = reservaRepository
                .findByEspacioIdAndFechaAndEstadoInOrderByHoraInicioAsc(
                        espacioId, fecha, List.of(EstadoReserva.PENDIENTE, EstadoReserva.APROBADA))
                .stream()
                .map(OcupacionResponse::desde)
                .toList();

        return new DisponibilidadResponse(
                espacio.getId(), espacio.getNombre(), fecha,
                ReservaService.HORA_APERTURA, ReservaService.HORA_CIERRE, ocupados);
    }
}