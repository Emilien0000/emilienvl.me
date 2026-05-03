// api/jobs.js — Vercel Edge Serverless Function
// Sources : La Bonne Alternance (gov) + Adzuna + France Travail (OAuth2)
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement requises (Vercel → Settings → Environment Variables) :
//
//   ADZUNA_APP_ID        → https://developer.adzuna.com  (gratuit, clé immédiate)
//   ADZUNA_APP_KEY       → même endroit
//   LBA_API_TOKEN        → https://api.apprentissage.beta.gouv.fr/fr/compte/profil (gratuit)
//   FT_CLIENT_ID         → https://francetravail.io  (gratuit, validation sous 24-48h)
//   FT_CLIENT_SECRET     → même endroit
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
  return btoa(String(str ?? Math.random())).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}

// ── 1. La Bonne Alternance ────────────────────────────────────────────────────
// API officielle gouvernementale — ~200k offres d'alternance en temps réel
// Token gratuit : https://api.apprentissage.beta.gouv.fr/fr/compte/profil

async function scrapeLBA(query, location, limit) {
  const token = process.env.LBA_API_TOKEN;
  if (!token) throw new Error('LBA_API_TOKEN manquant');

  const url = new URL('https://api.apprentissage.beta.gouv.fr/api/v1/jobOpportunities/search');
  url.searchParams.set('caller', 'emilienvl.me');
  url.searchParams.set('radius', '100');
  // Pas de filtre ROME → toutes les offres

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`LBA ${res.status}: ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  const rawOffers = [
    ...(data.jobs?.offres_emploi_lba ?? []),
    ...(data.jobs?.offres_emploi_partenaires ?? []),
  ];

  return rawOffers.slice(0, limit).map(o => ({
    id:          `lba-${uid(o.identifier?.id ?? o._id)}`,
    source:      'La Bonne Alternance',
    title:       o.offer?.title ?? "Offre d'alternance",
    company:     o.workplace?.name ?? o.company?.name ?? '',
    location:    o.workplace?.address?.city ?? location,
    url:         o.apply?.url ?? 'https://labonnealternance.apprentissage.beta.gouv.fr',
    description: (o.offer?.description ?? '').slice(0, 280),
    date:        parseDate(o.offer?.creation),
    type:        'alternance',
  }));
}

// ── 2. Adzuna ─────────────────────────────────────────────────────────────────
// API officielle, millions d'offres FR — clé gratuite immédiate
// Inscription : https://developer.adzuna.com

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
    const desc = (job.description ?? '').replace(/<[^>]+>/g, ' ').trim();
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

// ── 3. France Travail (ex Pôle Emploi) — OAuth2 ───────────────────────────────
// API officielle — contrats d'apprentissage (CA) et professionnalisation (CC)
// Inscription : https://francetravail.io/produits-partages/catalogue
// Scope requis : api_offresdemploiv2 + o2dsoffre

let _ftToken = null;
let _ftTokenExpires = 0;

async function getFTToken() {
  if (_ftToken && Date.now() < _ftTokenExpires - 30000) return _ftToken;

  const clientId     = process.env.FT_CLIENT_ID;
  const clientSecret = process.env.FT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('FT_CLIENT_ID / FT_CLIENT_SECRET manquants');

  const res = await fetch(
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
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
    throw new Error(`FT OAuth ${res.status}: ${txt.slice(0, 120)}`);
  }

  const json = await res.json();
  _ftToken = json.access_token;
  _ftTokenExpires = Date.now() + (json.expires_in ?? 1499) * 1000;
  return _ftToken;
}

async function scrapeFranceTravail(query, location, limit) {
  const token = await getFTToken();

  const params = new URLSearchParams({
    motsCles:    query,
    typeContrat: 'CA,CC',   // CA=apprentissage, CC=professionnalisation
    range:       `0-${limit - 1}`,
    sort:        '1',       // tri par date
  });

  const res = await fetch(
    `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
      },
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`France Travail ${res.status}: ${txt.slice(0, 120)}`);
  }

  const data = await res.json();

  return (data.resultats ?? []).slice(0, limit).map(o => ({
    id:          `ft-${uid(o.id)}`,
    source:      'France Travail',
    title:       o.intitule ?? '',
    company:     o.entreprise?.nom ?? '',
    location:    o.lieuTravail?.libelle ?? location,
    url:         o.origineOffre?.urlOrigine
                 ?? `https://www.francetravail.fr/emploi/nos-offres/detail/${o.id}`,
    description: (o.description ?? '').slice(0, 280),
    date:        parseDate(o.dateCreation),
    type:        o.typeContrat === 'CA' || o.typeContrat === 'CC' ? 'alternance'
                : o.typeContrat === 'ST' ? 'stage'
                : 'emploi',
  }));
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
  const limit    = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

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