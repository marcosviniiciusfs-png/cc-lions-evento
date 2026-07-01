/**
 * CC Lions Evento raffle lead intake Worker.
 *
 * Pipeline:
 *   [Site] POST /  --->  [Worker]  --->  GitHub repository archive
 *                                  --->  Supabase webhook (lead destination)
 *                                  --->  Meta Graph API (Conversions API "Lead" event)
 *
 * The Worker waits for GitHub and Supabase before confirming the form
 * submission, then continues Meta fan-out via waitUntil().
 *
 * Secrets (configure in Cloudflare dashboard → Worker → Settings → Variables):
 *   GITHUB_LEADS_TOKEN      GitHub token with repo contents write access
 *   META_PIXEL_ID           e.g. 1651769449464779
 *   META_ACCESS_TOKEN       Meta Conversions API access token (EAA...)
 *   SUPABASE_WEBHOOK_URL    full URL incl. webhook path
 *   SUPABASE_WEBHOOK_TOKEN  value sent in Authorization: Bearer ...
 *
 * Plain variables:
 *   ALLOWED_ORIGINS          comma-separated list of accepted site origins
 *   GITHUB_LEADS_OWNER       default: marcosviniiciusfs-png
 *   GITHUB_LEADS_REPO        default: cc-lions-evento
 *   GITHUB_LEADS_BRANCH      default: main
 *   GITHUB_LEADS_DIR         default: leads
 *   GITHUB_LEADS_ALLOW_PUBLIC set to "true" only if public lead files are intended
 */

const DEFAULT_ALLOWED_ORIGIN = "http://localhost:8080";
const DEFAULT_ALLOWED_ORIGINS = [
  DEFAULT_ALLOWED_ORIGIN,
  "http://localhost:5173",
  "http://localhost:4173",
  "https://cclionsevento.simulead.com.br",
  "http://cclionsevento.simulead.com.br",
  "https://marcosviniiciusfs-png.github.io",
];
const DEFAULT_GITHUB_LEADS_OWNER = "marcosviniiciusfs-png";
const DEFAULT_GITHUB_LEADS_REPO = "cc-lions-evento";
const DEFAULT_GITHUB_LEADS_BRANCH = "main";
const DEFAULT_GITHUB_LEADS_DIR = "leads";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_USER_AGENT = "cc-lions-evento-lead-worker";

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
    const receivedAt = new Date().toISOString();

    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    if (debug) {
      const [githubResult, supabaseResult, capiResult] = await Promise.allSettled([
        createLeadArchive(env, payload, { receivedAt, origin }),
        sendToSupabase(env, payload),
        sendToMetaCAPI(env, payload, clientIp, userAgent),
      ]);
      return jsonResponse(
        {
          event_id: payload.event_id,
          github_archive: serializeResult(githubResult),
          supabase: serializeResult(supabaseResult),
          meta_capi: serializeResult(capiResult),
        },
        200,
        origin,
      );
    }

    let githubArchive;
    try {
      githubArchive = await createLeadArchive(env, payload, { receivedAt, origin });
    } catch (err) {
      console.error("[GitHub Leads] rejected:", err);
      return jsonResponse({ error: "Lead archive failed" }, 502, origin);
    }

    let supabaseResult;
    try {
      supabaseResult = await sendToSupabase(env, payload);
    } catch (err) {
      console.error("[Supabase] rejected:", err);
      ctx.waitUntil(
        updateLeadArchive(env, githubArchive, payload, {
          status: "supabase_failed",
          supabase_error: String(err).slice(0, 500),
        }).catch((archiveErr) => {
          console.error("[GitHub Leads] failed to mark Supabase rejection:", archiveErr);
        }),
      );
      return jsonResponse({ error: "Lead destination failed" }, 502, origin);
    }

    ctx.waitUntil(
      Promise.all([
        updateLeadArchive(env, githubArchive, payload, {
          status: "accepted",
          supabase: {
            ok: true,
            lead_id: supabaseResult?.lead_id,
            response: supabaseResult,
          },
        }).catch((err) => {
          console.error("[GitHub Leads] failed to update delivery proof:", err);
        }),
        sendToMetaCAPI(env, payload, clientIp, userAgent).catch((err) => {
          console.error("[Meta CAPI] rejected:", err);
        }),
      ]),
    );

    return jsonResponse(
      {
        accepted: true,
        event_id: payload.event_id,
        lead_id: supabaseResult?.lead_id,
        lead_archive_path: githubArchive.path,
      },
      200,
      origin,
    );
  },
};

function serializeResult(r) {
  if (r.status === "fulfilled") return { ok: true, value: summarizeResultValue(r.value) };
  return { ok: false, error: String(r.reason).slice(0, 500) };
}

