import { expect, test, type Page } from '@playwright/test';
import { FakeSupabase } from './fakeSupabase';

const EMAIL = 'radek@example.com';
const PASSWORD = 'tajneheslo1';
const SHOTS = process.env.E2E_SCREENSHOTS;
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function saveAndClose(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function go(page: Page, section: string) {
  await page.getByTestId(`nav-${section}`).click();
}

async function upload(page: Page, trigger: () => Promise<void>) {
  const chooser = page.waitForEvent('filechooser');
  await trigger();
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
}

function monthsAgo(months: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

async function signUp(page: Page) {
  await page.goto('./');
  await page.getByText('Nemáš účet? Zaregistruj sa').click();
  await page.getByTestId('signup-email').fill(EMAIL);
  await page.getByTestId('signup-password').fill(PASSWORD);
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('add-tank')).toBeVisible();
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('full flow: tank card, detail, plans, calendar, stock, help, photo, sign out', async ({ page }) => {
    const fake = new FakeSupabase();
    await fake.attach(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // --- wrong password, then register
    await page.goto('./');
    await page.getByTestId('signin-email').fill(EMAIL);
    await page.getByTestId('signin-password').fill(PASSWORD);
    await page.getByTestId('signin-submit').click();
    await expect(page.getByTestId('signin-error')).toHaveText('Nesprávny e-mail alebo heslo.');
    await page.getByText('Nemáš účet? Zaregistruj sa').click();
    await page.getByTestId('signup-email').fill(EMAIL);
    await page.getByTestId('signup-password').fill(PASSWORD);
    await page.getByTestId('signup-submit').click();

    // --- sidebar with all 10 sections is permanently visible on desktop
    for (const s of ['index', 'plan', 'water', 'stock', 'encyclopedia', 'analyze', 'faq', 'tips', 'calendar', 'settings']) {
      await expect(page.getByTestId(`nav-${s}`)).toBeVisible();
    }
    await expect(page.getByTestId('home-stats')).toContainText('0akvárií');
    await shot(page, '01-home-empty');

    // --- create a tank with photo, start date and volume
    await page.getByTestId('add-tank').click();
    await upload(page, () => page.getByTestId('tank-photo').click());
    await expect(page.getByText('Zmeniť fotku')).toBeVisible();
    await page.getByTestId('tank-name').fill('Radtur World');
    await page.getByTestId('tank-volume').fill('40');
    await page.getByTestId('tank-started').fill(monthsAgo(7));
    await saveAndClose(page, 'save-tank');

    // lands on the tank detail
    await expect(page.getByTestId('tank-title')).toHaveText('Radtur World');
    await expect(page.getByText('7 mesiacov · 40 l · Sladkovodné')).toBeVisible();
    expect(fake.tables.tanks[0].photo_path).toMatch(/\/tank-\d+\.png$/);

    // --- stock + maintenance log
    await page.getByTestId('add-fish').click();
    await page.getByTestId('fish-species').fill('Guppy');
    await page.getByTestId('fish-count').fill('6');
    await saveAndClose(page, 'save-fish');
    await expect(page.getByText('Osádka · 6')).toBeVisible();
    await expect(page.getByText('6× Guppy')).toBeVisible();

    await page.getByTestId('log-water-change').click();
    await expect(page.getByTestId('history-row')).toContainText('Výmena vody');
    await expect(page.getByText('Naposledy: dnes')).toBeVisible();

    // --- water test from the tank detail: bad ammonia is flagged
    await expect(page.getByTestId('tank-water')).toContainText('Zatiaľ nemerané');
    await page.getByTestId('tank-add-water').click();
    await page.getByTestId('save-water-test').click();
    await expect(page.getByRole('dialog').getByText('Vyplň aspoň jednu hodnotu.')).toBeVisible();
    await page.getByTestId('water-ph').fill('7,6');
    await page.getByTestId('water-nh3').fill('0,5');
    await page.getByTestId('water-temp_c').fill('25');
    await saveAndClose(page, 'save-water-test');
    await expect(page.getByTestId('tank-water')).toContainText('Amoniak NH₃ 0,5 mg/l – nebezpečné');
    await expect(page.getByTestId('history-row').first()).toContainText('Meranie vody');
    await expect(page.getByTestId('history-row').first()).toContainText('pH 7,6 · Teplota 25 °C · Amoniak 0,5 mg/l');

    // --- diary note
    await page.getByTestId('add-note').click();
    await page.getByTestId('note-text').fill('Pridal som 2 rastliny');
    await saveAndClose(page, 'save-note');
    await expect(page.getByTestId('history-row').first()).toContainText('PoznámkaPridal som 2 rastliny');
    await expect(page.getByTestId('history-row')).toHaveCount(3);
    await shot(page, '02-tank-detail');

    // --- care plan
    await go(page, 'plan');
    await page.getByTestId('add-feeding').click();
    await page.getByTestId('feeding-time').fill('07:30');
    await page.getByPlaceholder('Typ krmiva (napr. vločky)').fill('Vločky');
    await saveAndClose(page, 'save-schedule');
    await expect(page.getByText('07:30 · Radtur World')).toBeVisible();
    await page.getByTestId('add-cleaning').click();
    await page.getByRole('dialog').getByText('Čistenie filtra').click();
    await page.getByTestId('cleaning-interval').fill('14');
    await saveAndClose(page, 'save-schedule');
    await expect(page.getByText('Čistenie filtra · Radtur World')).toBeVisible();
    await page.getByTestId('add-lighting').click();
    await page.getByTestId('lighting-start').fill('10:00');
    await page.getByTestId('lighting-duration').fill('8');
    await saveAndClose(page, 'save-schedule');
    await expect(page.getByText('10:00–18:00 · Radtur World')).toBeVisible();

    // --- home card reflects everything
    await go(page, 'index');
    const card = page.getByTestId('tank-card');
    await expect(card).toContainText('Radtur World');
    await expect(card).toContainText('7 mesiacov · 40 l');
    await expect(card).toContainText('6× Guppy');
    await expect(card).toContainText('Výmena vodydnes');
    await expect(card).toContainText('Čistenie filtranezapísané');
    await expect(card).toContainText('Úlohy dnes1');
    await expect(card).toContainText('Hodnoty vodynebezpečné · dnes');
    await expect(page.getByTestId('home-stats')).toContainText('1akvárium40litrov6rýb1úloha dnes');
    await shot(page, '03-home-card');

    // logging the filter clean from the detail also completes the 14-day plan item
    await card.click();
    await page.getByTestId('log-filter-clean').click();
    await expect(page.getByText('Naposledy: dnes')).toHaveCount(2);
    const filterPlan = fake.tables.cleaning_schedules.find((c) => c.task_type === 'filter_clean')!;
    expect(new Date(String(filterPlan.next_due_at)).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);

    // --- calendar: mark feeding done
    await go(page, 'calendar');
    await expect(page.getByTestId('agenda-feeding')).toContainText('07:30');
    await page.getByTestId('agenda-feeding').getByTestId('mark-done').click();
    await expect(page.getByTestId('agenda-feeding')).toHaveCount(0);
    await go(page, 'index');
    await expect(page.getByTestId('tank-card')).toContainText('Úlohy dneshotovo ✓');

    // --- stock, help, upcoming sections
    await go(page, 'stock');
    await expect(page.getByTestId('stock-total')).toHaveText('Spolu 6 rýb v 1 akváriu');
    await go(page, 'faq');
    await page.getByText('Koľko mám kŕmiť?').click();
    await expect(page.getByText('Toľko, koľko ryby zjedia za 2–3 minúty', { exact: false })).toBeVisible();
    await go(page, 'tips');
    await expect(page.getByText('Na jedného samca daj 2–3 samice', { exact: false }).filter({ visible: true })).toBeVisible();
    // --- water values: verdict, second (good) test, chart, diary, delete
    await go(page, 'water');
    await expect(page.getByTestId('water-verdict')).toContainText('Nebezpečné hodnoty');
    await page.getByTestId('add-water-test').click();
    await page.getByTestId('water-ph').fill('abc');
    await page.getByTestId('save-water-test').click();
    await expect(page.getByRole('dialog').getByText('pH: zadaj číslo (napr. 7,5).')).toBeVisible();
    await page.getByTestId('water-ph').fill('7,8');
    await page.getByTestId('water-nh3').fill('0');
    await page.getByTestId('water-no3').fill('10');
    await page.getByTestId('water-note').fill('po výmene vody');
    await saveAndClose(page, 'save-water-test');
    await expect(page.getByTestId('water-verdict')).toContainText('Voda je v poriadku');
    await expect(page.getByTestId('tile-nh3')).toContainText('0 mg/lv poriadku');
    await expect(page.getByTestId('chart-readout-ph')).toContainText('7,8');
    await page.getByTestId('tile-no3').click();
    await expect(page.getByTestId('chart-readout-no3')).toContainText('10 mg/l');
    await expect(page.getByTestId('water-history-row')).toHaveCount(2);
    await expect(page.getByTestId('water-history-row').first()).toContainText('po výmene vody');
    await shot(page, '06-water');
    await page.getByTestId('water-history-row').first().getByLabel('Zmazať meranie').click();
    await expect(page.getByTestId('water-history-row')).toHaveCount(1);
    await expect(page.getByTestId('water-verdict')).toContainText('Nebezpečné hodnoty');
    expect(fake.tables.water_tests).toHaveLength(1);
    // --- encyclopedia: search, check against the tank, add to it
    await go(page, 'encyclopedia');
    await expect(page.getByTestId('species-card').first()).toBeVisible();
    await page.getByTestId('species-search').fill('neón');
    await expect(page.getByTestId('species-card')).toHaveCount(2);
    await page.getByTestId('species-card').first().click();
    const detail = page.getByTestId('species-detail');
    await expect(detail).toContainText('Paracheirodon innesi');
    await expect(page.getByTestId('species-count')).toHaveValue('8');
    await expect(detail).toContainText('Neónka obyčajná potrebuje aspoň 54 l (máš 40 l).');
    await expect(detail).toContainText('pH 7,6 je mimo rozsahu pre Neónka obyčajná (5–7,5).');
    await page.getByTestId('add-species-to-tank').click();
    await expect(detail).toContainText('Pridané: 8× do Radtur World.');
    await shot(page, '07-encyclopedia');
    await page.getByRole('dialog').getByLabel('Zavrieť').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await go(page, 'stock');
    await expect(page.getByTestId('stock-total')).toHaveText('Spolu 14 rýb v 1 akváriu');
    await expect(page.getByTestId('bioload').filter({ visible: true })).toContainText('155 %');
    await expect(page.getByTestId('compat-issue').filter({ visible: true }).first()).toContainText('Pozor');
    await expect(page.getByText('Neónka obyčajná potrebuje aspoň 54 l (máš 40 l).').filter({ visible: true })).toBeVisible();
    await shot(page, '08-stock');

    // --- photo analysis
    await go(page, 'analyze');
    await upload(page, () => page.getByText('Z galérie').click());
    await expect(page.getByText('AI analýza ešte nie je zapnutá', { exact: false })).toBeVisible();
    expect([...fake.storage.keys()].some((k) => /\/analysis-\d+\.png$/.test(k))).toBe(true);

    // --- edit tank name
    await go(page, 'index');
    await page.getByTestId('tank-card').click();
    await page.getByTestId('edit-tank').click();
    await page.getByTestId('tank-name').fill('Gigantic');
    await saveAndClose(page, 'save-tank');
    await expect(page.getByTestId('tank-title')).toHaveText('Gigantic');

    // --- sign out / in
    await go(page, 'settings');
    await expect(page.getByTestId('settings-email')).toHaveText(EMAIL);
    await page.getByTestId('sign-out').click();
    await page.getByTestId('signin-email').fill(EMAIL);
    await page.getByTestId('signin-password').fill(PASSWORD);
    await page.getByTestId('signin-submit').click();
    await expect(page.getByTestId('tank-card')).toContainText('Gigantic');

    // --- delete with confirmation
    await page.getByTestId('tank-card').click();
    await page.getByTestId('delete-tank').click();
    await page.getByText('Áno, zmazať').click();
    await expect(page.getByTestId('add-tank')).toBeVisible();
    await expect(page.getByTestId('tank-card')).toHaveCount(0);
    expect(fake.tables.fish).toHaveLength(0);
    expect(fake.tables.cleaning_schedules).toHaveLength(0);
    expect(fake.tables.water_tests).toHaveLength(0);

    expect(pageErrors).toEqual([]);
  });
});

test('phone: menu opens from the header and cards scroll sideways', async ({ page }) => {
  const fake = new FakeSupabase();
  await fake.attach(page);
  await signUp(page);

  for (const name of ['Radtur World', 'Gigantic']) {
    await page.getByTestId('add-tank').click();
    await page.getByTestId('tank-name').fill(name);
    await saveAndClose(page, 'save-tank');
    await expect(page.getByTestId('tank-title')).toHaveText(name);
    await page.getByTestId('back-to-tanks').click();
  }
  await expect(page.getByTestId('tank-card')).toHaveCount(2);
  await shot(page, '04-phone-home');

  await expect(page.getByTestId('nav-faq')).not.toBeInViewport();
  await page.getByLabel('Show navigation menu').click();
  await expect(page.getByTestId('nav-faq')).toBeInViewport();
  await shot(page, '05-phone-menu');
  await page.getByTestId('nav-faq').click();
  await expect(page.getByText('Ako často mám meniť vodu?')).toBeVisible();
});

test('registering an existing e-mail and short passwords give Slovak errors', async ({ page }) => {
  const fake = new FakeSupabase();
  fake.users.push({ id: 'u-existing', email: EMAIL, password: PASSWORD });
  await fake.attach(page);

  await page.goto('./sign-up');
  await page.getByTestId('signup-email').fill(EMAIL);
  await page.getByTestId('signup-password').fill('123');
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('signup-error')).toHaveText('Heslo musí mať aspoň 6 znakov.');
  await page.getByTestId('signup-password').fill(PASSWORD);
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('signup-error')).toHaveText('Tento e-mail je už zaregistrovaný. Prihlás sa.');
});

