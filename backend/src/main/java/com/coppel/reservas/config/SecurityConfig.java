package com.coppel.reservas.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Configuración de seguridad de la API.
 * Define qué rutas son públicas, cuáles requieren un JWT válido y qué rol hace falta
 * para cada una. Spring Security aplica estas reglas antes de que la petición llegue
 * a cualquier controlador.
 */
@Configuration  // Clase de configuración: Spring lee los @Bean que define
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins;

    @Bean
    public RateLimitFilter rateLimitFilter(
            @Value("${app.ratelimit.enabled:true}") boolean enabled,
            @Value("${app.ratelimit.login.max-requests:5}") int loginLimit,
            @Value("${app.ratelimit.reservas.max-requests:10}") int reservasLimit,
            @Value("${app.ratelimit.api.max-requests:120}") int apiLimit,
            @Value("${app.ratelimit.window-seconds:60}") long windowSeconds) {
        return new RateLimitFilter(
                enabled, loginLimit, reservasLimit, apiLimit, windowSeconds, new ObjectMapper());
    }

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterServletRegistration(RateLimitFilter filter) {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Cadena de filtros de seguridad: el conjunto de reglas por las que pasa
     * cada petición HTTP antes de llegar al controlador.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, RateLimitFilter rateLimitFilter) throws Exception {
        http
            // CSRF protege formularios que usan cookies de sesión.
            // Esta API no usa cookies (usa tokens JWT), así que se desactiva.
            .csrf(csrf -> csrf.disable())

            // Activa CORS con las reglas definidas más abajo en corsConfigurationSource()
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // STATELESS = el servidor NO guarda sesiones en memoria.
            // Cada petición trae su propio token con toda la información del usuario.
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Reglas de autorización. IMPORTANTE: se evalúan en orden, de arriba hacia abajo,
            // y gana la primera que coincida. Por eso las reglas más específicas van primero.
            .authorizeHttpRequests(auth -> auth

                // Ruta interna de Spring donde se muestran los errores.
                // Si estuviera bloqueada, un error se vería como un 403 vacío.
                .requestMatchers("/error").permitAll()

                // Solo el inicio de sesión es público; las cuentas las administra ADMIN.
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()

                // Documentación Swagger (interfaz web y definición de la API).
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                // --- Portal del empleado: no requiere iniciar sesión ---
                .requestMatchers(HttpMethod.POST, "/api/reservas").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/reservas/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/espacios/**").permitAll()    // espacios y disponibilidad

                // --- Portal de administración ---
                // La administración de cuentas queda reservada al rol ADMIN.
                .requestMatchers("/api/admin/usuarios/**").hasRole("ADMIN")

                // Cancelar reservas (DELETE): solo ADMIN.
                // Va ANTES de la regla general de /api/admin/** para que tenga prioridad;
                // si fuera después, el jefe de departamento también podría cancelar.
                .requestMatchers(HttpMethod.DELETE, "/api/admin/**").hasRole("ADMIN")

                // Resto de operaciones de administración (listar, aprobar, rechazar, modificar):
                // administradores y jefes de departamento.
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "JEFE_DEPARTAMENTO")

                // Cualquier otra ruta no declarada arriba requiere estar autenticado.
                // Es una medida de seguridad por defecto: lo que no se permite, se bloquea.
                .anyRequest().authenticated()
            )

            // Convierte a la aplicación en "servidor de recursos" que valida tokens JWT.
            // Lee el encabezado "Authorization: Bearer <token>", comprueba la firma y la
            // vigencia con el JwtDecoder (definido en JwtConfig) y, si es válido, identifica
            // al usuario y su rol.
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        http.addFilterBefore(rateLimitFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Traduce el rol guardado dentro del token a un "permiso" que Spring Security entiende.
     * El token trae "rol": "ADMIN"; Spring espera "ROLE_ADMIN" (por eso el prefijo).
     * Así funcionan hasRole("ADMIN") y hasAnyRole(...) en las reglas de arriba.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter autoridades = new JwtGrantedAuthoritiesConverter();
        autoridades.setAuthoritiesClaimName("rol");   // nombre del dato dentro del token
        autoridades.setAuthorityPrefix("ROLE_");      // se antepone a "ADMIN" → "ROLE_ADMIN"

        JwtAuthenticationConverter convertidor = new JwtAuthenticationConverter();
        convertidor.setJwtGrantedAuthoritiesConverter(autoridades);
        return convertidor;
    }

    /**
     * CORS: el navegador bloquea por defecto que una página de un origen
     * (Angular en localhost:4200) llame a una API de otro origen (localhost:8080).
     * Esta configuración le indica al navegador que ese origen está autorizado.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(origin -> origin.trim()).filter(origin -> !origin.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));     // con qué métodos
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);   // aplica a todas las rutas
        return source;
    }
}