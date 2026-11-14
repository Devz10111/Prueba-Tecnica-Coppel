package com.coppel.reservas.service;

import com.coppel.reservas.dto.LoginRequest;
import com.coppel.reservas.dto.LoginResponse;
import com.coppel.reservas.exception.CredencialesInvalidasException;
import com.coppel.reservas.model.Usuario;
import com.coppel.reservas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Autenticación de administradores: valida credenciales y emite el JWT. */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    @Value("${app.jwt.expiracion-minutos}")
    private long expiracionMinutos;

    public LoginResponse login(LoginRequest req) {

        // Mismo mensaje si falla el correo o la contraseña: no revela cuál de los dos fue
        Usuario usuario = usuarioRepository.findByEmail(req.email())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new CredencialesInvalidasException("Correo o contraseña incorrectos"));

        Instant ahora = Instant.now();
        Instant expira = ahora.plus(expiracionMinutos, ChronoUnit.MINUTES);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("reservas-coppel")
                .issuedAt(ahora)
                .expiresAt(expira)
                .subject(usuario.getEmail())
                .claim("rol", usuario.getRol().name())
                .claim("nombre", usuario.getNombre())
                .build();

        JwsHeader encabezado = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(encabezado, claims)).getTokenValue();

        return new LoginResponse(token, "Bearer", expira, usuario.getNombre(), usuario.getRol().name());
    }
}