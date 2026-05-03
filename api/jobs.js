// api/jobs.js — Vercel Edge Serverless Function
// Sources : La Bonne Alternance (/api/V1/jobs) + Adzuna
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement Vercel (Settings → Environment Variables) :
//
//   LBA_API_TOKEN      → ton token JWT La Bonne Alternance
//   ADZUNA_APP_ID      → 44af61ed
//   ADZUNA_APP_KEY     → 7289612901e65a2425476345113b9f5f
// ─────────────────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function parseDate(raw) {
  try { const d = new Date(raw); if (!isNaN(d)) return d.toISOString(); } catch {}
  return new Date().toISOString();
}

function uid(str) {
  return btoa(unescape(encodeURIComponent(String(str ?? Math.random()))))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 12);
}

// ── Codes ROME fréquents par mot-clé ─────────────────────────────────────────
// L'API LBA exige des codes ROME (pas de recherche texte libre)
// On mappe les mots-clés courants → codes ROME pertinents

const ROME_MAP = {
  // Dev / Informatique
  'développeur':       'M1805,M1806',
  'developpeur':       'M1805,M1806',
  'dev':               'M1805,M1806',
  'web':               'M1805,M1806',
  'fullstack':         'M1805,M1806',
  'frontend':          'M1805',
  'backend':           'M1806',
  'javascript':        'M1805,M1806',
  'python':            'M1805,M1806',
  'react':             'M1805',
  'node':              'M1806',
  'data':              'M1811,M1805',
  'machine learning':  'M1811',
  'ia':                'M1811',
  'cybersécurité':     'M1802',
  'reseau':            'M1801',
  'réseau':            'M1801',
  'cloud':             'M1806',
  'devops':            'M1806',
  'mobile':            'M1805',
  // Marketing / Commerce
  'marketing':         'M1703,M1705',
  'commercial':        'D1401,D1403',
  'vente':             'D1401',
  'communication':     'E1103,M1707',
  // Finance / Compta
  'comptable':         'M1203,M1206',
  'finance':           'M1203,M1205',
  'audit':             'M1202',
  // RH
  'ressources humaines':'M1501,M1502',
  'rh':                'M1501',
  // Design
  'design':            'B1805,L1503',
  'graphique':         'B1805',
  'ux':                'B1805',
  // Default si rien ne matche
  'default':           'M1805,M1806,M1703,M1801',
};

function getRomes(query) {
  const q = query.toLowerCase();
  for (const [key, romes] of Object.entries(ROME_MAP)) {
    if (key !== 'default' && q.includes(key)) return romes;
  }
  return ROME_MAP.default;
}

// ── Coordonnées par ville/région ──────────────────────────────────────────────
const GEO_MAP = {
  'paris':       { lat: 48.8566, lon: 2.3522 },
  'lyon':        { lat: 45.7640, lon: 4.8357 },
  'marseille':   { lat: 43.2965, lon: 5.3698 },
  'bordeaux':    { lat: 44.8378, lon: -0.5792 },
  'lille':       { lat: 50.6292, lon: 3.0573 },
  'nantes':      { lat: 47.2184, lon: -1.5536 },
  'toulouse':    { lat: 43.6047, lon: 1.4442 },
  'strasbourg':  { lat: 48.5734, lon: 7.7521 },
  'rennes':      { lat: 48.1173, lon: -1.6778 },
  'grenoble':    { lat: 45.1885, lon: 5.7245 },
  'amiens':      { lat: 49.8942, lon: 2.2957 },
  'france':      { lat: 46.2276, lon: 2.2137 },
};

function getCoords(location) {
  const l = location.toLowerCase();
  for (const [key, coords] of Object.entries(GEO_MAP)) {
    if (l.includes(key)) return coords;
  }
  return GEO_MAP.france; // fallback centre France
}

// ── 1. La Bonne Alternance — /api/V1/jobs ─────────────────────────────────────
// Doc : https://labonnealternance.apprentissage.beta.gouv.fr/espace-developpeurs
// Le bon endpoint est labonnealternance.apprentissage.beta.gouv.fr (pas api.apprentissage...)

