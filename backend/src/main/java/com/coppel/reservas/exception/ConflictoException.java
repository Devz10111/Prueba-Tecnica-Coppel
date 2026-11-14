package com.coppel.reservas.exception;

/** Se lanza cuando la operación choca con el estado actual (horario ocupado). Responde 409. */
public class ConflictoException extends RuntimeException {
    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}