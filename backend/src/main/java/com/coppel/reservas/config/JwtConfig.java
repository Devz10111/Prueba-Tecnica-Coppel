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

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/** Herramientas para firmar (crear) y validar tokens JWT con una clave secreta (HS256). */
@Configuration
public class JwtConfig {

    // Se lee de application.properties (o de la variable de entorno JWT_SECRET)
    @Value("${app.jwt.secret}")
    private String secreto;

    private SecretKey clave() {
        return new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    // Crea tokens firmados (se usa en el login)
    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(clave()));
    }

    // Valida la firma y la vigencia de los tokens que llegan en cada petición
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(clave()).macAlgorithm(MacAlgorithm.HS256).build();
    }
}