async function scrapeLBA(query, location, limit) {
  const token = process.env.LBA_API_TOKEN;
  if (!token) throw new Error('LBA_API_TOKEN manquant');

  const coords = getCoords(location);
  const romes  = getRomes(query);

  const params = new URLSearchParams({
    romes,
    caller:    'emilienvl.me',
    latitude:  String(coords.lat),
    longitude: String(coords.lon),
    radius:    '100',
    insee:     '',
    zipcode:   '',
  });

  // Bon endpoint : labonnealternance.apprentissage.beta.gouv.fr/api/V1/jobs
  const url = `https://labonnealternance.apprentissage.beta.gouv.fr/api/V1/jobs?${params}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LBA ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();

  // Fusionner les deux types d'offres
  const lbaOffers       = data.jobs?.peJobOffers?.results ?? [];
  const partnerOffers   = data.jobs?.matchas?.results ?? [];
  const allOffers       = [...lbaOffers, ...partnerOffers];

  return allOffers.slice(0, limit).map(o => {
    // Structure différente selon le type
    const isLba = !!o.job;
    return {
      id:          `lba-${uid(o.id ?? o.ideaType ?? Math.random())}`,
      source:      'La Bonne Alternance',
      title:       o.job?.name ?? o.title ?? "Offre d'alternance",
      company:     o.company?.name ?? o.workplace?.name ?? '',
      location:    o.place?.fullAddress ?? o.workplace?.address?.city ?? location,
      url:         o.url
                   ?? (o.id ? `https://labonnealternance.apprentissage.beta.gouv.fr/recherche-apprentissage?type=${isLba ? 'matcha' : 'peJob'}&itemId=${o.id}` : 'https://labonnealternance.apprentissage.beta.gouv.fr'),
      description: (o.job?.description ?? o.description ?? '').slice(0, 280),
      date:        parseDate(o.job?.creationDate ?? o.createdAt ?? null),
      type:        'alternance',
    };
  });
}

// ── 2. Adzuna ─────────────────────────────────────────────────────────────────

async function scrapeAdzuna(query, location, limit) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY manquants dans Vercel');

  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: String(limit),
    what:             query,
    where:            location,
    sort_by:          'date',
  });

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Adzuna ${res.status}: ${txt.slice(0, 120)}`);
  }

  const data = await res.json();

  return (data.results ?? []).slice(0, limit).map(job => {
    const desc  = (job.description ?? '').replace(/<[^>]+>/g, ' ').trim();
    const isAlt = /alternance|apprentissage|contrat d.app/i.test(desc + job.title);
    const isStg = /stage|intern/i.test(desc + job.title);

    return {
      id:          `adzuna-${uid(job.id)}`,
      source:      'Adzuna',
      title:       job.title ?? '',
      company:     job.company?.display_name ?? '',
      location:    job.location?.display_name ?? location,
      url:         job.redirect_url ?? '',
      description: desc.slice(0, 280),
      date:        parseDate(job.created),
      type:        isAlt ? 'alternance' : isStg ? 'stage' : 'emploi',
    };
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);
  const query    = searchParams.get('q')        || 'alternance développeur';
  const location = searchParams.get('location') || 'France';
  const sources  = (searchParams.get('sources') || 'lba,adzuna').split(',');
  const limit    = Math.min(parseInt(searchParams.get('limit') || '12', 10), 20);

  const scrapers = {
    lba:    () => scrapeLBA(query, location, limit),
    adzuna: () => scrapeAdzuna(query, location, limit),
  };

  const results = await Promise.allSettled(
    sources.map(s => scrapers[s]?.() ?? Promise.resolve([]))
  );

  const jobs = results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const errors = results
    .map((r, i) => r.status === 'rejected'
      ? `${sources[i]}: ${r.reason?.message ?? 'Erreur'}`
      : null
    )
    .filter(Boolean);

  return new Response(
    JSON.stringify({ jobs, total: jobs.length, errors, query, location }),
    { status: 200, headers: corsHeaders() }
  );
}