package com.coppel.reservas.repository;

import com.coppel.reservas.model.HistorialCambio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Acceso a datos de la tabla "historial_cambios".
 */
public interface HistorialCambioRepository extends JpaRepository<HistorialCambio, Long> {

    // SELECT * FROM historial_cambios WHERE reserva_id = ? ORDER BY fecha ASC
    // Devuelve los cambios de una reserva del más antiguo al más reciente.
    List<HistorialCambio> findByReservaIdOrderByFechaAsc(Long reservaId);
}