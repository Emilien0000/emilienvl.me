// api/scrape.js — Scraper complet + sauvegarde Supabase
// Appelé par : Vercel Cron (toutes les 30 min) OU manuellement via POST
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement requises :
//   SCRAPE_API_KEY    → clé ScraperAPI (https://www.scraperapi.com)
//   SUPABASE_URL      → https://xxxx.supabase.co
//   SUPABASE_ANON_KEY → clé anon publique
//   CRON_SECRET       → secret optionnel pour sécuriser l'endpoint (recommandé)
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 60 };

// ── Helpers Supabase ──────────────────────────────────────────────────────────

function sbUrl(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}
function sbHeaders(extra = {}) {
  return {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}
async function sbFetch(path, options = {}) {
  const res = await fetch(sbUrl(path), {
    ...options,
    headers: { ...sbHeaders(), ...options.headers },
  });
  if (res.status === 204) return [];
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Helpers généraux ──────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

function parseDate(raw) {
  try { const d = new Date(raw); if (!isNaN(d)) return d.toISOString(); } catch {}
  return new Date().toISOString();
}

function uid(str) {
  // Génère un identifiant court depuis une chaîne
  let h = 5381;
  const s = String(str ?? Math.random());
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h).toString(36).padStart(8, '0');
}

function guessType(text) {
  const t = (text || '').toLowerCase();
  if (/alternance|apprentissage|contrat pro/i.test(t)) return 'alternance';
  if (/stage|intern/i.test(t))                         return 'stage';
  return 'emploi';
}

// ── Détection de la plateforme ────────────────────────────────────────────────

function detectPlatform(url) {
  if (/indeed\.com/i.test(url))                        return 'indeed';
  if (/hellowork\.com/i.test(url))                     return 'hellowork';
  if (/stage\.fr/i.test(url))                          return 'stagefr';
  if (/labonnealternance\.apprentissage/i.test(url))   return 'lba';
  if (/francetravail\.fr|pole-emploi\.fr/i.test(url))  return 'ft';
  if (/adzuna\.fr/i.test(url))                         return 'adzuna';
  if (/linkedin\.com/i.test(url))                      return 'linkedin';
  if (/welcometothejungle\.com/i.test(url))            return 'wtj';
  if (/monster\.fr/i.test(url))                        return 'monster';
  return 'generic';
}

// ── Fetch via ScraperAPI ──────────────────────────────────────────────────────

async function fetchWithScraper(targetUrl, apiKey, options = {}) {
  const { render = false, country = 'fr' } = options;
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=${render}&country_code=${country}`;
  const res = await fetch(proxyUrl, {
    headers: { 'Accept': 'text/html,application/json' },
    // 55s timeout pour laisser 5s de marge sur les 60s Vercel
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status} pour ${new URL(targetUrl).hostname}`);
  return res;
}

// ── Parsers par plateforme ────────────────────────────────────────────────────

function parseIndeed(html, sourceUrl) {
  const jobs = [];

  // Stratégie 1 : window.mosaic.providerData (plusieurs chemins)
  const mosaicMatch = html.match(/window\.mosaic\.providerData\s*=\s*(\{.+?\});\s*(?:window|<)/s);
  if (mosaicMatch) {
    try {
      const mosaic = JSON.parse(mosaicMatch[1]);
      const results =
        mosaic?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results ??
        mosaic?.['mosaic-provider-jobcards']?.metaData?.jobcards?.results ??
        mosaic?.['mosaic-provider-jobcards']?.results ??
        [];
      for (const r of results) {
        const jk    = r.jobkey ?? r.jobKey ?? '';
        const title = r.displayTitle ?? r.jobTitle ?? r.title ?? '';
        if (!title) continue;
        jobs.push({
          id:          `indeed-${uid(jk || title)}`,
          source_url:  sourceUrl,
          title,
          company:     r.company ?? r.companyName ?? '',
          location:    r.formattedLocation ?? r.location ?? '',
          url:         r.thirdPartyApplyUrl ?? (jk ? `https://fr.indeed.com/viewjob?jk=${jk}` : sourceUrl),
          description: (r.snippet ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
          date:        parseDate(r.pubDate ?? r.createDate ?? r.postedAt),
          type:        guessType(title + ' ' + (r.snippet ?? '') + ' ' + (r.jobTypes?.join(' ') ?? '')),
        });
      }
      if (jobs.length) return jobs;
    } catch {}
  }

  // Stratégie 2 : JSON-LD
  const jsonLdRe = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null && jobs.length < 30) {
    try {
      const d = JSON.parse(m[1]);
      for (const item of (Array.isArray(d) ? d.flat() : [d])) {
        const job = item['@type'] === 'ListItem' ? item.item : item;
        if (job?.['@type'] !== 'JobPosting') continue;
        const title = job.title ?? '';
        jobs.push({
          id:          `indeed-${uid(job.identifier?.value ?? title)}`,
          source_url:  sourceUrl,
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

  // Stratégie 3 : data-jk dans le HTML rendu
  const jkRe = /data-jk="([^"]{8,30})"/g;
  const seen  = new Set();
  while ((m = jkRe.exec(html)) !== null && jobs.length < 30) {
    const jk = m[1];
    if (seen.has(jk)) continue;
    seen.add(jk);
    const chunk  = html.slice(Math.max(0, m.index - 200), m.index + 1800);
    const titleM = chunk.match(/class="[^"]*jobTitle[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{5,120})/i);
    const coM    = chunk.match(/class="[^"]*companyName[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})/i);
    const locM   = chunk.match(/class="[^"]*companyLocation[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})/i);
    const title  = titleM?.[1]?.trim() ?? '';
    if (!title) continue;
    jobs.push({
      id:          `indeed-${uid(jk)}`,
      source_url:  sourceUrl,
      title,
      company:     coM?.[1]?.trim() ?? '',
      location:    locM?.[1]?.trim() ?? '',
      url:         `https://fr.indeed.com/viewjob?jk=${jk}`,
      description: '',
      date:        new Date().toISOString(),
      type:        guessType(title),
    });
  }

  return jobs;
}

