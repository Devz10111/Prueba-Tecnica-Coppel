package com.coppel.reservas.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

/** Captura las excepciones de toda la aplicación y las convierte en respuestas JSON claras. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ApiError> noEncontrado(RecursoNoEncontradoException ex) {
        return construir(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ConflictoException.class)
    public ResponseEntity<ApiError> conflicto(ConflictoException ex) {
        return construir(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ReglaNegocioException.class)
    public ResponseEntity<ApiError> reglaNegocio(ReglaNegocioException ex) {
        return construir(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ApiError> credencialesInvalidas(CredencialesInvalidasException ex) {
        return construir(HttpStatus.UNAUTHORIZED, ex.getMessage(), List.of());
    }

    // Falla la validación (@Valid) de un DTO: devuelve la lista de campos con error
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacion(MethodArgumentNotValidException ex) {
        List<String> detalles = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .toList();
        return construir(HttpStatus.BAD_REQUEST, "Hay datos inválidos en la solicitud", detalles);
    }

    // JSON mal formado o con formato de fecha/hora inválido (por ejemplo "8:00")
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> cuerpoInvalido(HttpMessageNotReadableException ex) {
        return construir(HttpStatus.BAD_REQUEST,
                "El cuerpo de la solicitud no es válido. Revisa el formato de fechas (2026-11-20) y horas (09:00).",
                List.of());
    }

    private ResponseEntity<ApiError> construir(HttpStatus status, String mensaje, List<String> detalles) {
        ApiError cuerpo = new ApiError(
                status.value(), status.getReasonPhrase(), mensaje, detalles, LocalDateTime.now());
        return ResponseEntity.status(status).body(cuerpo);
    }
}