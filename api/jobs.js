// api/jobs.js — Vercel Edge Serverless Function
// Nouveau système : scraping par URL directe
// On reçoit une liste d'URLs de pages de résultats, on les scrape toutes
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement :
//   SCRAPE_API_KEY   → clé ScraperAPI (https://www.scraperapi.com — 1000 req/mois gratuit)
//                      Utilisé pour TOUTES les sources (Indeed, HelloWork, Stage.fr, LBA, etc.)
//   LBA_API_TOKEN    → optionnel — si présent, scrape LBA via leur API officielle au lieu du HTML
//   ADZUNA_APP_ID    → optionnel — si présent, scrape Adzuna via leur API officielle
//   ADZUNA_APP_KEY   → voir ci-dessus
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
    .replace(/[^a-zA-Z0-9]/g, '').slice(0, 14);
}

// ── Détection de la plateforme depuis l'URL ───────────────────────────────────

function detectPlatform(url) {
  if (/indeed\.com/i.test(url))                    return 'indeed';
  if (/hellowork\.com/i.test(url))                 return 'hellowork';
  if (/stage\.fr/i.test(url))                      return 'stagefr';
  if (/labonnealternance\.apprentissage/i.test(url)) return 'lba';
  if (/francetravail\.fr|pole-emploi\.fr/i.test(url)) return 'ft';
  if (/adzuna\.fr/i.test(url))                     return 'adzuna';
  if (/linkedin\.com/i.test(url))                  return 'linkedin';
  if (/welcometothejungle\.com/i.test(url))        return 'wtj';
  if (/monster\.fr/i.test(url))                    return 'monster';
  return 'generic';
}

// ── Helper : fetch via ScraperAPI ─────────────────────────────────────────────

async function fetchWithScraper(targetUrl, apiKey, options = {}) {
  const { render = false, country = 'fr' } = options;
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=${render}&country_code=${country}`;
  const res = await fetch(proxyUrl, { headers: { 'Accept': 'text/html,application/json' } });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status} pour ${new URL(targetUrl).hostname}`);
  return res;
}

// ── Helper : type de contrat ──────────────────────────────────────────────────

function guessType(text) {
  const t = (text || '').toLowerCase();
  if (/alternance|apprentissage|contrat pro/i.test(t)) return 'alternance';
  if (/stage|intern/i.test(t))                         return 'stage';
  return 'emploi';
}

// ── Extracteurs HTML par plateforme ──────────────────────────────────────────

// ── Indeed ────────────────────────────────────────────────────────────────────
// Indeed expose ses résultats en JSON dans une balise <script id="mosaic-data">
// ou via le JSON-LD. On tente plusieurs stratégies.

function parseIndeed(html, sourceUrl) {
  const jobs = [];

  // Stratégie 1 : JSON dans window.mosaic.providerData
  const mosaicMatch = html.match(/window\.mosaic\.providerData\s*=\s*({.+?});\s*window/s);
  if (mosaicMatch) {
    try {
      const mosaic = JSON.parse(mosaicMatch[1]);
      const results = mosaic?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results ?? [];
      for (const r of results) {
        const title = r.displayTitle ?? r.jobTitle ?? '';
        jobs.push({
          id:          `indeed-${uid(r.jobkey ?? r.jobKey ?? Math.random())}`,
          sourceUrl,
          title,
          company:     r.company ?? r.companyName ?? '',
          location:    r.formattedLocation ?? r.location ?? '',
          url:         r.thirdPartyApplyUrl ?? `https://fr.indeed.com/viewjob?jk=${r.jobkey ?? ''}`,
          description: (r.snippet ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
          date:        parseDate(r.pubDate ?? r.createDate),
          type:        guessType(title + ' ' + (r.snippet ?? '') + ' ' + (r.jobTypes?.join(' ') ?? '')),
        });
      }
      if (jobs.length) return jobs;
    } catch {}
  }

  // Stratégie 2 : balises <div class="job_seen_beacon"> / data-jk
  const jobCardRe = /<div[^>]*data-jk="([^"]+)"[^>]*>([\s\S]+?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  while ((m = jobCardRe.exec(html)) !== null && jobs.length < 30) {
    const jk   = m[1];
    const body = m[2];
    const title = (body.match(/<span[^>]*jobTitle[^>]*>([^<]+)<\/span>/i) ?? [])[1] ?? '';
    const co    = (body.match(/class="companyName"[^>]*>([^<]+)<\/span>/i) ?? [])[1] ?? '';
    const loc   = (body.match(/class="companyLocation"[^>]*>([^<]+)<\/span>/i) ?? [])[1] ?? '';
    if (!title) continue;
    jobs.push({
      id:       `indeed-${uid(jk)}`,
      sourceUrl,
      title:    title.trim(),
      company:  co.trim(),
      location: loc.trim(),
      url:      `https://fr.indeed.com/viewjob?jk=${jk}`,
      description: '',
      date:     new Date().toISOString(),
      type:     guessType(title),
    });
  }

  return jobs;
}

