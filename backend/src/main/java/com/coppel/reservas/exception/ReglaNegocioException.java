package com.coppel.reservas.exception;

/** Se lanza cuando se rompe una regla de negocio (horario inválido, etc.). Responde 400. */
public class ReglaNegocioException extends RuntimeException {
    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}