// src/pages/JobBoard.jsx
// v8 — Fix badges source + handleApply unifié

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './JobBoard.css';
import LoginScreen from '../components/LoginScreen';
import { extensionBridge } from '../utils/jobboard-bridge';

// ── Icônes SVG ────────────────────────────────────────────────────────────────
const IconLink      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconExternal  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconRefresh   = ({ spinning }) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>;
const IconBack      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconBriefcase = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IconCalendar  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconMap       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconBookmark  = ({ filled }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconBan       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>;
const IconPlus      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconX         = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconTrash     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconClock     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCheck     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconSend      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IconUser      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLogout    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconCancel    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

// ── Sources ───────────────────────────────────────────────────────────────────
const SOURCE_PATTERNS = [
  { id: 'indeed',    label: 'Indeed',                color: '#2557a7', emoji: '💼', pattern: /indeed\./i },
  { id: 'hellowork', label: 'HelloWork',             color: '#7c3aed', emoji: '👋', pattern: /hellowork\.com/i },
  { id: 'stagefr',   label: 'Stage.fr',              color: '#f59e0b', emoji: '📋', pattern: /stage\.fr/i },
  { id: 'lba',       label: 'La Bonne Alternance',   color: '#1a73e8', emoji: '🎓', pattern: /labonnealternance\.apprentissage/i },
  { id: 'adzuna',    label: 'Adzuna',                color: '#e64c1f', emoji: '🔍', pattern: /adzuna\./i },
  { id: 'ft',        label: 'France Travail',        color: '#00a651', emoji: '🏛️', pattern: /francetravail\.fr|pole-emploi\.fr/i },
  { id: 'linkedin',  label: 'LinkedIn',              color: '#0a66c2', emoji: '🔗', pattern: /linkedin\.com/i },
  { id: 'welcomejb', label: 'Welcome to the Jungle', color: '#ff4655', emoji: '🌴', pattern: /welcometothejungle\.com/i },
  { id: 'monster',   label: 'Monster',               color: '#6600cc', emoji: '👾', pattern: /monster\./i },
];

function detectSource(...urls) {
  for (const url of urls) {
    if (!url) continue;
    for (const src of SOURCE_PATTERNS) {
      if (src.pattern.test(url)) return src;
    }
  }
  return { id: 'other', label: 'Source', color: '#555', emoji: '🌐' };
}

const TYPE_LABELS = {
  alternance: { label: 'Alternance', color: '#13c9ed' },
  stage:      { label: 'Stage',      color: '#7c3aed' },
  emploi:     { label: 'Emploi',     color: '#1a73e8' },
};

const LS = {
  get: (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, value)    => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2)  return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)  return `Il y a ${days} j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function jobMatchesBanwords(job, banwords) {
  if (!banwords.length) return false;
  const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return banwords.some(w => w && text.includes(w.toLowerCase()));
}

const jobKey = (job) =>
  `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;

