package com.coppel.reservas.repository;

import com.coppel.reservas.model.HistorialCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Acceso a datos de la tabla "historial_cambios".
 */
public interface HistorialCambioRepository extends JpaRepository<HistorialCambio, Long> {

    // SELECT * FROM historial_cambios WHERE reserva_id = ? ORDER BY fecha ASC
    // Devuelve los cambios de una reserva del más antiguo al más reciente.
    List<HistorialCambio> findByReservaIdOrderByFechaAsc(Long reservaId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE HistorialCambio h SET h.usuario = null WHERE h.usuario.id = :usuarioId")
    int desvincularUsuario(@Param("usuarioId") Long usuarioId);
}