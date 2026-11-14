package com.coppel.reservas.repository;

import com.coppel.reservas.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Acceso a datos de la tabla "reservas".
 */
public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    // SELECT * FROM reservas WHERE folio = ?
    // Es la consulta del caso de uso CU2: el empleado consulta su reserva por folio.
    Optional<Reserva> findByFolio(String folio);
}