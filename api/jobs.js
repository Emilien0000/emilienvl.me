// api/jobs.js — Vercel Edge Serverless Function
// Sources : La Bonne Alternance + Adzuna + France Travail
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement Vercel :
//   LBA_API_TOKEN         → token JWT depuis api.apprentissage.beta.gouv.fr
//   ADZUNA_APP_ID         → ton app id Adzuna
//   ADZUNA_APP_KEY        → ta app key Adzuna
//   FT_CLIENT_ID          → client_id OAuth France Travail (ex-Pôle Emploi)
//   FT_CLIENT_SECRET      → client_secret OAuth France Travail
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

// ── Codes ROME par mot-clé ────────────────────────────────────────────────────

const ROME_MAP = {
  'développeur':        'M1805,M1806',
  'developpeur':        'M1805,M1806',
  'dev':                'M1805,M1806',
  'web':                'M1805,M1806',
  'fullstack':          'M1805,M1806',
  'cyber':              'M1802',
  'frontend':           'M1805',
  'backend':            'M1806',
  'javascript':         'M1805,M1806',
  'python':             'M1805,M1806',
  'react':              'M1805',
  'node':               'M1806',
  'data':               'M1811,M1805',
  'machine learning':   'M1811',
  'ia':                 'M1811',
  'cybersécurité':      'M1802',
  'reseau':             'M1801',
  'réseau':             'M1801',
  'cloud':              'M1806',
  'devops':             'M1806',
  'mobile':             'M1805',
  'marketing':          'M1703,M1705',
  'commercial':         'D1401,D1403',
  'vente':              'D1401',
  'communication':      'E1103,M1707',
  'comptable':          'M1203,M1206',
  'finance':            'M1203,M1205',
  'audit':              'M1202',
  'ressources humaines':'M1501,M1502',
  'rh':                 'M1501',
  'design':             'B1805,L1503',
  'graphique':          'B1805',
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

// ── Coordonnées par ville ─────────────────────────────────────────────────────

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

function getCoords(location) {
  const l = location.toLowerCase();
  for (const [key, coords] of Object.entries(GEO_MAP)) {
    if (l.includes(key)) return coords;
  }
  return GEO_MAP.france;
}

// ── Département par localisation (France Travail) ─────────────────────────────
// France Travail filtre par code département (ex: "75" pour Paris)

const DEPT_MAP = {
  'paris':      '75',
  'lyon':       '69',
  'marseille':  '13',
  'bordeaux':   '33',
  'lille':      '59',
  'nantes':     '44',
  'toulouse':   '31',
  'strasbourg': '67',
  'rennes':     '35',
  'grenoble':   '38',
  'amiens':     '80',
};

function getDept(location) {
  const l = location.toLowerCase();
  for (const [key, dept] of Object.entries(DEPT_MAP)) {
    if (l.includes(key)) return dept;
  }
  return null; // Pas de filtre département = toute la France
}

// ── 1. La Bonne Alternance ────────────────────────────────────────────────────

async function scrapeLBA(query, location, limit) {
  const token = process.env.LBA_API_TOKEN;
  if (!token) throw new Error("LBA_API_TOKEN manquant");

  const coords = getCoords(location);
  const romes  = getRomes(query);

  const params = new URLSearchParams({
    romes,
    latitude:  String(coords.lat),
    longitude: String(coords.lon),
    radius:    "100",
  });

  const url = `https://api.apprentissage.beta.gouv.fr/api/job/v1/search?${params}`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "api-key":       token,
      "Accept":        "application/json",
      "Content-Type":  "application/json",
    },
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok || contentType.includes("text/html")) {
    const txt = await res.text().catch(() => "");
    if (contentType.includes("text/html")) {
      const firstBytes = txt.slice(0, 100);
      throw new Error(`LBA ${res.status}: HTML reçu (token invalide ou expiré ?). Début: ${firstBytes}`);
    }
    throw new Error(`LBA ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();

  const offers = Array.isArray(data.jobs) ? data.jobs : [];

  return offers.slice(0, limit).map(o => mapLBAOffer(o, location));
}

function mapLBAOffer(o, fallbackLocation) {
  const title    = o.offer?.title       ?? "Offre d'alternance";
  const company  = o.workplace?.name    ?? '';
  const address  = o.workplace?.location?.address ?? fallbackLocation;
  const applyUrl = o.apply?.url         ?? 'https://labonnealternance.apprentissage.beta.gouv.fr';
  const desc     = (o.offer?.description ?? '').slice(0, 280);
  const created  = o.offer?.publication?.creation ?? o.createdAt ?? null;
  const id       = o.identifier?.id ?? Math.random();

  return {
    id:          `lba-${uid(id)}`,
    source:      'La Bonne Alternance',
    title,
    company,
    location:    address,
    url:         applyUrl,
    description: desc,
    date:        parseDate(created),
    type:        'alternance',
  };
}

function mapLBARecruiter(r, fallbackLocation) {
  return {
    id:          `lba-rec-${uid(r.identifier?.id ?? Math.random())}`,
    source:      "La Bonne Alternance",
    title:       `Candidature spontanée — ${r.workplace?.name ?? "Entreprise"}`,
    company:     r.workplace?.name ?? "",
    location:    r.workplace?.location?.address ?? fallbackLocation,
    url:         r.apply?.url ?? "https://labonnealternance.apprentissage.beta.gouv.fr",
    description: r.workplace?.description ?? "",
    date:        new Date().toISOString(),
    type:        "alternance",
  };
}

// ── 2. Adzuna ─────────────────────────────────────────────────────────────────

async function scrapeAdzuna(query, location, limit) {
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY manquants');

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

// ── 3. France Travail (ex Pôle Emploi) ───────────────────────────────────────
//
// Doc : https://pole-emploi.io/data/api/offres-emploi
// Auth : OAuth2 client_credentials
//   POST https://entreprise.francetravail.fr/connexion/oauth2/access_token
//   ?realm=/partenaire
//   Body: grant_type=client_credentials&client_id=...&client_secret=...
//         &scope=api_offresdemploiv2+o2dsoffre
//
// Endpoint : GET https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search
// Params clés :
//   motsCles, departement, typeContrat (CA=apprentissage, CDD, CDI, SAI=stage)
//   range (ex: 0-14 pour les 15 premiers)

// Cache token en mémoire pour la durée du worker (Edge runtime)
let ftTokenCache = { token: null, expiresAt: 0 };

async function getFTToken() {
  if (ftTokenCache.token && Date.now() < ftTokenCache.expiresAt - 30_000) {
    return ftTokenCache.token;
  }

  const clientId     = process.env.FT_CLIENT_ID;
  const clientSecret = process.env.FT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('FT_CLIENT_ID / FT_CLIENT_SECRET manquants');

  const res = await fetch(
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         'api_offresdemploiv2 o2dsoffre',
      }),
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`FT OAuth ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  ftTokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 1500) * 1000,
  };
  return ftTokenCache.token;
}

