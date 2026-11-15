import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { ReservaRequest, ReservaResponse } from '../models';

/**
 * Servicio con las operaciones públicas de reservas.
 * Las operaciones de administración se agregarán en su propio servicio.
 */
@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.baseUrl}/api/reservas`;

  /**
   * POST /api/reservas
   * Envía el formulario y devuelve la reserva creada con su folio.
   */
  crear(reserva: ReservaRequest): Observable<ReservaResponse> {
    return this.http.post<ReservaResponse>(this.apiUrl, reserva);
  }

  /**
   * GET /api/reservas/{folio}
   * Consulta una reserva por su folio.
   *
   * encodeURIComponent evita problemas si el folio tuviera caracteres especiales.
   */
  consultarPorFolio(folio: string): Observable<ReservaResponse> {
    return this.http.get<ReservaResponse>(
      `${this.apiUrl}/${encodeURIComponent(folio)}`,
    );
  }
}
