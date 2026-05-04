// api/scrape.js
export const config = { maxDuration: 60 }; // Demande à Vercel d'être patient (jusqu'à 60s)

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function sbFetch(path, options = {}) {
  const res = await fetch(sbUrl(path), { ...options, headers: { ...sbHeaders(), ...options.headers } });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders() });

  // 👇 ASSURE-TOI QUE CES VARIABLES SONT BIEN DANS LES REGLAGES DE TON PROJET VERCEL
  const pythonApiUrl = process.env.PYTHON_SCRAPER_URL; 
  const scraperSecret = process.env.SCRAPER_SECRET || '';
  const userId = req.headers.get('x-user-id');

  if (!userId) return new Response(JSON.stringify({ error: "Non connecté" }), { status: 401, headers: corsHeaders() });
  if (!pythonApiUrl) return new Response(JSON.stringify({ error: "URL Python manquante sur Vercel" }), { status: 500, headers: corsHeaders() });

  try {
    // 1. Lire tes filtres depuis Supabase
    const profiles = await sbFetch(`user_filters?id=eq.${encodeURIComponent(userId)}&select=filters`);
    if (!profiles.length || !profiles[0].filters) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });

    let filterArray = profiles[0].filters;
    const activeFilters = filterArray.filter(f => f.enabled);
    if (activeFilters.length === 0) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });

    const urls = activeFilters.map(f => f.url);

    // 2. Demander à Python de scraper (instantané si Render est éveillé)
    const scrapeRes = await fetch(`${pythonApiUrl}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-scraper-secret': scraperSecret },
      body: JSON.stringify({ urls, results_wanted: 30 })
    });

    if (!scrapeRes.ok) throw new Error(`Python API a planté : ${scrapeRes.status}`);
    const scrapeData = await scrapeRes.json();

    const allJobs = [];
    const seen = new Set();

    // 3. Traiter les résultats
    for (const result of scrapeData.results) {
      const filterIndex = filterArray.findIndex(f => f.url === result.url);
      if (filterIndex !== -1) {
        filterArray[filterIndex].lastScraped = result.scrapedAt;
        filterArray[filterIndex].jobCount = result.count;
      }

      for (const job of result.jobs) {
         if (job.url && !seen.has(job.url)) {
            seen.add(job.url);
            allJobs.push(job);
         }
      }
    }

    // 4. Sauvegarder dans ta table jb_jobs Supabase
    if (allJobs.length > 0) {
      await sbFetch('jb_jobs?on_conflict=url', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(allJobs),
      });
    }

    // 5. Mettre à jour la date de dernier scrape dans tes filtres
    await sbFetch(`user_filters?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ filters: filterArray })
    });

    return new Response(JSON.stringify({ ok: true, count: allJobs.length }), { status: 200, headers: corsHeaders() });

  } catch (err) {
    console.error("Erreur globale scrape:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders() });
  }
}