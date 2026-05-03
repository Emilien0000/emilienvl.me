// api/jobs.js — Vercel Serverless Function
// Scrape Indeed (RSS), HelloWork (RSS) et Stage.fr (HTML)
// Déployé automatiquement sur Vercel dans /api/

export const config = { runtime: 'edge' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function xmlText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return (m[1] ?? m[2] ?? '').trim();
}

function parseRSSItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    items.push(m[1]);
  }
  return items;
}

function cleanHTML(str) {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseDate(raw) {
  try {
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString();
  } catch {}
  return new Date().toISOString();
}

// ── Scraper Indeed RSS ────────────────────────────────────────────────────────

async function scrapeIndeed(query, location, limit) {
  // Indeed RSS (non officiel mais public)
  const url = `https://fr.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&sort=date&limit=${limit}&fromage=30`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!res.ok) throw new Error(`Indeed RSS: ${res.status}`);
  const xml = await res.text();
  const items = parseRSSItems(xml);

  return items.slice(0, limit).map(item => {
    const title     = cleanHTML(xmlText(item, 'title'));
    const link      = xmlText(item, 'link') || xmlText(item, 'guid');
    const pubDate   = xmlText(item, 'pubDate');
    const desc      = cleanHTML(xmlText(item, 'description'));
    // Indeed encode l'entreprise dans le titre "Poste — Entreprise"
    const [jobTitle, company] = title.includes(' - ')
      ? title.split(' - ').map(s => s.trim())
      : [title, ''];
    // Localisation dans la description
    const locMatch  = desc.match(/([A-Z][a-zÀ-ÿ\s-]+(?:\s\(\d{2,5}\))?)\s*[-–]/);
    const jobLocation = locMatch ? locMatch[1].trim() : location;

    return {
      id: `indeed-${Buffer.from(link).toString('base64').slice(0, 12)}`,
      source: 'Indeed',
      title: jobTitle,
      company,
      location: jobLocation,
      url: link,
      description: desc.slice(0, 280),
      date: parseDate(pubDate),
      type: desc.toLowerCase().includes('alternance') ? 'alternance'
           : desc.toLowerCase().includes('stage') ? 'stage' : 'emploi',
    };
  });
}

// ── Scraper HelloWork RSS ─────────────────────────────────────────────────────

async function scrapeHelloWork(query, location, limit) {
  const url = `https://www.hellowork.com/rss/offres-emploi/?k=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&contrat=alternance,stage`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!res.ok) throw new Error(`HelloWork RSS: ${res.status}`);
  const xml = await res.text();
  const items = parseRSSItems(xml);

  return items.slice(0, limit).map(item => {
    const title    = cleanHTML(xmlText(item, 'title'));
    const link     = xmlText(item, 'link') || xmlText(item, 'guid');
    const pubDate  = xmlText(item, 'pubDate');
    const desc     = cleanHTML(xmlText(item, 'description'));
    const company  = cleanHTML(xmlText(item, 'author') || xmlText(item, 'dc:creator') || '');
    const category = cleanHTML(xmlText(item, 'category'));

    return {
      id: `hw-${Buffer.from(link).toString('base64').slice(0, 12)}`,
      source: 'HelloWork',
      title,
      company,
      location,
      url: link,
      description: desc.slice(0, 280),
      date: parseDate(pubDate),
      type: category.toLowerCase().includes('alternance') ? 'alternance'
           : category.toLowerCase().includes('stage') ? 'stage' : 'emploi',
    };
  });
}

// ── Scraper Stage.fr (HTML léger) ────────────────────────────────────────────

async function scrapeStage(query, location, limit) {
  const url = `https://www.stage.fr/offres-de-stage?motcle=${encodeURIComponent(query)}&lieu=${encodeURIComponent(location)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`Stage.fr: ${res.status}`);
  const html = await res.text();

  // Extraire les cards d'offres via regex sur le HTML brut
  const cards = [];
  // Sélecteur générique sur les blocs d'offres Stage.fr
  const cardRegex = /class="[^"]*offer[^"]*"[\s\S]*?<\/(?:article|div)>/gi;
  const titleRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i;
  const linkRegex = /href="(\/offre[^"]+)"/i;
  const companyRegex = /class="[^"]*company[^"]*"[^>]*>([\s\S]*?)<\//i;
  const locationRegex = /class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\//i;
  const dateRegex = /class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\//i;

  // Fallback : parser les balises <a> ayant /offre dans l'href
  const linkTitleRegex = /href="(\/offres?[^"]+)"[^>]*>[\s\S]*?<[^>]*>([\s\S]*?)<\/[^>]*>/gi;
  let m;
  const seen = new Set();

  while ((m = linkTitleRegex.exec(html)) !== null && cards.length < limit) {
    const path = m[1];
    const rawTitle = cleanHTML(m[2]);
    if (!rawTitle || rawTitle.length < 5) continue;
    if (seen.has(path)) continue;
    seen.add(path);

    cards.push({
      id: `stage-${Buffer.from(path).toString('base64').slice(0, 12)}`,
      source: 'Stage.fr',
      title: rawTitle,
      company: '',
      location,
      url: `https://www.stage.fr${path}`,
      description: '',
      date: new Date().toISOString(),
      type: 'stage',
    });
  }

  return cards.slice(0, limit);
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const { searchParams } = new URL(req.url);
  const query    = searchParams.get('q')        || 'alternance développeur';
  const location = searchParams.get('location') || 'France';
  const sources  = (searchParams.get('sources') || 'indeed,hellowork,stage').split(',');
  const limit    = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

  const results  = await Promise.allSettled([
    sources.includes('indeed')    ? scrapeIndeed(query, location, limit)    : Promise.resolve([]),
    sources.includes('hellowork') ? scrapeHelloWork(query, location, limit) : Promise.resolve([]),
    sources.includes('stage')     ? scrapeStage(query, location, limit)     : Promise.resolve([]),
  ]);

  const jobs = results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason?.message || 'Erreur inconnue');

  return new Response(
    JSON.stringify({ jobs, total: jobs.length, errors, query, location }),
    { status: 200, headers: corsHeaders() }
  );
}