async function scrapeFranceTravail(query, location, limit) {
  const token = await getFTToken();
  const dept  = getDept(location);

  // On fait deux appels en parallèle : contrats d'apprentissage (CA) + stages (SAI)
  // typeContrat : CA = Contrat d'apprentissage, CDD, CDI, SAI = Saisonnier (utilisé aussi pour stages)
  const buildParams = (typeContrat) => {
    const p = new URLSearchParams({
      motsCles:    query,
      sort:        1,        // tri par date
      range:       `0-${Math.min(limit, 149)}`,
    });
    if (dept)         p.set('departement', dept);
    if (typeContrat)  p.set('typeContrat', typeContrat);
    return p;
  };

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept':        'application/json',
  };

  const baseUrl = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

  const [resAlt, resStg] = await Promise.all([
    fetch(`${baseUrl}?${buildParams('CA')}`,  { headers }),
    fetch(`${baseUrl}?${buildParams('SAI')}`, { headers }),
  ]);

  const parseBody = async (res) => {
    if (!res.ok) {
      // 204 = aucun résultat, c'est normal
      if (res.status === 204) return [];
      const txt = await res.text().catch(() => '');
      throw new Error(`France Travail ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.resultats ?? [];
  };

  const [altOffres, stgOffres] = await Promise.all([
    parseBody(resAlt),
    parseBody(resStg),
  ]);

  const mapOffer = (o, type) => {
    const desc = (o.description ?? '').slice(0, 280);
    return {
      id:          `ft-${uid(o.id)}`,
      source:      'France Travail',
      title:       o.intitule ?? 'Offre France Travail',
      company:     o.entreprise?.nom ?? '',
      location:    o.lieuTravail?.libelle ?? location,
      url:         o.origineOffre?.urlOrigine
                    ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
      description: desc,
      date:        parseDate(o.dateCreation),
      type,
    };
  };

  const half = Math.ceil(limit / 2);
  return [
    ...altOffres.slice(0, half).map(o => mapOffer(o, 'alternance')),
    ...stgOffres.slice(0, limit - Math.min(altOffres.length, half)).map(o => mapOffer(o, 'stage')),
  ];
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);
  const query    = searchParams.get('q')        || 'alternance développeur';
  const location = searchParams.get('location') || 'France';
  const sources  = (searchParams.get('sources') || 'lba,adzuna,ft').split(',');
  const limit    = Math.min(parseInt(searchParams.get('limit') || '12', 10), 20);

  const scrapers = {
    lba:    () => scrapeLBA(query, location, limit),
    adzuna: () => scrapeAdzuna(query, location, limit),
    ft:     () => scrapeFranceTravail(query, location, limit),
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