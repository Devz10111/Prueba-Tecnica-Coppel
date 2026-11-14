package com.coppel.reservas.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/** Reglas de seguridad de la API: qué rutas son públicas y cuáles requieren sesión. */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF protege formularios con cookies; en una API sin cookies de sesión no aplica
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                // Ruta interna de Spring donde se muestran los errores
                .requestMatchers("/error").permitAll()
                // Rutas públicas: lo que usa el empleado
                .requestMatchers(HttpMethod.POST, "/api/reservas").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/reservas/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/espacios/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                // Todo lo demás (portal de administración) requiere autenticación
                .anyRequest().authenticated()
            );
        return http.build();
    }

    // Permite que el frontend Angular (puerto 4200) llame a esta API (puerto 8080)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}