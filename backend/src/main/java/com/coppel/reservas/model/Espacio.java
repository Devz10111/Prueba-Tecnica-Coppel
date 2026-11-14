package com.coppel.reservas.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Representa un espacio corporativo que se puede reservar
 * (sala pequeña, sala grande, auditorio, área de descanso).
 * Cada objeto Espacio es una fila de la tabla "espacios".
 */
@Entity                          // Le dice a JPA: "esta clase se guarda en la base de datos"
@Table(name = "espacios")        // Nombre de la tabla en PostgreSQL
@Getter @Setter                  // Lombok: genera automáticamente los getX() y setX()
@NoArgsConstructor               // Lombok: genera un constructor vacío (JPA lo necesita)
public class Espacio {

    // Clave primaria de la tabla (identifica cada fila de forma única)
    @Id
    // El valor lo genera la base de datos: 1, 2, 3... (columna autoincremental)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // nullable = false → la columna es obligatoria (NOT NULL)
    // unique = true    → no puede haber dos espacios con el mismo nombre
    // length = 100     → máximo 100 caracteres (VARCHAR(100))
    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    // Cuántas personas caben como máximo. Se muestra al seleccionar el espacio.
    @Column(nullable = false)
    private Integer capacidad;

    // Texto breve que describe el espacio. Es opcional (puede quedar vacío).
    @Column(length = 255)
    private String descripcion;

    // Constructor de conveniencia para crear un espacio con sus datos de una sola vez.
    // No incluye el id porque lo asigna la base de datos.
    public Espacio(String nombre, Integer capacidad, String descripcion) {
        this.nombre = nombre;
        this.capacidad = capacidad;
        this.descripcion = descripcion;
    }
}