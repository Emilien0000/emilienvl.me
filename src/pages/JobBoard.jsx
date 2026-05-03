// src/pages/JobBoard.jsx
// Route : /alternances
// Sources : La Bonne Alternance + Adzuna + France Travail

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './JobBoard.css';

// ── Icônes SVG inline ────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconExternal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconRefresh = ({ spinning }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
const IconBriefcase = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ── Config sources ───────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'lba',    label: 'La Bonne Alternance', color: '#1a73e8', emoji: '🎓' },
  { id: 'adzuna', label: 'Adzuna',              color: '#e64c1f', emoji: '🔍' },
  { id: 'ft',     label: 'France Travail',      color: '#00a651', emoji: '🏛️' },
];

const TYPE_LABELS = {
  alternance: { label: 'Alternance', color: '#13c9ed' },
  stage:      { label: 'Stage',      color: '#7c3aed' },
  emploi:     { label: 'Emploi',     color: '#06395c' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)  return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function sourceColor(source) {
  return SOURCES.find(s => s.label === source || s.id === source?.toLowerCase())?.color
    ?? '#13c9ed';
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({ job, index }) {
  const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS.emploi;
  const color    = sourceColor(job.source);

  return (
    <motion.a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="jb-card"
      style={{ '--source-color': color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div className="jb-card-accent" />
      <div className="jb-card-inner">
        <div className="jb-card-top">
          <div className="jb-card-badges">
            <span className="jb-source-badge" style={{ background: color + '18', color }}>
              {job.source}
            </span>
            <span className="jb-type-badge" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>
              {typeInfo.label}
            </span>
          </div>
          <span className="jb-date">
            <IconCalendar />
            {timeAgo(job.date)}
          </span>
        </div>

        <h3 className="jb-title">{job.title}</h3>

        {job.company && (
          <p className="jb-company"><IconBriefcase />{job.company}</p>
        )}
        {job.location && (
          <p className="jb-location"><IconMap />{job.location}</p>
        )}
        {job.description && (
          <p className="jb-desc">{job.description}</p>
        )}

        <div className="jb-card-footer">
          <span className="jb-apply-btn">
            Voir l'offre <IconExternal />
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="jb-card jb-skeleton">
      <div className="jb-card-accent" style={{ opacity: 0.3 }} />
      <div className="jb-card-inner">
        <div className="jb-sk-row" style={{ width: '40%', height: 20, marginBottom: 12 }} />
        <div className="jb-sk-row" style={{ width: '85%', height: 22, marginBottom: 8 }} />
        <div className="jb-sk-row" style={{ width: '55%', height: 16, marginBottom: 6 }} />
        <div className="jb-sk-row" style={{ width: '35%', height: 14, marginBottom: 14 }} />
        <div className="jb-sk-row" style={{ width: '70%', height: 12 }} />
        <div className="jb-sk-row" style={{ width: '50%', height: 12, marginTop: 4 }} />
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function JobBoard() {
  const navigate = useNavigate();

  const [query,      setQuery]      = useState('alternance développeur');
  const [location,   setLocation]   = useState('France');
  const [sources,    setSources]    = useState(['lba', 'adzuna', 'ft']);
  const [typeFilter, setTypeFilter] = useState('all');
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [fetched,    setFetched]    = useState(false);
  const [warnings,   setWarnings]   = useState([]);

  const abortRef = useRef(null);

  const fetchJobs = useCallback(async () => {
    if (!sources.length) return;
    setLoading(true);
    setError(null);
    setJobs([]);
    setFetched(false);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        q:       query,
        location,
        sources: sources.join(','),
        limit:   '12',
      });
      const res = await fetch(`/api/jobs?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setWarnings(data.errors || []);
      setFetched(true);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [query, location, sources]);

  useEffect(() => { fetchJobs(); }, []);

  const filteredJobs = typeFilter === 'all' ? jobs : jobs.filter(j => j.type === typeFilter);
  const toggleSource = id => setSources(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  return (
    <div className="jb-root">

      {/* ── Header ── */}
      <div className="jb-header">
        <button className="jb-back-btn" onClick={() => navigate(-1)}>
          <IconBack /> Retour
        </button>

        <motion.div className="jb-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="jb-hero-badge">🎯 Job Tracker</div>
          <h1 className="jb-hero-title">
            Trouve ton <span className="highlight">alternance</span>
          </h1>
          <p className="jb-hero-sub">
            Annonces officielles — La Bonne Alternance · Adzuna · France Travail
          </p>
        </motion.div>

        {/* Formulaire de recherche */}
        <motion.form
          className="jb-search-form"
          onSubmit={e => { e.preventDefault(); fetchJobs(); }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="jb-search-row">
            <div className="jb-search-field">
              <IconSearch />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Poste, compétence…" className="jb-input" />
            </div>
            <div className="jb-search-field">
              <IconMap />
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Ville, région…" className="jb-input" />
            </div>
            <button type="submit" className="jb-search-btn" disabled={loading}>
              {loading ? <><IconRefresh spinning={true} /> Recherche…</> : <><IconSearch /> Rechercher</>}
            </button>
          </div>

          {/* Toggles sources */}
          <div className="jb-source-toggles">
            {SOURCES.map(src => (
              <button key={src.id} type="button"
                className={`jb-source-toggle ${sources.includes(src.id) ? 'active' : ''}`}
                style={{ '--src-color': src.color }}
                onClick={() => toggleSource(src.id)}
              >
                {src.emoji} {src.label}
              </button>
            ))}
          </div>
        </motion.form>
      </div>

      {/* ── Filtres type ── */}
      {fetched && !loading && (
        <div className="jb-filters">
          <div className="jb-filters-inner">
            {['all', 'alternance', 'stage', 'emploi'].map(t => (
              <button key={t} className={`jb-filter-btn ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}>
                {t === 'all'
                  ? `Tout (${jobs.length})`
                  : `${TYPE_LABELS[t]?.label} (${jobs.filter(j => j.type === t).length})`}
              </button>
            ))}
            <button className="jb-filter-btn jb-refresh-btn" onClick={fetchJobs} disabled={loading}>
              <IconRefresh spinning={loading} /> Actualiser
            </button>
          </div>
          {warnings.length > 0 && (
            <p className="jb-warn">⚠️ {warnings.join(' · ')}</p>
          )}
        </div>
      )}

      {/* ── Contenu ── */}
      <main className="jb-main">
        {error && !loading && (
          <motion.div className="jb-error-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p>😕 {error}</p>
            <button className="jb-search-btn" onClick={fetchJobs}>Réessayer</button>
          </motion.div>
        )}

        {loading && (
          <div className="jb-grid">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        )}

        {!loading && fetched && filteredJobs.length > 0 && (
          <AnimatePresence mode="popLayout">
            <div className="jb-grid">
              {filteredJobs.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}
            </div>
          </AnimatePresence>
        )}

        {!loading && fetched && filteredJobs.length === 0 && !error && (
          <motion.div className="jb-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="jb-empty-icon">🔍</div>
            <h3>Aucune offre trouvée</h3>
            <p>Essaie d'autres mots-clés ou élargis la zone géographique.</p>
          </motion.div>
        )}

        {!loading && !fetched && !error && (
          <motion.div className="jb-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="jb-empty-icon">✨</div>
            <h3>Lance une recherche</h3>
            <p>Saisis un poste et une localisation pour trouver tes offres.</p>
          </motion.div>
        )}
      </main>

      <footer className="jb-footer">
        <p>Données officielles — La Bonne Alternance · Adzuna · France Travail</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.6, fontSize: '0.75rem' }}>
          © 2026 Émilien Vitry-Lhotte
        </p>
      </footer>
    </div>
  );
}