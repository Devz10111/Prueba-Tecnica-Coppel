package com.coppel.reservas.controller;

import com.coppel.reservas.dto.DisponibilidadResponse;
import com.coppel.reservas.dto.EspacioResponse;
import com.coppel.reservas.service.EspacioService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** Endpoints públicos de espacios (portal del empleado). */
@RestController
@RequestMapping("/api/espacios")
@RequiredArgsConstructor
public class EspacioController {

    private final EspacioService espacioService;

    // GET /api/espacios
    @GetMapping
    public List<EspacioResponse> listar() {
        return espacioService.listar();
    }

    // GET /api/espacios/{id}/disponibilidad?fecha=2026-11-20
    @GetMapping("/{id}/disponibilidad")
    public DisponibilidadResponse disponibilidad(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return espacioService.disponibilidad(id, fecha);
    }
}