function parseHelloWork(html, sourceUrl) {
  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s);
  if (match) {
    try {
      const data  = JSON.parse(match[1]);
      const items = data?.jobs ?? data?.results ?? data?.offers ?? data?.offerList ?? [];
      return items.slice(0, 30).map(job => {
        const title = job.title ?? job.label ?? '';
        return {
          id:          `hw-${uid(job.id ?? job.offerId ?? title)}`,
          source_url:  sourceUrl,
          title,
          company:     job.company ?? job.companyName ?? '',
          location:    job.location ?? job.city ?? '',
          url:         job.url ?? job.applyUrl ?? sourceUrl,
          description: (job.description ?? job.resume ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
          date:        parseDate(job.date ?? job.publishedAt ?? job.createdAt),
          type:        guessType(title),
        };
      });
    } catch {}
  }
  return parseGenericHTML(html, sourceUrl, 'hellowork');
}

function parseStageFr(html, sourceUrl) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
  if (match) {
    try {
      const nd     = JSON.parse(match[1]);
      const offers = nd?.props?.pageProps?.offers ?? nd?.props?.pageProps?.initialOffers ?? nd?.props?.pageProps?.jobs ?? [];
      return offers.slice(0, 30).map(o => ({
        id:          `stage-${uid(o.id ?? o.title)}`,
        source_url:  sourceUrl,
        title:       o.title ?? o.name ?? 'Offre Stage.fr',
        company:     o.company?.name ?? o.companyName ?? '',
        location:    o.location ?? o.city ?? '',
        url:         o.url ?? `https://www.stage.fr/offres/${o.id ?? ''}`,
        description: (o.description ?? o.excerpt ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
        date:        parseDate(o.publishedAt ?? o.createdAt ?? o.date),
        type:        guessType(o.title ?? ''),
      }));
    } catch {}
  }
  return parseGenericHTML(html, sourceUrl, 'stagefr');
}

