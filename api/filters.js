// api/filters.js — CRUD des filtres URL dans Supabase, par utilisateur
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement requises :
//   SUPABASE_URL      → https://xxxx.supabase.co
//   SUPABASE_ANON_KEY → clé anon publique
//
// Migration DB à appliquer :
//   ALTER TABLE jb_filters ADD COLUMN IF NOT EXISTS user_id TEXT;
//   CREATE INDEX IF NOT EXISTS jb_filters_user_id_idx ON jb_filters(user_id);
//
// Tous les endpoints acceptent le header X-User-Id pour isoler les données.
// Sans ce header, on tombe sur les filtres "globaux" (user_id IS NULL).
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 10 };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Content-Type': 'application/json',
  };
}

function sbUrl(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

function sbHeaders(extra = {}) {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra,
  };
}

async function sbFetch(path, options = {}) {
  const res = await fetch(sbUrl(path), {
    ...options,
    headers: { ...sbHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  if (res.status === 204) return [];
  return res.json();
}

// Construit le filtre user_id pour les requêtes Supabase
function userFilter(userId) {
  if (!userId) return 'user_id=is.null';
  return `user_id=eq.${encodeURIComponent(userId)}`;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL ou SUPABASE_ANON_KEY manquant' }),
      { status: 500, headers: corsHeaders() }
    );
  }

  // Récupère l'identifiant utilisateur depuis le header
  const userId = req.headers.get('x-user-id') ?? null;

  try {
    // ── GET /api/filters → liste les filtres de l'utilisateur ───────────────
    if (req.method === 'GET') {
      const filters = await sbFetch(`jb_filters?${userFilter(userId)}&order=created_at.asc`);
      const mapped = filters.map(f => ({
        id:          f.id,
        url:         f.url,
        label:       f.label ?? null,
        enabled:     f.enabled,
        lastScraped: f.last_scraped ?? null,
        jobCount:    f.job_count ?? null,
      }));
      return new Response(JSON.stringify(mapped), { status: 200, headers: corsHeaders() });
    }

    // ── POST /api/filters → ajoute un filtre ────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json();
      const { id, url, label, enabled = true } = body;
      if (!id || !url) {
        return new Response(JSON.stringify({ error: 'id et url requis' }), { status: 400, headers: corsHeaders() });
      }
      const [created] = await sbFetch('jb_filters', {
        method: 'POST',
        body: JSON.stringify({ id, url, label: label ?? null, enabled, user_id: userId }),
      });
      return new Response(JSON.stringify(created), { status: 201, headers: corsHeaders() });
    }

    // ── PUT /api/filters → remplace TOUTE la liste de l'utilisateur ─────────
    if (req.method === 'PUT') {
      const body = await req.json();
      const filters = body.filters ?? [];

      if (filters.length > 0) {
        await sbFetch('jb_filters?on_conflict=id', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(filters.map(f => ({
            id:      f.id,
            url:     f.url,
            label:   f.label ?? null,
            enabled: f.enabled,
            user_id: userId,
          }))),
        });
      }

      // Supprime les filtres qui ne sont plus dans la liste (pour cet utilisateur uniquement)
      const ids = filters.map(f => f.id);
      if (ids.length > 0) {
        await sbFetch(`jb_filters?${userFilter(userId)}&id=not.in.(${ids.join(',')})`, { method: 'DELETE' });
      } else {
        await sbFetch(`jb_filters?${userFilter(userId)}`, {
          method: 'DELETE',
          headers: { 'Prefer': 'return=minimal' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }

    // ── DELETE /api/filters?id=xxx → supprime un filtre de l'utilisateur ────
    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'id requis' }), { status: 400, headers: corsHeaders() });
      }
      await sbFetch(`jb_filters?id=eq.${encodeURIComponent(id)}&${userFilter(userId)}`, { method: 'DELETE' });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
    }

    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers: corsHeaders() });

  } catch (err) {
    console.error('[filters]', err);
    return new Response(
      JSON.stringify({ error: err.message ?? 'Erreur inconnue' }),
      { status: 500, headers: corsHeaders() }
    );
  }
}