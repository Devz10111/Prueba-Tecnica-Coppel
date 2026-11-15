package com.coppel.reservas.repository;

import com.coppel.reservas.model.Espacio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Acceso a datos de la tabla "espacios".
 */
public interface EspacioRepository extends JpaRepository<Espacio, Long> {

    // SELECT * FROM espacios ORDER BY id ASC
    // Spring genera la consulta a partir del nombre del método.
    List<Espacio> findAllByOrderByIdAsc();
}