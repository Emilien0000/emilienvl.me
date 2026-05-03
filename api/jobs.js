// api/jobs.js — Vercel Serverless Function
// Agrège les offres d'alternance depuis Indeed (RSS), Hello Work (API) et stage.fr (HTML scraping)
// Place ce fichier dans /api/jobs.js à la racine de ton projet Vite

import { load } from 'cheerio';

// ─── Config ───────────────────────────────────────────────────────────────────
const KEYWORDS = 'alternance cybersécurité réseaux informatique';
const LOCATION = 'France';
const MAX_RESULTS = 30; // par source

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch (_) {}
  return null;
}

function deduplicate(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = (j.title + j.company).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Indeed — flux RSS ────────────────────────────────────────────────────────
async function fetchIndeed() {
  try {
    const query = encodeURIComponent(KEYWORDS);
    const loc = encodeURIComponent(LOCATION);
    const url = `https://fr.indeed.com/rss?q=${query}&l=${loc}&jt=internship&sort=date`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; portfolio-bot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Indeed RSS ${res.status}`);
    const xml = await res.text();
    const $ = load(xml, { xmlMode: true });

    const jobs = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').first().text().trim();
      const link = $(el).find('link').first().text().trim() || $(el).find('guid').text().trim();
      const description = $(el).find('description').first().text().replace(/<[^>]+>/g, '').trim();
      const pubDate = normalizeDate($(el).find('pubDate').text().trim());

      // Extraire l'entreprise depuis le titre "Poste - Entreprise"
      const parts = title.split(' - ');
      const company = parts.length > 1 ? parts[parts.length - 1] : 'Inconnu';
      const jobTitle = parts.length > 1 ? parts.slice(0, -1).join(' - ') : title;

      if (jobTitle) {
        jobs.push({
          id: `indeed_${Buffer.from(link).toString('base64').slice(0, 12)}`,
          source: 'Indeed',
          sourceColor: '#2164f3',
          title: jobTitle,
          company,
          location: 'France',
          description: description.slice(0, 300),
          link,
          date: pubDate,
          type: 'Alternance',
        });
      }
    });

    return jobs.slice(0, MAX_RESULTS);
  } catch (err) {
    console.error('[Indeed]', err.message);
    return [];
  }
}

// ─── Hello Work — API publique ────────────────────────────────────────────────
async function fetchHelloWork() {
  try {
    const query = encodeURIComponent(KEYWORDS);
    const url = `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${query}&c=alternance&page=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HelloWork ${res.status}`);
    const html = await res.text();
    const $ = load(html);

    const jobs = [];

    // Hello Work charge les offres dans des balises data-json ou articles
    $('li[data-id], article[data-id], [data-offer-id]').each((_, el) => {
      const $el = $(el);
      const title = $el.find('h2, h3, [class*="title"]').first().text().trim();
      const company = $el.find('[class*="company"], [class*="entreprise"]').first().text().trim();
      const location = $el.find('[class*="location"], [class*="lieu"]').first().text().trim();
      const link = $el.find('a').first().attr('href');
      const fullLink = link ? (link.startsWith('http') ? link : `https://www.hellowork.com${link}`) : '#';

      if (title) {
        jobs.push({
          id: `hw_${$el.attr('data-id') || $el.attr('data-offer-id') || Math.random().toString(36).slice(2, 10)}`,
          source: 'Hello Work',
          sourceColor: '#ff6b35',
          title,
          company: company || 'Inconnu',
          location: location || 'France',
          description: '',
          link: fullLink,
          date: null,
          type: 'Alternance',
        });
      }
    });

    // Fallback : scraper les liens d'offres classiques
    if (jobs.length === 0) {
      $('a[href*="/emploi/"]').each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        const href = $el.attr('href');
        if (title && title.length > 10 && href && !jobs.find(j => j.link.includes(href))) {
          jobs.push({
            id: `hw_${Math.random().toString(36).slice(2, 10)}`,
            source: 'Hello Work',
            sourceColor: '#ff6b35',
            title,
            company: 'Voir l\'annonce',
            location: 'France',
            description: '',
            link: href.startsWith('http') ? href : `https://www.hellowork.com${href}`,
            date: null,
            type: 'Alternance',
          });
        }
      });
    }

    return jobs.slice(0, MAX_RESULTS);
  } catch (err) {
    console.error('[HelloWork]', err.message);
    return [];
  }
}