// ── JobCard ───────────────────────────────────────────────────────────────────
function JobCard({ job, index, saved, onSave, onApply, onDelete, onCancel, showActions = true, appliedAt, isNew, extAvailable, applyingIds }) {
    const companyStr  = (job.company || '').toLowerCase();
    const titleStr    = (job.title || '').toLowerCase();

    const isIndeed    = job.url && (job.url.includes('indeed.com') || job.url.includes('indeed.fr'));
    const isHelloWork = job.url && job.url.includes('hellowork.com');
    const isThales    = (job.url && job.url.includes('thalesgroup.com')) || companyStr.includes('thales') || titleStr.includes('thales');
    const isEightfold = job.url && job.url.includes('eightfold.ai');
    const isLinkedIn  = job.url && job.url.includes('linkedin.com/jobs');
    
    // 🌟 FIX : On détecte Atos même si l'URL est cryptique, via le nom de l'entreprise
    const isAtos      = (job.url && (job.url.includes('jobs.atos.net') || job.url.includes('successfactors.eu') || job.url.includes('atos'))) || companyStr.includes('atos') || titleStr.includes('atos');
    const isCapgemini = (job.url && job.url.includes('capgemini')) || companyStr.includes('capgemini') || titleStr.includes('capgemini');
    
    const isEasyApply = isIndeed || isHelloWork || isThales || isEightfold || isLinkedIn || isAtos || isCapgemini;
    const canAutoApply = isEasyApply && extAvailable;

    const isApplying = applyingIds?.has(job.id) ?? false;
    const source   = detectSource(job.sourceUrl, job.url);
    const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS['emploi'];

  return (
    <motion.div
      className={`jb-card${isNew ? ' jb-card-new' : ''}${isApplying ? ' jb-card-applying' : ''}`}
      style={{ '--source-color': source.color }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.6) }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <div className="jb-card-accent" />
      <div className="jb-card-inner">
        <div className="jb-card-top">
          <div className="jb-card-badges">

            {/* Badge source (Indeed, LinkedIn, HelloWork…) */}
            <a
              href={job.sourceUrl || job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="jb-source-badge"
              style={{
                background: `${source.color}18`,
                color: source.color,
                border: `1px solid ${source.color}40`,
                textDecoration: 'none',
              }}
              title={source.label}
            >
              {source.emoji} {source.label}
            </a>

            {/* Badge type (Alternance / Stage / Emploi) */}
            <span
              className="jb-type-badge"
              style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>

            {/* Badge Easy Apply */}
            {isEasyApply && (
              <span
                className="jb-type-badge"
                style={{
                  background: isApplying ? 'rgba(74,222,128,0.2)' : 'rgba(250,204,21,0.15)',
                  color: isApplying ? '#4ade80' : '#facc15',
                  cursor: canAutoApply ? 'pointer' : 'default',
                }}
                onClick={() => canAutoApply && onApply && onApply(job)}
                title={canAutoApply ? 'Cliquer pour postuler automatiquement' : 'Installez l\'extension pour l\'auto-apply'}
              >
                {isApplying ? '⏳ Candidature en cours…' : canAutoApply ? '⚡ Auto Apply' : '⭐ Easy Apply'}
              </span>
            )}

            {appliedAt && (
              <span className="jb-applied-badge">✅ Postulé {timeAgo(appliedAt)}</span>
            )}
          </div>

          <div className="jb-card-actions">
            {onSave && (
              <button
                className={`jb-save-btn ${saved ? 'saved' : ''}`}
                onClick={() => onSave(job)}
                title={saved ? 'Retirer' : 'Sauvegarder'}
                style={{ color: saved ? '#13c9ed' : undefined }}
              >
                <IconBookmark filled={saved} />
              </button>
            )}
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

          {showActions && (
            <div className="jb-card-action-btns">
              {onApply && (
                canAutoApply ? (
                  <button
                    className="jb-action-btn jb-apply-action"
                    onClick={() => onApply(job)}
                    disabled={isApplying}
                    title="Postuler automatiquement via l'extension"
                    style={{
                      background: isApplying ? 'rgba(74,222,128,0.15)' : 'rgba(19,201,237,0.15)',
                      color: isApplying ? '#4ade80' : '#13c9ed',
                      borderColor: isApplying ? '#4ade80' : '#13c9ed',
                      cursor: isApplying ? 'wait' : 'pointer'
                    }}
                  >
                    {isApplying ? <><IconRefresh spinning={true} /> En cours…</> : <><IconSend /> ⚡ Auto Apply</>}
                  </button>
                ) : (
                  <button
                    className="jb-action-btn jb-apply-action"
                    onClick={() => onApply(job)}
                    title="Ouvrir l'offre et marquer comme postulé"
                  >
                    <IconSend /> Postulé
                  </button>
                )
              )}
              {onDelete && (
                <button
                  className="jb-action-btn jb-delete-action"
                  onClick={() => onDelete(job)}
                  title="Supprimer cette offre"
                >
                  <IconTrash /> Supprimer
                </button>
              )}
            </div>
          )}

          {onCancel && (
            <div className="jb-card-action-btns">
              <button
                className="jb-action-btn jb-delete-action"
                onClick={() => onCancel(job)}
                title="Annuler ma candidature"
              >
                <IconCancel /> Annuler la candidature
              </button>
            </div>
          )}
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
        <div className="jb-sk-row" style={{ width: '45%', height: 18, marginBottom: 12 }} />
        <div className="jb-sk-row" style={{ width: '88%', height: 22, marginBottom: 8 }} />
        <div className="jb-sk-row" style={{ width: '55%', height: 15, marginBottom: 6 }} />
        <div className="jb-sk-row" style={{ width: '38%', height: 13, marginBottom: 14 }} />
        <div className="jb-sk-row" style={{ width: '72%', height: 11 }} />
      </div>
    </div>
  );
}

