package com.coppel.reservas.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Solicitud de reserva de un espacio corporativo.
 * Cada objeto Reserva es una fila de la tabla "reservas".
 */
@Entity
@Table(name = "reservas")
@Getter @Setter
@NoArgsConstructor
public class Reserva {

    // Clave primaria interna (la usa la base de datos para relacionar tablas)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identificador público que verá el empleado, por ejemplo "RES-2026-000123".
    // Es único: con él se consulta el estado de la solicitud.
    @Column(nullable = false, unique = true, length = 30)
    private String folio;

    // Relación muchos-a-uno: muchas reservas pueden ser del mismo espacio.
    // En la tabla se guarda solo el id del espacio, en la columna "espacio_id" (llave foránea).
    // LAZY: el espacio completo se carga de la base solo cuando se necesita (más eficiente).
    // optional = false: toda reserva debe tener un espacio.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "espacio_id")
    private Espacio espacio;

    // Día de la reserva (LocalDate guarda solo la fecha, sin hora)
    @Column(nullable = false)
    private LocalDate fecha;

    // Hora de inicio y de fin (LocalTime guarda solo la hora, sin fecha).
    // Con estos dos valores se validan solapamientos y se calcula la duración.
    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    // Datos de quien solicita (el empleado no tiene cuenta, se identifica aquí)
    @Column(nullable = false, length = 120)
    private String solicitante;

    @Column(nullable = false, length = 120)
    private String departamento;

    // Breve resumen del propósito del evento
    @Column(nullable = false, length = 500)
    private String descripcion;

    // Estado actual de la solicitud. Toda reserva nace como PENDIENTE.
    // Se guarda como texto ("PENDIENTE") por la misma razón que el rol de Usuario.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    // Momento en que se registró la solicitud.
    // updatable = false: una vez guardada, esta fecha no puede modificarse.
    @Column(name = "creada_en", nullable = false, updatable = false)
    private LocalDateTime creadaEn;

    // Método "callback" de JPA: se ejecuta automáticamente justo antes
    // de insertar la reserva por primera vez, y asigna la fecha y hora actuales.
    @PrePersist
    void alCrear() {
        this.creadaEn = LocalDateTime.now();
    }

    // La "duración estimada" se calcula a partir de la hora de inicio y fin.
    // Así no se guarda un dato duplicado que pudiera contradecirse.
    public long getDuracionMinutos() {
        return Duration.between(horaInicio, horaFin).toMinutes();
    }
}