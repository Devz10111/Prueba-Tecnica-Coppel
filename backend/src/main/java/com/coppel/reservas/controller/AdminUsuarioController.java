package com.coppel.reservas.controller;

import com.coppel.reservas.dto.UsuarioAdminResponse;
import com.coppel.reservas.dto.UsuarioActualizarRequest;
import com.coppel.reservas.dto.UsuarioCrearRequest;
import com.coppel.reservas.service.AdminUsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Endpoints para consultar y crear cuentas; SecurityConfig los limita a ADMIN. */
@RestController
@RequestMapping("/api/admin/usuarios")
@RequiredArgsConstructor
public class AdminUsuarioController {

    private final AdminUsuarioService adminUsuarioService;

    @GetMapping
    public List<UsuarioAdminResponse> listar() {
        return adminUsuarioService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioAdminResponse crear(@Valid @RequestBody UsuarioCrearRequest request) {
        return adminUsuarioService.crear(request);
    }

    @PutMapping("/{id}")
    public UsuarioAdminResponse actualizar(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioActualizarRequest request) {
        return adminUsuarioService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id, Authentication authentication) {
        adminUsuarioService.eliminar(id, authentication.getName());
    }
}