// ── FilterRow ─────────────────────────────────────────────────────────────────
function FilterRow({ filter, onToggle, onDelete, isNew }) {
  const source = detectSource(filter.url);
  return (
    <motion.div
      className={`jb-filter-row ${filter.enabled ? '' : 'disabled'} ${isNew ? 'new' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
    >
      <div className="jb-filter-row-left">
        <button
          className={`jb-toggle-btn ${filter.enabled ? 'on' : 'off'}`}
          onClick={() => onToggle(filter.id)}
        >
          {filter.enabled ? <IconCheck /> : null}
        </button>
        <div className="jb-filter-info">
          {source && (
            <span className="jb-filter-source" style={{ color: source.color }}>
              {source.emoji} {source.label}
            </span>
          )}
          <a
            href={filter.url}
            target="_blank"
            rel="noopener noreferrer"
            className="jb-filter-url"
            title={filter.url}
          >
            {filter.label || filter.url} <IconExternal />
          </a>
          {filter.lastScraped && (
            <span className="jb-filter-meta">
              <IconClock /> Scrapé {timeAgo(filter.lastScraped)} · {filter.jobCount ?? 0} offre(s)
            </span>
          )}
        </div>
      </div>
      <button className="jb-filter-del" onClick={() => onDelete(filter.id)}><IconTrash /></button>
    </motion.div>
  );
}

// ── FiltersPanel ──────────────────────────────────────────────────────────────
function FiltersPanel({ filters, onChange, onScrapeNow, scrapeStatus, onClearJobs }) {
  const [urlInput,   setUrlInput]   = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [urlError,   setUrlError]   = useState('');
  const [newId,      setNewId]      = useState(null);

  const addFilter = () => {
    const url = urlInput.trim();
    if (!url) return;
    try { new URL(url); } catch { return setUrlError('URL invalide — commence par https://'); }
    if (filters.some(f => f.url === url)) return setUrlError('Ce lien est déjà dans la liste');
    const id = `f-${Date.now()}`;
    onChange([...filters, { id, url, label: labelInput.trim() || null, enabled: true, lastScraped: null, jobCount: null }]);
    setNewId(id); setUrlInput(''); setLabelInput(''); setUrlError('');
    setTimeout(() => setNewId(null), 2000);
  };

  const enabledCount = filters.filter(f => f.enabled).length;
  const isRunning = scrapeStatus === 'running' || scrapeStatus === 'pending';

  return (
    <div className="jb-panel">
      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconLink /> Ajouter un lien de recherche</h4>
        <div className="jb-url-form">
          <div className={`jb-url-input-wrap ${urlError ? 'error' : ''}`}>
            <span className="jb-url-prefix">🔗</span>
            <input
              className="jb-input"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
              onKeyDown={e => e.key === 'Enter' && addFilter()}
              placeholder="https://fr.indeed.com/jobs?q=alternance+dev"
            />
            {urlInput && (
              <button className="jb-url-clear" onClick={() => { setUrlInput(''); setUrlError(''); }}>
                <IconX />
              </button>
            )}
          </div>
          {urlError && <p className="jb-url-error">{urlError}</p>}
          <input
            className="jb-input jb-label-input"
            value={labelInput}
            onChange={e => setLabelInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFilter()}
            placeholder="Nom (ex: Dev React Paris)"
          />
          <button className="jb-search-btn" onClick={addFilter} disabled={!urlInput.trim()}>
            <IconPlus /> Ajouter le lien
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="jb-panel-section">
          <div className="jb-panel-label-row">
            <h4 className="jb-panel-label" style={{ margin: 0 }}>
              📋 Liens actifs ({enabledCount}/{filters.length})
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="jb-ghost-btn"
                style={{ marginTop: 0, fontSize: '0.78rem' }}
                onClick={onScrapeNow}
                disabled={isRunning || enabledCount === 0}
              >
                <IconRefresh spinning={isRunning} /> {isRunning ? 'Scraping…' : 'Scraper maintenant'}
              </button>
              <button
                className="jb-ghost-btn"
                style={{ marginTop: 0, fontSize: '0.78rem', color: '#ef4444', borderColor: '#ef4444' }}
                onClick={onClearJobs}
                disabled={isRunning}
                title="Vider tous les résultats en DB"
              >
                <IconTrash /> Vider les résultats
              </button>
            </div>
          </div>
          <div className="jb-filter-list">
            <AnimatePresence>
              {filters.map(f => (
                <FilterRow
                  key={f.id}
                  filter={f}
                  isNew={f.id === newId}
                  onToggle={(id) => onChange(filters.map(fi => fi.id === id ? { ...fi, enabled: !fi.enabled } : fi))}
                  onDelete={(id) => onChange(filters.filter(fi => fi.id !== id))}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BanwordsPanel ─────────────────────────────────────────────────────────────
function BanwordsPanel({ banwords, onChange }) {
  const [val, setVal] = useState('');
  const add = () => {
    const t = val.trim();
    if (t && !banwords.includes(t)) onChange([...banwords, t]);
    setVal('');
  };
  return (
    <div className="jb-panel">
      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconBan /> Mots bannis</h4>
        <div className="jb-tag-input-wrap">
          <div className="jb-tags-list">
            {banwords.map(t => (
              <span key={t} className="jb-tag" style={{ '--tag-color': '#ef4444' }}>
                {t}
                <button className="jb-tag-rm" onClick={() => onChange(banwords.filter(b => b !== t))}>
                  <IconX />
                </button>
              </span>
            ))}
          </div>
          <div className="jb-tag-field">
            <input
              className="jb-input jb-tag-input"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="Ex : senior, manager..."
            />
            <button className="jb-tag-add-btn" onClick={add} style={{ color: '#ef4444' }}>
              <IconPlus />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AppliedPanel ──────────────────────────────────────────────────────────────
function AppliedPanel({ applied, onRemove }) {
  if (!applied.length) return (
    <div className="jb-empty">
      <div className="jb-empty-icon">📨</div>
      <h3>Aucune candidature</h3>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        Clique sur "Postulé" sur une offre pour la retrouver ici.
      </p>
    </div>
  );
  return (
    <div className="jb-panel jb-saves-panel">
      <div className="jb-grid">
        <AnimatePresence>
          {applied.map((entry) => (
            <JobCard
              key={entry.job.id}
              job={entry.job}
              saved={false}
              showActions={false}
              appliedAt={entry.appliedAt}
              onCancel={(job) => onRemove(job.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── SavesPanel ────────────────────────────────────────────────────────────────
function SavesPanel({ saves, onRemove }) {
  if (!saves.length) return (
    <div className="jb-empty">
      <div className="jb-empty-icon">🔖</div>
      <h3>Aucune offre sauvegardée</h3>
    </div>
  );
  return (
    <div className="jb-panel jb-saves-panel">
      <div className="jb-grid">
        {saves.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            saved={true}
            showActions={false}
            onSave={() => onRemove(job.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'results',  label: 'Résultats',   icon: '🔍' },
  { id: 'filters',  label: 'Mes liens',   icon: '🔗' },
  { id: 'banwords', label: 'Banwords',    icon: '🚫' },
  { id: 'saves',    label: 'Sauvegardes', icon: '🔖' },
  { id: 'applied',  label: 'Postulé',     icon: '📨' },
];

// ── CountdownRing ─────────────────────────────────────────────────────────────
function CountdownRing({ value, total = 30 }) {
  const radius = 10;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ * (value / total);
  const isLow  = value <= 5;
  return (
    <span className="jb-countdown-ring" title={`Prochain polling dans ${value}s`}>
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r={radius} fill="none" stroke="var(--ring-track, #2a2a3a)" strokeWidth="2.5" />
        <circle
          cx="15" cy="15" r={radius}
          fill="none"
          stroke={isLow ? '#ef4444' : '#13c9ed'}
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 15 15)"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
        <text x="15" y="15" textAnchor="middle" dominantBaseline="central"
          fontSize="8" fontWeight="700" fill={isLow ? '#ef4444' : '#13c9ed'}
          style={{ fontFamily: 'inherit', transition: 'fill 0.3s' }}>
          {value}
        </text>
      </svg>
    </span>
  );
}

// ── JobBoard (page principale) ────────────────────────────────────────────────
export default function JobBoard() {
  const navigate = useNavigate();

  // ── Session ───────────────────────────────────────────────────────────────
  const [session,     setSession]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setSession({ email: data.session.user.email, userId: data.session.user.id });
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { email: s.user.email, userId: s.user.id } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.userId ?? null;

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState('results');
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [jobs,           setJobs]           = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [fetched,        setFetched]        = useState(false);
  const [scrapeStatus,   setScrapeStatus]   = useState(null);
  const [debugInfo,      setDebugInfo]      = useState(null);
  const [urlFilters,     setUrlFilters]     = useState([]);
  const [filtersLoaded,  setFiltersLoaded]  = useState(false);
  const [banwords,       setBanwords]       = useState([]);
  const [banwordsLoaded, setBanwordsLoaded] = useState(false);
  const [saves,          setSaves]          = useState([]);
  const [savesLoaded,    setSavesLoaded]    = useState(false);
  const [applied,        setApplied]        = useState([]);
  const [appliedLoaded,  setAppliedLoaded]  = useState(false);
  const [deletedKeys,    setDeletedKeys]    = useState(() => new Set(LS.get('jb_deleted_ids', [])));
  const deletedKeysRef = useRef(new Set(LS.get('jb_deleted_ids', [])));
  const [undoToast,      setUndoToast]      = useState(null);
  const undoTimerRef    = useRef(null);
  const undoIntervalRef = useRef(null);

  // ── Extension ─────────────────────────────────────────────────────────────
  const [extAvailable, setExtAvailable] = useState(false);
  const [applyingIds,  setApplyingIds]  = useState(new Set());

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const notifCounterRef = useRef(0);

  const addNotif = useCallback((job, msg, type) => {
    const id = ++notifCounterRef.current;
    setNotifications(prev => [...prev, { id, job, msg, type }]);
    if (type === 'error')   setTimeout(() => removeNotif(id), 12000);
    if (type === 'success') setTimeout(() => removeNotif(id), 5000);
    return id;
  }, []);

  const removeNotif = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateNotif = useCallback((id, msg, type) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, msg, type } : n));
  }, []);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const filtersOwnerRef = useRef(null);
  const initialLoadRef  = useRef(true);
  const knownJobIdsRef  = useRef(new Set());
  const pendingQueueRef = useRef([]);
  const drainTimerRef   = useRef(null);

  const [newJobsCount, setNewJobsCount] = useState(0);
  const [newJobIds,    setNewJobIds]    = useState(new Set());
  const [queueSize,    setQueueSize]    = useState(0);

  // ── Décompte polling ──────────────────────────────────────────────────────
  const POLL_INTERVAL = 30;
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const countdownRef = useRef(POLL_INTERVAL);

  // ── Init extension ────────────────────────────────────────────────────────
  useEffect(() => {
    extensionBridge.ping().then(ok => setExtAvailable(ok));
    extensionBridge.onProgress(({ msg, type, job }) => {
      // Mise à jour de la notif existante si elle est dans la liste
      setNotifications(prev => {
        const idx = [...prev].reverse().findIndex(n => n.job?.id === job?.id);
        if (idx === -1) {
          // 🌟 FIX : Pas de notif en cours (candidature manuelle) — on en crée une nouvelle
          // pour que l'utilisateur voie la confirmation de SuccessFactors
          if (type === 'success' || type === 'external') {
            return [...prev, { id: Date.now(), job, msg, type }];
          }
          return prev;
        }
        const realIdx = prev.length - 1 - idx;
        const updated = [...prev];
        updated[realIdx] = { ...updated[realIdx], msg, type };
        return updated;
      });

      // 🌟 FIX : Si SuccessFactors confirme la soumission (type 'success'),
      // on marque le job comme postulé même si ce n'était pas une candidature auto.
      if (type === 'success' && job) {
        setApplied(prev =>
          prev.find(e => e.job.id === job.id)
            ? prev
            : [{ job, appliedAt: new Date().toISOString(), method: 'sf_confirmed' }, ...prev]
        );
        setApplyingIds(prev => { const n = new Set(prev); n.delete(job?.id); return n; });
      }
    });
  }, []);

  // ── Chargement filtres ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function init() {
      filtersOwnerRef.current = null;
      setFiltersLoaded(false);
      initialLoadRef.current = true;
      try {
        const { data, error } = await supabase.from('user_filters').select('filters').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') console.error('Erreur chargement filtres:', error);
        if (isMounted) {
          setUrlFilters(data?.filters && Array.isArray(data.filters) ? data.filters : []);
          filtersOwnerRef.current = userId;
          setFiltersLoaded(true);
        }
      } catch (err) { console.error(err); }
    }
    init();
    return () => { isMounted = false; };
  }, [userId]);

  // ── Sauvegarde filtres ────────────────────────────────────────────────────
  useEffect(() => {
    if (!filtersLoaded || !userId || filtersOwnerRef.current !== userId) return;
    if (initialLoadRef.current) { initialLoadRef.current = false; return; }
    supabase.from('user_filters').upsert({ id: userId, filters: urlFilters }).then(({ error }) => {
      if (error) console.error('❌ ERREUR SAUVEGARDE SUPABASE:', error.message);
    });
  }, [urlFilters, filtersLoaded, userId]);

  useEffect(() => {
    LS.set('jb_deleted_ids', [...deletedKeys]);
    deletedKeysRef.current = deletedKeys;
  }, [deletedKeys]);

  // ── Chargement banwords + saves ───────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    supabase.from('user_prefs').select('banwords,saves').eq('id', userId).single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') console.error('Erreur chargement prefs:', error);
        if (isMounted) {
          setBanwords(data?.banwords && Array.isArray(data.banwords) ? data.banwords : []);
          setSaves(data?.saves && Array.isArray(data.saves) ? data.saves : []);
          setBanwordsLoaded(true);
          setSavesLoaded(true);
        }
      });
    return () => { isMounted = false; };
  }, [userId]);

  // ── Sauvegarde banwords + saves ───────────────────────────────────────────
  useEffect(() => {
    if (!banwordsLoaded || !savesLoaded || !userId) return;
    supabase.from('user_prefs').upsert({ id: userId, banwords, saves }).then(({ error }) => {
      if (error) console.error('❌ Erreur sauvegarde prefs:', error.message);
    });
  }, [banwords, saves, banwordsLoaded, savesLoaded, userId]);

  // ── Chargement candidatures ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    supabase.from('user_applied').select('applied').eq('id', userId).single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') console.error('Erreur chargement candidatures:', error);
        if (isMounted) {
          setApplied(data?.applied && Array.isArray(data.applied) ? data.applied : []);
          setAppliedLoaded(true);
        }
      })
      .catch(err => { console.error(err); if (isMounted) setAppliedLoaded(true); });
    return () => { isMounted = false; };
  }, [userId]);

  // ── Sauvegarde candidatures ───────────────────────────────────────────────
  useEffect(() => {
    if (!appliedLoaded || !userId) return;
    supabase.from('user_applied').upsert({ id: userId, applied }).then(({ error }) => {
      if (error) console.error('❌ Erreur sauvegarde candidatures:', error.message);
    });
  }, [applied, appliedLoaded, userId]);

  // ── fetchJobs ─────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async ({ silent = false, firstOpen = false } = {}) => {
    if (!silent) { setLoading(true); setError(null); }
    if (!silent && activeTab !== 'results') setActiveTab('results');
    try {
      const { data, error: dbErr } = await supabase
        .from('jb_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('scraped_at', { ascending: false })
        .order('date',       { ascending: false })
        .limit(1000);

      if (dbErr) throw new Error(`Supabase: ${dbErr.message}`);

      const normalized = (data || []).map(r => ({
        id:          r.id,
        sourceUrl:   r.source_url,
        title:       r.title,
        company:     r.company || '',
        location:    r.location || '',
        url:         r.url,
        description: r.description || '',
        date:        r.date,
        scrapedAt:   r.scraped_at,
        type:        r.type || 'emploi',
        isDirect:    r.is_direct === true,
      }));

      if (silent) {
        const newOnes = normalized.filter(j => !knownJobIdsRef.current.has(j.id) && !deletedKeysRef.current.has(j.id));
        if (newOnes.length > 0) {
          newOnes.forEach(j => knownJobIdsRef.current.add(j.id));
          if (firstOpen && newOnes.length > 5) {
            setJobs(prev => {
              const existingIds = new Set(prev.map(j => j.id));
              const toAdd = newOnes.filter(j => !existingIds.has(j.id));
              return [...toAdd, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
            });
            setNewJobIds(prev => new Set([...prev, ...newOnes.map(j => j.id)]));
            setNewJobsCount(c => c + newOnes.length);
          } else {
            const sorted = [...newOnes].sort((a, b) => new Date(a.date) - new Date(b.date));
            pendingQueueRef.current = [...pendingQueueRef.current, ...sorted];
            setQueueSize(pendingQueueRef.current.length);
          }
        }
      } else {
        pendingQueueRef.current = [];
        setQueueSize(0);
        knownJobIdsRef.current = new Set(normalized.map(j => j.id));
        setNewJobIds(new Set());
        setJobs(normalized);
        setFetched(true);
      }
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    if (filtersLoaded && userId) fetchJobs({ firstOpen: true });
  }, [filtersLoaded, userId]);

  // ── Polling silencieux ────────────────────────────────────────────────────
  useEffect(() => {
    if (!filtersLoaded || !userId) return;
    countdownRef.current = POLL_INTERVAL;
    setCountdown(POLL_INTERVAL);
    const tick = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        countdownRef.current = POLL_INTERVAL;
        setCountdown(POLL_INTERVAL);
        fetchJobs({ silent: true });
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [filtersLoaded, userId, fetchJobs]);

  // ── Drain queue ───────────────────────────────────────────────────────────
  useEffect(() => {
    const drainOne = () => {
      if (pendingQueueRef.current.length === 0) {
        drainTimerRef.current = setTimeout(drainOne, 2000);
        return;
      }
      const job = pendingQueueRef.current.shift();
      setJobs(prev => {
        if (prev.find(j => j.id === job.id)) return prev;
        return [job, ...prev];
      });
      setNewJobsCount(c => c + 1);
      setNewJobIds(prev => new Set([...prev, job.id]));
      setQueueSize(pendingQueueRef.current.length);
      drainTimerRef.current = setTimeout(drainOne, 2000);
    };
    drainTimerRef.current = setTimeout(drainOne, 2000);
    return () => clearTimeout(drainTimerRef.current);
  }, []);

  // ── triggerScrape ─────────────────────────────────────────────────────────
  const triggerScrape = useCallback(async () => {
    setScrapeStatus('pending');
    setError(null);
    setDebugInfo(null);
    if (activeTab !== 'results') setActiveTab('results');

    try {
      const activeFilters = urlFilters.filter(f => f.enabled);
      if (activeFilters.length === 0) return setScrapeStatus(null);
      setScrapeStatus('running');

      const { error: purgeErr } = await supabase.from('jb_jobs').delete().eq('user_id', userId);
      if (purgeErr) console.warn('⚠️ Purge jobs avant scrape échouée:', purgeErr.message);

      const pythonUrl     = 'https://scraper-jobs.onrender.com';
      const scraperSecret = import.meta.env.VITE_SCRAPER_SECRET || 'MA_CLE_SECRETE';

      const scrapeRes = await fetch(`${pythonUrl}/scrape`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-scraper-secret': scraperSecret },
        body:    JSON.stringify({ urls: activeFilters.map(f => f.url), results_wanted: 30, user_id: userId }),
      });

      if (!scrapeRes.ok) throw new Error(`Erreur Render: ${scrapeRes.status}`);

      const scrapeData = await scrapeRes.json();

      let results = [];
      if (Array.isArray(scrapeData.results)) {
        const firstItem = scrapeData.results[0];
        if (firstItem && Array.isArray(firstItem.jobs)) {
          results = scrapeData.results;
        } else {
          results = [{ url: activeFilters[0]?.url, jobs: scrapeData.results, scrapedAt: new Date().toISOString(), count: scrapeData.results.length }];
        }
      } else if (Array.isArray(scrapeData.jobs)) {
        results = [{ url: activeFilters[0]?.url, jobs: scrapeData.jobs, scrapedAt: new Date().toISOString(), count: scrapeData.jobs.length }];
      }

      setDebugInfo({
        rawKeys:     Object.keys(scrapeData),
        nbResults:   results.length,
        firstResult: results[0] ? { url: results[0].url, nbJobs: results[0].jobs?.length ?? 0, firstJob: results[0].jobs?.[0] } : null,
      });

      const updatedFilters = [...urlFilters];
      for (const result of results) {
        const idx = updatedFilters.findIndex(f => f.url === result.url);
        if (idx !== -1) {
          updatedFilters[idx].lastScraped = result.scrapedAt;
          updatedFilters[idx].jobCount    = result.count ?? result.jobs?.length ?? 0;
        }
      }

      await supabase.from('user_filters').update({ filters: updatedFilters }).eq('id', userId);
      setUrlFilters(updatedFilters);
      await fetchJobs();
      setScrapeStatus('done');
      setTimeout(() => setScrapeStatus(null), 5000);
    } catch (err) {
      setError(err.message);
      setScrapeStatus(null);
    }
  }, [fetchJobs, activeTab, userId, urlFilters]);

  // ── handleApply ───────────────────────────────────────────────────────────
  const handleApply = useCallback(async (job) => {
    const companyStr  = (job.company || '').toLowerCase();
    const titleStr    = (job.title || '').toLowerCase();

    const isIndeed    = job.url && (job.url.includes('indeed.com') || job.url.includes('indeed.fr'));
    const isHelloWork = job.url && job.url.includes('hellowork.com');
    const isThales    = (job.url && job.url.includes('thalesgroup.com')) || companyStr.includes('thales') || titleStr.includes('thales');
    const isEightfold = job.url && job.url.includes('eightfold.ai');
    const isLinkedIn  = job.url && job.url.includes('linkedin.com/jobs');
    
    // 🌟 FIX : Détection d'Atos renforcée
    const isAtos      = (job.url && (job.url.includes('jobs.atos.net') || job.url.includes('successfactors.eu') || job.url.includes('atos'))) || companyStr.includes('atos') || titleStr.includes('atos');
    const isCapgemini = (job.url && job.url.includes('capgemini')) || companyStr.includes('capgemini') || titleStr.includes('capgemini');
    
    const supportsExtension = isIndeed || isHelloWork || isThales || isEightfold || isLinkedIn || isAtos || isCapgemini;
    const usesExtension = extAvailable && supportsExtension;

    // CAS 1 : extension disponible + site supporté → tout se passe en background
    if (usesExtension) {
      setApplyingIds(prev => new Set([...prev, job.id]));
      const notifId = addNotif(job, '🚀 Candidature en cours (background)…', 'info');

      let result;
      try {
        result = await extensionBridge.applyToJob(job);
      } catch (e) {
        result = { success: false, error: e.message || 'Erreur inattendue' };
      } finally {
        // Toujours retirer l'id de la liste "en cours", quoi qu'il arrive
        setApplyingIds(prev => { const n = new Set(prev); n.delete(job.id); return n; });
      }

      if (result && result.success) {
        const isExternal = result.type === 'external';
        // 🌟 FIX : Thales et Atos ont le même niveau de validation forte
        const isThalesOrAtosResult = (isThales || isAtos) && !isExternal;

        updateNotif(
          notifId,
          isExternal
            ? '🟣 Site recruteur ouvert en arrière-plan — marqué comme postulé'
            : isThalesOrAtosResult
              ? '✅ Formulaire soumis — candidature enregistrée !'
              : '✅ Candidature envoyée !',
          isExternal ? 'external' : 'success'
        );
        setTimeout(() => removeNotif(notifId), isExternal ? 8000 : 4000);

        setApplied(prev =>
          prev.find(e => e.job.id === job.id)
            ? prev
            : [{
                job,
                appliedAt: result.appliedAt || new Date().toISOString(),
                method: isExternal ? 'external_redirect' : isThalesOrAtosResult ? 'thales_atos_auto' : 'auto',
              }, ...prev]
        );
      } else {
        updateNotif(
          notifId,
          `❌ ${result?.error || 'Échec de la candidature automatique'}`,
          'error'
        );
        setTimeout(() => removeNotif(notifId), 12000);
      }
      return;
    }
    const isMultiStep = isAtos || isThales || isCapgemini;
      if (isMultiStep) {
        // 👇 RÉCUPÈRE L'ID ET AJOUTE LE SETTIMEOUT 👇
        const nid = addNotif(job, '🔗 Ouverture du site recruteur — reviens marquer manuellement une fois postulé.', 'info');
        setTimeout(() => removeNotif(nid), 15000); 
        
        if (job.url) window.open(job.url, '_blank');
        return;
      }

    // 1. On affiche une notif et on met la carte en mode "Attente"
    const manualNotifId = addNotif(job, '🔗 Redirection vers le site du recruteur...', 'info');
    setApplyingIds(prev => new Set([...prev, job.id]));

    // 2. On ouvre le site externe
    if (job.url) window.open(job.url, '_blank');

    // 3. On attend artificiellement 3 secondes que la page charge avant de classer l'offre
    setTimeout(() => {
      setApplyingIds(prev => { const n = new Set(prev); n.delete(job.id); return n; });
      updateNotif(manualNotifId, '✅ Marqué comme postulé (mode manuel)', 'success');
      setTimeout(() => removeNotif(manualNotifId), 4000);

      setApplied(prev =>
        prev.find(e => e.job.id === job.id)
          ? prev
          : [{ job, appliedAt: new Date().toISOString(), method: 'manual' }, ...prev]
      );
    }, 3000);

  }, [extAvailable, addNotif, updateNotif, removeNotif]);

  // ── handleDelete ──────────────────────────────────────────────────────────
  const handleDelete = useCallback((job) => {
    if (undoTimerRef.current)    clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    // Masquage immédiat basé sur le Titre+Entreprise (infaillible)
    setDeletedKeys(prev => new Set([...prev, jobKey(job)]));

    let remaining = 10;
    setUndoToast({ job, remaining });

    undoIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setUndoToast(prev => prev ? { ...prev, remaining } : null);
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      clearInterval(undoIntervalRef.current);
      setUndoToast(null);
      // Suppression physique Supabase après le délai d'annulation
      if (job.id && userId) {
        supabase.from('jb_jobs').delete().eq('id', job.id).eq('user_id', userId)
          .then(({ error }) => {
            if (error) console.error('❌ Erreur suppression job:', error.message);
          });
      }
    }, 10000);
  }, [userId]);

  // ── handleUndo ────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoTimerRef.current)    clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    if (undoToast) {
      // Restauration par ID stable
      // Restauration par Titre+Entreprise
      setDeletedKeys(prev => { const next = new Set(prev); next.delete(jobKey(undoToast.job)); return next; });setUndoToast(null);
    }
  }, [undoToast]);

  // ── handleClearJobs ───────────────────────────────────────────────────────
  const handleClearJobs = useCallback(async () => {
    if (!userId) return;
    if (!window.confirm('Vider tous les résultats ? Un re-scrape sera nécessaire.')) return;
    const { error } = await supabase.from('jb_jobs').delete().eq('user_id', userId);
    if (error) { console.error('❌ Erreur purge jobs:', error.message); return; }
    setJobs([]);
    knownJobIdsRef.current = new Set();
    setNewJobIds(new Set());
    setFetched(true);
  }, [userId]);

  // ── Filtres visuels ───────────────────────────────────────────────────────
  const appliedKeys = new Set(
    applied.map(e => `${(e.job.title || '').toLowerCase().trim()}|${(e.job.company || '').toLowerCase().trim()}`)
  );
  const enabledFilterUrls = urlFilters.filter(f => f.enabled).map(f => f.url);
  const hasActiveFilters  = enabledFilterUrls.length > 0 && enabledFilterUrls.length < urlFilters.length;

  const seenTitleCompany = new Set();
  const visibleJobs = jobs
    .filter(j => !jobMatchesBanwords(j, banwords))
    .filter(j => typeFilter === 'all' || j.type === typeFilter)
    .filter(j => !deletedKeys.has(jobKey(j)))
    .filter(j => !appliedKeys.has(jobKey(j)))
    .filter(j => {
      if (!hasActiveFilters) return true;
      return enabledFilterUrls.some(url => j.sourceUrl === url);
    })
    .filter(j => {
      const key = jobKey(j);
      if (seenTitleCompany.has(key)) return false;
      seenTitleCompany.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30);

  const savedIds   = new Set(saves.map(s => s.id));
  const isScraping = scrapeStatus === 'pending' || scrapeStatus === 'running';

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="jb-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Chargement…
    </div>
  );
  if (!session) return <LoginScreen onLogin={(s) => setSession(s)} />;

  return (
    <div className="jb-root">

      {/* ── Stack notifications ── */}
      <div className="jb-notif-stack">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              className={`jb-notif jb-notif-${n.type}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div className="jb-notif-body">
                <div className="jb-notif-title">
                  {n.job?.title || 'Candidature'}
                  {n.job?.company ? <span className="jb-notif-company"> · {n.job.company}</span> : null}
                </div>
                <div className="jb-notif-msg">{n.msg}</div>
                {n.type === 'error' && n.job?.url && (
                  <a href={n.job.url} target="_blank" rel="noreferrer" className="jb-notif-link">
                    Ouvrir l'offre manuellement →
                  </a>
                )}
              </div>
              <button className="jb-notif-close" onClick={() => removeNotif(n.id)}>✕</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Toasts ── */}
      <AnimatePresence>
        {queueSize > 0 && (
          <motion.div
            className="jb-new-toast"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            ⏳ {queueSize} offre{queueSize > 1 ? 's' : ''} en attente…
          </motion.div>
        )}
        {undoToast && (
          <motion.div
            className="jb-undo-toast"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <span className="jb-undo-label">🗑️ Offre supprimée</span>
            <button className="jb-undo-btn" onClick={handleUndo}>
              Annuler <span className="jb-undo-timer">{undoToast.remaining}s</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="jb-header">
        <div className="jb-header-top">
          <button className="jb-back-btn" onClick={() => navigate(-1)}><IconBack /> Retour</button>
          <div className="jb-session-info">
            <span className="jb-session-email"><IconUser /> {session.email}</span>
            <button
              className="jb-logout-btn"
              onClick={async () => { await supabase.auth.signOut(); setSession(null); }}
            >
              <IconLogout /> Déconnexion
            </button>
          </div>
        </div>
        <div className="jb-hero">
          <div className="jb-hero-badge">🎯 Job Tracker</div>
          <h1 className="jb-hero-title">Scrape tes <span className="highlight">offres d'emploi</span></h1>
        </div>
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
              <span className="jb-tab-icon">{tab.icon}</span> {tab.label}
              {tab.id === 'applied' && applied.length > 0 && (
                <span className="jb-tab-badge">{applied.length}</span>
              )}
            </button>
          ))}
          <button
            className="jb-tab jb-tab-refresh"
            onClick={triggerScrape}
            disabled={loading || isScraping}
            title="Scraper maintenant"
          >
            <IconRefresh spinning={loading || isScraping} />
            {isScraping ? 'Scraping…' : 'Actualiser'}
          </button>
          {!isScraping && filtersLoaded && userId && (
            <CountdownRing value={countdown} total={POLL_INTERVAL} />
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <main className="jb-main">
        <AnimatePresence mode="wait">

          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {fetched && !loading && (
                <div className="jb-type-filters">
                  {['all', 'alternance', 'stage', 'emploi'].map(t => (
                    <button
                      key={t}
                      className={`jb-filter-btn ${typeFilter === t ? 'active' : ''}`}
                      onClick={() => setTypeFilter(t)}
                    >
                      {t === 'all' ? `Tout (${visibleJobs.length})` : TYPE_LABELS[t]?.label}
                    </button>
                  ))}
                </div>
              )}

              {isScraping && (
                <motion.div className="jb-scrape-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="jb-scrape-spinner">⟳</span> Scraping en direct… Laisse la page ouverte !
                </motion.div>
              )}

              {debugInfo && !isScraping && (
                <div style={{ margin: '12px 0', padding: '12px 16px', background: '#1a1a2e', border: '1px solid #334', borderRadius: 10, fontSize: '0.78rem', color: '#aaa', fontFamily: 'monospace' }}>
                  <strong style={{ color: '#13c9ed' }}>🔎 Debug dernier scrape</strong><br />
                  Clés : <span style={{ color: '#fff' }}>{debugInfo.rawKeys.join(', ')}</span><br />
                  Nb results : <span style={{ color: '#fff' }}>{debugInfo.nbResults}</span><br />
                  {debugInfo.firstResult && <>
                    1er result — URL : <span style={{ color: '#fff' }}>{debugInfo.firstResult.url}</span>
                    {' · '}
                    <span style={{ color: debugInfo.firstResult.nbJobs > 0 ? '#4ade80' : '#ef4444' }}>
                      {debugInfo.firstResult.nbJobs} job(s)
                    </span><br />
                    1er job : <span style={{ color: '#fff' }}>{JSON.stringify(debugInfo.firstResult.firstJob)}</span>
                  </>}
                  <button
                    onClick={() => setDebugInfo(null)}
                    style={{ marginTop: 8, display: 'block', background: 'none', border: '1px solid #334', color: '#aaa', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}
                  >
                    Fermer
                  </button>
                </div>
              )}

              {error && !loading && <div className="jb-error-box"><p>😕 {error}</p></div>}

              {loading && (
                <div className="jb-grid">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
                </div>
              )}

              {!loading && fetched && visibleJobs.length === 0 && (
                <div className="jb-empty">
                  <div className="jb-empty-icon">🔍</div>
                  <h3>Aucune offre trouvée</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem' }}>
                    Lance un scrape depuis "Mes liens" ou vérifie la console.
                  </p>
                </div>
              )}

              {!loading && fetched && visibleJobs.length > 0 && (
                <div className="jb-grid">
                  <AnimatePresence>
                    {visibleJobs.map((job, i) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        index={i}
                        saved={savedIds.has(job.id)}
                        isNew={newJobIds.has(job.id)}
                        extAvailable={extAvailable}
                        applyingIds={applyingIds}
                        onSave={(j) => setSaves(p =>
                          p.find(s => s.id === j.id) ? p.filter(s => s.id !== j.id) : [j, ...p]
                        )}
                        onApply={handleApply}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'filters' && (
            <motion.div key="filters">
              <FiltersPanel
                filters={urlFilters}
                onChange={setUrlFilters}
                onScrapeNow={triggerScrape}
                scrapeStatus={scrapeStatus}
                onClearJobs={handleClearJobs}
              />
            </motion.div>
          )}

          {activeTab === 'banwords' && (
            <motion.div key="banwords">
              <BanwordsPanel banwords={banwords} onChange={setBanwords} />
            </motion.div>
          )}

          {activeTab === 'saves' && (
            <motion.div key="saves">
              <SavesPanel saves={saves} onRemove={(id) => setSaves(p => p.filter(s => s.id !== id))} />
            </motion.div>
          )}

          {activeTab === 'applied' && (
            <motion.div key="applied">
              <AppliedPanel
                applied={applied}
                onRemove={(id) => {
                  const entry = applied.find(e => e.job.id === id);
                  if (entry) {
                    // On purge l'offre des deletedKeys (pour corriger les anciennes sessions buggées)
                    setDeletedKeys(prev => {
                      const next = new Set(prev);
                      next.delete(jobKey(entry.job));
                      return next;
                    });
                  }
                  // On la retire de la liste des postulants
                  setApplied(p => p.filter(e => e.job.id !== id));
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}