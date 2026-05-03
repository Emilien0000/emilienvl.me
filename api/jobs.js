// api/jobs.js — Vercel Edge Serverless Function
// Sources : La Bonne Alternance + Adzuna + France Travail + Indeed + HelloWork + Stage.fr
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement :
//   LBA_API_TOKEN         → token JWT depuis api.apprentissage.beta.gouv.fr
//   ADZUNA_APP_ID         → app id Adzuna
//   ADZUNA_APP_KEY        → app key Adzuna
//   FT_CLIENT_ID          → client_id OAuth France Travail
//   FT_CLIENT_SECRET      → client_secret OAuth France Travail
//   SCRAPE_API_KEY        → clé ScraperAPI (pour Indeed / HelloWork / Stage.fr)
//                           https://www.scraperapi.com — plan gratuit = 1000 req/mois
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
    .replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

// ── Codes ROME par mot-clé ───────────────────────────────────────────────────

const ROME_MAP = {
  'développeur':        'M1805,M1806',
  'developpeur':        'M1805,M1806',
  'dev':                'M1805,M1806',
  'web':                'M1805,M1806',
  'fullstack':          'M1805,M1806',
  'frontend':           'M1805',
  'backend':            'M1806',
  'javascript':         'M1805,M1806',
  'python':             'M1805,M1806',
  'react':              'M1805',
  'node':               'M1806',
  'data':               'M1811,M1805',
  'machine learning':   'M1811',
  'ia':                 'M1811',
  'cyber':              'M1802,M1801,M1805,M1806',
  'cybersécurité':      'M1802,M1801,M1805,M1806',
  'reseau':             'M1801',
  'réseau':             'M1801',
  'cloud':              'M1806',
  'devops':             'M1806',
  'mobile':             'M1805',
  'marketing':          'M1703,M1705',
  'commercial':         'D1401,D1403',
  'comptable':          'M1203,M1206',
  'finance':            'M1203,M1205',
  'rh':                 'M1501',
  'ressources humaines':'M1501,M1502',
  'design':             'B1805,L1503',
  'ux':                 'B1805',
  'default':            'M1805,M1806,M1703,M1801',
};

function getRomes(query) {
  const q = query.toLowerCase();
  for (const [key, romes] of Object.entries(ROME_MAP)) {
    if (key !== 'default' && q.includes(key)) return romes;
  }
  return ROME_MAP.default;
}

// ── Géo ─────────────────────────────────────────────────────────────────────

const GEO_MAP = {
  'paris':      { lat: 48.8566, lon: 2.3522 },
  'lyon':       { lat: 45.7640, lon: 4.8357 },
  'marseille':  { lat: 43.2965, lon: 5.3698 },
  'bordeaux':   { lat: 44.8378, lon: -0.5792 },
  'lille':      { lat: 50.6292, lon: 3.0573 },
  'nantes':     { lat: 47.2184, lon: -1.5536 },
  'toulouse':   { lat: 43.6047, lon: 1.4442 },
  'strasbourg': { lat: 48.5734, lon: 7.7521 },
  'rennes':     { lat: 48.1173, lon: -1.6778 },
  'grenoble':   { lat: 45.1885, lon: 5.7245 },
  'amiens':     { lat: 49.8942, lon: 2.2957 },
  'france':     { lat: 46.2276, lon: 2.2137 },
};

const DEPT_MAP = {
  'paris': '75', 'lyon': '69', 'marseille': '13', 'bordeaux': '33',
  'lille': '59', 'nantes': '44', 'toulouse': '31', 'strasbourg': '67',
  'rennes': '35', 'grenoble': '38', 'amiens': '80',
};

function getCoords(location) {
  const l = location.toLowerCase();
  for (const [key, coords] of Object.entries(GEO_MAP)) {
    if (l.includes(key)) return coords;
  }
  return GEO_MAP.france;
}

function getDept(location) {
  const l = location.toLowerCase();
  for (const [key, dept] of Object.entries(DEPT_MAP)) {
    if (l.includes(key)) return dept;
  }
  return null;
}

// ── 1. La Bonne Alternance ───────────────────────────────────────────────────

