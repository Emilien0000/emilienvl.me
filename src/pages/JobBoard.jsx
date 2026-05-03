// src/pages/JobBoard.jsx
// Route : /alternances
// Sources : LBA + Adzuna + France Travail + Indeed + HelloWork + Stage.fr

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './JobBoard.css';

// ── Icônes SVG ───────────────────────────────────────────────────────────────

const IconSearch   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const IconMap      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconExternal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconRefresh  = ({ spinning }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>;
const IconBack     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconBriefcase= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IconCalendar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconBookmark = ({ filled }) => <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconBan      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>;
const IconFilter   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconPlus     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconX        = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconTrash    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

// ── Config sources ────────────────────────────────────────────────────────────

const SOURCES = [
  { id: 'lba',       label: 'La Bonne Alternance', color: '#1a73e8', emoji: '🎓' },
  { id: 'adzuna',    label: 'Adzuna',              color: '#e64c1f', emoji: '🔍' },
  { id: 'ft',        label: 'France Travail',      color: '#00a651', emoji: '🏛️' },
  { id: 'indeed',    label: 'Indeed',              color: '#2557a7', emoji: '💼' },
  { id: 'hellowork', label: 'HelloWork',           color: '#7c3aed', emoji: '👋' },
  { id: 'stagefr',   label: 'Stage.fr',            color: '#f59e0b', emoji: '📋' },
];

const TYPE_LABELS = {
  alternance: { label: 'Alternance', color: '#13c9ed' },
  stage:      { label: 'Stage',      color: '#7c3aed' },
  emploi:     { label: 'Emploi',     color: '#1a73e8' },
};

const CONTRACT_TYPES = ['alternance', 'stage', 'emploi', 'cdi', 'cdd'];
const EXPERIENCE_OPTS = ['Débutant', '1-3 ans', '3-5 ans', '5+ ans'];
const SALARY_OPTS = ['< 25k', '25-35k', '35-50k', '50k+'];

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return SOURCES.find(s => s.label === source || s.id === source?.toLowerCase())?.color ?? '#13c9ed';
}

function jobMatchesBanwords(job, banwords) {
  if (!banwords.length) return false;
  const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return banwords.some(w => w && text.includes(w.toLowerCase()));
}

// ── TagInput — petit composant pour saisir des tags ──────────────────────────

function TagInput({ tags, onAdd, onRemove, placeholder, color = 'var(--cyan)' }) {
  const [val, setVal] = useState('');

  const add = () => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) { onAdd(trimmed); }
    setVal('');
  };

  return (
    <div className="jb-tag-input-wrap">
      <div className="jb-tags-list">
        {tags.map(t => (
          <span key={t} className="jb-tag" style={{ '--tag-color': color }}>
            {t}
            <button className="jb-tag-rm" onClick={() => onRemove(t)}><IconX /></button>
          </span>
        ))}
      </div>
      <div className="jb-tag-field">
        <input
          className="jb-input jb-tag-input"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <button className="jb-tag-add-btn" onClick={add} style={{ color }}><IconPlus /></button>
      </div>
    </div>
  );
}

// ── JobCard ───────────────────────────────────────────────────────────────────

