// src/pages/JobBoard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Données mock (fallback si l'API n'est pas dispo) ────────────────────────
const MOCK_JOBS = [
  {
    id: 'mock_1', source: 'Indeed', sourceColor: '#2164f3',
    title: 'Alternant Cybersécurité', company: 'Orange Cyberdefense',
    location: 'Paris (75)', description: 'Rejoignez notre SOC pour une alternance de 2 ans en cybersécurité défensive. Vous participerez à la surveillance des systèmes et à la réponse aux incidents.',
    link: 'https://fr.indeed.com', date: new Date(Date.now() - 86400000).toISOString(), type: 'Alternance',
  },
  {
    id: 'mock_2', source: 'Hello Work', sourceColor: '#ff6b35',
    title: 'Alternance Administrateur Réseaux & Systèmes', company: 'Thales Group',
    location: 'Toulouse (31)', description: 'En alternance au sein de notre DSI, vous gérerez l\'infrastructure réseau, participerez à des projets de sécurisation et apprendrez aux côtés d\'experts.',
    link: 'https://www.hellowork.com', date: new Date(Date.now() - 2 * 86400000).toISOString(), type: 'Alternance',
  },
  {
    id: 'mock_3', source: 'Stage.fr', sourceColor: '#00b894',
    title: 'Alternance Analyste SOC N1/N2', company: 'Sopra Steria',
    location: 'Lyon (69)', description: 'Analyste SOC en alternance : surveillance temps réel, triage des alertes SIEM, qualification des incidents et rédaction de rapports de sécurité.',
    link: 'https://www.stage.fr', date: new Date(Date.now() - 3 * 86400000).toISOString(), type: 'Alternance',
  },
  {
    id: 'mock_4', source: 'Indeed', sourceColor: '#2164f3',
    title: 'Alternant Pentesteur / Ethical Hacker', company: 'Capgemini',
    location: 'Paris (75)', description: 'Intégrez notre équipe Red Team pour réaliser des tests d\'intrusion sur des infrastructures critiques. Formation assurée par des experts certifiés OSCP.',
    link: 'https://fr.indeed.com', date: new Date(Date.now() - 5 * 86400000).toISOString(), type: 'Alternance',
  },
  {
    id: 'mock_5', source: 'Hello Work', sourceColor: '#ff6b35',
    title: 'Alternance Ingénieur Cloud & Sécurité', company: 'Atos',
    location: 'Grenoble (38)', description: 'Vous interviendrez sur des projets de migration cloud sécurisée (Azure/AWS), mise en place de politiques de sécurité et automatisation DevSecOps.',
    link: 'https://www.hellowork.com', date: new Date(Date.now() - 7 * 86400000).toISOString(), type: 'Alternance',
  },
  {
    id: 'mock_6', source: 'Stage.fr', sourceColor: '#00b894',
    title: 'Alternance Technicien Réseaux', company: 'SFR Business',
    location: 'Bordeaux (33)', description: 'Administration et supervision du réseau cœur, déploiement de configurations, monitoring et support N2 pour nos clients entreprises.',
    link: 'https://www.stage.fr', date: new Date(Date.now() - 10 * 86400000).toISOString(), type: 'Alternance',
  },
];

// ─── Constantes ───────────────────────────────────────────────────────────────
const SOURCES = ['Toutes', 'Indeed', 'Hello Work', 'Stage.fr'];

const STATUS_CONFIG = {
  none:     { label: 'Suivre',        emoji: '＋', color: 'var(--text-secondary)', bg: 'transparent' },
  saved:    { label: 'Sauvegardé',    emoji: '⭐', color: '#f39c12',              bg: 'rgba(243,156,18,0.1)' },
  applied:  { label: 'Postulé',       emoji: '✅', color: '#27ae60',              bg: 'rgba(39,174,96,0.1)'  },
  rejected: { label: 'Non retenu',    emoji: '❌', color: '#e74c3c',              bg: 'rgba(231,76,60,0.1)'  },
};
const STATUS_CYCLE = ['none', 'saved', 'applied', 'rejected'];

