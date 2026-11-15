import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
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
   * Datos del usuario en un signal para que el navbar se actualice solo
   * cuando se inicia o cierra sesión, sin recargar la página.
   */
  private readonly usuarioSesion = signal<DatosUsuarioSesion | null>(
    this.leerUsuarioGuardado(),
  );

  /** Versión de solo lectura que pueden consumir los componentes. */
  readonly usuarioActual = this.usuarioSesion.asReadonly();

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
    this.usuarioSesion.set(null);
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
    this.usuarioSesion.set(usuario);
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
    const usuario = this.leerUsuarioGuardado();
    this.usuarioSesion.set(usuario);
    return usuario;
  }

  /**
   * Lee el usuario desde localStorage sin tocar el signal.
   * Se usa al crear el servicio y al consultar la sesión actual.
   */
  private leerUsuarioGuardado(): DatosUsuarioSesion | null {
    const guardado = localStorage.getItem(this.CLAVE_USUARIO);
    const token = localStorage.getItem(this.CLAVE_TOKEN);

    if (!guardado || !token) {
      if (guardado || token) {
        this.limpiarSesionGuardada();
      }
      return null;
    }

    try {
      const usuario: unknown = JSON.parse(guardado);
      if (
        !usuario ||
        typeof usuario !== 'object' ||
        !('nombre' in usuario) ||
        typeof usuario.nombre !== 'string' ||
        !('rol' in usuario) ||
        (usuario.rol !== 'ADMIN' &&
          usuario.rol !== 'JEFE_DEPARTAMENTO') ||
        !('expiraEn' in usuario) ||
        typeof usuario.expiraEn !== 'string'
      ) {
        this.limpiarSesionGuardada();
        return null;
      }

      const expiracion = new Date(usuario.expiraEn).getTime();
      if (Number.isNaN(expiracion) || expiracion <= Date.now()) {
        this.limpiarSesionGuardada();
        return null;
      }

      return {
        nombre: usuario.nombre,
        rol: usuario.rol,
        expiraEn: usuario.expiraEn,
      };
    } catch {
      // Si el JSON está dañado, se elimina la sesión para evitar errores.
      this.limpiarSesionGuardada();
      return null;
    }
  }

  /** Elimina ambas piezas de la sesión cuando están incompletas o inválidas. */
  private limpiarSesionGuardada(): void {
    localStorage.removeItem(this.CLAVE_TOKEN);
    localStorage.removeItem(this.CLAVE_USUARIO);
  }

  /**
   * Indica si existe un token y si todavía no llegó su fecha de expiración.
   * Si la sesión expiró, la elimina automáticamente.
   */
  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    const usuario = this.obtenerUsuario();

    if (!token || !usuario) {
      // Si queda solo una de las dos partes, la sesión está incompleta.
      if (token || usuario) {
        this.logout();
      }
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
