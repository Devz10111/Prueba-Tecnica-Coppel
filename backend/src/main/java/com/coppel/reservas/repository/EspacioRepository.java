package com.coppel.reservas.repository;

import com.coppel.reservas.model.Espacio;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acceso a datos de la tabla "espacios".
 * JpaRepository<Espacio, Long> significa: maneja entidades Espacio
 * cuya clave primaria es de tipo Long.
 * Sin escribir código ya incluye: save(), findById(), findAll(), deleteById(), count()...
 */
public interface EspacioRepository extends JpaRepository<Espacio, Long> {
}