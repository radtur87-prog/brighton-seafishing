import { expect, test, type Page } from '@playwright/test';
import { FakeSupabase } from './fakeSupabase';

const EMAIL = 'radek@example.com';
const PASSWORD = 'tajneheslo1';
const SHOTS = process.env.E2E_SCREENSHOTS;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function saveAndClose(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

function tab(page: Page, name: string) {
  return page.getByRole('tab', { name: new RegExp(name) });
}

test('full AquaCare flow: account, tank, fish, plans, dashboard, photo, sign out', async ({ page }) => {
  const fake = new FakeSupabase();
  await fake.attach(page);

  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // --- unknown account shows a Slovak error
  await page.goto('/');
  await expect(page.getByText('AquaCare')).toBeVisible();
  await page.getByTestId('signin-email').fill(EMAIL);
  await page.getByTestId('signin-password').fill(PASSWORD);
  await page.getByTestId('signin-submit').click();
  await expect(page.getByTestId('signin-error')).toHaveText('Nesprávny e-mail alebo heslo.');
  await shot(page, '01-signin-error');

  // --- register -> lands on dashboard
  await page.getByText('Nemáš účet? Zaregistruj sa').click();
  await page.getByTestId('signup-email').fill(EMAIL);
  await page.getByTestId('signup-password').fill(PASSWORD);
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('dashboard-summary')).toHaveText('Na dnes máš všetko hotové 🎉');
  await shot(page, '02-dashboard-empty');

  // --- tank + fish
  await tab(page, 'Akváriá').click();
  await page.getByTestId('add-tank').click();
  await page.getByTestId('tank-name').fill('Obývačka');
  await page.getByPlaceholder('Objem v litroch (voliteľné)').fill('54');
  await saveAndClose(page, 'save-tank');
  await expect(page.getByText('Obývačka')).toBeVisible();
  await expect(page.getByText('Sladkovodné · 54 l', { exact: false })).toBeVisible();

  await page.getByTestId('tank-toggle').click();
  await expect(page.getByText('Zatiaľ žiadne ryby.')).toBeVisible();
  await page.getByTestId('add-fish').click();
  await page.getByTestId('fish-species').fill('Guppy');
  await page.getByPlaceholder('Počet kusov').fill('2');
  await saveAndClose(page, 'save-fish');
  await expect(page.getByText('2× Guppy')).toBeVisible();
  await shot(page, '03-tank-with-fish');

  // --- plans
  await tab(page, 'Plán').click();
  await expect(page.getByText('Pripomienky (notifikácie) fungujú v mobilnej appke', { exact: false })).toBeVisible();

  await page.getByTestId('add-feeding').click();
  await page.getByTestId('feeding-time').fill('07:30');
  await page.getByPlaceholder('Typ krmiva (napr. vločky)').fill('Vločky');
  await page.getByPlaceholder('Dávka (napr. štipka, zje za 2 min)').fill('štipka');
  await saveAndClose(page, 'save-schedule');
  await expect(page.getByText('07:30 · Obývačka')).toBeVisible();
  await expect(page.getByText('Každý deň').first()).toBeVisible();

  await page.getByTestId('add-cleaning').click();
  await page.getByTestId('cleaning-interval').fill('0');
  await page.getByTestId('save-schedule').click();
  await expect(page.getByText('Zadaj interval ako celé číslo od 1 do 365 dní.')).toBeVisible();
  await page.getByTestId('cleaning-interval').fill('7');
  await saveAndClose(page, 'save-schedule');
  await expect(page.getByText('Výmena vody · Obývačka')).toBeVisible();
  await expect(page.getByText('Každých 7 dní')).toBeVisible();

  await page.getByTestId('add-lighting').click();
  await page.getByTestId('lighting-start').fill('20:00');
  await page.getByTestId('lighting-duration').fill('6');
  await saveAndClose(page, 'save-schedule');
  await expect(page.getByText('20:00–02:00 · Obývačka')).toBeVisible();
  await expect(page.getByText('6 h svietenia')).toBeVisible();
  await shot(page, '04-plans');

  const cleaning = fake.tables.cleaning_schedules[0];
  const due = new Date(String(cleaning.next_due_at));
  expect(due.getHours()).toBe(9);
  expect(Math.round((due.getTime() - Date.now()) / 86_400_000)).toBeGreaterThanOrEqual(6);

  // --- dashboard: feeding + lighting today; make cleaning overdue to see it too
  cleaning.next_due_at = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await tab(page, 'Prehľad').click();
  await page.reload();
  await expect(page.getByTestId('dashboard-summary')).toHaveText('Úlohy na dnes: 2');
  await expect(page.getByTestId('agenda-feeding')).toContainText('07:30 · štipka');
  await expect(page.getByTestId('agenda-lighting')).toContainText('20:00–02:00');
  await expect(page.getByTestId('agenda-cleaning')).toContainText('Po termíne');
  await shot(page, '05-dashboard-tasks');

  await page.getByTestId('agenda-feeding').getByTestId('mark-done').click();
  await expect(page.getByTestId('agenda-feeding')).toHaveCount(0);
  await page.getByTestId('agenda-cleaning').getByTestId('mark-done').click();
  await expect(page.getByTestId('agenda-cleaning')).toHaveCount(0);
  await expect(page.getByTestId('agenda-lighting')).toBeVisible();

  // Done state survives a reload; cleaning moved a week ahead.
  await page.reload();
  await expect(page.getByTestId('dashboard-summary')).toHaveText('Na dnes máš všetko hotové 🎉');
  await expect(page.getByTestId('agenda-feeding')).toHaveCount(0);
  expect(new Date(String(fake.tables.cleaning_schedules[0].next_due_at)).getTime()).toBeGreaterThan(Date.now());
  expect(fake.tables.task_logs.map((l) => l.task_type).sort()).toEqual(['feeding', 'water_change']);

  // --- photo analysis: upload works, missing AI function is reported clearly
  await tab(page, 'Analýza').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Z galérie').click();
  await (await chooser).setFiles({
    name: 'akvarium.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    ),
  });
  await expect(page.getByText('AI analýza ešte nie je zapnutá', { exact: false })).toBeVisible();
  expect([...fake.storage.keys()][0]).toMatch(/^tank-photos\/[0-9a-f-]+\/\d+\.png$/);
  expect(fake.tables.photo_analyses[0].status).toBe('error');
  await shot(page, '06-analysis');

  // --- settings + sign out + sign back in
  await tab(page, 'Nastavenia').click();
  await expect(page.getByTestId('settings-email')).toHaveText(EMAIL);
  await expect(page.getByText('Dostupné len v mobilnej appke')).toBeVisible();
  await page.getByTestId('sign-out').click();
  await expect(page.getByTestId('signin-submit')).toBeVisible();

  await page.getByTestId('signin-email').fill(EMAIL);
  await page.getByTestId('signin-password').fill(PASSWORD);
  await page.getByTestId('signin-submit').click();
  await expect(page.getByTestId('dashboard-summary')).toBeVisible();

  // --- deleting the tank needs confirmation and removes its plans
  await tab(page, 'Akváriá').click();
  await page.getByLabel('Zmazať akvárium').click();
  await page.getByText('Áno, zmazať').click();
  await expect(page.getByText('Zatiaľ nemáš žiadne akvárium', { exact: false })).toBeVisible();
  expect(fake.tables.feeding_schedules).toHaveLength(0);
  expect(fake.tables.lighting_schedules).toHaveLength(0);

  await tab(page, 'Plán').click();
  await expect(page.getByText('Najprv pridaj akvárium', { exact: false })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('registering an existing e-mail and short passwords give Slovak errors', async ({ page }) => {
  const fake = new FakeSupabase();
  fake.users.push({ id: 'u-existing', email: EMAIL, password: PASSWORD });
  await fake.attach(page);

  await page.goto('/sign-up');
  await page.getByTestId('signup-email').fill(EMAIL);
  await page.getByTestId('signup-password').fill('123');
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('signup-error')).toHaveText('Heslo musí mať aspoň 6 znakov.');

  await page.getByTestId('signup-password').fill(PASSWORD);
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('signup-error')).toHaveText('Tento e-mail je už zaregistrovaný. Prihlás sa.');
});
