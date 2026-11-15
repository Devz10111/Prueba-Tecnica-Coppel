package com.coppel.reservas.service;

import com.coppel.reservas.dto.UsuarioCrearRequest;
import com.coppel.reservas.exception.ConflictoException;
import com.coppel.reservas.model.Rol;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUsuarioServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private AdminUsuarioService service;

    @Test
    void listar_devuelveDatosSinExponerContrasena() {
        Usuario usuario = new Usuario("Ana Empleada", "ana@coppel.test", "hash-secreto", Rol.EMPLEADO);
        usuario.setId(3L);
        when(usuarioRepository.findAllByOrderByNombreAscEmailAsc())
                .thenReturn(List.of(usuario));

        var resultado = service.listar();

        assertThat(resultado).containsExactly(
                new com.coppel.reservas.dto.UsuarioAdminResponse(
                        3L, "Ana Empleada", "ana@coppel.test", null, Rol.EMPLEADO));
    }

    @Test
    void crear_normalizaCorreoYGuardaHashDeContrasena() {
        UsuarioCrearRequest request = new UsuarioCrearRequest(
                "  Ana Empleada  ", " ANA@COPPEL.TEST ", "Sistemas",
                "ClaveSegura123", Rol.EMPLEADO);
        when(usuarioRepository.existsByEmailIgnoreCase("ana@coppel.test")).thenReturn(false);
        when(passwordEncoder.encode("ClaveSegura123")).thenReturn("hash-cifrado");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(8L);
            return usuario;
        });

        var resultado = service.crear(request);

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertThat(captor.getValue().getNombre()).isEqualTo("Ana Empleada");
        assertThat(captor.getValue().getEmail()).isEqualTo("ana@coppel.test");
        assertThat(captor.getValue().getDepartamento()).isEqualTo("Sistemas");
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hash-cifrado");
        assertThat(resultado.email()).isEqualTo("ana@coppel.test");
        assertThat(resultado.rol()).isEqualTo(Rol.EMPLEADO);
    }

    @Test
    void crear_conCorreoExistente_lanzaConflictoSinGuardar() {
        UsuarioCrearRequest request = new UsuarioCrearRequest(
                "Ana Empleada", "ana@coppel.test", null, "ClaveSegura123", Rol.EMPLEADO);
        when(usuarioRepository.existsByEmailIgnoreCase("ana@coppel.test")).thenReturn(true);

        assertThatThrownBy(() -> service.crear(request))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Ya existe");

        verify(usuarioRepository, never()).save(any(Usuario.class));
    }
}
