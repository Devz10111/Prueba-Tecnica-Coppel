import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import {
  DatosUsuarioSesion,
  LoginRequest,
  LoginResponse,
  RolUsuario,
} from '../models';

/**
 * Servicio de autenticación del portal de administración.
 *
 * Responsabilidades:
 * - Enviar las credenciales al backend.
 * - Guardar el token y los datos del usuario en localStorage.
 * - Saber si hay una sesión válida y cuál es el rol.
 * - Eliminar la sesión al cerrar sesión.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // Claves usadas en localStorage. Se separan token y datos del usuario.
  private readonly CLAVE_TOKEN = 'coppel_token';
  private readonly CLAVE_USUARIO = 'coppel_usuario';

  /**
   * POST /api/auth/login
   *
   * `tap` permite ejecutar un efecto secundario (guardar la sesión)
   * sin modificar la respuesta que recibe el componente.
   */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_CONFIG.baseUrl}/api/auth/login`, credenciales)
      .pipe(
        tap((respuesta) => this.guardarSesion(respuesta)),
      );
  }

  /**
   * Cierra la sesión en el navegador.
   * El backend trabaja con JWT sin sesión en servidor, así que basta con
   * borrar el token y los datos del usuario almacenados.
   *
   * El componente que llame a logout() se encarga de navegar al login.
   */
  logout(): void {
    localStorage.removeItem(this.CLAVE_TOKEN);
    localStorage.removeItem(this.CLAVE_USUARIO);
  }

  /**
   * Guarda el token y los datos básicos del usuario.
   * Se marca como `private` porque solo debe usarlo este servicio.
   */
  private guardarSesion(respuesta: LoginResponse): void {
    const usuario: DatosUsuarioSesion = {
      nombre: respuesta.nombre,
      rol: respuesta.rol,
      expiraEn: respuesta.expiraEn,
    };

    localStorage.setItem(this.CLAVE_TOKEN, respuesta.token);
    localStorage.setItem(this.CLAVE_USUARIO, JSON.stringify(usuario));
  }

  /**
   * Devuelve el token guardado o null si no hay sesión.
   */
  obtenerToken(): string | null {
    return localStorage.getItem(this.CLAVE_TOKEN);
  }

  /**
   * Devuelve los datos del usuario guardado o null si no hay sesión.
   * Si el JSON almacenado está dañado, limpia la sesión para evitar errores.
   */
  obtenerUsuario(): DatosUsuarioSesion | null {
    const guardado = localStorage.getItem(this.CLAVE_USUARIO);
    if (!guardado) {
      return null;
    }

    try {
      return JSON.parse(guardado) as DatosUsuarioSesion;
    } catch {
      this.logout();
      return null;
    }
  }

  /**
   * Indica si existe un token y si todavía no llegó su fecha de expiración.
   * Si la sesión expiró, la elimina automáticamente.
   */
  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    const usuario = this.obtenerUsuario();

    if (!token || !usuario) {
      return false;
    }

    const expiracion = new Date(usuario.expiraEn).getTime();
    const expirada = Number.isNaN(expiracion) || expiracion <= Date.now();

    if (expirada) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Devuelve el rol del usuario autenticado o null si no hay sesión válida.
   */
  obtenerRol(): RolUsuario | null {
    if (!this.estaAutenticado()) {
      return null;
    }

    return this.obtenerUsuario()?.rol ?? null;
  }
}