async function scrapeLBA(query, location, limit) {
  const token = process.env.LBA_API_TOKEN;
  if (!token) throw new Error('LBA_API_TOKEN manquant');

  const coords = getCoords(location);
  const romes  = getRomes(query);

  const params = new URLSearchParams({
    romes,
    latitude:  String(coords.lat),
    longitude: String(coords.lon),
    radius:    '100',
  });

  const res = await fetch(`https://api.apprentissage.beta.gouv.fr/api/job/v1/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'api-key': token,
      'Accept': 'application/json',
    },
  });

  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok || ct.includes('text/html')) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LBA ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return (Array.isArray(data.jobs) ? data.jobs : []).slice(0, limit).map(o => ({
    id:          `lba-${uid(o.identifier?.id ?? Math.random())}`,
    source:      'La Bonne Alternance',
    title:       o.offer?.title ?? "Offre d'alternance",
    company:     o.workplace?.name ?? '',
    location:    o.workplace?.location?.address ?? location,
    url:         o.apply?.url ?? 'https://labonnealternance.apprentissage.beta.gouv.fr',
    description: (o.offer?.description ?? '').slice(0, 280),
    date:        parseDate(o.offer?.publication?.creation ?? o.createdAt),
    type:        'alternance',
  }));
}

// ── 2. Adzuna ────────────────────────────────────────────────────────────────

async function scrapeAdzuna(query, location, limit) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY manquants');

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey,
    results_per_page: String(limit),
    what: query, where: location, sort_by: 'date',
  });

  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`Adzuna ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).slice(0, limit).map(job => {
    const desc  = (job.description ?? '').replace(/<[^>]+>/g, ' ').trim();
    const isAlt = /alternance|apprentissage/i.test(desc + job.title);
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

// ── 3. France Travail ────────────────────────────────────────────────────────

let ftTokenCache = { token: null, expiresAt: 0 };

async function getFTToken() {
  if (ftTokenCache.token && Date.now() < ftTokenCache.expiresAt - 30_000) return ftTokenCache.token;

  const clientId     = process.env.FT_CLIENT_ID;
  const clientSecret = process.env.FT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('FT_CLIENT_ID / FT_CLIENT_SECRET manquants');

  const res = await fetch(
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId, client_secret: clientSecret,
        scope: 'api_offresdemploiv2 o2dsoffre',
      }),
    }
  );
  if (!res.ok) throw new Error(`FT OAuth ${res.status}`);
  const data = await res.json();
  ftTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 1500) * 1000 };
  return ftTokenCache.token;
}

async function scrapeFranceTravail(query, location, limit) {
  const token = await getFTToken();
  const dept  = getDept(location);

  const buildParams = (typeContrat) => {
    const p = new URLSearchParams({ motsCles: query, sort: 1, range: `0-${Math.min(limit, 149)}` });
    if (dept)        p.set('departement', dept);
    if (typeContrat) p.set('typeContrat', typeContrat);
    return p;
  };

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
  const base = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

  const [resAlt, resStg] = await Promise.all([
    fetch(`${base}?${buildParams('CA')}`, { headers }),
    fetch(`${base}?${buildParams('SAI')}`, { headers }),
  ]);

  const parse = async (res) => {
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`France Travail ${res.status}`);
    const d = await res.json();
    return d.resultats ?? [];
  };

  const [altOffres, stgOffres] = await Promise.all([parse(resAlt), parse(resStg)]);

  const mapOffer = (o, type) => ({
    id:          `ft-${uid(o.id)}`,
    source:      'France Travail',
    title:       o.intitule ?? 'Offre France Travail',
    company:     o.entreprise?.nom ?? '',
    location:    o.lieuTravail?.libelle ?? location,
    url:         o.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    description: (o.description ?? '').slice(0, 280),
    date:        parseDate(o.dateCreation),
    type,
  });

  const half = Math.ceil(limit / 2);
  return [
    ...altOffres.slice(0, half).map(o => mapOffer(o, 'alternance')),
    ...stgOffres.slice(0, limit - Math.min(altOffres.length, half)).map(o => mapOffer(o, 'stage')),
  ];
}