function JobCard({ job, index, saved, onSave }) {
  const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS.emploi;
  const color    = sourceColor(job.source);

  return (
    <motion.div
      className="jb-card"
      style={{ '--source-color': color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
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
          <div className="jb-card-actions">
            <button
              className={`jb-save-btn ${saved ? 'saved' : ''}`}
              onClick={() => onSave(job)}
              title={saved ? 'Retirer des sauvegardes' : 'Sauvegarder'}
              style={{ color: saved ? '#13c9ed' : 'var(--text-dim)' }}
            >
              <IconBookmark filled={saved} />
            </button>
            <span className="jb-date"><IconCalendar />{timeAgo(job.date)}</span>
          </div>
        </div>

        <h3 className="jb-title">{job.title}</h3>

        {job.company  && <p className="jb-company"><IconBriefcase />{job.company}</p>}
        {job.location && <p className="jb-location"><IconMap />{job.location}</p>}
        {job.description && <p className="jb-desc">{job.description}</p>}

        <div className="jb-card-footer">
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="jb-apply-btn">
            Voir l'offre <IconExternal />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Panel Filtres ─────────────────────────────────────────────────────────────

function FiltersPanel({ filters, onChange }) {
  const update = (key, val) => onChange({ ...filters, [key]: val });

  const addKeyword    = w => update('keywords',    [...filters.keywords,    w]);
  const removeKeyword = w => update('keywords',    filters.keywords.filter(k => k !== w));
  const addLocation   = l => update('locations',   [...filters.locations,   l]);
  const removeLocation= l => update('locations',   filters.locations.filter(x => x !== l));

  const toggleContract = c => {
    const next = filters.contracts.includes(c)
      ? filters.contracts.filter(x => x !== c)
      : [...filters.contracts, c];
    update('contracts', next);
  };

  return (
    <div className="jb-panel">
      <p className="jb-panel-hint">
        Ces filtres sont envoyés directement au scraper — chaque mot-clé et localisation génère une requête ciblée.
      </p>

      {/* Mots-clés */}
      <div className="jb-panel-section">
        <h4 className="jb-panel-label">
          <IconSearch /> Mots-clés de recherche
        </h4>
        <TagInput
          tags={filters.keywords}
          onAdd={addKeyword}
          onRemove={removeKeyword}
          placeholder="Ex : développeur React, data, UX…"
          color="var(--cyan)"
        />
      </div>

      {/* Localisations */}
      <div className="jb-panel-section">
        <h4 className="jb-panel-label">
          <IconMap /> Localisations
        </h4>
        <TagInput
          tags={filters.locations}
          onAdd={addLocation}
          onRemove={removeLocation}
          placeholder="Ex : Paris, Lyon, Télétravail…"
          color="#1a73e8"
        />
      </div>

      {/* Types de contrat */}
      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconBriefcase /> Types de contrat</h4>
        <div className="jb-chip-group">
          {CONTRACT_TYPES.map(c => (
            <button
              key={c}
              className={`jb-chip ${filters.contracts.includes(c) ? 'active' : ''}`}
              onClick={() => toggleContract(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div className="jb-panel-section">
        <h4 className="jb-panel-label">📡 Sources actives</h4>
        <div className="jb-chip-group">
          {SOURCES.map(src => (
            <button
              key={src.id}
              className={`jb-chip ${filters.sources.includes(src.id) ? 'active' : ''}`}
              style={{ '--chip-color': src.color }}
              onClick={() => {
                const next = filters.sources.includes(src.id)
                  ? filters.sources.filter(s => s !== src.id)
                  : [...filters.sources, src.id];
                update('sources', next);
              }}
            >
              {src.emoji} {src.label}
            </button>
          ))}
        </div>
      </div>

      <button
        className="jb-search-btn"
        style={{ marginTop: '1rem' }}
        onClick={() => onChange({ ...filters, _trigger: Date.now() })}
      >
        <IconSearch /> Appliquer et scraper
      </button>
    </div>
  );
}

// ── Panel Banwords ────────────────────────────────────────────────────────────

function BanwordsPanel({ banwords, onChange }) {
  const add    = w => { if (!banwords.includes(w)) onChange([...banwords, w]); };
  const remove = w => onChange(banwords.filter(b => b !== w));

  return (
    <div className="jb-panel">
      <p className="jb-panel-hint">
        Les offres contenant ces mots (dans le titre, l'entreprise ou la description) seront automatiquement masquées.
      </p>
      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconBan /> Mots bannis</h4>
        <TagInput
          tags={banwords}
          onAdd={add}
          onRemove={remove}
          placeholder="Ex : senior, manager, stagiaire…"
          color="#ef4444"
        />
      </div>
      {banwords.length > 0 && (
        <button className="jb-ghost-btn danger" onClick={() => onChange([])}>
          <IconTrash /> Tout effacer
        </button>
      )}
    </div>
  );
}

// ── Panel Saves ───────────────────────────────────────────────────────────────

function SavesPanel({ saves, onRemove }) {
  if (!saves.length) return (
    <div className="jb-empty">
      <div className="jb-empty-icon">🔖</div>
      <h3>Aucune offre sauvegardée</h3>
      <p>Clique sur l'icône bookmark d'une offre pour la retrouver ici.</p>
    </div>
  );

  return (
    <div className="jb-panel jb-saves-panel">
      <p className="jb-panel-hint">{saves.length} offre{saves.length > 1 ? 's' : ''} sauvegardée{saves.length > 1 ? 's' : ''}</p>
      <div className="jb-grid">
        {saves.map((job, i) => {
          const color = sourceColor(job.source);
          const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS.emploi;
          return (
            <div key={job.id} className="jb-card" style={{ '--source-color': color }}>
              <div className="jb-card-accent" />
              <div className="jb-card-inner">
                <div className="jb-card-top">
                  <div className="jb-card-badges">
                    <span className="jb-source-badge" style={{ background: color + '18', color }}>{job.source}</span>
                    <span className="jb-type-badge" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>{typeInfo.label}</span>
                  </div>
                  <button className="jb-save-btn saved" onClick={() => onRemove(job.id)} style={{ color: '#ef4444' }}>
                    <IconTrash />
                  </button>
                </div>
                <h3 className="jb-title">{job.title}</h3>
                {job.company  && <p className="jb-company"><IconBriefcase />{job.company}</p>}
                {job.location && <p className="jb-location"><IconMap />{job.location}</p>}
                <div className="jb-card-footer">
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="jb-apply-btn">
                    Voir l'offre <IconExternal />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'results',  label: 'Résultats',  icon: '🔍' },
  { id: 'filters',  label: 'Filtres',    icon: '⚙️' },
  { id: 'banwords', label: 'Banwords',   icon: '🚫' },
  { id: 'saves',    label: 'Sauvegardes',icon: '🔖' },
];

const DEFAULT_FILTERS = {
  keywords:  ['alternance développeur'],
  locations: ['France'],
  contracts: ['alternance'],
  sources:   ['lba', 'adzuna', 'ft', 'indeed', 'hellowork', 'stagefr'],
};

export default function JobBoard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('results');
  const [typeFilter, setTypeFilter] = useState('all');
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [fetched, setFetched] = useState(false);
  const [warnings, setWarnings] = useState([]);

  // Persistent state
  const [filters,  setFilters]  = useState(() => LS.get('jb_filters', DEFAULT_FILTERS));
  const [banwords, setBanwords] = useState(() => LS.get('jb_banwords', []));
  const [saves,    setSaves]    = useState(() => LS.get('jb_saves', []));

  const abortRef = useRef(null);

  // Persist on change
  useEffect(() => { LS.set('jb_filters', filters); }, [filters]);
  useEffect(() => { LS.set('jb_banwords', banwords); }, [banwords]);
  useEffect(() => { LS.set('jb_saves', saves); }, [saves]);

  const fetchJobs = useCallback(async (f = filters) => {
    if (!f.sources?.length || !f.keywords?.length) return;
    setLoading(true);
    setError(null);
    setJobs([]);
    setFetched(false);
    setActiveTab('results');

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        keywords:  (f.keywords  || []).join(','),
        locations: (f.locations || []).join(','),
        contracts: (f.contracts || []).join(','),
        sources:   (f.sources   || []).join(','),
        limit:     '20',
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
  }, [filters]);

  // Trigger fetch when filters._trigger changes (via "Appliquer" button)
  useEffect(() => {
    if (filters._trigger) fetchJobs(filters);
  }, [filters._trigger]);

  // Initial fetch on mount
  useEffect(() => { fetchJobs(); }, []);

  const toggleSave = (job) => {
    setSaves(prev => {
      const exists = prev.find(s => s.id === job.id);
      return exists ? prev.filter(s => s.id !== job.id) : [job, ...prev];
    });
  };
  const removeSave = (id) => setSaves(prev => prev.filter(s => s.id !== id));

  const visibleJobs = jobs
    .filter(j => !jobMatchesBanwords(j, banwords))
    .filter(j => typeFilter === 'all' || j.type === typeFilter);

  const savedIds = new Set(saves.map(s => s.id));

  const tabBadge = {
    results:  fetched ? visibleJobs.length : null,
    banwords: banwords.length || null,
    saves:    saves.length    || null,
  };

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
            {SOURCES.map(s => s.label).join(' · ')}
          </p>
        </motion.div>
      </div>

      {/* ── Tabs ── */}
      <div className="jb-tabs-bar">
        <div className="jb-tabs-inner">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`jb-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="jb-tab-icon">{tab.icon}</span>
              {tab.label}
              {tabBadge[tab.id] != null && (
                <span className="jb-tab-badge">{tabBadge[tab.id]}</span>
              )}
            </button>
          ))}
          <button className="jb-tab jb-tab-refresh" onClick={() => fetchJobs()} disabled={loading}>
            <IconRefresh spinning={loading} />
            {loading ? 'Scraping…' : 'Actualiser'}
          </button>
        </div>
        {warnings.length > 0 && (
          <p className="jb-warn">⚠️ {warnings.join(' · ')}</p>
        )}
      </div>

      {/* ── Contenu par onglet ── */}
      <main className="jb-main">
        <AnimatePresence mode="wait">

          {/* RÉSULTATS */}
          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

              {/* Sous-filtres type */}
              {fetched && !loading && (
                <div className="jb-type-filters">
                  {['all', 'alternance', 'stage', 'emploi'].map(t => (
                    <button key={t} className={`jb-filter-btn ${typeFilter === t ? 'active' : ''}`}
                      onClick={() => setTypeFilter(t)}>
                      {t === 'all'
                        ? `Tout (${visibleJobs.length})`
                        : `${TYPE_LABELS[t]?.label} (${jobs.filter(j => j.type === t && !jobMatchesBanwords(j, banwords)).length})`}
                    </button>
                  ))}
                  {banwords.length > 0 && (
                    <span className="jb-banword-indicator">
                      <IconBan /> {jobs.length - visibleJobs.length} masquée{jobs.length - visibleJobs.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {error && !loading && (
                <motion.div className="jb-error-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p>😕 {error}</p>
                  <button className="jb-search-btn" onClick={() => fetchJobs()}>Réessayer</button>
                </motion.div>
              )}

              {loading && (
                <div className="jb-grid">
                  {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} />)}
                </div>
              )}

              {!loading && fetched && visibleJobs.length > 0 && (
                <div className="jb-grid">
                  {visibleJobs.map((job, i) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={i}
                      saved={savedIds.has(job.id)}
                      onSave={toggleSave}
                    />
                  ))}
                </div>
              )}

              {!loading && fetched && visibleJobs.length === 0 && !error && (
                <div className="jb-empty">
                  <div className="jb-empty-icon">🔍</div>
                  <h3>Aucune offre trouvée</h3>
                  <p>Essaie d'autres mots-clés dans l'onglet <strong>Filtres</strong>, ou retire des banwords.</p>
                </div>
              )}

              {!loading && !fetched && !error && (
                <div className="jb-empty">
                  <div className="jb-empty-icon">✨</div>
                  <h3>Lance une recherche</h3>
                  <p>Configure tes filtres dans l'onglet <strong>Filtres</strong> puis clique sur "Appliquer".</p>
                </div>
              )}
            </motion.div>
          )}

          {/* FILTRES */}
          {activeTab === 'filters' && (
            <motion.div key="filters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <FiltersPanel filters={filters} onChange={setFilters} />
            </motion.div>
          )}

          {/* BANWORDS */}
          {activeTab === 'banwords' && (
            <motion.div key="banwords" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <BanwordsPanel banwords={banwords} onChange={setBanwords} />
            </motion.div>
          )}

          {/* SAVES */}
          {activeTab === 'saves' && (
            <motion.div key="saves" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <SavesPanel saves={saves} onRemove={removeSave} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="jb-footer">
        <p>{SOURCES.map(s => s.label).join(' · ')}</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.6, fontSize: '0.75rem' }}>© 2026 Émilien Vitry-Lhotte</p>
      </footer>
    </div>
  );
}