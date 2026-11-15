package com.coppel.reservas.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class JwtConfigTest {

    @Test
    void claveJwtMenorA32Caracteres_impideElArranqueConMensajeClaro() {
        new ApplicationContextRunner()
                .withUserConfiguration(JwtConfig.class)
                .withPropertyValues("app.jwt.secret=demasiado-corta")
                .run(context -> {
                    assertThat(context.getStartupFailure()).isNotNull();
                    assertThat(causaRaiz(context.getStartupFailure()).getMessage())
                            .contains("JWT_SECRET")
                            .contains("32 caracteres");
                });
    }

    private Throwable causaRaiz(Throwable error) {
        Throwable actual = error;
        while (actual.getCause() != null) {
            actual = actual.getCause();
        }
        return actual;
    }
}