// ── HelloWork ─────────────────────────────────────────────────────────────────
// HelloWork expose un état React initial : window.__INITIAL_STATE__

function parseHelloWork(html, sourceUrl) {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s);
  if (!match) {
    // Fallback : scrape HTML direct
    return parseGenericHTML(html, sourceUrl, 'hellowork');
  }
  try {
    const data  = JSON.parse(match[1]);
    const items = data?.jobs ?? data?.results ?? data?.offers ?? data?.offerList ?? [];
    return items.slice(0, 30).map(job => {
      const title = job.title ?? job.label ?? '';
      return {
        id:          `hw-${uid(job.id ?? job.offerId ?? Math.random())}`,
        sourceUrl,
        title,
        company:     job.company ?? job.companyName ?? '',
        location:    job.location ?? job.city ?? '',
        url:         job.url ?? job.applyUrl ?? sourceUrl,
        description: (job.description ?? job.resume ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
        date:        parseDate(job.date ?? job.publishedAt ?? job.createdAt),
        type:        guessType(title),
      };
    });
  } catch {
    return parseGenericHTML(html, sourceUrl, 'hellowork');
  }
}

// ── Stage.fr ──────────────────────────────────────────────────────────────────
// Stage.fr est une app Next.js — état dans <script id="__NEXT_DATA__">

function parseStageFr(html, sourceUrl) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (!match) return parseGenericHTML(html, sourceUrl, 'stagefr');
  try {
    const nd     = JSON.parse(match[1]);
    const offers = nd?.props?.pageProps?.offers ?? nd?.props?.pageProps?.initialOffers ?? nd?.props?.pageProps?.jobs ?? [];
    return offers.slice(0, 30).map(o => ({
      id:          `stage-${uid(o.id ?? Math.random())}`,
      sourceUrl,
      title:       o.title ?? o.name ?? 'Offre Stage.fr',
      company:     o.company?.name ?? o.companyName ?? '',
      location:    o.location ?? o.city ?? '',
      url:         o.url ?? `https://www.stage.fr/offres/${o.id ?? ''}`,
      description: (o.description ?? o.excerpt ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
      date:        parseDate(o.publishedAt ?? o.createdAt ?? o.date),
      type:        guessType(o.title ?? ''),
    }));
  } catch {
    return parseGenericHTML(html, sourceUrl, 'stagefr');
  }
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────
// LinkedIn expose les offres en JSON-LD ou dans des attributs data-*

function parseLinkedIn(html, sourceUrl) {
  const jobs = [];

  // Stratégie 1 : JSON-LD
  const jsonLdRe = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      const items = Array.isArray(d) ? d : [d];
      for (const item of items) {
        if (item['@type'] === 'JobPosting' || item['@type'] === 'ListItem') {
          const job = item['@type'] === 'ListItem' ? item.item : item;
          const title = job.title ?? '';
          jobs.push({
            id:          `li-${uid(job.identifier?.value ?? Math.random())}`,
            sourceUrl,
            title,
            company:     job.hiringOrganization?.name ?? '',
            location:    job.jobLocation?.address?.addressLocality ?? '',
            url:         job.url ?? sourceUrl,
            description: (job.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
            date:        parseDate(job.datePosted),
            type:        guessType(title + ' ' + (job.employmentType ?? '')),
          });
        }
      }
    } catch {}
  }
  if (jobs.length) return jobs;

  return parseGenericHTML(html, sourceUrl, 'linkedin');
}

// ── Welcome to the Jungle ─────────────────────────────────────────────────────