// ─── stage.fr — scraping HTML ─────────────────────────────────────────────────
async function fetchStageFr() {
  try {
    const query = encodeURIComponent(KEYWORDS.split(' ').slice(0, 2).join(' '));
    const url = `https://www.stage.fr/alternance?q=${query}&page=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://www.stage.fr/',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`stage.fr ${res.status}`);
    const html = await res.text();
    const $ = load(html);

    const jobs = [];

    // Sélecteurs courants de stage.fr
    const selectors = [
      '.offer-card',
      '.job-card',
      'article.offer',
      '[class*="offer-item"]',
      '[class*="job-item"]',
    ];

    let found = false;
    for (const sel of selectors) {
      if ($(sel).length > 0) {
        $(sel).each((_, el) => {
          const $el = $(el);
          const title = $el.find('h2, h3, .title, [class*="title"]').first().text().trim();
          const company = $el.find('.company, [class*="company"], [class*="entreprise"]').first().text().trim();
          const location = $el.find('.location, [class*="location"], [class*="ville"]').first().text().trim();
          const link = $el.find('a').first().attr('href');
          const fullLink = link ? (link.startsWith('http') ? link : `https://www.stage.fr${link}`) : '#';
          const date = normalizeDate($el.find('time').attr('datetime') || $el.find('[class*="date"]').text());

          if (title) {
            jobs.push({
              id: `sf_${Math.random().toString(36).slice(2, 10)}`,
              source: 'Stage.fr',
              sourceColor: '#00b894',
              title,
              company: company || 'Inconnu',
              location: location || 'France',
              description: '',
              link: fullLink,
              date,
              type: 'Alternance',
            });
          }
        });
        found = true;
        break;
      }
    }

    // Fallback JSON-LD
    if (!found) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html());
          const items = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            if (item['@type'] === 'JobPosting') {
              jobs.push({
                id: `sf_${Math.random().toString(36).slice(2, 10)}`,
                source: 'Stage.fr',
                sourceColor: '#00b894',
                title: item.title || '',
                company: item.hiringOrganization?.name || 'Inconnu',
                location: item.jobLocation?.address?.addressLocality || 'France',
                description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
                link: item.url || '#',
                date: normalizeDate(item.datePosted),
                type: 'Alternance',
              });
            }
          });
        } catch (_) {}
      });
    }

    return jobs.slice(0, MAX_RESULTS);
  } catch (err) {
    console.error('[stage.fr]', err.message);
    return [];
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // cache 5 min

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch en parallèle, timeout global 9s (Vercel pro = 30s, gratuit = 10s)
    const [indeed, hellowork, stagefr] = await Promise.allSettled([
      fetchIndeed(),
      fetchHelloWork(),
      fetchStageFr(),
    ]);

    const allJobs = [
      ...(indeed.status === 'fulfilled' ? indeed.value : []),
      ...(hellowork.status === 'fulfilled' ? hellowork.value : []),
      ...(stagefr.status === 'fulfilled' ? stagefr.value : []),
    ];

    const jobs = deduplicate(allJobs).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    const sources = {
      indeed: indeed.status === 'fulfilled' ? indeed.value.length : 0,
      hellowork: hellowork.status === 'fulfilled' ? hellowork.value.length : 0,
      stagefr: stagefr.status === 'fulfilled' ? stagefr.value.length : 0,
    };

    return res.status(200).json({
      jobs,
      total: jobs.length,
      sources,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/jobs]', err);
    return res.status(500).json({ error: 'Erreur lors de la récupération des offres' });
  }
}
