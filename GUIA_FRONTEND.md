# Guía para explicar el frontend

Este documento sirve como apoyo para presentar la aplicación Angular de reservas de espacios. El frontend es una SPA (aplicación de página única): Angular cambia las pantallas sin recargar todo el sitio y consume la API REST de Spring Boot.

## 1. Arquitectura de carpetas

```text
frontend/
├── public/
│   └── logo.png
└── src/
    ├── main.ts
    ├── styles.css
    └── app/
        ├── app.ts
        ├── app.config.ts
        ├── app.routes.ts
        ├── core/
        │   ├── config/       URL base de la API
        │   ├── guards/       Protección de rutas
        │   ├── interceptors/ Token y manejo de 401
        │   ├── models/       Tipos de solicitudes y respuestas
        │   ├── services/     Comunicación HTTP con el backend
        │   └── utils/        Validaciones, fechas, horas y errores
        ├── features/
        │   ├── inicio/
        │   ├── reserva/
        │   ├── consulta/
        │   ├── calendario/
        │   ├── auth/login/
        │   └── admin/reservas/
        └── shared/
            └── components/layout/
```

### ¿Qué responsabilidad tiene cada parte?

- **`features/`** agrupa las pantallas por función. Cada pantalla tiene su componente TypeScript, plantilla HTML y estilos.
- **`core/services/`** contiene servicios reutilizables que conocen las rutas HTTP de la API. Los componentes no construyen esas URLs por su cuenta.
- **`core/models/`** define los tipos TypeScript de los datos enviados y recibidos.
- **`core/utils/`** concentra reglas y transformaciones compartidas, por ejemplo, validar horarios y mostrar fechas.
- **`shared/components/layout/`** contiene el encabezado, navegación, pie de página y el espacio donde aparece la pantalla activa.
- **`app.routes.ts`** relaciona cada URL con su pantalla. Las pantallas se cargan bajo demanda con `loadComponent`.
- **`app.config.ts`** registra el Router, `HttpClient` y el interceptor al iniciar Angular.
- **`main.ts`** inicia la aplicación con `bootstrapApplication`; no se necesita un `AppModule`.

## 2. Conceptos de Angular utilizados

### Componentes standalone

Las pantallas son componentes independientes. Declaran directamente en `imports` las directivas y módulos que usan, como `ReactiveFormsModule` o `RouterLink`. No se agrupan en NgModules.

### Rutas y navegación

Angular Router conecta rutas como `/reservar` y `/calendario` con sus componentes. El `Layout` contiene un `<router-outlet>` donde Router inserta la pantalla actual. `loadComponent` separa las pantallas en archivos que se descargan cuando se visitan.

`/admin` redirige a la gestión de reservas. Un `adminGuard` protege esa sección y las rutas desconocidas redirigen a una pantalla existente.

### Servicios e inyección de dependencias

Un servicio separa la comunicación con el backend de la presentación. Por ejemplo, `ReservaService` envía y consulta reservas; `EspacioService` obtiene espacios y disponibilidad.

Los servicios se registran normalmente con `providedIn: 'root'` y se obtienen mediante `inject()`. Angular administra sus dependencias, como `HttpClient`, y comparte una instancia durante la aplicación.

### Formularios reactivos

El formulario de reserva usa `FormBuilder`, `FormGroup`, controles y validadores. Esto permite:

- conservar los datos al avanzar y regresar entre los cuatro pasos;
- mostrar errores de campos obligatorios y formatos incorrectos;
- validar reglas de negocio, duración y disponibilidad antes de enviar.

Las validaciones que dependen de varias horas o de la disponibilidad se calculan con utilidades compartidas y se vuelven a validar en el servidor.

### Interceptor HTTP

`authInterceptor` es una función que se ejecuta en las solicitudes de `HttpClient`. Solo añade `Authorization: Bearer ...` a URLs del backend bajo `/api/admin`. Si una de esas solicitudes responde 401, limpia la sesión y redirige al login; después vuelve a propagar el error para que la pantalla también pueda mostrarlo.

### Guardas de rutas

`adminGuard` consulta `AuthService` antes de permitir el acceso a `/admin/**`. Si no hay sesión válida, devuelve una `UrlTree` que lleva a `/admin/login` y conserva la URL solicitada para regresar a ella después del login.

### Signals y Observables

- **Signals** guardan estado de interfaz que cambia, por ejemplo, la lista, el indicador de carga y el usuario de sesión. Angular actualiza la plantilla cuando cambia un signal.
- **Observables** representan resultados asíncronos de `HttpClient` y cambios de formularios. Los componentes se suscriben para manejar respuestas o errores.
- Operadores de RxJS como `finalize` apagan indicadores de carga al terminar una petición y `takeUntilDestroyed` evita conservar suscripciones cuando se destruye un componente.

## 3. Flujo de una petición de la pantalla al backend

Ejemplo: una persona crea una reserva.

1. En `/reservar`, el componente `Reserva` recopila y valida los datos con un formulario reactivo.
2. Al confirmar, el componente llama a `ReservaService.crear()`.
3. El servicio usa `HttpClient` y la URL base definida en `core/config/api.config.ts` para enviar `POST http://localhost:8080/api/reservas`.
4. Angular envía el JSON al controlador de Spring Boot. El controlador valida el DTO y delega las reglas al servicio del backend, que persiste la reserva mediante el repositorio.
5. El backend responde con el folio y los datos de la reserva. El componente muestra la confirmación; si hay un error, muestra el mensaje y permite corregir o reintentar.

En las operaciones administrativas se suma el interceptor:

1. `ReservasAdmin` llama a `AdminReservaService`.
2. La solicitud a `/api/admin/...` pasa por `authInterceptor`, que agrega el token Bearer.
3. Spring Security verifica el token y el rol antes de ejecutar la operación.
4. La pantalla actualiza sus datos al recibir la respuesta; los errores HTTP se convierten en mensajes para la persona usuaria.

El flujo general es:

```text
Componente → Servicio Angular → HttpClient → Interceptor (si es /api/admin)
           → Controlador Spring → Servicio de negocio → Repositorio/BD
           ← respuesta JSON o error HTTP ←
```

## 4. Pantallas que puedes presentar

| Ruta | Qué explicar |
|---|---|
| `/` | Menú de acceso a las funciones públicas |
| `/reservar` | Captura de una reserva en cuatro pasos, validación y confirmación con folio |
| `/consultar` | Búsqueda por folio, estado e historial |
| `/calendario` | Disponibilidad por espacio y fecha |
| `/admin/login` | Inicio de sesión administrativo y manejo de errores |
| `/admin/reservas` | Filtros, detalle e historial; aprobar, rechazar, modificar y cancelar según rol |

## 5. Comandos útiles

Desde PowerShell, en la raíz del repositorio:

```powershell
cd frontend
npm install
npm start
```

`npm start` ejecuta `ng serve`. También se puede iniciar directamente con `npx ng serve`. La aplicación queda en `http://localhost:4200` y requiere que el backend esté disponible en `http://localhost:8080`.

Para compilar y ejecutar las pruebas unitarias:

```powershell
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## 6. Resumen para la exposición

> “El frontend está dividido en componentes standalone por pantalla. Angular Router navega entre ellas y carga cada pantalla bajo demanda. Los componentes usan servicios para comunicarse con la API mediante HttpClient; los formularios reactivos y las utilidades aplican las validaciones del cliente. Para administración, un guard protege las rutas y un interceptor agrega el token solo a las solicitudes protegidas. Signals mantienen el estado visible y Observables manejan las respuestas asíncronas.”