function parseLinkedIn(html, sourceUrl) {
  const jobs = [];
  const jsonLdRe = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const d = JSON.parse(m[1]);
      for (const item of (Array.isArray(d) ? d : [d])) {
        const job = item['@type'] === 'ListItem' ? item.item : item;
        if (job?.['@type'] !== 'JobPosting') continue;
        const title = job.title ?? '';
        jobs.push({
          id:          `li-${uid(job.identifier?.value ?? title)}`,
          source_url:  sourceUrl,
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
  return parseGenericHTML(html, sourceUrl, 'linkedin');
}

function parseWTJ(html, sourceUrl) {
  const match = html.match(/\{"jobs":\[{.+?\](?:,"meta"|\})/s);
  if (match) {
    try {
      const data = JSON.parse(match[0].endsWith('}') ? match[0] : match[0] + '}');
      return (data.jobs ?? []).slice(0, 30).map(j => ({
        id:          `wtj-${uid(j.id ?? j.name)}`,
        source_url:  sourceUrl,
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

function parseGenericHTML(html, sourceUrl, platform = 'generic') {
  const jobs = [];
  const prefix = platform.slice(0, 4);
  const jsonLdRe = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g;
  let m;
  while ((m = jsonLdRe.exec(html)) !== null && jobs.length < 30) {
    try {
      const d = JSON.parse(m[1]);
      for (const item of (Array.isArray(d) ? d.flat() : [d])) {
        const job = item['@type'] === 'ListItem' ? item.item : item;
        if (job?.['@type'] !== 'JobPosting') continue;
        const title = job.title ?? '';
        jobs.push({
          id:          `${prefix}-${uid(job.identifier?.value ?? title)}`,
          source_url:  sourceUrl,
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
  const titleRe = /<h[23][^>]*class="[^"]*(?:job|offer|title|poste)[^"]*"[^>]*>\s*([^<]{5,120})\s*<\/h[23]>/gi;
  while ((m = titleRe.exec(html)) !== null && jobs.length < 20) {
    const title = m[1].trim();
    jobs.push({
      id:          `${prefix}-${uid(title + platform)}`,
      source_url:  sourceUrl,
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

// ── Scraper une URL ───────────────────────────────────────────────────────────

async function scrapeUrl(targetUrl, apiKey) {
  const platform = detectPlatform(targetUrl);
  const needsRender = ['indeed', 'linkedin', 'wtj', 'monster', 'ft'].includes(platform);
  const res  = await fetchWithScraper(targetUrl, apiKey, { render: needsRender });
  const html = await res.text();

  let jobs = [];
  switch (platform) {
    case 'indeed':    jobs = parseIndeed(html, targetUrl);    break;
    case 'hellowork': jobs = parseHelloWork(html, targetUrl); break;
    case 'stagefr':   jobs = parseStageFr(html, targetUrl);  break;
    case 'linkedin':  jobs = parseLinkedIn(html, targetUrl); break;
    case 'wtj':       jobs = parseWTJ(html, targetUrl);      break;
    default:          jobs = parseGenericHTML(html, targetUrl, platform);
  }
  return { url: targetUrl, jobs, count: jobs.length, scrapedAt: new Date().toISOString() };
}

// ── Sauvegarde en DB ──────────────────────────────────────────────────────────

async function saveJobsToSupabase(jobs) {
  if (!jobs.length) return;
  // Upsert par id (on_conflict=id) — ne remplace pas les offres existantes
  await sbFetch('jb_jobs?on_conflict=url', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(jobs),
  });
}

async function updateFilterMeta(url, count, scrapedAt) {
  await sbFetch(`jb_filters?url=eq.${encodeURIComponent(url)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ last_scraped: scrapedAt, job_count: count }),
  });
}

async function pruneOldJobs() {
  // Garde seulement les 200 offres les plus récentes pour ne pas faire exploser la DB
  const rows = await sbFetch('jb_jobs?select=id&order=date.desc&limit=1&offset=200');
  if (!rows.length) return;
  // Supprime tout ce qui est plus vieux que la 200ème offre
  const cutoffId = rows[0].id;
  const cutoffRow = await sbFetch(`jb_jobs?id=eq.${cutoffId}&select=date`);
  if (!cutoffRow.length) return;
  const cutoffDate = cutoffRow[0].date;
  await sbFetch(`jb_jobs?date=lt.${encodeURIComponent(cutoffDate)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=minimal' },
  });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Sécurisation optionnelle via CRON_SECRET
  // Vercel injecte automatiquement le header Authorization pour les cron jobs
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders() });
  }

  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SCRAPE_API_KEY manquant' }),
      { status: 200, headers: corsHeaders() }
    );
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'SUPABASE_URL ou SUPABASE_ANON_KEY manquant' }),
      { status: 200, headers: corsHeaders() }
    );
  }

  try {
    // Récupère les filtres actifs depuis la DB
    const filters = await sbFetch('jb_filters?enabled=eq.true&order=created_at.asc');
    if (!filters.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'Aucun filtre actif', scraped: 0, saved: 0 }),
        { status: 200, headers: corsHeaders() }
      );
    }

    const urls = filters.map(f => f.url);

    // Scrape toutes les URLs en parallèle (avec limite de concurrence à 3 pour éviter les timeouts)
    const results = [];
    for (let i = 0; i < urls.length; i += 3) {
      const batch = urls.slice(i, i + 3);
      const settled = await Promise.allSettled(batch.map(url => scrapeUrl(url, apiKey)));
      results.push(...settled.map((r, j) => ({ url: batch[j], result: r })));
    }

    // Déduplique et insère en DB
    const seen = new Set();
    const allJobs = [];
    const errors  = [];

    for (const { url, result } of results) {
      if (result.status === 'fulfilled') {
        const { jobs, count, scrapedAt } = result.value;
        // Mettre à jour les métadonnées du filtre
        await updateFilterMeta(url, count, scrapedAt).catch(() => {});
        for (const job of jobs) {
          if (job.url && !seen.has(job.url)) {
            seen.add(job.url);
            allJobs.push(job);
          }
        }
      } else {
        const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
        errors.push(`${hostname}: ${result.reason?.message ?? 'Erreur'}`);
      }
    }

    // Sauvegarde en DB par batch de 50
    for (let i = 0; i < allJobs.length; i += 50) {
      await saveJobsToSupabase(allJobs.slice(i, i + 50));
    }

    // Nettoyage des vieilles offres
    await pruneOldJobs().catch(() => {});

    console.log(`[scrape] ${allJobs.length} offres sauvegardées, ${errors.length} erreurs`);

    return new Response(
      JSON.stringify({
        ok: true,
        scraped: results.length,
        saved: allJobs.length,
        errors,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders() }
    );

  } catch (err) {
    console.error('[scrape]', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message ?? 'Erreur inconnue' }),
      { status: 500, headers: corsHeaders() }
    );
  }
}