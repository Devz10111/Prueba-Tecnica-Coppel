package com.coppel.reservas.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de un cambio realizado sobre una reserva (auditoría).
 * Cada objeto HistorialCambio es una fila de la tabla "historial_cambios".
 */
@Entity
@Table(name = "historial_cambios")
@Getter @Setter
@NoArgsConstructor
public class HistorialCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Reserva a la que pertenece este cambio.
    // Muchos cambios pueden ser de la misma reserva (relación muchos-a-uno),
    // y se guarda como llave foránea en la columna "reserva_id".
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id")
    private Reserva reserva;

    // Usuario administrador que hizo el cambio.
    // Puede ser null: cuando el empleado crea la solicitud no hay un usuario
    // autenticado, así que aquí no se pone optional = false.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    // Qué se hizo: por ejemplo "CREADA", "APROBADA", "RECHAZADA", "MODIFICADA", "CANCELADA"
    @Column(nullable = false, length = 60)
    private String accion;

    // Explicación más detallada, por ejemplo "Cambió la fecha de 2026-11-20 a 2026-11-21"
    @Column(length = 500)
    private String detalle;

    // Momento exacto en que ocurrió el cambio
    @Column(nullable = false)
    private LocalDateTime fecha;

    // Constructor de conveniencia: la fecha se asigna automáticamente con el momento actual,
    // de modo que quien registre el cambio no tenga que acordarse de ponerla.
    public HistorialCambio(Reserva reserva, Usuario usuario, String accion, String detalle) {
        this.reserva = reserva;
        this.usuario = usuario;
        this.accion = accion;
        this.detalle = detalle;
        this.fecha = LocalDateTime.now();
    }
}