test('forgotten password: request the e-mail, open the link, set a new password', async ({ page, baseURL }) => {
  const fake = new FakeSupabase();
  fake.users.push({ id: 'u-radek', email: EMAIL, password: 'stareheslo' });
  await fake.attach(page);

  await page.goto('./');
  await page.getByTestId('signin-email').fill(EMAIL);
  await page.getByTestId('forgot-password-link').click();
  await expect(page.getByTestId('reset-email')).toHaveValue(EMAIL);
  await page.getByTestId('reset-submit').click();
  await expect(page.getByTestId('reset-sent')).toContainText(`Poslali sme e-mail na ${EMAIL}`);
  expect(fake.recoveryEmails).toEqual([{ email: EMAIL, redirectTo: baseURL }]);

  // the link from the e-mail lands on the app root with the recovery tokens in the hash
  await page.goto(`./${fake.recoveryHash(EMAIL)}`);
  await expect(page.getByTestId('new-password')).toBeVisible();
  await page.getByTestId('new-password').fill('noveheslo1');
  await page.getByTestId('new-password-confirm').fill('ineheslo');
  await page.getByTestId('save-new-password').click();
  await expect(page.getByText('Heslá sa nezhodujú.')).toBeVisible();
  await page.getByTestId('new-password-confirm').fill('noveheslo1');
  await page.getByTestId('save-new-password').click();
  await expect(page.getByTestId('add-tank')).toBeVisible();
  expect(fake.users[0].password).toBe('noveheslo1');

  // signs in with the new password afterwards
  await page.goto('./settings');
  await page.getByTestId('sign-out').click();
  await page.getByTestId('signin-email').fill(EMAIL);
  await page.getByTestId('signin-password').fill('noveheslo1');
  await page.getByTestId('signin-submit').click();
  await expect(page.getByTestId('add-tank')).toBeVisible();
});

