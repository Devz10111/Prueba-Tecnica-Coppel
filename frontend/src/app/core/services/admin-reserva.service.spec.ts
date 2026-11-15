import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminReservaService } from './admin-reserva.service';

const API = 'http://localhost:8080/api/admin/reservas';

describe('AdminReservaService', () => {
  let service: AdminReservaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminReservaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía el estado del filtro como query parameter', () => {
    service.listar('PENDIENTE').subscribe();

    const request = http.expectOne(`${API}?estado=PENDIENTE`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('omite el query parameter cuando se solicitan todos los estados', () => {
    service.listar('').subscribe();

    const request = http.expectOne(API);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('usa los endpoints y métodos correctos para las acciones', () => {
    service.detalle('2026000001').subscribe();
    http.expectOne(`${API}/2026000001`).flush({});

    service.cambiarEstado('2026000001', {
      estado: 'RECHAZADA',
      comentario: 'No disponible',
    }).subscribe();
    const estado = http.expectOne(`${API}/2026000001/estado`);
    expect(estado.request.method).toBe('PUT');
    expect(estado.request.body).toEqual({
      estado: 'RECHAZADA',
      comentario: 'No disponible',
    });
    estado.flush({});

    service.modificar('2026000001', {
      espacioId: 2,
      fecha: '2099-01-01',
      horaInicio: '10:00',
      horaFin: '11:00',
    }).subscribe();
    const modificar = http.expectOne(`${API}/2026000001`);
    expect(modificar.request.method).toBe('PUT');
    modificar.flush({});

    service.cancelar('2026000001').subscribe();
    const cancelar = http.expectOne(`${API}/2026000001`);
    expect(cancelar.request.method).toBe('DELETE');
    cancelar.flush({});
  });
});
