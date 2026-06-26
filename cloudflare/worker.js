/**
 * CC Lions Evento raffle lead intake Worker.
 *
 * Pipeline:
 *   [Site] POST /  --->  [Worker]  --->  Supabase webhook (lead destination)
 *                                  --->  Meta Graph API (Conversions API "Lead" event)
 *
 * The Worker responds 202 immediately and continues fan-out via waitUntil(),
 * so the user never waits on Supabase or Meta. The Pixel "Lead" event fires
 * client-side with the same event_id, and Meta deduplicates server vs browser
 * via that id.
 *
 * Secrets (configure in Cloudflare dashboard → Worker → Settings → Variables):
 *   META_PIXEL_ID            e.g. 1651769449464779
 *   META_ACCESS_TOKEN        Meta Conversions API access token (EAA...)
 *   SUPABASE_WEBHOOK_URL     full URL incl. webhook path
 *   SUPABASE_WEBHOOK_TOKEN   value sent in Authorization: Bearer ...
 *
 * Plain variables:
 *   ALLOWED_ORIGINS          comma-separated list of accepted site origins
 */

const DEFAULT_ALLOWED_ORIGIN = "http://localhost:8080";
const DEFAULT_ALLOWED_ORIGINS = [
  DEFAULT_ALLOWED_ORIGIN,
  "http://localhost:5173",
  "http://localhost:4173",
];

export default {
  async fetch(request, env, ctx) {
    const origin = resolveCorsOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, origin);
    }

    const required = ["fullName", "whatsapp", "event_id"];
    for (const key of required) {
      if (!payload[key]) {
        return jsonResponse({ error: `Missing field: ${key}` }, 400, origin);
      }
    }

    const clientIp = request.headers.get("CF-Connecting-IP") || "";
    const userAgent = request.headers.get("User-Agent") || "";

    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    if (debug) {
      const [supabaseResult, capiResult] = await Promise.allSettled([
        sendToSupabase(env, payload),
        sendToMetaCAPI(env, payload, clientIp, userAgent),
      ]);
      return jsonResponse(
        {
          event_id: payload.event_id,
          supabase: serializeResult(supabaseResult),
          meta_capi: serializeResult(capiResult),
        },
        200,
        origin,
      );
    }

    ctx.waitUntil(
      Promise.allSettled([
        sendToSupabase(env, payload),
        sendToMetaCAPI(env, payload, clientIp, userAgent),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.error(
              `[fan-out ${i === 0 ? "Supabase" : "Meta CAPI"}] rejected:`,
              r.reason,
            );
          }
        });
      }),
    );

    return jsonResponse({ accepted: true, event_id: payload.event_id }, 202, origin);
  },
};

function serializeResult(r) {
  if (r.status === "fulfilled") return { ok: true };
  return { ok: false, error: String(r.reason).slice(0, 500) };
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function resolveCorsOrigin(request, env) {
  const configured = String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = request.headers.get("Origin");
  return requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] || DEFAULT_ALLOWED_ORIGIN;
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

async function sendToSupabase(env, payload) {
  const body = {
    nome: payload.fullName,
    telefone: payload.whatsapp,
    cidade_bairro: payload.cityNeighborhood,
    cidade: payload.city,
    bairro_condominio: payload.neighborhoodCondo,
    instagram: payload.instagramHandle,
    campanha: payload.campaign || "sorteio_camisa_autografada_ingresso_atletico_mineiro",
    premios: payload.prizes || ["camisa_autografada", "ingresso_jogo_atletico_mineiro"],
    data_entrada: payload.data_entrada,
    event_id: payload.event_id,
  };

  const response = await fetch(env.SUPABASE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_WEBHOOK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
  }
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function normalizeName(raw) {
  return String(raw || "").trim().toLowerCase();
}

function normalizeCity(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

async function sendToMetaCAPI(env, payload, clientIp, userAgent) {
  const eventTime = Math.floor(Date.now() / 1000);
  const sourceUrl = payload.source_url || `${DEFAULT_ALLOWED_ORIGIN}/`;

  const userData = {
    ph: [await sha256(normalizePhone(payload.whatsapp))],
    fn: [await sha256(normalizeName(payload.fullName))],
    country: [await sha256("br")],
  };

  if (payload.city) {
    userData.ct = [await sha256(normalizeCity(payload.city))];
  }
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;

  const event = {
    event_name: "Lead",
    event_time: eventTime,
    event_id: payload.event_id,
    event_source_url: sourceUrl,
    action_source: "website",
    user_data: userData,
  };

  const url = `https://graph.facebook.com/v18.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Meta CAPI ${response.status}: ${text.slice(0, 300)}`);
  }
}
