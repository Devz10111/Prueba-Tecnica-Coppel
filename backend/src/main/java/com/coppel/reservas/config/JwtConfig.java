package com.coppel.reservas.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;

/** Herramientas para firmar (crear) y validar tokens JWT con una clave secreta (HS256). */
@Configuration
public class JwtConfig {

    // Se lee de application.properties (o de la variable de entorno JWT_SECRET)
    @Value("${app.jwt.secret}")
    private String secreto;

    @Bean
    public SecretKey jwtSecretKey() {
        if (secreto == null || secreto.length() < 32) {
            throw new IllegalStateException(
                    "La clave JWT debe tener al menos 32 caracteres. Configura JWT_SECRET.");
        }
        return new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    }
}