function parseWTJ(html, sourceUrl) {
  // WTJ est une app React avec état dans un script JSON
  const match = html.match(/\{"jobs":\[{.+?\](?:,"meta"|\})/s);
  if (match) {
    try {
      const data = JSON.parse(match[0].endsWith('}') ? match[0] : match[0] + '}');
      return (data.jobs ?? []).slice(0, 30).map(j => ({
        id:          `wtj-${uid(j.id ?? Math.random())}`,
        sourceUrl,
        title:       j.name ?? j.title ?? '',
        company:     j.organization?.name ?? '',
        location:    j.offices?.map(o => o.city).join(', ') ?? '',
        url:         `https://www.welcometothejungle.com/fr/companies/${j.organization?.slug ?? ''}/jobs/${j.slug ?? ''}`,
        description: (j.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
        date:        parseDate(j.publishedAt),
        type:        guessType(j.name ?? ''),
      }));
    } catch {}
  }
  return parseGenericHTML(html, sourceUrl, 'wtj');
}

// ── Extracteur générique ───────────────────────────────────────────────────────
// Tente d'extraire des offres depuis le JSON-LD, les microdata, ou des patterns communs

function parseGenericHTML(html, sourceUrl, platform = 'generic') {
  const jobs = [];
  const prefix = platform.slice(0, 4);

  // JSON-LD
  const jsonLdRe = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null && jobs.length < 30) {
    try {
      const d = JSON.parse(m[1]);
      const candidates = Array.isArray(d) ? d.flat() : [d];
      for (const item of candidates) {
        const job = item['@type'] === 'ListItem' ? item.item : item;
        if (job?.['@type'] !== 'JobPosting') continue;
        const title = job.title ?? '';
        jobs.push({
          id:          `${prefix}-${uid(job.identifier?.value ?? Math.random())}`,
          sourceUrl,
          title,
          company:     job.hiringOrganization?.name ?? '',
          location:    job.jobLocation?.address?.addressLocality ?? '',
          url:         job.url ?? sourceUrl,
          description: (job.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
          date:        parseDate(job.datePosted),
          type:        guessType(title + ' ' + (job.employmentType ?? '')),
        });
      }
    } catch {}
  }
  if (jobs.length) return jobs;

  // Fallback : cherche des patterns classiques de titre d'offre dans le HTML
  const titleRe = /<h[23][^>]*class="[^"]*(?:job|offer|title|poste)[^"]*"[^>]*>\s*([^<]{5,120})\s*<\/h[23]>/gi;
  while ((m = titleRe.exec(html)) !== null && jobs.length < 20) {
    const title = m[1].trim();
    jobs.push({
      id:          `${prefix}-${uid(title + Math.random())}`,
      sourceUrl,
      title,
      company:     '',
      location:    '',
      url:         sourceUrl,
      description: '',
      date:        new Date().toISOString(),
      type:        guessType(title),
    });
  }

  return jobs;
}

// ── Scraper principal pour une URL ────────────────────────────────────────────

async function scrapeUrl(targetUrl, apiKey) {
  const platform = detectPlatform(targetUrl);

  // LBA API officielle (si token dispo) → on délègue à l'ancienne logique
  // mais on s'assure que l'URL LBA est scrapée directement si pas de token

  const needsRender = ['linkedin', 'wtj', 'monster'].includes(platform);

  const res  = await fetchWithScraper(targetUrl, apiKey, { render: needsRender });
  const html = await res.text();

  let jobs = [];
  switch (platform) {
    case 'indeed':    jobs = parseIndeed(html, targetUrl);    break;
    case 'hellowork': jobs = parseHelloWork(html, targetUrl); break;
    case 'stagefr':   jobs = parseStageFr(html, targetUrl);  break;
    case 'linkedin':  jobs = parseLinkedIn(html, targetUrl); break;
    case 'wtj':       jobs = parseWTJ(html, targetUrl);      break;
    default:          jobs = parseGenericHTML(html, targetUrl, platform); break;
  }

  return { url: targetUrl, jobs, count: jobs.length, scrapedAt: new Date().toISOString() };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);
  const apiKey = process.env.SCRAPE_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ jobs: [], errors: ['SCRAPE_API_KEY manquant'], sourceMeta: {} }),
      { status: 200, headers: corsHeaders() }
    );
  }

  // Liste d'URLs séparées par virgule
  const rawUrls = searchParams.get('urls') || searchParams.get('url') || '';
  const urls    = rawUrls.split(',').map(u => u.trim()).filter(u => {
    try { new URL(u); return true; } catch { return false; }
  });

  const limit = Math.min(parseInt(searchParams.get('limit') || '60', 10), 100);

  if (!urls.length) {
    return new Response(
      JSON.stringify({ jobs: [], errors: ['Aucune URL valide fournie'], sourceMeta: {} }),
      { status: 200, headers: corsHeaders() }
    );
  }

  // Scrape toutes les URLs en parallèle
  const settled = await Promise.allSettled(urls.map(url => scrapeUrl(url, apiKey)));

  // Déduplique par URL d'offre, trie par date
  const seen = new Set();
  const allJobs = settled
    .flatMap((r, i) => r.status === 'fulfilled' ? r.value.jobs : [])
    .filter(j => {
      if (!j.url || seen.has(j.url)) return false;
      seen.add(j.url);
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  // Métadonnées par URL source
  const sourceMeta = {};
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sourceMeta[urls[i]] = { scrapedAt: r.value.scrapedAt, count: r.value.count };
    }
  });

  // Erreurs
  const errors = settled
    .map((r, i) => r.status === 'rejected' ? `${new URL(urls[i]).hostname}: ${r.reason?.message ?? 'Erreur'}` : null)
    .filter(Boolean);

  return new Response(
    JSON.stringify({ jobs: allJobs, total: allJobs.length, errors, sourceMeta }),
    { status: 200, headers: corsHeaders() }
  );
}