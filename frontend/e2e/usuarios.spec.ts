import { expect, test } from '@playwright/test';

test('ADMIN inicia sesión y crea un usuario desde la pestaña Usuarios', async ({
  page,
}) => {
  const usuarios: Array<{
    id: number;
    nombre: string;
    email: string;
    departamento: string | null;
    rol: string;
  }> = [
    {
      id: 1,
      nombre: 'Administrador de Reservas',
      email: 'admin@coppel.test',
      departamento: null,
      rol: 'ADMIN',
    },
  ];

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      json: {
        token: 'token-e2e',
        tipo: 'Bearer',
        expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        nombre: 'Administrador de Reservas',
        email: 'admin@coppel.test',
        departamento: null,
        rol: 'ADMIN',
      },
    }),
  );
  await page.route('**/api/admin/reservas**', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/espacios', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/admin/usuarios**', async (route) => {
    const metodo = route.request().method();
    if (metodo === 'GET') {
      await route.fulfill({ json: usuarios });
      return;
    }

    if (metodo === 'DELETE') {
      const id = Number(route.request().url().match(/\/(\d+)$/)?.[1]);
      const indice = usuarios.findIndex((usuario) => usuario.id === id);
      usuarios.splice(indice, 1);
      await route.fulfill({ status: 204 });
      return;
    }

    const body = route.request().postDataJSON() as {
      nombre: string;
      email: string;
      departamento: string | null;
      rol: string;
    };
    if (metodo === 'POST') {
      const nuevoUsuario = { id: 2, ...body };
      usuarios.push(nuevoUsuario);
      await route.fulfill({ status: 201, json: nuevoUsuario });
      return;
    }

    const id = Number(route.request().url().match(/\/(\d+)$/)?.[1]);
    const actualizado = { id, ...body };
    const indice = usuarios.findIndex((usuario) => usuario.id === id);
    usuarios[indice] = actualizado;
    await route.fulfill({ json: actualizado });
  });

  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('admin@coppel.test');
  await page.locator('#password').fill('Admin123!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL(/\/admin\/reservas$/);
  await page.getByRole('button', { name: 'Abrir o cerrar el menú' }).click();
  await expect(
    page.getByText('Hola, Administrador de Reservas', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(
    page.getByRole('heading', { name: 'Usuarios del sistema' }),
  ).toBeVisible();
  await expect(page.getByText('admin@coppel.test')).toBeVisible();

  await page.getByRole('button', { name: 'Agregar usuario' }).click();
  await page.getByLabel('Nombre completo').fill('Empleado E2E');
  await page.getByLabel('Correo electrónico').fill('empleado.e2e@coppel.test');
  await page.getByLabel('Departamento').fill('Sistemas');
  await page.getByLabel('Contraseña inicial').fill('ClaveE2E123');
  await page.getByLabel('Rol').selectOption('EMPLEADO');
  await page.getByRole('button', { name: 'Guardar usuario' }).click();

  await expect(
    page.getByRole('status').getByText('El usuario se agregó correctamente.'),
  ).toBeVisible();
  await expect(
    page.getByRole('row', { name: /Empleado E2E.*empleado\.e2e@coppel\.test.*Empleado/ }),
  ).toBeVisible();

  const filaEmpleado = page.getByRole('row', {
    name: /Empleado E2E.*empleado\.e2e@coppel\.test.*Sistemas.*Empleado/,
  });
  await filaEmpleado.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre completo').fill('Empleado actualizado');
  await page.getByLabel('Departamento').fill('Finanzas');
  await page.getByLabel('Rol').selectOption('JEFE_DEPARTAMENTO');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(
    page.getByRole('status').getByText('Los datos del usuario se actualizaron correctamente.'),
  ).toBeVisible();
  await expect(
    page.getByRole('row', {
      name: /Empleado actualizado.*empleado\.e2e@coppel\.test.*Finanzas.*Jefe de departamento/,
    }),
  ).toBeVisible();

  const filaActualizada = page.getByRole('row', {
    name: /Empleado actualizado.*empleado\.e2e@coppel\.test.*Finanzas.*Jefe de departamento/,
  });
  await filaActualizada.getByRole('button', { name: 'Eliminar' }).click();
  await expect(
    page.getByText(/¿Eliminar la cuenta de Empleado actualizado\?/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sí, eliminar' }).click();

  await expect(
    page.getByRole('status').getByText(
      'Se eliminó la cuenta de Empleado actualizado. Sus reservas e historial se conservaron.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('row', {
      name: /Empleado actualizado.*empleado\.e2e@coppel\.test/,
    }),
  ).toHaveCount(0);
});

test('un usuario EMPLEADO no puede entrar al módulo administrativo', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('coppel_token', 'token-empleado');
    localStorage.setItem(
      'coppel_usuario',
      JSON.stringify({
        nombre: 'Empleado',
        email: 'empleado@coppel.test',
        departamento: 'Sistemas',
        rol: 'EMPLEADO',
        expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );
  });

  await page.goto('/admin/usuarios');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('status')).toContainText(
    'No tienes permisos para acceder al panel de administración.',
  );
});

test('la barra se pliega antes de comprimir sus textos', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('coppel_token', 'token-admin');
    localStorage.setItem(
      'coppel_usuario',
      JSON.stringify({
        nombre: 'Administrador de Reservas',
        email: 'admin@coppel.test',
        departamento: null,
        rol: 'ADMIN',
        expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Abrir o cerrar el menú' });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(
    page.getByRole('link', { name: /Panel de administración/ }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1680, height: 900 });
  await expect(menu).toBeHidden();
  await expect(
    page.getByRole('link', { name: /Panel de administración/ }),
  ).toBeVisible();
  expect(
    await page.locator('nav').evaluate((nav) => nav.scrollWidth <= nav.clientWidth),
  ).toBe(true);
});

test('la barra conserva Nueva reserva y Consultar sin sesión y pide iniciar sesión', async ({
  page,
}) => {
  await page.goto('/');

  const nav = page.locator('nav');
  await page.getByRole('button', { name: 'Abrir o cerrar el menú' }).click();
  await expect(nav.getByRole('link', { name: /Nueva reserva/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Consultar' })).toBeVisible();

  await nav.getByRole('link', { name: /Nueva reserva/ }).click();
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Freservar$/);
  await expect(page.getByRole('status')).toContainText(
    'Inicia sesión para continuar.',
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir o cerrar el menú' }).click();
  await nav.getByRole('link', { name: 'Consultar' }).click();
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fconsultar$/);
  await expect(page.getByRole('status')).toContainText(
    'Inicia sesión para continuar.',
  );
});
