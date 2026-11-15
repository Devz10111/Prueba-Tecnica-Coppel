package com.coppel.reservas.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/** Aplica límites de solicitudes en memoria, agrupados por IP y tipo de endpoint. */
public class RateLimitFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final int loginLimit;
    private final int reservasLimit;
    private final int apiLimit;
    private final long windowMillis;
    private final ObjectMapper objectMapper;
    private final Map<String, RequestWindow> windows = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong();

    public RateLimitFilter(
            boolean enabled,
            int loginLimit,
            int reservasLimit,
            int apiLimit,
            long windowSeconds,
            ObjectMapper objectMapper) {
        if (loginLimit < 1 || reservasLimit < 1 || apiLimit < 1 || windowSeconds < 1) {
            throw new IllegalArgumentException("Los límites y la ventana de rate limit deben ser positivos.");
        }
        this.enabled = enabled;
        this.loginLimit = loginLimit;
        this.reservasLimit = reservasLimit;
        this.apiLimit = apiLimit;
        this.windowMillis = windowSeconds * 1_000;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!enabled || (!"/api".equals(path) && !path.startsWith("/api/"))) {
            filterChain.doFilter(request, response);
            return;
        }

        String policy;
        int limit;
        if ("POST".equalsIgnoreCase(request.getMethod())
                && "/api/auth/login".equals(path)) {
            policy = "login";
            limit = loginLimit;
        } else if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/reservas".equals(path)) {
            policy = "reservas";
            limit = reservasLimit;
        } else {
            policy = "api";
            limit = apiLimit;
        }

        long now = System.currentTimeMillis();
        cleanupIfNeeded(now);
        RequestWindow window = windows.computeIfAbsent(
                request.getRemoteAddr() + ":" + policy, ignored -> new RequestWindow());
        long retryAfterSeconds = window.tryAcquire(now, windowMillis, limit);
        if (retryAfterSeconds > 0) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getOutputStream(), Map.of(
                    "status", HttpStatus.TOO_MANY_REQUESTS.value(),
                    "error", HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                    "mensaje", "Se excedió el límite de solicitudes. Inténtalo de nuevo más tarde.",
                    "detalles", List.of(),
                    "fecha", LocalDateTime.now().toString()));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void cleanupIfNeeded(long now) {
        if (requestCount.incrementAndGet() % 256 == 0) {
            windows.forEach((key, window) ->
                    windows.computeIfPresent(key, (ignored, current) ->
                            current.isExpired(now, windowMillis * 2) ? null : current));
        }
    }

    private static final class RequestWindow {
        private final ArrayDeque<Long> timestamps = new ArrayDeque<>();
        private volatile long lastAccess;

        synchronized long tryAcquire(long now, long windowMillis, int limit) {
            long cutoff = now - windowMillis;
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= cutoff) {
                timestamps.removeFirst();
            }
            lastAccess = now;
            if (timestamps.size() >= limit) {
                long waitMillis = timestamps.peekFirst() + windowMillis - now;
                return Math.max(1, (waitMillis + 999) / 1_000);
            }
            timestamps.addLast(now);
            return 0;
        }

        boolean isExpired(long now, long expirationMillis) {
            return now - lastAccess > expirationMillis;
        }
    }
}
