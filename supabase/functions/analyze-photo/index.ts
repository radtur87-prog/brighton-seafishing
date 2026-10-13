// Supabase Edge Function: analyze-photo
//
// Deploy: supabase functions deploy analyze-photo
// Secrets needed (supabase secrets set ...):
//   ANTHROPIC_API_KEY   - Claude API key (never exposed to the client)
//   SUPABASE_URL              - auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY - auto-provided by Supabase
//
// The client calls this with { photo_analysis_id } for a row it already
// created (status = 'pending') pointing at a file in the `tank-photos`
// storage bucket. This function downloads the photo, asks Claude to look at
// it, writes the structured result back onto the row, and also returns it
// so the app can update its UI immediately without polling.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_SYSTEM_PROMPT = `Si skúsený akvarista a veterinárny poradca pre akváriové ryby.
Pozri sa na priloženú fotku akvária / rýb a vyhodnoť ju.
Všímaj si: čistotu a zákal vody, rast rias, viditeľné správanie a zdravotný stav rýb
(farba, plutvy, škvrny, plávanie, dýchanie), stav rastlín a dekorácií, prípadné
problémy so zariadením (filter, hadičky, teplomer).

Odpovedz IBA validným JSON objektom (bez markdown bloku) v tomto tvare:
{
  "summary": "1-3 vety zhrnutia situácie v slovenčine",
  "risk_level": "ok" | "watch" | "urgent",
  "findings": [
    { "label": "krátky názov pozorovania", "severity": "ok" | "watch" | "urgent", "detail": "1 veta vysvetlenia" }
  ]
}
Ak z fotky nevieš niečo posúdiť (napr. nie je vidieť vodu), napíš to do findings s severity "watch" a nehádaj si čísla.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { photo_analysis_id } = await req.json();
    if (!photo_analysis_id) {
      return jsonResponse({ error: 'Chýba photo_analysis_id' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: analysis, error: fetchError } = await supabaseAdmin
      .from('photo_analyses')
      .select('*')
      .eq('id', photo_analysis_id)
      .single();

    if (fetchError || !analysis) {
      return jsonResponse({ error: 'Záznam analýzy sa nenašiel.' }, 404);
    }

    if (!anthropicKey) {
      await markError(supabaseAdmin, photo_analysis_id, 'Na serveri chýba ANTHROPIC_API_KEY.');
      return jsonResponse({ error: 'Na serveri chýba ANTHROPIC_API_KEY.' }, 500);
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('tank-photos')
      .download(analysis.photo_path);

    if (downloadError || !fileData) {
      await markError(supabaseAdmin, photo_analysis_id, 'Nepodarilo sa stiahnuť fotku zo storage.');
      return jsonResponse({ error: 'Nepodarilo sa stiahnuť fotku.' }, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = base64Encode(arrayBuffer);
    const mediaType = guessMediaType(analysis.photo_path);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: 'Vyhodnoť túto fotku akvária podľa inštrukcií v system prompte.',
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      await markError(supabaseAdmin, photo_analysis_id, `Chyba AI API: ${errText.slice(0, 300)}`);
      return jsonResponse({ error: 'Chyba pri volaní AI API.' }, 502);
    }

    const claudeJson = await claudeResponse.json();
    const textBlock = claudeJson.content?.find((c: { type: string }) => c.type === 'text');
    const rawText: string = textBlock?.text ?? '';

    let parsed: { summary: string; risk_level: string; findings: unknown[] };
    try {
      parsed = JSON.parse(extractJson(rawText));
    } catch {
      await markError(supabaseAdmin, photo_analysis_id, 'AI odpoveď sa nepodarilo spracovať.');
      return jsonResponse({ error: 'AI odpoveď sa nepodarilo spracovať.' }, 500);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('photo_analyses')
      .update({
        status: 'done',
        summary: parsed.summary,
        risk_level: parsed.risk_level,
        findings: parsed.findings,
      })
      .eq('id', photo_analysis_id)
      .select()
      .single();

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    return jsonResponse(updated, 200);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Neznáma chyba.' }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function markError(
  supabaseAdmin: ReturnType<typeof createClient>,
  id: string,
  message: string
) {
  await supabaseAdmin
    .from('photo_analyses')
    .update({ status: 'error', error_message: message })
    .eq('id', id);
}

function guessMediaType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Claude sometimes wraps JSON in ```json fences despite instructions; strip them defensively. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return fenced ? fenced[1] : text.trim();
}
