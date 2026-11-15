import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  ParamMap,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { ReservaResponse } from '../../core/models';
import { Consulta } from './consulta';

const API = 'http://localhost:8080';

const RESERVA: ReservaResponse = {
  folio: '2026000001',
  espacioId: 1,
  espacio: 'Sala de reuniones pequeña',
  capacidadEspacio: 8,
  fecha: '2026-11-20',
  horaInicio: '09:00:00',
  horaFin: '10:30:00',
  duracionMinutos: 90,
  solicitante: 'Ana Pérez',
  departamento: 'Sistemas',
  descripcion: 'Reunión de planeación trimestral',
  estado: 'APROBADA',
  creadaEn: '2026-11-18T10:15:00',
  historial: [
    {
      accion: 'CREADA',
      detalle: 'Solicitud registrada por el empleado.',
      fecha: '2026-11-18T10:15:00',
      usuario: 'Solicitante',
    },
    {
      accion: 'APROBADA',
      detalle: 'Reserva aprobada por el administrador.',
      fecha: '2026-11-19T09:00:00',
      usuario: 'Administrador Coppel',
    },
  ],
};

describe('Consulta', () => {
  let fixture: ComponentFixture<Consulta>;
  let componente: any;
  let http: HttpTestingController;
  let parametros: BehaviorSubject<ParamMap>;
  let location: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    parametros = new BehaviorSubject(convertToParamMap({}));
    location = jasmine.createSpyObj<Location>('Location', ['replaceState']);

    await TestBed.configureTestingModule({
      imports: [Consulta],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: parametros.asObservable() },
        },
        { provide: Location, useValue: location },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Consulta);
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    // ngOnInit se suscribe al folio de la URL.
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('carga la reserva cuando el folio viene en la URL', () => {
    parametros.next(convertToParamMap({ folio: '2026000001' }));

    const peticion = http.expectOne(`${API}/api/reservas/2026000001`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush(RESERVA);

    fixture.detectChanges();

    expect(componente.reserva()).toEqual(RESERVA);
    expect(location.replaceState).toHaveBeenCalledWith('/consultar/2026000001');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Sala de reuniones pequeña');
    expect(texto).toContain('8 personas');
    expect(texto).toContain('90 minutos');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('APROBADA');
    expect(texto).toContain('Historial de cambios');
    expect(texto).toContain('Administrador Coppel');

    const insignia = fixture.nativeElement.querySelector('.estado-badge');
    expect(insignia.classList).toContain('text-bg-success');
  });

  it('busca manualmente y muestra un mensaje amigable en 404', () => {
    componente.folio.setValue('9999999999');
    componente.buscar();

    expect(location.replaceState).toHaveBeenCalledWith('/consultar/9999999999');

    http
      .expectOne(`${API}/api/reservas/9999999999`)
      .flush({}, { status: 404, statusText: 'Not Found' });

    fixture.detectChanges();

    expect(componente.error()).toContain(
      'No encontramos una reserva con el folio 9999999999',
    );

    const alerta = fixture.nativeElement.querySelector('.alert');
    expect(alerta.classList).toContain('alert-warning');
    expect(fixture.nativeElement.textContent).toContain('No encontramos esa reserva');
  });

  it('elimina automáticamente las letras del folio', () => {
    componente.folio.setValue('12ab34');

    expect(componente.folio.value).toBe('1234');
  });

  it('asigna el color correcto a cada estado', () => {
    expect(componente.claseEstado('PENDIENTE')).toBe('text-bg-warning');
    expect(componente.claseEstado('APROBADA')).toBe('text-bg-success');
    expect(componente.claseEstado('RECHAZADA')).toBe('text-bg-danger');
    expect(componente.claseEstado('CANCELADA')).toBe('text-bg-secondary');
  });
});
