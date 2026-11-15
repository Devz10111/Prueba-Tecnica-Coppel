import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { Disponibilidad, Espacio } from '../models';

/**
 * Servicio encargado de las consultas públicas de espacios.
 *
 * `providedIn: 'root'` hace que Angular cree UNA sola instancia del servicio
 * y la comparta con toda la aplicación (patrón singleton).
 */
@Injectable({ providedIn: 'root' })
export class EspacioService {
  // inject() obtiene dependencias sin escribir un constructor.
  private readonly http = inject(HttpClient);

  // URL base del recurso, construida desde la configuración central.
  private readonly apiUrl = `${API_CONFIG.baseUrl}/api/espacios`;

  /**
   * GET /api/espacios
   * Devuelve los 4 espacios disponibles.
   */
  listar(): Observable<Espacio[]> {
    return this.http.get<Espacio[]>(this.apiUrl);
  }

  /**
   * GET /api/espacios/{id}/disponibilidad?fecha=YYYY-MM-DD
   * Devuelve el horario de atención y las franjas ya ocupadas.
   *
   * HttpParams construye el query string de forma segura,
   * sin concatenar manualmente "?fecha=...".
   */
  disponibilidad(espacioId: number, fecha: string): Observable<Disponibilidad> {
    const params = new HttpParams().set('fecha', fecha);

    return this.http.get<Disponibilidad>(
      `${this.apiUrl}/${espacioId}/disponibilidad`,
      { params },
    );
  }
}
