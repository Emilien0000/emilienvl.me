// api/jobs.js — Lecture des offres depuis Supabase (réponse instantanée)
// Le scraping réel est fait par api/scrape.js (cron ou appel manuel)
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement requises :
//   SUPABASE_URL      → https://xxxx.supabase.co
//   SUPABASE_ANON_KEY → clé anon publique
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 10 };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function sbUrl(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

function sbHeaders() {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ jobs: [], errors: ['SUPABASE_URL ou SUPABASE_ANON_KEY manquant'], sourceMeta: {} }),
      { status: 200, headers: corsHeaders() }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    // Récupère les 30 offres les plus récentes
    const res = await fetch(
      sbUrl(`jb_jobs?order=date.desc&limit=${limit}`),
      { headers: sbHeaders() }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase ${res.status}: ${err}`);
    }

    const rows = await res.json();

    // Remappage snake_case → camelCase
    const jobs = rows.map(r => ({
      id:          r.id,
      sourceUrl:   r.source_url,
      title:       r.title,
      company:     r.company ?? '',
      location:    r.location ?? '',
      url:         r.url,
      description: r.description ?? '',
      date:        r.date,
      type:        r.type ?? 'emploi',
    }));

    // Métadonnées par source (dernier scrape + nb offres)
    const metaRes = await fetch(
      sbUrl('jb_filters?select=url,last_scraped,job_count'),
      { headers: sbHeaders() }
    );
    const metaRows = metaRes.ok ? await metaRes.json() : [];
    const sourceMeta = {};
    for (const row of metaRows) {
      if (row.last_scraped) {
        sourceMeta[row.url] = { scrapedAt: row.last_scraped, count: row.job_count ?? 0 };
      }
    }

    return new Response(
      JSON.stringify({ jobs, total: jobs.length, errors: [], sourceMeta }),
      { status: 200, headers: corsHeaders() }
    );

  } catch (err) {
    console.error('[jobs]', err);
    return new Response(
      JSON.stringify({ jobs: [], errors: [err.message ?? 'Erreur inconnue'], sourceMeta: {} }),
      { status: 200, headers: corsHeaders() }
    );
  }
}