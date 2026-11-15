import { expect, test } from '@playwright/test';

const espacios = [
  {
    id: 1,
    nombre: 'Sala de reuniones pequeña',
    capacidad: 8,
    descripcion: 'Sala para reuniones de equipo reducido',
  },
];

test('el empleado completa una solicitud de reserva y recibe su folio', async ({
  page,
}) => {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fecha = new Date(
    manana.getTime() - manana.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 10);

  await page.route('**/api/espacios', (route) =>
    route.fulfill({ json: espacios }),
  );
  await page.addInitScript(() => {
    localStorage.setItem('coppel_token', 'token-empleado-e2e');
    localStorage.setItem(
      'coppel_usuario',
      JSON.stringify({
        nombre: 'Prueba E2E',
        email: 'empleado.e2e@coppel.test',
        departamento: 'Calidad',
        rol: 'EMPLEADO',
        expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    );
  });
  await page.route('**/api/espacios/1/disponibilidad**', (route) =>
    route.fulfill({
      json: {
        espacioId: 1,
        espacio: espacios[0].nombre,
        fecha,
        horaApertura: '08:00:00',
        horaCierre: '20:00:00',
        ocupados: [],
      },
    }),
  );

  let solicitudEnviada: Record<string, unknown> | undefined;
  await page.route('**/api/reservas', async (route) => {
    solicitudEnviada = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        folio: '2026000456',
        espacioId: 1,
        espacio: espacios[0].nombre,
        capacidadEspacio: 8,
        fecha,
        horaInicio: '10:00:00',
        horaFin: '11:00:00',
        duracionMinutos: 60,
        solicitante: 'Prueba E2E',
        departamento: 'Calidad',
        descripcion: 'Validación automática del flujo',
        estado: 'PENDIENTE',
        creadaEn: new Date().toISOString(),
        historial: [],
      },
    });
  });

  await page.goto('/reservar');
  await page.getByRole('button', { name: 'Abrir o cerrar el menú' }).click();
  await expect(page.getByRole('link', { name: 'Consultar' })).toBeVisible();
  await page
    .getByRole('radio', { name: 'Seleccionar Sala de reuniones pequeña' })
    .check();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Fecha').fill(fecha);
  await page.getByLabel('Hora de inicio').fill('10:00');
  await page.getByLabel('Hora de fin').fill('11:00');
  await expect(page.getByText('Horario disponible. Puedes continuar.')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await expect(page.getByLabel('Solicitante')).toHaveValue('Prueba E2E');
  await expect(page.getByLabel('Solicitante')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Departamento')).toHaveValue('Calidad');
  await expect(page.getByLabel('Departamento')).toHaveAttribute('readonly', '');
  await page
    .getByLabel('Descripción del evento')
    .fill('Validación automática del flujo');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(
    page.getByRole('heading', { name: 'Reserva exitosa' }),
  ).toBeVisible();
  await expect(page.getByText('2026000456')).toBeVisible();
  expect(solicitudEnviada).toMatchObject({
    espacioId: 1,
    fecha,
    horaInicio: '10:00',
    horaFin: '11:00',
  });
  expect(solicitudEnviada).not.toHaveProperty('solicitante');
  expect(solicitudEnviada).not.toHaveProperty('departamento');
});