const LOCATIONS_SUGGEST = ['Paris', 'Lyon', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Marseille', 'Grenoble', 'Rennes', 'France'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)}sem`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

// ─── Hooks localStorage ───────────────────────────────────────────────────────
function useJobStatuses() {
  const [statuses, setStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('job_statuses') || '{}'); } catch { return {}; }
  });
  const cycleStatus = useCallback((id) => {
    setStatuses(prev => {
      const current = prev[id] || 'none';
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [id]: next };
      localStorage.setItem('job_statuses', JSON.stringify(updated));
      return updated;
    });
  }, []);
  return { statuses, cycleStatus };
}

function useSeenJobs() {
  const [seen, setSeen] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('job_seen') || '[]')); } catch { return new Set(); }
  });
  const markSeen = useCallback((id) => {
    setSeen(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('job_seen', JSON.stringify([...next]));
      return next;
    });
  }, []);
  return { seen, markSeen };
}

// ─── Composant SourceBadge ────────────────────────────────────────────────────
function SourceBadge({ source, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>
      {source}
    </span>
  );
}

// ─── Composant JobCard ────────────────────────────────────────────────────────
function JobCard({ job, status, onCycleStatus, isSeen, onMarkSeen }) {
  const statusCfg = STATUS_CONFIG[status || 'none'];
  const [expanded, setExpanded] = useState(false);

  const handleOpen = () => {
    onMarkSeen(job.id);
    window.open(job.link, '_blank', 'noopener noreferrer');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--card-bg)',
        border: `1.5px solid ${isSeen ? 'var(--border-subtle)' : 'rgba(19,201,237,0.25)'}`,
        borderRadius: '16px',
        padding: '1.1rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '0.6rem',
        boxShadow: isSeen ? 'var(--shadow-card)' : '0 4px 20px rgba(19,201,237,0.09)',
        opacity: isSeen ? 0.85 : 1,
        transition: 'border-color 0.3s ease, opacity 0.3s ease',
        position: 'relative',
      }}
    >
      {/* Badge Nouveau */}
      {!isSeen && (
        <span style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'var(--highlight-color)', color: '#fff',
          fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px',
          borderRadius: '20px', letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Nouveau</span>
      )}

      {/* Source + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SourceBadge source={job.source} color={job.sourceColor} />
        {job.date && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: 'auto', paddingRight: isSeen ? 0 : '64px' }}>
            🕐 {timeAgo(job.date)}
          </span>
        )}
      </div>

      {/* Titre */}
      <h3
        onClick={handleOpen}
        style={{
          fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)',
          lineHeight: 1.35, cursor: 'pointer', paddingRight: !isSeen ? '52px' : 0,
        }}
      >
        {job.title}
      </h3>

      {/* Entreprise + lieu */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {job.company && job.company !== 'Inconnu' && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            🏢 {job.company}
          </span>
        )}
        {job.location && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            📍 {job.location}
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div>
          <p style={{
            fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--highlight-color)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '2px 0', marginTop: '2px' }}
            >
              {expanded ? 'Voir moins ↑' : 'Voir plus ↓'}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.1rem',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onCycleStatus(job.id); }}
          style={{
            padding: '4px 10px', borderRadius: '20px',
            border: `1px solid ${statusCfg.color}50`,
            background: statusCfg.bg, color: statusCfg.color,
            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
          title="Cliquer pour changer le statut"
        >
          {statusCfg.emoji} {statusCfg.label}
        </button>
        <button
          onClick={handleOpen}
          style={{
            padding: '5px 13px', borderRadius: '10px',
            border: '1px solid rgba(19,201,237,0.35)',
            background: 'transparent', color: 'var(--highlight-color)',
            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(19,201,237,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Voir l'offre →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [sources, setSources] = useState({});

  // Filtres
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [activeSource, setActiveSource] = useState('Toutes');
  const [activeStatus, setActiveStatus] = useState('Toutes');
  const [showNew, setShowNew] = useState(false);

  const { statuses, cycleStatus } = useJobStatuses();
  const { seen, markSeen } = useSeenJobs();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsMock(false);
    try {
      const res = await fetch('/api/jobs');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('API indisponible');
      }
      const data = await res.json();
      setJobs(data.jobs || []);
      setSources(data.sources || {});
      setFetchedAt(data.fetchedAt || null);
    } catch {
      // Fallback mock en dev / API non déployée
      setJobs(MOCK_JOBS);
      setSources({ indeed: 2, hellowork: 2, stagefr: 2 });
      setFetchedAt(new Date().toISOString());
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = jobs.filter(job => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q);

    const matchLoc = !locationFilter ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());

    const matchSource = activeSource === 'Toutes' || job.source === activeSource;

    const jobStatus = statuses[job.id] || 'none';
    const matchStatus = activeStatus === 'Toutes' || jobStatus === activeStatus;

    const matchNew = !showNew || !seen.has(job.id);

    return matchSearch && matchLoc && matchSource && matchStatus && matchNew;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const newCount = jobs.filter(j => !seen.has(j.id)).length;
  const appliedCount = Object.values(statuses).filter(s => s === 'applied').length;
  const savedCount = Object.values(statuses).filter(s => s === 'saved').length;

  const hasActiveFilter = search || locationFilter || activeSource !== 'Toutes' || activeStatus !== 'Toutes' || showNew;

  const resetFilters = () => {
    setSearch('');
    setLocationFilter('');
    setActiveSource('Toutes');
    setActiveStatus('Toutes');
    setShowNew(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-main)',
    }}>
      {/* ── Header fixe ────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-color)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        padding: '0 1.5rem',
      }}>
        <div style={{
          maxWidth: '860px', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: '1rem',
          height: '60px',
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: '1.5px solid var(--border-subtle)',
              borderRadius: '10px', padding: '6px 12px',
              color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--highlight-color)'; e.currentTarget.style.color = 'var(--highlight-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ← Portfolio
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Scraper d'offres <span style={{ color: 'var(--highlight-color)' }}>alternance</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
              Indeed · Hello Work · Stage.fr
              {fetchedAt && ` · ${timeAgo(fetchedAt)}`}
              {isMock && <span style={{ color: '#f39c12', marginLeft: '6px' }}>⚠️ Données démo</span>}
            </p>
          </div>

          <button
            onClick={fetchJobs}
            disabled={loading}
            style={{
              background: 'none', border: '1.5px solid var(--border-subtle)',
              borderRadius: '10px', padding: '6px 12px',
              color: 'var(--highlight-color)', fontSize: '0.82rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {loading ? '…' : '🔄 Refresh'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.6rem', marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Total', value: jobs.length, color: 'var(--highlight-color)' },
            { label: 'Nouveaux', value: newCount, color: '#3498db' },
            { label: 'Sauvegardés', value: savedCount, color: '#f39c12' },
            { label: 'Postulés', value: appliedCount, color: '#27ae60' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px', padding: '0.8rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Zone filtres ────────────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px', padding: '1rem 1.1rem',
          marginBottom: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>

          {/* Recherche + Localisation */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.85rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Poste, entreprise…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.6rem 0.8rem 0.6rem 2.1rem',
                  borderRadius: '10px', border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-color)', color: 'var(--text-main)',
                  fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--highlight-color)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
            <div style={{ position: 'relative', flex: '1 1 160px', minWidth: '140px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.85rem' }}>📍</span>
              <input
                type="text"
                placeholder="Ville, région…"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                list="loc-suggest"
                style={{
                  width: '100%', padding: '0.6rem 0.8rem 0.6rem 2.1rem',
                  borderRadius: '10px', border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-color)', color: 'var(--text-main)',
                  fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--highlight-color)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
              />
              <datalist id="loc-suggest">
                {LOCATIONS_SUGGEST.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
          </div>

          {/* Sources */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '2px' }}>Source</span>
            {SOURCES.map(src => (
              <button key={src} onClick={() => setActiveSource(src)} style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                border: `1.5px solid ${activeSource === src ? 'var(--highlight-color)' : 'var(--border-subtle)'}`,
                background: activeSource === src ? 'rgba(19,201,237,0.12)' : 'transparent',
                color: activeSource === src ? 'var(--highlight-color)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.18s',
              }}>
                {src} {src !== 'Toutes' && sources[src.toLowerCase().replace(' ', '')] !== undefined ? `(${sources[src.toLowerCase().replace(' ', '')] || 0})` : ''}
              </button>
            ))}
          </div>

          {/* Statuts + Nouveau */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '2px' }}>Statut</span>
            {['Toutes', 'saved', 'applied', 'rejected'].map(st => {
              const label = st === 'Toutes' ? 'Tous' : STATUS_CONFIG[st]?.emoji + ' ' + STATUS_CONFIG[st]?.label;
              const isActive = activeStatus === st;
              return (
                <button key={st} onClick={() => setActiveStatus(st)} style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  border: `1.5px solid ${isActive ? 'var(--highlight-color)' : 'var(--border-subtle)'}`,
                  background: isActive ? 'rgba(19,201,237,0.12)' : 'transparent',
                  color: isActive ? 'var(--highlight-color)' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.18s',
                }}>
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => setShowNew(v => !v)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                border: `1.5px solid ${showNew ? '#3498db' : 'var(--border-subtle)'}`,
                background: showNew ? 'rgba(52,152,219,0.12)' : 'transparent',
                color: showNew ? '#3498db' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.18s', marginLeft: 'auto',
              }}
            >
              🆕 Nouveaux seulement
            </button>
          </div>

          {/* Reset */}
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              style={{
                alignSelf: 'flex-start', background: 'none', border: 'none',
                color: 'var(--highlight-color)', fontSize: '0.75rem', fontWeight: 700,
                cursor: 'pointer', padding: 0,
              }}
            >
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* ── Feed ─────────────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid rgba(19,201,237,0.2)',
              borderTop: '3px solid #13c9ed',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '0.9rem' }}>Scraping en cours…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔎</div>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Aucune offre trouvée</div>
            <div style={{ fontSize: '0.85rem' }}>Essaie d'autres filtres ou mots-clés</div>
            {hasActiveFilter && (
              <button onClick={resetFilters} style={{
                marginTop: '1rem', padding: '8px 20px', borderRadius: '10px',
                border: '1px solid rgba(19,201,237,0.3)', background: 'rgba(19,201,237,0.08)',
                color: 'var(--highlight-color)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
              }}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              {filtered.length} offre{filtered.length > 1 ? 's' : ''} {hasActiveFilter ? 'filtrée' + (filtered.length > 1 ? 's' : '') : ''}
            </p>
            <AnimatePresence mode="popLayout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filtered.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    status={statuses[job.id]}
                    onCycleStatus={cycleStatus}
                    isSeen={seen.has(job.id)}
                    onMarkSeen={markSeen}
                  />
                ))}
              </div>
            </AnimatePresence>
          </>
        )}

        {/* Note données démo */}
        {isMock && !loading && (
          <div style={{
            marginTop: '2rem', padding: '1rem 1.25rem',
            background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.25)',
            borderRadius: '12px', fontSize: '0.82rem', color: '#f39c12',
          }}>
            ⚠️ <strong>Données de démonstration</strong> — L'API <code>/api/jobs</code> n'est pas encore déployée sur Vercel. Ces offres sont fictives. Une fois <code>api/jobs.js</code> poussé sur GitHub, les vraies offres s'afficheront.
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}