package com.coppel.reservas.controller;

import com.coppel.reservas.dto.ReservaRequest;
import com.coppel.reservas.dto.ReservaResponse;
import com.coppel.reservas.dto.ReservaResumenResponse;
import com.coppel.reservas.model.Rol;
import com.coppel.reservas.service.ReservaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Endpoints públicos de reservas (portal del empleado). */
@RestController
@RequestMapping("/api/reservas")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;

    // POST /api/reservas  → CU1: crear una reserva. Responde 201 (Created).
    @PostMapping
    public ResponseEntity<ReservaResponse> crear(
            @Valid @RequestBody ReservaRequest request, Authentication authentication) {
        ReservaResponse creada = reservaService.crear(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @GetMapping("/mias")
    public List<ReservaResumenResponse> listarMias(Authentication authentication) {
        return reservaService.listarMias(authentication.getName());
    }

    // GET /api/reservas/{folio}  → CU2: consultar una reserva por folio
    @GetMapping("/{folio}")
    public ReservaResponse consultar(@PathVariable String folio, Authentication authentication) {
        boolean puedeConsultarTodas = authentication.getAuthorities().stream()
                .anyMatch(autoridad -> autoridad.getAuthority().equals("ROLE_" + Rol.ADMIN.name())
                        || autoridad.getAuthority().equals("ROLE_" + Rol.JEFE_DEPARTAMENTO.name()));
        return reservaService.consultarPorFolio(folio, authentication.getName(), puedeConsultarTodas);
    }
}