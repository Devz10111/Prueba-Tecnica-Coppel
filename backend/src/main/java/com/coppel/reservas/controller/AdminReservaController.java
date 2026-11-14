package com.coppel.reservas.controller;

import com.coppel.reservas.dto.CambioEstadoRequest;
import com.coppel.reservas.dto.ReservaModificacionRequest;
import com.coppel.reservas.dto.ReservaResponse;
import com.coppel.reservas.dto.ReservaResumenResponse;
import com.coppel.reservas.model.EstadoReserva;
import com.coppel.reservas.service.ReservaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Endpoints del portal de administración. Requieren un JWT válido (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/reservas")
@RequiredArgsConstructor
public class AdminReservaController {

    private final ReservaService reservaService;

    // GET /api/admin/reservas  o  GET /api/admin/reservas?estado=PENDIENTE
    @GetMapping
    public List<ReservaResumenResponse> listar(@RequestParam(required = false) EstadoReserva estado) {
        return reservaService.listar(estado);
    }

    // GET /api/admin/reservas/{folio}  → detalle con historial
    @GetMapping("/{folio}")
    public ReservaResponse detalle(@PathVariable String folio) {
        return reservaService.consultarPorFolio(folio);
    }

    // PUT /api/admin/reservas/{folio}/estado  → aprobar o rechazar
    // authentication.getName() devuelve el correo del administrador (subject del JWT)
    @PutMapping("/{folio}/estado")
    public ReservaResponse cambiarEstado(@PathVariable String folio,
                                         @Valid @RequestBody CambioEstadoRequest request,
                                         Authentication authentication) {
        return reservaService.cambiarEstado(folio, request, authentication.getName());
    }

    // PUT /api/admin/reservas/{folio}  → modificar espacio, fecha u horario
    @PutMapping("/{folio}")
    public ReservaResponse modificar(@PathVariable String folio,
                                     @Valid @RequestBody ReservaModificacionRequest request,
                                     Authentication authentication) {
        return reservaService.modificar(folio, request, authentication.getName());
    }

    // DELETE /api/admin/reservas/{folio}  → cancelar (solo ADMIN)
    @DeleteMapping("/{folio}")
    public ReservaResponse cancelar(@PathVariable String folio, Authentication authentication) {
        return reservaService.cancelar(folio, authentication.getName());
    }
}