// ── 4. Indeed (via ScraperAPI structured endpoint) ───────────────────────────
// ScraperAPI propose un endpoint Indeed structuré (pas de parsing HTML)
// Doc : https://docs.scraperapi.com/structured-data-collection/indeed

async function scrapeIndeed(query, location, limit) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) throw new Error('SCRAPE_API_KEY manquant (ScraperAPI)');

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    location: location || 'France',
    country: 'fr',
    limit: String(Math.min(limit, 15)),
  });

  const res = await fetch(`https://api.scraperapi.com/structured/indeed/search?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`Indeed/ScraperAPI ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.jobs) ? data.jobs : (data.organic_results ?? []);

  return items.slice(0, limit).map(job => {
    const title = job.title ?? job.job_title ?? '';
    const desc  = (job.description ?? job.snippet ?? '').replace(/<[^>]+>/g, ' ').trim();
    const isAlt = /alternance|apprentissage/i.test(title + desc);
    const isStg = /stage|intern/i.test(title + desc);
    return {
      id:          `indeed-${uid(job.job_id ?? job.id ?? Math.random())}`,
      source:      'Indeed',
      title,
      company:     job.company ?? job.company_name ?? '',
      location:    job.location ?? location,
      url:         job.url ?? job.job_url ?? `https://fr.indeed.com`,
      description: desc.slice(0, 280),
      date:        parseDate(job.date ?? job.posted_at),
      type:        isAlt ? 'alternance' : isStg ? 'stage' : 'emploi',
    };
  });
}

// ── 5. HelloWork (scraping léger via ScraperAPI) ──────────────────────────────
// HelloWork n'a pas d'API publique — on scrape leur page de résultats JSON
// URL : https://www.hellowork.com/fr-fr/emploi/recherche.html?k=...&l=...&c=...

async function scrapeHelloWork(query, location, limit) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) throw new Error('SCRAPE_API_KEY manquant (ScraperAPI)');

  // HelloWork expose une API interne JSON pour ses résultats de recherche
  const contractMap = { alternance: 'apprentissage', stage: 'stage', emploi: 'cdi,cdd' };
  const hwQuery  = encodeURIComponent(query);
  const hwLoc    = encodeURIComponent(location || 'France');

  // On tente l'API interne JSON de HelloWork
  const targetUrl = `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${hwQuery}&l=${hwLoc}&jt=alternance%2Cstage&jsonResults=true`;

  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=false`;

  const res = await fetch(proxyUrl, { headers: { 'Accept': 'application/json, text/html' } });
  if (!res.ok) throw new Error(`HelloWork ${res.status}`);

  // HelloWork renvoie du JSON si jsonResults=true
  let data;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('json')) {
    data = await res.json();
  } else {
    // Fallback : extrait le JSON embarqué dans le HTML (window.__INITIAL_STATE__)
    const html = await res.text();
    const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s);
    if (!match) throw new Error('HelloWork : structure HTML non reconnue');
    data = JSON.parse(match[1]);
  }

  // Les offres peuvent être dans data.jobs, data.results, data.offers ou data.offerList
  const items = data?.jobs ?? data?.results ?? data?.offers ?? data?.offerList ?? [];

  return items.slice(0, limit).map(job => {
    const title = job.title ?? job.label ?? '';
    const desc  = (job.description ?? job.resume ?? '').replace(/<[^>]+>/g, ' ').trim();
    const isAlt = /alternance|apprentissage/i.test(title + desc);
    const isStg = /stage|intern/i.test(title + desc);
    return {
      id:          `hw-${uid(job.id ?? job.offerId ?? Math.random())}`,
      source:      'HelloWork',
      title,
      company:     job.company ?? job.companyName ?? '',
      location:    job.location ?? job.city ?? location,
      url:         job.url ?? job.applyUrl ?? `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${hwQuery}`,
      description: desc.slice(0, 280),
      date:        parseDate(job.date ?? job.publishedAt ?? job.createdAt),
      type:        isAlt ? 'alternance' : isStg ? 'stage' : 'emploi',
    };
  });
}

// ── 6. Stage.fr (scraping via ScraperAPI) ────────────────────────────────────
// Stage.fr : https://www.stage.fr/offres?q=...&localisation=...

async function scrapeStage(query, location, limit) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) throw new Error('SCRAPE_API_KEY manquant (ScraperAPI)');

  const targetUrl = `https://www.stage.fr/offres?q=${encodeURIComponent(query)}&localisation=${encodeURIComponent(location || 'France')}`;
  const proxyUrl  = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=true`;

  const res = await fetch(proxyUrl, { headers: { 'Accept': 'text/html' } });
  if (!res.ok) throw new Error(`Stage.fr ${res.status}`);

  const html = await res.text();

  // Stage.fr expose son état React dans un script JSON
  const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (!jsonMatch) throw new Error('Stage.fr : structure HTML non reconnue');

  const nextData = JSON.parse(jsonMatch[1]);
  const offers   = nextData?.props?.pageProps?.offers
                ?? nextData?.props?.pageProps?.initialOffers
                ?? nextData?.props?.pageProps?.jobs
                ?? [];

  return offers.slice(0, limit).map(o => ({
    id:          `stage-${uid(o.id ?? Math.random())}`,
    source:      'Stage.fr',
    title:       o.title ?? o.name ?? 'Offre Stage.fr',
    company:     o.company?.name ?? o.companyName ?? '',
    location:    o.location ?? o.city ?? location,
    url:         o.url ?? `https://www.stage.fr/offres/${o.id ?? ''}`,
    description: (o.description ?? o.excerpt ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 280),
    date:        parseDate(o.publishedAt ?? o.createdAt ?? o.date),
    type:        /alternance|apprentissage/i.test(o.title ?? '') ? 'alternance' : 'stage',
  }));
}

