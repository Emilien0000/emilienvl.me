// api/scrape.js
export const config = { maxDuration: 60 };

// 👇 ON CHERCHE LES VARIABLES SOUS LEURS DEUX NOMS POSSIBLES
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function sbUrl(path) { return `${SUPABASE_URL}/rest/v1/${path}`; }

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function sbFetch(path, options = {}) {
  const res = await fetch(sbUrl(path), { ...options, headers: { ...sbHeaders(), ...options.headers } });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const pythonApiUrl = process.env.PYTHON_SCRAPER_URL; 
  const scraperSecret = process.env.SCRAPER_SECRET || '';
  const userId = req.headers['x-user-id'];

  if (!userId) return res.status(401).json({ error: "Utilisateur non connecté" });
  if (!pythonApiUrl) return res.status(500).json({ error: "URL Python manquante sur Vercel" });
  
  // Sécurité anti-crash
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Variables SUPABASE manquantes sur Vercel. Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les settings." });
  }

  try {
    // 1. Lire tes filtres depuis Supabase
    const profiles = await sbFetch(`user_filters?id=eq.${encodeURIComponent(userId)}&select=filters`);
    if (!profiles.length || !profiles[0].filters) {
      return res.status(200).json({ ok: true, message: 'Aucun filtre' });
    }

    let filterArray = profiles[0].filters;
    const activeFilters = filterArray.filter(f => f.enabled);
    if (activeFilters.length === 0) {
      return res.status(200).json({ ok: true, message: 'Aucun filtre actif' });
    }

    const urls = activeFilters.map(f => f.url);

    // 2. Demander à Python de scraper
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

    return res.status(200).json({ ok: true, count: allJobs.length });

  } catch (err) {
    console.error("Erreur globale scrape:", err);
    return res.status(500).json({ error: err.message });
  }
}