test('an expired reset link explains what to do', async ({ page }) => {
  const fake = new FakeSupabase();
  await fake.attach(page);
  await page.goto('./#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expect(page.getByTestId('signin-error')).toHaveText('Odkaz z e-mailu už vypršal alebo bol použitý. Požiadaj o nový.');
});

test('phone tour: every screen has its aquarium photo, home has hero, greeting and tip', async ({ page }) => {
  const fake = new FakeSupabase();
  await fake.attach(page);
  await page.goto('./');
  await expect(page.getByTestId('backdrop-auth')).toBeAttached();
  await shot(page, 'm01-sign-in');
  await page.getByText('Nemáš účet? Zaregistruj sa').click();
  await page.getByTestId('signup-email').fill(EMAIL);
  await page.getByTestId('signup-password').fill(PASSWORD);
  await page.getByTestId('signup-submit').click();

  await expect(page.getByTestId('home-hero')).toContainText('AquaCare');
  await expect(page.getByTestId('home-greeting')).toHaveText(/^(Dobré ráno|Pekný deň|Dobrý večer|Dobrú noc) 👋$/);
  await expect(page.getByTestId('tip-of-day')).toContainText('Tip dňa');

  await page.getByTestId('add-tank').click();
  await page.getByTestId('tank-name').fill('Radtur World');
  await page.getByTestId('tank-volume').fill('40');
  await page.getByTestId('tank-started').fill(monthsAgo(1));
  await saveAndClose(page, 'save-tank');
  await page.getByTestId('add-fish').click();
  await page.getByTestId('fish-species').fill('gup');
  await page.getByTestId('species-suggestion').first().click();
  await expect(page.getByTestId('fish-species')).toHaveValue('Živorodka dúhová (Guppy)');
  await expect(page.getByTestId('fish-count')).toHaveValue('3');
  await saveAndClose(page, 'save-fish');
  await page.getByTestId('tank-add-water').click();
  await page.getByTestId('water-ph').fill('7,6');
  await page.getByTestId('water-kh').fill('12');
  await page.getByTestId('water-no3').fill('10');
  await saveAndClose(page, 'save-water-test');
  await expect(page.getByTestId('backdrop-tank')).toBeAttached();
  await shot(page, 'm03-tank');
  await page.getByTestId('back-to-tanks').click();
  await expect(page.getByTestId('tank-card')).toContainText('Radtur World');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, 'm02-home');

  for (const [route, theme] of [
    ['water', 'water'],
    ['stock', 'stock'],
    ['encyclopedia', 'encyclopedia'],
    ['plan', 'plan'],
    ['calendar', 'calendar'],
    ['tips', 'tips'],
    ['faq', 'faq'],
    ['analyze', 'analyze'],
    ['settings', 'settings'],
  ] as const) {
    await page.getByLabel('Show navigation menu').filter({ visible: true }).click();
    await page.getByTestId(`nav-${route}`).click();
    await expect(page.getByTestId(`backdrop-${theme}`)).toBeAttached();
    await page.waitForTimeout(300);
    await shot(page, `m-${route}`);
  }
  await page.getByLabel('Show navigation menu').filter({ visible: true }).click();
  await expect(page.getByTestId('nav-faq')).toBeInViewport();
  await page.waitForTimeout(500);
  await shot(page, 'm00-menu');
});
