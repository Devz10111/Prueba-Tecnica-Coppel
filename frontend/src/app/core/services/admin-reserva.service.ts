import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import {
  CambioEstadoRequest,
  EstadoReserva,
  ReservaModificacionRequest,
  ReservaResponse,
  ReservaResumen,
} from '../models';

/** Operaciones protegidas del portal de administración de reservas. */
@Injectable({ providedIn: 'root' })
export class AdminReservaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.baseUrl}/api/admin/reservas`;

  /** GET /api/admin/reservas?estado=...; omite el parámetro para ver todas. */
  listar(estado: EstadoReserva | ''): Observable<ReservaResumen[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<ReservaResumen[]>(this.apiUrl, { params });
  }

  /** GET /api/admin/reservas/{folio}, incluye el historial completo. */
  detalle(folio: string): Observable<ReservaResponse> {
    return this.http.get<ReservaResponse>(
      `${this.apiUrl}/${encodeURIComponent(folio)}`,
    );
  }

  /** PUT /api/admin/reservas/{folio}/estado. */
  cambiarEstado(
    folio: string,
    cambio: CambioEstadoRequest,
  ): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(
      `${this.apiUrl}/${encodeURIComponent(folio)}/estado`,
      cambio,
    );
  }

  /** PUT /api/admin/reservas/{folio}. */
  modificar(
    folio: string,
    cambios: ReservaModificacionRequest,
  ): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(
      `${this.apiUrl}/${encodeURIComponent(folio)}`,
      cambios,
    );
  }

  /** DELETE /api/admin/reservas/{folio}; el backend limita esto a ADMIN. */
  cancelar(folio: string): Observable<ReservaResponse> {
    return this.http.delete<ReservaResponse>(
      `${this.apiUrl}/${encodeURIComponent(folio)}`,
    );
  }
}
