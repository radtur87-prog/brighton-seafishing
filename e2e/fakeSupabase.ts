import type { Page, Route } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const SUPABASE_URL = 'https://rkklwfhkfpezgniquasf.supabase.co';

type Row = Record<string, unknown>;

const TABLE_DEFAULTS: Record<string, () => Row> = {
  tanks: () => ({ notes: null, volume_liters: null, water_type: 'freshwater', created_at: new Date().toISOString() }),
  fish: () => ({ nickname: null, color: null, count: 1, added_at: new Date().toISOString() }),
  feeding_schedules: () => ({
    food_type: null,
    amount_note: null,
    enabled: true,
    notification_id: null,
    created_at: new Date().toISOString(),
  }),
  cleaning_schedules: () => ({
    last_done_at: null,
    enabled: true,
    notification_id: null,
    created_at: new Date().toISOString(),
  }),
  lighting_schedules: () => ({
    enabled: true,
    notification_on_id: null,
    notification_off_id: null,
    created_at: new Date().toISOString(),
  }),
  task_logs: () => ({ note: null, done_at: new Date().toISOString() }),
  photo_analyses: () => ({
    status: 'pending',
    summary: null,
    risk_level: null,
    findings: null,
    error_message: null,
    created_at: new Date().toISOString(),
  }),
};

const TANK_CHILDREN = ['fish', 'feeding_schedules', 'cleaning_schedules', 'lighting_schedules', 'task_logs', 'photo_analyses'];

// 1x1 transparent PNG used for signed photo URLs.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function base64url(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/** In-memory stand-in for the Supabase auth, PostgREST, storage and functions APIs. */
export class FakeSupabase {
  users: { id: string; email: string; password: string }[] = [];
  tables: Record<string, Row[]> = Object.fromEntries(Object.keys(TABLE_DEFAULTS).map((t) => [t, []]));
  storage = new Map<string, Buffer>();
  functionCalls = 0;

  async attach(page: Page) {
    await page.route(`${SUPABASE_URL}/**`, (route) => this.handle(route));
  }

  private session(user: { id: string; email: string }) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: user.id, email: user.email, role: 'authenticated', exp })}.sig`;
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: randomUUID(),
      user: this.userJson(user),
    };
  }

  private userJson(user: { id: string; email: string }) {
    return {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email' },
      user_metadata: {},
      identities: [{ id: user.id, provider: 'email' }],
      created_at: new Date().toISOString(),
    };
  }

  private userFromAuth(route: Route) {
    const auth = route.request().headers()['authorization'] ?? '';
    const payload = auth.replace(/^Bearer /, '').split('.')[1];
    if (!payload) return null;
    try {
      const { sub } = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return this.users.find((u) => u.id === sub) ?? null;
    } catch {
      return null;
    }
  }

  private async handle(route: Route) {
    const req = route.request();
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*',
      'access-control-expose-headers': '*',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    const url = new URL(req.url());
    const path = url.pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });

    // ---- auth
    if (path === '/auth/v1/signup') {
      const { email, password } = req.postDataJSON();
      if (this.users.some((u) => u.email === email)) {
        return json(422, { code: 'user_already_exists', message: 'User already registered' });
      }
      const user = { id: randomUUID(), email, password };
      this.users.push(user);
      return json(200, this.session(user));
    }
    if (path === '/auth/v1/token') {
      const { email, password } = req.postDataJSON();
      const user = this.users.find((u) => u.email === email && u.password === password);
      if (!user) return json(400, { code: 'invalid_credentials', message: 'Invalid login credentials' });
      return json(200, this.session(user));
    }
    if (path === '/auth/v1/user') {
      const user = this.userFromAuth(route);
      return user ? json(200, this.userJson(user)) : json(401, { message: 'invalid JWT' });
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });

    // ---- storage
    const signMatch = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(path);
    if (signMatch && req.method() === 'POST') {
      return json(200, { signedURL: `/object/sign/${signMatch[1]}/${signMatch[2]}?token=fake` });
    }
    if (signMatch && req.method() === 'GET') {
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: PIXEL_PNG });
    }
    const objectMatch = /^\/storage\/v1\/object\/([^/]+)\/(.+)$/.exec(path);
    if (objectMatch && req.method() === 'POST') {
      this.storage.set(`${objectMatch[1]}/${objectMatch[2]}`, req.postDataBuffer() ?? Buffer.alloc(0));
      return json(200, { Key: `${objectMatch[1]}/${objectMatch[2]}`, Id: randomUUID() });
    }

    // ---- edge functions (not deployed in the real project yet)
    if (path.startsWith('/functions/v1/')) {
      this.functionCalls++;
      return json(404, { code: 'NOT_FOUND', message: 'Requested function was not found' });
    }

    // ---- PostgREST
    const restMatch = /^\/rest\/v1\/([a-z_]+)$/.exec(path);
    if (restMatch) return this.handleRest(route, restMatch[1], url, json, cors);

    return json(404, { message: `fake supabase: unhandled ${req.method()} ${path}` });
  }

  private filterRows(rows: Row[], url: URL) {
    const reserved = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict']);
    let result = rows;
    for (const [key, raw] of url.searchParams) {
      if (reserved.has(key)) continue;
      const [op, ...rest] = raw.split('.');
      const value = rest.join('.');
      result = result.filter((row) => {
        const cell = row[key] === null || row[key] === undefined ? 'null' : String(row[key]);
        if (op === 'eq') return cell === value;
        if (op === 'gte') return cell >= value;
        if (op === 'lte') return cell <= value;
        return true;
      });
    }
    return result;
  }

  private async handleRest(
    route: Route,
    table: string,
    url: URL,
    json: (status: number, body: unknown) => Promise<void>,
    cors: Record<string, string>
  ) {
    const req = route.request();
    const rows = (this.tables[table] ??= []);
    const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const reply = (data: Row[]) => {
      if (wantsObject) {
        return data.length === 1
          ? json(200, data[0])
          : json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      }
      return json(200, data);
    };

    if (req.method() === 'GET') {
      let data = this.filterRows(rows, url);
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        data = [...data].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'desc' ? -1 : 1));
      }
      const limit = url.searchParams.get('limit');
      if (limit) data = data.slice(0, Number(limit));
      return reply(data);
    }

    if (req.method() === 'POST') {
      const body = req.postDataJSON();
      const inserted = (Array.isArray(body) ? body : [body]).map((r: Row) => ({
        id: randomUUID(),
        ...(TABLE_DEFAULTS[table]?.() ?? {}),
        ...r,
      }));
      rows.push(...inserted);
      return reply(inserted);
    }

    if (req.method() === 'PATCH') {
      const patch = req.postDataJSON();
      const matched = this.filterRows(rows, url);
      matched.forEach((row) => Object.assign(row, patch));
      return reply(matched);
    }

    if (req.method() === 'DELETE') {
      const matched = new Set(this.filterRows(rows, url));
      this.tables[table] = rows.filter((r) => !matched.has(r));
      if (table === 'tanks') {
        const ids = new Set([...matched].map((r) => r.id));
        for (const child of TANK_CHILDREN) {
          this.tables[child] = this.tables[child].filter((r) => !ids.has(r.tank_id));
        }
      }
      return route.fulfill({ status: 204, headers: cors });
    }

    return json(405, { message: 'method not allowed' });
  }
}
