import { RolUsuario } from './auth.model';

/** Datos de cuenta que el backend expone en el panel (sin contraseña ni hash). */
export interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  departamento: string | null;
  rol: RolUsuario;
}

/** Campos que se envían al crear una cuenta. */
export interface UsuarioCrearRequest {
  nombre: string;
  email: string;
  departamento: string | null;
  password: string;
  rol: RolUsuario;
}

/** Campos editables de una cuenta, sin incluir ni modificar su contraseña. */
export interface UsuarioActualizarRequest {
  nombre: string;
  email: string;
  departamento: string | null;
  rol: RolUsuario;
}
