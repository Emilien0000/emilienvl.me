// api/scrape.js — Fire-and-forget : répond immédiatement, scrape en arrière-plan
// Le frontend poll GET /api/scrape?jobId=xxx pour connaître l'avancement
// ─────────────────────────────────────────────────────────────────────────────
// Variables d'environnement requises :
//   SCRAPE_API_KEY    → clé ScraperAPI
//   SUPABASE_URL      → https://xxxx.supabase.co
//   SUPABASE_ANON_KEY → clé anon publique
//   CRON_SECRET       → secret optionnel pour sécuriser l'endpoint
//
// Table Supabase supplémentaire à créer :
//   CREATE TABLE jb_scrape_jobs (
//     id TEXT PRIMARY KEY,
//     status TEXT DEFAULT 'pending',   -- pending | running | done | error
//     user_id TEXT,
//     started_at TIMESTAMPTZ DEFAULT now(),
//     finished_at TIMESTAMPTZ,
//     result JSONB
//   );
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Content-Type': 'application/json',
  };
}

function parseDate(raw) {
  try { const d = new Date(raw); if (!isNaN(d)) return d.toISOString(); } catch {}
  return new Date().toISOString();
}

function uid(str) {
  let h = 5381;
  const s = String(str ?? Math.random());
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h).toString(36).padStart(8, '0');
}

function guessType(text) {
  const t = (text || '').toLowerCase();
  if (/alternance|apprentissage|contrat pro/i.test(t)) return 'alternance';
  if (/stage|intern/i.test(t)) return 'stage';
  return 'emploi';
}

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

async function fetchWithScraper(targetUrl, apiKey, options = {}) {
  const { render = false, country = 'fr' } = options;
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=${render}&country_code=${country}`;
  const res = await fetch(proxyUrl, {
    headers: { 'Accept': 'text/html,application/json' },
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status} pour ${new URL(targetUrl).hostname}`);
  return res;
}

// ── Parsers (identiques à l'original) ────────────────────────────────────────

function parseIndeed(html, sourceUrl) {
  const jobs = [];
  const mosaicMatch = html.match(/window\.mosaic\.providerData\s*=\s*(\{.+?\});\s*(?:window|<)/s);
  if (mosaicMatch) {
    try {
      const mosaic = JSON.parse(mosaicMatch[1]);
      const results =
        mosaic?.['mosaic-provider-jobcards']?.metaData?.mosaicProviderJobCardsModel?.results ??
        mosaic?.['mosaic-provider-jobcards']?.metaData?.jobcards?.results ??
        mosaic?.['mosaic-provider-jobcards']?.results ?? [];
      for (const r of results) {
        const jk = r.jobkey ?? r.jobKey ?? '';
        const title = r.displayTitle ?? r.jobTitle ?? r.title ?? '';
        if (!title) continue;
        jobs.push({
          id: `indeed-${uid(jk || title)}`,
          source_url: sourceUrl,
          title,
          company: r.company ?? r.companyName ?? '',
          location: r.formattedLocation ?? r.location ?? '',
          url: r.thirdPartyApplyUrl ?? (jk ? `https://fr.indeed.com/viewjob?jk=${jk}` : sourceUrl),
          description: (r.snippet ?? '').replace(/<[^>]+>/g, ' ').trim().slice(0, 300),
          date: parseDate(r.pubDate ?? r.createDate ?? r.postedAt),
          type: guessType(title + ' ' + (r.snippet ?? '') + ' ' + (r.jobTypes?.join(' ') ?? '')),
        });
      }
      if (jobs.length) return jobs;
    } catch {}
  }
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
          id: `indeed-${uid(job.identifier?.value ?? title)}`,
          source_url: sourceUrl,
          title,
          company: job.hiringOrganization?.name ?? '',
          location: job.jobLocation?.address?.addressLocality ?? '',
          url: job.url ?? sourceUrl,
          description: (job.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
          date: parseDate(job.datePosted),
          type: guessType(title + ' ' + (job.employmentType ?? '')),
        });
      }
    } catch {}
  }
  if (jobs.length) return jobs;
  const jkRe = /data-jk="([^"]{8,30})"/g;
  const seen = new Set();
  while ((m = jkRe.exec(html)) !== null && jobs.length < 30) {
    const jk = m[1];
    if (seen.has(jk)) continue;
    seen.add(jk);
    const chunk = html.slice(Math.max(0, m.index - 200), m.index + 1800);
    const titleM = chunk.match(/class="[^"]*jobTitle[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{5,120})/i);
    const coM = chunk.match(/class="[^"]*companyName[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})/i);
    const locM = chunk.match(/class="[^"]*companyLocation[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})/i);
    const title = titleM?.[1]?.trim() ?? '';
    if (!title) continue;
    jobs.push({
      id: `indeed-${uid(jk)}`,
      source_url: sourceUrl,
      title,
      company: coM?.[1]?.trim() ?? '',
      location: locM?.[1]?.trim() ?? '',
      url: `https://fr.indeed.com/viewjob?jk=${jk}`,
      description: '',
      date: new Date().toISOString(),
      type: guessType(title),
    });
  }
  return jobs;
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
          id: `${prefix}-${uid(job.identifier?.value ?? title)}`,
          source_url: sourceUrl,
          title,
          company: job.hiringOrganization?.name ?? '',
          location: job.jobLocation?.address?.addressLocality ?? '',
          url: job.url ?? sourceUrl,
          description: (job.description ?? '').replace(/<[^>]+>/g, ' ').slice(0, 300),
          date: parseDate(job.datePosted),
          type: guessType(title + ' ' + (job.employmentType ?? '')),
        });
      }
    } catch {}
  }
  return jobs;
}