// ── Handler principal ─────────────────────────────────────────────────────────
//
// Nouvelle logique : on supporte plusieurs mots-clés ET plusieurs localisations.
// Pour chaque combinaison (keyword × location), on lance un scrape de chaque source.
// Les résultats sont dédupliqués par URL puis triés par date.

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);

  // Paramètres multi-valeurs (séparés par virgule)
  const rawKeywords  = searchParams.get('keywords')  || searchParams.get('q') || 'alternance développeur';
  const rawLocations = searchParams.get('locations')  || searchParams.get('location') || 'France';
  const rawSources   = searchParams.get('sources')   || 'lba,adzuna,ft,indeed,hellowork,stagefr';

  const keywords  = rawKeywords.split(',').map(k => k.trim()).filter(Boolean);
  const locations = rawLocations.split(',').map(l => l.trim()).filter(Boolean);
  const sources   = rawSources.split(',').map(s => s.trim()).filter(Boolean);
  const limit     = Math.min(parseInt(searchParams.get('limit') || '12', 10), 20);

  // Nombre de résultats par combinaison (on répartit le budget)
  const perCombo = Math.max(3, Math.ceil(limit / (keywords.length * locations.length)));

  const scraperMap = {
    lba:       scrapeLBA,
    adzuna:    scrapeAdzuna,
    ft:        scrapeFranceTravail,
    indeed:    scrapeIndeed,
    hellowork: scrapeHelloWork,
    stagefr:   scrapeStage,
  };

  // On lance toutes les combinaisons keyword × location × source en parallèle
  const tasks = [];
  for (const kw of keywords) {
    for (const loc of locations) {
      for (const src of sources) {
        if (scraperMap[src]) {
          tasks.push({ src, kw, loc, fn: () => scraperMap[src](kw, loc, perCombo) });
        }
      }
    }
  }

  const settled = await Promise.allSettled(tasks.map(t => t.fn()));

  // Déduplique par URL
  const seen = new Set();
  const jobs = settled
    .flatMap((r, i) => r.status === 'fulfilled' ? r.value : [])
    .filter(j => {
      if (!j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60); // max 60 résultats

  // Erreurs uniques par source
  const errorMap = {};
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      const src = tasks[i].src;
      if (!errorMap[src]) errorMap[src] = r.reason?.message ?? 'Erreur';
    }
  });
  const errors = Object.entries(errorMap).map(([src, msg]) => `${src}: ${msg}`);

  return new Response(
    JSON.stringify({ jobs, total: jobs.length, errors, keywords, locations }),
    { status: 200, headers: corsHeaders() }
  );
}