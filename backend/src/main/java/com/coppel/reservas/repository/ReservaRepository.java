package com.coppel.reservas.repository;

import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de la tabla "reservas".
 */
public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    // SELECT * FROM reservas WHERE folio = ?
    Optional<Reserva> findByFolio(String folio);

    // Reservas de un espacio en una fecha, con los estados indicados, ordenadas por hora
    List<Reserva> findByEspacioIdAndFechaAndEstadoInOrderByHoraInicioAsc(
            Long espacioId, LocalDate fecha, Collection<EstadoReserva> estados);

    // Listado del portal de administración. JOIN FETCH trae el espacio en la misma consulta
    // (evita una consulta extra por cada reserva).
    @Query("""
            SELECT r FROM Reserva r JOIN FETCH r.espacio
            ORDER BY r.fecha DESC, r.horaInicio DESC
            """)
    List<Reserva> listarTodas();

    @Query("""
            SELECT r FROM Reserva r JOIN FETCH r.espacio
            WHERE r.estado = :estado
            ORDER BY r.fecha DESC, r.horaInicio DESC
            """)
    List<Reserva> listarPorEstado(@Param("estado") EstadoReserva estado);

    /**
     * Indica si ya existe una reserva que se traslape con el horario solicitado.
     * Traslape: inicioExistente < finNuevo  Y  finExistente > inicioNuevo.
     * excluirId permite ignorar una reserva (al modificarla); al crear se pasa 0.
     */
    @Query("""
            SELECT COUNT(r) > 0 FROM Reserva r
            WHERE r.espacio.id = :espacioId
              AND r.fecha = :fecha
              AND r.estado IN :estados
              AND r.horaInicio < :horaFin
              AND r.horaFin > :horaInicio
              AND r.id <> :excluirId
            """)
    boolean existeSolapamiento(@Param("espacioId") Long espacioId,
                               @Param("fecha") LocalDate fecha,
                               @Param("horaInicio") LocalTime horaInicio,
                               @Param("horaFin") LocalTime horaFin,
                               @Param("estados") Collection<EstadoReserva> estados,
                               @Param("excluirId") long excluirId);
}