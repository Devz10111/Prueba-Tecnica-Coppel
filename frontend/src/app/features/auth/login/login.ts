import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { obtenerMensajeError } from '../../../core/utils/error.utils';

/**
 * Pantalla de inicio de sesión compartida por todos los roles.
 *
 * Flujo:
 * 1. Valida correo y contraseña con Reactive Forms.
 * 2. Envía las credenciales a AuthService (POST /api/auth/login).
 * 3. Si el login es correcto, regresa a la pantalla protegida que el usuario
 *    intentaba abrir (returnUrl) o a la gestión de reservas.
 * 4. Si falla, muestra el mensaje que devuelve la API.
 *
 * También muestra un aviso cuando el interceptor cierra la sesión porque
 * una petición protegida respondió 401.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  @ViewChild('emailInput') private emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Formulario reactivo con las dos credenciales.
   * `nonNullable` evita que los valores puedan ser null al enviarlos.
   */
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  /** Atajos para leer los controles desde la plantilla. */
  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  ngOnInit(): void {
    // Si ya hay una sesión válida, no tiene sentido mostrar el login.
    if (this.auth.estaAutenticado()) {
      void this.router.navigateByUrl(this.destinoSeguro(this.auth.obtenerRol()), {
        replaceUrl: true,
      });
      return;
    }

    const motivo = this.route.snapshot.queryParamMap.get('motivo');
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (motivo === 'sesion-expirada') {
      this.aviso.set('Tu sesión expiró. Inicia sesión nuevamente.');
    } else if (returnUrl) {
      this.aviso.set('Inicia sesión para continuar.');
    }
    const avisoGuardado = this.auth.consumirAviso();
    if (avisoGuardado) {
      this.aviso.set(avisoGuardado);
    }

    // Al escribir de nuevo se oculta el error anterior de la API.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.error()) {
          this.error.set(null);
        }
      });
  }

  /** Muestra u oculta la contraseña sin borrar lo que se escribió. */
  protected alternarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  /** Mensaje de validación del correo (solo después de tocarlo). */
  protected errorEmail(): string | null {
    const control = this.email;
    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Escribe tu correo electrónico.';
    }

    return 'Escribe un correo electrónico válido.';
  }

  /** Mensaje de validación de la contraseña (solo después de tocarla). */
  protected errorPassword(): string | null {
    const control = this.password;
    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Escribe tu contraseña.';
    }

    if (control.hasError('minlength')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    return 'Revisa la contraseña.';
  }

  /**
   * Envía el formulario al backend.
   * Mientras la petición está en curso se deshabilita el botón para evitar
   * envíos duplicados.
   */
  protected iniciarSesion(): void {
    if (this.enviando()) {
      return;
    }

    // Se quitan espacios accidentales antes de validar y de enviar.
    const { email, password } = this.form.getRawValue();
    const emailLimpio = email.trim();

    if (emailLimpio !== email) {
      this.form.controls.email.setValue(emailLimpio);
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los datos marcados en rojo.');
      const primerCampoInvalido = this.email.invalid
        ? this.emailInput
        : this.passwordInput;
      primerCampoInvalido?.nativeElement.focus();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.aviso.set(null);

    this.auth
      .login({
        email: emailLimpio,
        password,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          void this.router.navigateByUrl(this.destinoSeguro(respuesta.rol), {
            replaceUrl: true,
          });
        },
        error: (error: unknown) => {
          this.error.set(obtenerMensajeError(error));
        },
      });
  }

  /**
   * Mantiene rutas internas y evita que un empleado vuelva al panel administrativo.
   */
  private destinoSeguro(rol: string | null): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    const esRutaInterna = returnUrl.startsWith('/') && !returnUrl.startsWith('//');
    const esRutaAuth = returnUrl.startsWith('/login');
    const esRutaAdmin = returnUrl === '/admin' || returnUrl.startsWith('/admin/');
    const esAdmin = rol === 'ADMIN' || rol === 'JEFE_DEPARTAMENTO';

    if (esRutaInterna && !esRutaAuth && (!esRutaAdmin || esAdmin)) {
      return returnUrl === '/admin' ? '/admin/reservas' : returnUrl;
    }
    return esAdmin ? '/admin/reservas' : '/';
  }
}