async function scrapeUrl(targetUrl, apiKey) {
  const platform = detectPlatform(targetUrl);
  const needsRender = ['indeed', 'linkedin', 'wtj', 'monster', 'ft'].includes(platform);
  const res = await fetchWithScraper(targetUrl, apiKey, { render: needsRender });
  const html = await res.text();
  let jobs = platform === 'indeed' ? parseIndeed(html, targetUrl) : parseGenericHTML(html, targetUrl, platform);
  return { url: targetUrl, jobs, count: jobs.length, scrapedAt: new Date().toISOString() };
}

async function saveJobsToSupabase(jobs) {
  if (!jobs.length) return;
  await sbFetch('jb_jobs?on_conflict=url', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(jobs),
  });
}

async function updateFilterMeta(url, userId, count, scrapedAt) {
  const encodedUrl = encodeURIComponent(url);
  const userFilter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';
  await sbFetch(`jb_filters?url=eq.${encodedUrl}${userFilter}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ last_scraped: scrapedAt, job_count: count }),
  });
}

async function updateJobStatus(jobId, status, result = null) {
  const body = { status };
  if (status === 'done' || status === 'error') body.finished_at = new Date().toISOString();
  if (result) body.result = result;
  await sbFetch(`jb_scrape_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // ── GET /api/scrape?jobId=xxx → statut d'un scrape en cours ──────────────
  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId requis' }), { status: 400, headers: corsHeaders() });
    }
    try {
      const rows = await sbFetch(`jb_scrape_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,status,result,started_at,finished_at`);
      if (!rows.length) {
        return new Response(JSON.stringify({ status: 'not_found' }), { status: 404, headers: corsHeaders() });
      }
      return new Response(JSON.stringify(rows[0]), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders() });
    }
  }

  // ── POST /api/scrape → déclenche le scraping, répond IMMÉDIATEMENT ────────
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers: corsHeaders() });
  }

  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Variables d\'environnement manquantes' }),
      { status: 500, headers: corsHeaders() }
    );
  }

  // Récupère l'identifiant utilisateur depuis le header (envoyé par le frontend)
  const userId = req.headers.get('x-user-id') ?? null;

  // Crée un job de scraping en DB
  const jobId = `scrape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    await sbFetch('jb_scrape_jobs', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: jobId, status: 'pending', user_id: userId }),
    });
  } catch (err) {
    // Table peut ne pas exister encore — on continue quand même
    console.warn('[scrape] Impossible de créer le job en DB:', err.message);
  }

  // Réponse IMMÉDIATE au frontend avec le jobId pour le polling
  const immediateResponse = new Response(
    JSON.stringify({ ok: true, jobId, status: 'pending', message: 'Scraping démarré en arrière-plan' }),
    { status: 202, headers: corsHeaders() }
  );

  // Lance le scraping en arrière-plan (Vercel Edge/Node attendra la fin avant de tuer la fonction)
  (async () => {
    try {
      await updateJobStatus(jobId, 'running');

      // Filtre selon user_id si présent
      const filterPath = userId
        ? `jb_filters?enabled=eq.true&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`
        : 'jb_filters?enabled=eq.true&order=created_at.asc';

      const filters = await sbFetch(filterPath);
      if (!filters.length) {
        await updateJobStatus(jobId, 'done', { scraped: 0, saved: 0, errors: [], message: 'Aucun filtre actif' });
        return;
      }

      const urls = filters.map(f => f.url);
      const results = [];

      // Scrape par batch de 2 (plus prudent pour le timeout Vercel)
      for (let i = 0; i < urls.length; i += 2) {
        const batch = urls.slice(i, i + 2);
        const settled = await Promise.allSettled(batch.map(url => scrapeUrl(url, apiKey)));
        results.push(...settled.map((r, j) => ({ url: batch[j], result: r })));
      }

      const seen = new Set();
      const allJobs = [];
      const errors = [];

      for (const { url, result } of results) {
        if (result.status === 'fulfilled') {
          const { jobs, count, scrapedAt } = result.value;
          await updateFilterMeta(url, userId, count, scrapedAt).catch(() => {});
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

      for (let i = 0; i < allJobs.length; i += 50) {
        await saveJobsToSupabase(allJobs.slice(i, i + 50));
      }

      await updateJobStatus(jobId, 'done', {
        scraped: results.length,
        saved: allJobs.length,
        errors,
        timestamp: new Date().toISOString(),
      });

      console.log(`[scrape] job=${jobId} ${allJobs.length} offres sauvegardées, ${errors.length} erreurs`);
    } catch (err) {
      console.error('[scrape] background error:', err);
      await updateJobStatus(jobId, 'error', { error: err.message ?? 'Erreur inconnue' });
    }
  })();

  return immediateResponse;
}