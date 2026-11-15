package com.coppel.reservas.service;

import com.coppel.reservas.dto.UsuarioAdminResponse;
import com.coppel.reservas.dto.UsuarioActualizarRequest;
import com.coppel.reservas.dto.UsuarioCrearRequest;
import com.coppel.reservas.exception.ConflictoException;
import com.coppel.reservas.exception.RecursoNoEncontradoException;
import com.coppel.reservas.repository.HistorialCambioRepository;
import com.coppel.reservas.repository.ReservaRepository;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** Lógica de lectura y creación de cuentas desde el módulo de administración. */
@Service
@RequiredArgsConstructor
public class AdminUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ReservaRepository reservaRepository;
    private final HistorialCambioRepository historialCambioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listar() {
        return usuarioRepository.findAllByOrderByNombreAscEmailAsc()
                .stream()
                .map(this::aRespuesta)
                .toList();
    }

    @Transactional
    public UsuarioAdminResponse crear(UsuarioCrearRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictoException("Ya existe una cuenta con ese correo electrónico.");
        }

        Usuario usuario = new Usuario(
                request.nombre().trim(),
                email,
                normalizarDepartamento(request.departamento()),
                passwordEncoder.encode(request.password()),
                request.rol());

        return aRespuesta(usuarioRepository.save(usuario));
    }

    @Transactional
    public UsuarioAdminResponse actualizar(Long id, UsuarioActualizarRequest request) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario."));
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (usuarioRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictoException("Ya existe una cuenta con ese correo electrónico.");
        }

        usuario.setNombre(request.nombre().trim());
        usuario.setEmail(email);
        usuario.setDepartamento(normalizarDepartamento(request.departamento()));
        usuario.setRol(request.rol());
        return aRespuesta(usuarioRepository.save(usuario));
    }

    @Transactional
    public void eliminar(Long id, String emailAdministrador) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario."));
        if (usuario.getEmail().equalsIgnoreCase(emailAdministrador)) {
            throw new ConflictoException("No puedes eliminar la cuenta con la que iniciaste sesión.");
        }

        reservaRepository.desvincularUsuario(id);
        historialCambioRepository.desvincularUsuario(id);
        usuarioRepository.delete(usuario);
        usuarioRepository.flush();
    }

    private String normalizarDepartamento(String departamento) {
        if (departamento == null || departamento.isBlank()) {
            return null;
        }
        return departamento.trim();
    }

    private UsuarioAdminResponse aRespuesta(Usuario usuario) {
        return new UsuarioAdminResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getDepartamento(),
                usuario.getRol());
    }
}
