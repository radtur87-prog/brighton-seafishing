# AquaCare 🐠

Mobilná appka (Expo / React Native) na starostlivosť o akváriové ryby:

- **Pripomienky** na kŕmenie a čistenie/výmenu vody (lokálne push notifikácie)
- **Evidencia akvárií a rýb**
- **AI analýza fotky** akvária – odfotíš nádrž/rybu, appka ju pošle na vyhodnotenie
  (čistota vody, zdravie rýb, riziká) a dostaneš textový report

## Stack

- [Expo](https://expo.dev) + Expo Router (`app/`)
- [Supabase](https://supabase.com) – auth, databáza (Postgres + RLS), storage pre fotky
- Supabase Edge Function (`supabase/functions/analyze-photo`) – server-side volanie Claude API
  (vision), aby API kľúč nebol nikdy v klientskej appke
- `expo-notifications` – lokálne pripomienky kŕmenia/čistenia
- `expo-image-picker` – fotenie / výber fotky z galérie

## Nastavenie

1. **Supabase projekt**
   - Vytvor projekt na [supabase.com](https://supabase.com)
   - V SQL editore spusti `supabase/migrations/0001_init.sql` (vytvorí tabuľky, RLS politiky
     a storage bucket `tank-photos`)
   - V Project Settings → API skopíruj `Project URL` a `anon public` kľúč

2. **Premenné prostredia**
   ```bash
   cp .env.example .env
   ```
   Doplň `EXPO_PUBLIC_SUPABASE_URL` a `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. **Edge Function pre AI analýzu fotky** (voliteľné, ale potrebné pre záložku „Analýza“)
   ```bash
   supabase functions deploy analyze-photo
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   Kľúč k Claude API získaš na [console.anthropic.com](https://console.anthropic.com).
   Bez nasadenej funkcie appka ostatné funkcie (pripomienky, evidencia akvárií) bude
   fungovať normálne, iba analýza fotky vráti chybu.

4. **Inštalácia a spustenie**
   ```bash
   npm install
   npm run dev
   ```

## Štruktúra

```
app/
  (auth)/        – prihlásenie, registrácia
  (tabs)/        – Prehľad, Akváriá, Plán, Analýza, Nastavenia
lib/             – Supabase klient, auth kontext, notifikácie, DB queries
types/database.ts – TypeScript typy zodpovedajúce DB schéme
supabase/
  migrations/    – SQL schéma (tabuľky + RLS + storage bucket)
  functions/     – Edge Function pre AI analýzu fotky
```

---

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/radtur87-prog/brighton-seafishing)
