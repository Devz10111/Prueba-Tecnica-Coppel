import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Disponibilidad, Espacio } from '../../core/models';
import { fechaLocal, sumarDias } from '../../core/utils/fecha.utils';
import { Calendario } from './calendario';

const API = 'http://localhost:8080';
const HOY = fechaLocal(new Date());

const ESPACIOS: Espacio[] = [
  {
    id: 1,
    nombre: 'Sala de reuniones pequeña',
    capacidad: 8,
    descripcion: 'Sala para reuniones de equipo reducido',
  },
  {
    id: 2,
    nombre: 'Sala de reuniones grande',
    capacidad: 20,
    descripcion: 'Sala para reuniones de área o departamento',
  },
];

/** Disponibilidad de prueba con dos reservas activas. */
const DISPONIBILIDAD: Disponibilidad = {
  espacioId: 1,
  espacio: 'Sala de reuniones pequeña',
  fecha: HOY,
  horaApertura: '08:00:00',
  horaCierre: '20:00:00',
  ocupados: [
    { horaInicio: '09:00:00', horaFin: '10:00:00', estado: 'PENDIENTE' },
    { horaInicio: '11:00:00', horaFin: '12:00:00', estado: 'APROBADA' },
  ],
};

describe('Calendario', () => {
  let fixture: ComponentFixture<Calendario>;
  let componente: any;
  let http: HttpTestingController;

  /** Prepara el componente con HTTP y Router simulados antes de cada prueba. */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calendario],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Calendario);
    componente = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  /** Verifica que no queden peticiones HTTP pendientes. */
  afterEach(() => {
    http.verify();
  });

  /** Consume la carga inicial de espacios y disponibilidad. */
  function cargarInicial(): void {
    http.expectOne(`${API}/api/espacios`).flush(ESPACIOS);
    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${HOY}`)
      .flush(DISPONIBILIDAD);
    fixture.detectChanges();
  }

  /** Comprueba la cuadrícula completa y los colores de las reservas. */
  it('dibuja 24 bloques y colorea las franjas ocupadas', () => {
    cargarInicial();

    expect(componente.franjas().length).toBe(24);
    expect(componente.bloquesOcupados()).toBe(4);
    expect(componente.bloquesLibres()).toBe(20);

    const filas = fixture.nativeElement.querySelectorAll('.franja');
    expect(filas.length).toBe(24);
    expect(
      fixture.nativeElement.querySelectorAll('.franja-pendiente').length,
    ).toBe(2);
    expect(
      fixture.nativeElement.querySelectorAll('.franja-aprobada').length,
    ).toBe(2);
    expect(
      fixture.nativeElement.querySelectorAll('.franja-libre').length,
    ).toBe(20);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('PENDIENTE');
    expect(texto).toContain('APROBADA');
    expect(texto).toContain('Libre');
  });

  /** Verifica la navegación al día siguiente y su consulta. */
  it('avanza al día siguiente y consulta su disponibilidad', () => {
    cargarInicial();

    componente.irDiaSiguiente();
    const manana = sumarDias(HOY, 1);

    expect(componente.fecha()).toBe(manana);

    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${manana}`)
      .flush({ ...DISPONIBILIDAD, fecha: manana, ocupados: [] });

    fixture.detectChanges();

    expect(componente.bloquesOcupados()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('24 libres');
  });

  /** Comprueba el límite inferior del botón para retroceder. */
  it('deshabilita el día anterior cuando la fecha es hoy', () => {
    cargarInicial();

    expect(componente.puedeDiaAnterior()).toBeFalse();

    componente.irDiaSiguiente();
    expect(componente.puedeDiaAnterior()).toBeTrue();

    http
      .expectOne(
        `${API}/api/espacios/1/disponibilidad?fecha=${sumarDias(HOY, 1)}`,
      )
      .flush({ ...DISPONIBILIDAD, fecha: sumarDias(HOY, 1), ocupados: [] });
  });

  /** Verifica que una fecha pasada se corrige a hoy. */
  it('no permite consultar una fecha anterior a hoy', () => {
    cargarInicial();

    const input = document.createElement('input');
    input.value = '2000-01-01';

    componente.cambiarFecha({ target: input } as unknown as Event);

    expect(componente.fecha()).toBe(HOY);
    expect(input.value).toBe(HOY);
    expect(componente.avisoFecha()).toContain('anterior a hoy');

    http
      .expectOne(`${API}/api/espacios/1/disponibilidad?fecha=${HOY}`)
      .flush(DISPONIBILIDAD);
  });

  /** Comprueba que el botón lleva al formulario con los parámetros correctos. */
  it('lleva al formulario con el espacio y la fecha seleccionados', () => {
    cargarInicial();

    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );

    componente.reservar();

    expect(navegar).toHaveBeenCalledWith(['/reservar'], {
      queryParams: { espacioId: 1, fecha: HOY },
    });
  });
});

