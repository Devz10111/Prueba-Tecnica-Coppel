package com.coppel.reservas.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    void errorNoControladoResponde500SinExponerDetallesInternos() {
        ResponseEntity<ApiError> response =
                new GlobalExceptionHandler().errorInterno(new IllegalStateException("secreto-interno"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().mensaje()).isEqualTo(
                "Ocurrió un error interno. Inténtalo de nuevo más tarde.");
        assertThat(response.getBody().detalles()).isEmpty();
        assertThat(response.getBody().mensaje()).doesNotContain("secreto-interno");
    }
}
