import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import {
  UsuarioActualizarRequest,
  UsuarioAdmin,
  UsuarioCrearRequest,
} from '../models';

/** Operaciones para administrar las cuentas del portal. */
@Injectable({ providedIn: 'root' })
export class AdminUsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.baseUrl}/api/admin/usuarios`;

  /** GET /api/admin/usuarios devuelve datos públicos, nunca contraseñas. */
  listar(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(this.apiUrl);
  }

  /** POST /api/admin/usuarios crea una cuenta nueva. */
  crear(usuario: UsuarioCrearRequest): Observable<UsuarioAdmin> {
    return this.http.post<UsuarioAdmin>(this.apiUrl, usuario);
  }

  /** PUT /api/admin/usuarios/{id} actualiza los datos del perfil. */
  actualizar(id: number, usuario: UsuarioActualizarRequest): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(`${this.apiUrl}/${id}`, usuario);
  }

  /** DELETE /api/admin/usuarios/{id} elimina la cuenta sin borrar sus reservas. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