function summarizeResultValue(value) {
  if (!value || typeof value !== "object") return value ?? null;
  return {
    path: value.path,
    html_url: value.html_url,
    lead_id: value.lead_id,
  };
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

async function createLeadArchive(env, payload, requestMeta) {
  const target = resolveGitHubTarget(env);
  await ensureGitHubArchiveAllowed(env, target);

  const record = buildLeadArchiveRecord(payload, {
    receivedAt: requestMeta.receivedAt,
    status: "received",
    origin: requestMeta.origin,
  });
  const path = leadArchivePath(target.dir, requestMeta.receivedAt, payload.event_id);

  const result = await putGitHubFile(env, target, {
    path,
    record,
    message: `Archive lead ${payload.event_id}`,
  });

  return {
    ...target,
    path,
    origin: requestMeta.origin,
    receivedAt: requestMeta.receivedAt,
    sha: result?.content?.sha,
    html_url: result?.content?.html_url,
  };
}

async function updateLeadArchive(env, archive, payload, delivery) {
  if (!archive?.path || !archive?.sha) return null;

  const record = buildLeadArchiveRecord(payload, {
    receivedAt: archive.receivedAt,
    status: delivery.status,
    origin: archive.origin,
    delivery,
  });

  return putGitHubFile(env, archive, {
    path: archive.path,
    sha: archive.sha,
    record,
    message: `Update lead ${payload.event_id}`,
  });
}

function buildLeadArchiveRecord(payload, details) {
  return {
    schema_version: 1,
    source: "cc-lions-evento",
    status: details.status,
    received_at: details.receivedAt,
    updated_at: new Date().toISOString(),
    request_origin: details.origin || null,
    lead: payload,
    delivery: details.delivery || null,
  };
}

function resolveGitHubTarget(env) {
  return {
    owner: cleanPathPart(env.GITHUB_LEADS_OWNER || DEFAULT_GITHUB_LEADS_OWNER),
    repo: cleanPathPart(env.GITHUB_LEADS_REPO || DEFAULT_GITHUB_LEADS_REPO),
    branch: cleanPathPart(env.GITHUB_LEADS_BRANCH || DEFAULT_GITHUB_LEADS_BRANCH),
    dir: cleanPath(env.GITHUB_LEADS_DIR || DEFAULT_GITHUB_LEADS_DIR),
  };
}

async function ensureGitHubArchiveAllowed(env, target) {
  const response = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.repo}`,
    { headers: githubHeaders(env) },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub repo check ${response.status}: ${text.slice(0, 300)}`);
  }

  const repo = await response.json();
  if (repo.private === false && env.GITHUB_LEADS_ALLOW_PUBLIC !== "true") {
    throw new Error(
      "Refusing to archive personal lead data into a public GitHub repo without GITHUB_LEADS_ALLOW_PUBLIC=true",
    );
  }
}

async function putGitHubFile(env, target, file) {
  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${file.path}`;
  const body = {
    message: file.message,
    branch: target.branch,
    content: base64EncodeUtf8(`${JSON.stringify(file.record, null, 2)}\n`),
  };
  if (file.sha) body.sha = file.sha;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...githubHeaders(env),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) return response.json();

    const text = await response.text().catch(() => "");
    if ((response.status === 409 || response.status === 422) && attempt < 3) {
      await sleep(attempt * 250);
      continue;
    }
    throw new Error(`GitHub archive ${response.status}: ${text.slice(0, 300)}`);
  }

  throw new Error("GitHub archive failed after retries");
}

function githubHeaders(env) {
  if (!env.GITHUB_LEADS_TOKEN) {
    throw new Error("Missing GITHUB_LEADS_TOKEN secret");
  }

  return {
    Authorization: `Bearer ${env.GITHUB_LEADS_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": GITHUB_USER_AGENT,
  };
}

function leadArchivePath(dir, receivedAt, eventId) {
  const date = receivedAt.slice(0, 10);
  const timestamp = receivedAt.replace(/[:.]/g, "-");
  return `${dir}/${date}/${timestamp}-${cleanPathPart(eventId || "lead")}.json`;
}

function cleanPath(value) {
  return String(value || DEFAULT_GITHUB_LEADS_DIR)
    .split("/")
    .map(cleanPathPart)
    .filter(Boolean)
    .join("/") || DEFAULT_GITHUB_LEADS_DIR;
}

function cleanPathPart(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function base64EncodeUtf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToSupabase(env, payload) {
  if (!env.SUPABASE_WEBHOOK_URL) {
    throw new Error("Missing SUPABASE_WEBHOOK_URL secret");
  }

  const body = {
    nome: payload.fullName,
    telefone: payload.whatsapp,
    city: payload.city,
    cidade: payload.city,
    bairro_condominio: payload.neighborhoodCondo,
    instagram: payload.instagramHandle,
    campanha: payload.campaign || "sorteio_camisa_oficial_ingresso_atletico_mineiro",
    premios: payload.prizes || ["camisa_oficial_atletico_mineiro", "ingresso_jogo_atletico_mineiro"],
    data_entrada: payload.data_entrada,
    event_id: payload.event_id,
    source_url: payload.source_url,
  };

  const headers = { "Content-Type": "application/json" };
  if (env.SUPABASE_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.SUPABASE_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(env.SUPABASE_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    const result = JSON.parse(text);
    if (result?.success === false) {
      throw new Error(`Supabase success=false: ${JSON.stringify(result).slice(0, 200)}`);
    }
    return result;
  } catch (err) {
    if (err instanceof SyntaxError) return { raw: text.slice(0, 200) };
    throw err;
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
