/**
 * Roles que puede tener un usuario autenticado.
 * Coincide con el enum Rol del backend.
 */
export type RolUsuario = 'ADMIN' | 'JEFE_DEPARTAMENTO';

/**
 * Credenciales que se envían al endpoint de login.
 * Coincide con el DTO LoginRequest del backend.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Respuesta del login.
 * Coincide con el DTO LoginResponse del backend.
 *
 * - tipo: siempre "Bearer".
 * - expiraEn: fecha ISO con la hora exacta en que vence el token.
 * - rol: "ADMIN" o "JEFE_DEPARTAMENTO".
 */
export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: string;
  nombre: string;
  rol: RolUsuario;
}

/**
 * Datos del usuario que se guardan en el navegador para saber quién inició sesión.
 * Es un subconjunto de LoginResponse: el token se guarda por separado.
 */
export type DatosUsuarioSesion = Pick<LoginResponse, 'nombre' | 'rol' | 'expiraEn'>;
