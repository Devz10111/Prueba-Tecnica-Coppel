package com.coppel.reservas.exception;

/** Se lanza cuando el correo o la contraseña son incorrectos. Responde 401. */
public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}