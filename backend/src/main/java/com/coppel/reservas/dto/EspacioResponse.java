package com.coppel.reservas.dto;

import com.coppel.reservas.model.Espacio;

/** Espacio tal como lo ve el cliente. */
public record EspacioResponse(Long id, String nombre, Integer capacidad, String descripcion) {

    public static EspacioResponse desde(Espacio e) {
        return new EspacioResponse(e.getId(), e.getNombre(), e.getCapacidad(), e.getDescripcion());
    }
}