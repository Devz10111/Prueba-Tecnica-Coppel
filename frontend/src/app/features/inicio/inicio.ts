import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Describe una de las tarjetas de acceso rápido de la pantalla principal.
 * Se usa una interfaz para que el editor valide que cada tarjeta tenga
 * todos los datos necesarios.
 */
interface AccesoRapido {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: string;
}

/**
 * Pantalla principal "RESERVA DE ESPACIOS".
 * Muestra tres tarjetas grandes que llevan a las funciones principales.
 */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  /**
   * Datos de las tres tarjetas. Al recorrerlos con @for en la plantilla,
   * evitamos repetir el mismo HTML tres veces.
   */
  protected readonly accesos: AccesoRapido[] = [
    {
      titulo: 'Nueva reserva',
      descripcion:
        'Registra un espacio en cuatro pasos: elige el espacio, la fecha y hora, captura tus datos y confirma.',
      ruta: '/reservar',
      icono: 'bi-calendar-plus',
    },
    {
      titulo: 'Consultar reserva',
      descripcion:
        'Busca una reserva por folio y revisa su estado, sus detalles y el historial de cambios.',
      ruta: '/consultar',
      icono: 'bi-search',
    },
    {
      titulo: 'Disponibilidad de espacios',
      descripcion:
        'Consulta el calendario del día y las franjas horarias ocupadas antes de reservar.',
      ruta: '/calendario',
      icono: 'bi-calendar3',
    },
  ];
}
