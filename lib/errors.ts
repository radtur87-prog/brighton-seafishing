const TRANSLATIONS: [RegExp, string][] = [
  [/(could not find the table|relation).*water_tests/i, 'V databáze chýba tabuľka pre hodnoty vody. Spusti v Supabase SQL súbor 0004_water_tests.sql.'],
  [/invalid login credentials/i, 'Nesprávny e-mail alebo heslo.'],
  [/email not confirmed/i, 'E-mail ešte nie je potvrdený. Otvor e-mail od Supabase, klikni na odkaz a potom sa prihlás.'],
  [/user already registered/i, 'Tento e-mail je už zaregistrovaný. Prihlás sa.'],
  [/password should be at least/i, 'Heslo musí mať aspoň 6 znakov.'],
  [/unable to validate email|invalid format|email address .* is invalid/i, 'Zadaj platnú e-mailovú adresu.'],
  [/rate limit|too many requests/i, 'Príliš veľa pokusov. Počkaj chvíľu a skús znova.'],
  [/failed to fetch|network request failed|load failed|networkerror/i, 'Nepodarilo sa spojiť so serverom. Skontroluj pripojenie na internet.'],
  [/jwt expired|invalid jwt|not authenticated|auth session missing/i, 'Prihlásenie vypršalo. Odhlás sa a prihlás znova.'],
];

/** Turns any thrown value (Error, Supabase error object, string) into a Slovak, user-facing message. */
export function errorMessage(e: unknown, fallback: string): string {
  const raw =
    typeof e === 'string'
      ? e
      : e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
        ? (e as { message: string }).message
        : '';
  if (!raw) return fallback;
  const match = TRANSLATIONS.find(([pattern]) => pattern.test(raw));
  return match ? match[1] : raw;
}
