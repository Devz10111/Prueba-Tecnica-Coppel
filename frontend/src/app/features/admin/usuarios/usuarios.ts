import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  RolUsuario,
  UsuarioActualizarRequest,
  UsuarioAdmin,
} from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUsuarioService } from '../../../core/services/admin-usuario.service';
import { obtenerMensajeError } from '../../../core/utils/error.utils';

interface Notificacion {
  tipo: 'exito' | 'error';
  mensaje: string;
}

/** Pantalla para consultar y dar de alta usuarios desde el panel ADMIN. */
@Component({
  selector: 'app-admin-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class AdminUsuarios implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly usuariosApi = inject(AdminUsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly mostrarFormulario = signal(false);
  protected readonly idEdicion = signal<number | null>(null);
  protected readonly idConfirmarEliminacion = signal<number | null>(null);
  protected readonly eliminandoId = signal<number | null>(null);
  protected readonly errorLista = signal<string | null>(null);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly notificacion = signal<Notificacion | null>(null);
  protected readonly roles: RolUsuario[] = [
    'EMPLEADO',
    'JEFE_DEPARTAMENTO',
    'ADMIN',
  ];

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    departamento: ['', [Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    rol: this.fb.nonNullable.control<RolUsuario>('EMPLEADO', Validators.required),
  });

  ngOnInit(): void {
    this.cargarUsuarios();
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorFormulario.set(null));
  }

  /** Obtiene la lista sin exponer información de contraseñas. */
  protected cargarUsuarios(): void {
    this.cargando.set(true);
    this.errorLista.set(null);

    this.usuariosApi
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (usuarios) => this.usuarios.set(usuarios),
        error: (error: unknown) =>
          this.errorLista.set(obtenerMensajeError(error)),
      });
  }

  protected alternarFormulario(): void {
    if (this.mostrarFormulario()) {
      this.cancelarAlta();
      return;
    }
    this.mostrarFormulario.set(true);
    this.notificacion.set(null);
  }

  protected cancelarAlta(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(null);
    this.errorFormulario.set(null);
    this.formulario.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(72),
    ]);
    this.formulario.reset({
      nombre: '',
      email: '',
      departamento: '',
      password: '',
      rol: 'EMPLEADO',
    });
  }

  protected editarUsuario(usuario: UsuarioAdmin): void {
    this.idConfirmarEliminacion.set(null);
    this.idEdicion.set(usuario.id);
    this.errorFormulario.set(null);
    this.notificacion.set(null);
    this.formulario.controls.password.clearValidators();
    this.formulario.controls.password.updateValueAndValidity();
    this.formulario.patchValue({
      nombre: usuario.nombre,
      email: usuario.email,
      departamento: usuario.departamento ?? '',
      password: '',
      rol: usuario.rol,
    });
    this.mostrarFormulario.set(true);
  }

  protected puedeEliminar(usuario: UsuarioAdmin): boolean {
    return usuario.email.toLowerCase() !==
      (this.auth.usuarioActual()?.email ?? '').toLowerCase();
  }

  protected confirmarEliminacion(usuario: UsuarioAdmin): void {
    this.idConfirmarEliminacion.set(usuario.id);
    this.notificacion.set(null);
  }

  protected cancelarEliminacion(): void {
    this.idConfirmarEliminacion.set(null);
  }

  protected eliminarUsuario(usuario: UsuarioAdmin): void {
    if (this.eliminandoId() !== null || !this.puedeEliminar(usuario)) {
      return;
    }

    this.eliminandoId.set(usuario.id);
    this.idConfirmarEliminacion.set(null);
    this.notificacion.set(null);

    this.usuariosApi
      .eliminar(usuario.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.eliminandoId.set(null)),
      )
      .subscribe({
        next: () => {
          this.usuarios.update((actuales) =>
            actuales.filter((actual) => actual.id !== usuario.id),
          );
          this.notificacion.set({
            tipo: 'exito',
            mensaje: `Se eliminó la cuenta de ${usuario.nombre}. Sus reservas e historial se conservaron.`,
          });
        },
        error: (error: unknown) =>
          this.notificacion.set({
            tipo: 'error',
            mensaje: obtenerMensajeError(error),
          }),
      });
  }

  protected crearUsuario(): void {
    if (this.enviando()) {
      return;
    }

    const email = this.formulario.controls.email.value.trim();
    const nombre = this.formulario.controls.nombre.value.trim();
    const departamento = this.formulario.controls.departamento.value.trim();
    this.formulario.controls.email.setValue(email);
    this.formulario.controls.nombre.setValue(nombre);
    this.formulario.controls.departamento.setValue(departamento);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { password, rol } = this.formulario.getRawValue();
    const idEdicion = this.idEdicion();
    const datosEdicion: UsuarioActualizarRequest = {
      nombre,
      email,
      departamento: departamento || null,
      rol,
    };
    const operacion = idEdicion === null
      ? this.usuariosApi.crear({
          nombre,
          email,
          departamento: departamento || null,
          password,
          rol,
        })
      : this.usuariosApi.actualizar(idEdicion, datosEdicion);

    this.enviando.set(true);
    this.errorFormulario.set(null);
    this.notificacion.set(null);

    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (usuario) => {
          this.usuarios.update((actuales) =>
            [...actuales.filter((actual) => actual.id !== usuario.id), usuario].sort((a, b) =>
              a.nombre.localeCompare(b.nombre),
            ),
          );
          this.cancelarAlta();
          this.notificacion.set({
            tipo: 'exito',
            mensaje: idEdicion === null
              ? 'El usuario se agregó correctamente.'
              : 'Los datos del usuario se actualizaron correctamente.',
          });
        },
        error: (error: unknown) =>
          this.errorFormulario.set(obtenerMensajeError(error)),
      });
  }

  protected mensajeError(
    campo: 'nombre' | 'email' | 'departamento' | 'password',
  ): string | null {
    const control = this.formulario.controls[campo];
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('email')) {
      return 'Escribe un correo electrónico válido.';
    }
    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (control.hasError('maxlength')) {
      return campo === 'password'
        ? 'La contraseña no puede exceder 72 caracteres.'
        : 'El campo no puede exceder 120 caracteres.';
    }
    return 'Revisa este campo.';
  }

  protected rolTexto(rol: RolUsuario): string {
    const etiquetas: Record<RolUsuario, string> = {
      ADMIN: 'Administrador',
      JEFE_DEPARTAMENTO: 'Jefe de departamento',
      EMPLEADO: 'Empleado',
    };
    return etiquetas[rol];
  }
}
