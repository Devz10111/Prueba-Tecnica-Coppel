package com.coppel.reservas.exception;

/** Se lanza cuando no existe lo que se busca (folio, espacio...). Responde 404. */
public class RecursoNoEncontradoException extends RuntimeException {
    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}