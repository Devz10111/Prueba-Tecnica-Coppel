package com.coppel.reservas.repository;

import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.Optional;

/**
 * Acceso a datos de la tabla "reservas".
 */
public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    // SELECT * FROM reservas WHERE folio = ?
    // Es la consulta del caso de uso CU2: el empleado consulta su reserva por folio.
    Optional<Reserva> findByFolio(String folio);

    /**
     * Indica si ya existe una reserva que se traslape con el horario solicitado.
     *
     * Dos intervalos se traslapan cuando:
     *   el inicio de uno es ANTES del fin del otro  Y  el fin de uno es DESPUÉS del inicio del otro.
     *
     * Ejemplo: ya existe 10:00-11:00.
     *   - Nueva 10:30-11:30 → traslapa (10:00 < 11:30 y 11:00 > 10:30)
     *   - Nueva 11:00-12:00 → NO traslapa, una empieza justo cuando termina la otra
     *
     * @param espacioId  espacio que se quiere reservar
     * @param fecha      día de la reserva
     * @param horaInicio hora de inicio solicitada
     * @param horaFin    hora de fin solicitada
     * @param estados    estados que bloquean el espacio (las rechazadas y canceladas no cuentan)
     * @param excluirId  id de una reserva a ignorar. Se usa al MODIFICAR una reserva,
     *                   para que no choque consigo misma. Al crear una nueva se pasa 0.
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