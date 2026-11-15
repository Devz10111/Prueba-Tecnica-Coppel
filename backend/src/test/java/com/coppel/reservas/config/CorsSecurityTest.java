package com.coppel.reservas.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.ratelimit.enabled=false",
        "app.cors.allowed-origins=http://localhost:4200"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void preflightDesdeOrigenNoPermitidoNoDevuelvePermisoCors() throws Exception {
        mockMvc.perform(options("/api/espacios")
                        .header(HttpHeaders.ORIGIN, "https://sitio-no-autorizado.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
