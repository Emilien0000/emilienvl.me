// api/jobs.js
export const config = { maxDuration: 10 };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    'Content-Type': 'application/json',
  };
}

function sbUrl(path) { return `${process.env.SUPABASE_URL}/rest/v1/${path}`; }
function sbHeaders() {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ jobs: [], errors: ['Config Supabase manquante'], sourceMeta: {} }), { status: 200, headers: corsHeaders() });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const userId = req.headers.get('x-user-id');

    // Récupère les offres
    const res = await fetch(sbUrl(`jb_jobs?order=date.desc&limit=${limit}`), { headers: sbHeaders() });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = await res.json();

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

    // Récupère les métadonnées depuis le JSON de l'utilisateur
    const sourceMeta = {};
    if (userId) {
      const metaRes = await fetch(sbUrl(`user_filters?id=eq.${encodeURIComponent(userId)}&select=filters`), { headers: sbHeaders() });
      if (metaRes.ok) {
        const profiles = await metaRes.json();
        if (profiles.length > 0 && profiles[0].filters) {
          for (const f of profiles[0].filters) {
            if (f.lastScraped) sourceMeta[f.url] = { scrapedAt: f.lastScraped, count: f.jobCount ?? 0 };
          }
        }
      }
    }

    return new Response(JSON.stringify({ jobs, total: jobs.length, errors: [], sourceMeta }), { status: 200, headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ jobs: [], errors: [err.message], sourceMeta: {} }), { status: 200, headers: corsHeaders() });
  }
}