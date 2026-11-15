package com.coppel.reservas.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    @Test
    void login_alExcederLimiteResponde429ConRetryAfterYApiError() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(true, 5, 10, 120, 60, new ObjectMapper());
        for (int i = 0; i < 5; i++) {
            MockHttpServletResponse response = ejecutar(filter, "/api/auth/login");
            assertThat(response.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse response = ejecutar(filter, "/api/auth/login");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isNotBlank();
        JsonNode body = new ObjectMapper().readTree(response.getContentAsString());
        assertThat(body.get("status").asInt()).isEqualTo(429);
        assertThat(body.get("error").asText()).isEqualTo("Too Many Requests");
        assertThat(body.get("mensaje").asText()).contains("límite");
        assertThat(body.get("detalles").isArray()).isTrue();
        assertThat(body.hasNonNull("fecha")).isTrue();
    }

    @Test
    void rateLimit_usaLaIpRemotaYNoElEncabezadoForwarded() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(true, 1, 10, 120, 60, new ObjectMapper());
        MockHttpServletRequest first = request("/api/auth/login");
        first.addHeader("X-Forwarded-For", "203.0.113.1");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(first, firstResponse, new MockFilterChain());

        MockHttpServletRequest second = request("/api/auth/login");
        second.addHeader("X-Forwarded-For", "198.51.100.2");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(second, secondResponse, new MockFilterChain());

        assertThat(firstResponse.getStatus()).isEqualTo(200);
        assertThat(secondResponse.getStatus()).isEqualTo(429);
    }

    private MockHttpServletResponse ejecutar(RateLimitFilter filter, String path) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request(path), response, new MockFilterChain());
        return response;
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("192.0.2.10");
        return request;
    }

}
