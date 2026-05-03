// src/pages/JobBoard.jsx
// Dashboard d'offres d'alternance agrégées depuis Indeed, Hello Work et stage.fr
// Ajouter dans App.jsx : <Route path="/alternances" element={<JobBoard />} />

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Variants ─────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const SOURCES = ['Toutes', 'Indeed', 'Hello Work', 'Stage.fr'];

const STATUS_CONFIG = {
  none:      { label: '—',          color: 'var(--text-secondary)',  bg: 'transparent' },
  saved:     { label: '⭐ Sauvegardé', color: '#f39c12', bg: 'rgba(243,156,18,0.1)' },
  applied:   { label: '✅ Postulé',   color: '#27ae60', bg: 'rgba(39,174,96,0.1)'  },
  rejected:  { label: '❌ Refusé',    color: '#e74c3c', bg: 'rgba(231,76,60,0.1)'  },
};

const STATUS_CYCLE = ['none', 'saved', 'applied', 'rejected'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
  } catch (_) {
    return null;
  }
}

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)}sem`;
  return formatDate(iso);
}

// ─── Hook localStorage statuts ────────────────────────────────────────────────

function useJobStatuses() {
  const [statuses, setStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('job_statuses') || '{}'); }
    catch (_) { return {}; }
  });

  const setStatus = useCallback((id, status) => {
    setStatuses(prev => {
      const next = { ...prev, [id]: status };
      localStorage.setItem('job_statuses', JSON.stringify(next));
      return next;
    });
  }, []);

  const cycleStatus = useCallback((id) => {
    setStatuses(prev => {
      const current = prev[id] || 'none';
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      const updated = { ...prev, [id]: next };
      localStorage.setItem('job_statuses', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { statuses, setStatus, cycleStatus };
}

// ─── Hook localStorage offres vues ────────────────────────────────────────────

function useSeenJobs() {
  const [seen, setSeen] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('job_seen') || '[]')); }
    catch (_) { return new Set(); }
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

// ─── Composant SourceBadge ─────────────────────────────────────────────────────

function SourceBadge({ source, color }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: 700,
      background: `${color}18`,
      color,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {source}
    </span>
  );
}

// ─── Composant JobCard ────────────────────────────────────────────────────────

function JobCard({ job, status, onCycleStatus, isSeen, onMarkSeen }) {
  const statusCfg = STATUS_CONFIG[status || 'none'];

  const handleClick = () => {
    onMarkSeen(job.id);
    window.open(job.link, '_blank', 'noopener noreferrer');
  };

  return (
    <motion.div
      variants={cardVariants}
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${isSeen ? 'var(--border-subtle)' : 'rgba(19,201,237,0.2)'}`,
        borderRadius: '16px',
        padding: '1rem 1.2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: isSeen ? 'var(--shadow-card)' : '0 4px 20px rgba(19,201,237,0.08)',
        opacity: isSeen ? 0.82 : 1,
        transition: 'all 0.25s ease',
        position: 'relative',
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.015, boxShadow: '0 8px 32px rgba(19,201,237,0.15)' }}
    >
      {/* Badge "Nouveau" */}
      {!isSeen && (
        <span style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'var(--highlight-color)',
          color: '#fff',
          fontSize: '0.62rem',
          fontWeight: 800,
          padding: '2px 7px',
          borderRadius: '20px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Nouveau
        </span>
      )}

      {/* En-tête : source + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <SourceBadge source={job.source} color={job.sourceColor} />
        {job.date && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
            🕐 {timeAgo(job.date)}
          </span>
        )}
      </div>

      {/* Titre */}
      <h3
        onClick={handleClick}
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          lineHeight: 1.35,
          paddingRight: '50px', // espace pour le badge "Nouveau"
          cursor: 'pointer',
        }}
      >
        {job.title}
      </h3>

      {/* Entreprise + localisation */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {job.description}
        </p>
      )}

      {/* Footer : statut + lien */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.25rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {/* Bouton statut */}
        <button
          onClick={(e) => { e.stopPropagation(); onCycleStatus(job.id); }}
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            border: `1px solid ${statusCfg.color}50`,
            background: statusCfg.bg,
            color: statusCfg.color,
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Cliquer pour changer le statut"
        >
          {statusCfg.label}
        </button>

        {/* Lien externe */}
        <button
          onClick={handleClick}
          style={{
            padding: '5px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(19,201,237,0.3)',
            background: 'transparent',
            color: 'var(--highlight-color)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(19,201,237,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Voir l'offre →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Composant principal JobBoard ─────────────────────────────────────────────

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [sources, setSources] = useState({});

  const [search, setSearch] = useState('');
  const [activeSource, setActiveSource] = useState('Toutes');
  const [activeStatus, setActiveStatus] = useState('Toutes');

  const { statuses, cycleStatus } = useJobStatuses();
  const { seen, markSeen } = useSeenJobs();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setSources(data.sources || {});
      setFetchedAt(data.fetchedAt || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Filtrage ────────────────────────────────────────────────────────────────
  const filtered = jobs.filter(job => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q) ||
      job.description.toLowerCase().includes(q);

    const matchSource =
      activeSource === 'Toutes' ||
      job.source === activeSource ||
      (activeSource === 'Stage.fr' && job.source === 'Stage.fr');

    const jobStatus = statuses[job.id] || 'none';
    const matchStatus =
      activeStatus === 'Toutes' ||
      (activeStatus === 'Nouveau' && !seen.has(job.id)) ||
      (activeStatus !== 'Nouveau' && jobStatus === activeStatus.toLowerCase());

    return matchSearch && matchSource && matchStatus;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const newCount = jobs.filter(j => !seen.has(j.id)).length;
  const appliedCount = Object.values(statuses).filter(s => s === 'applied').length;
  const savedCount = Object.values(statuses).filter(s => s === 'saved').length;

  return (
    <div style={{
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '2rem 1.25rem',
    }}>

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '2rem' }}
      >
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: 900,
          color: 'var(--text-main)',
          marginBottom: '0.4rem',
        }}>
          Offres d'<span style={{ color: 'var(--highlight-color)' }}>alternance</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Agrégation en direct — Indeed · Hello Work · Stage.fr
          {fetchedAt && (
            <span> · Mis à jour {timeAgo(fetchedAt)}</span>
          )}
        </p>
      </motion.div>

      {/* ── Compteurs ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
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
            borderRadius: '14px',
            padding: '0.9rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Barre de recherche ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <span style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          placeholder="Rechercher un poste, une entreprise, une ville…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.5rem',
            borderRadius: '12px',
            border: '1.5px solid var(--border-subtle)',
            background: 'var(--card-bg)',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--highlight-color)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)'; }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >✕</button>
        )}
      </div>

      {/* ── Filtres Sources ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0.75rem' }}>
        {SOURCES.map(src => (
          <button
            key={src}
            onClick={() => setActiveSource(src)}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              border: `1.5px solid ${activeSource === src ? 'var(--highlight-color)' : 'var(--border-subtle)'}`,
              background: activeSource === src ? 'rgba(19,201,237,0.12)' : 'transparent',
              color: activeSource === src ? 'var(--highlight-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {src}
          </button>
        ))}
      </div>

      {/* ── Filtres Statuts ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
        {['Toutes', 'Nouveau', 'saved', 'applied', 'rejected'].map(st => {
          const label = st === 'Toutes' ? 'Tous les statuts'
            : st === 'Nouveau' ? '🆕 Nouveaux'
            : STATUS_CONFIG[st]?.label || st;
          const isActive = activeStatus === st;
          return (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: `1px solid ${isActive ? 'var(--highlight-color)' : 'var(--border-subtle)'}`,
                background: isActive ? 'rgba(19,201,237,0.1)' : 'transparent',
                color: isActive ? 'var(--highlight-color)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Sources détail ────────────────────────────────────────────────────── */}
      {!loading && Object.keys(sources).length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
        }}>
          <span>📊 Sources :</span>
          <span>Indeed <strong style={{ color: '#2164f3' }}>{sources.indeed || 0}</strong></span>
          <span>Hello Work <strong style={{ color: '#ff6b35' }}>{sources.hellowork || 0}</strong></span>
          <span>Stage.fr <strong style={{ color: '#00b894' }}>{sources.stagefr || 0}</strong></span>
          <button
            onClick={fetchJobs}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'var(--highlight-color)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            🔄 Actualiser
          </button>
        </div>
      )}

      {/* ── États ─────────────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(19,201,237,0.2)',
              borderTop: '3px solid #13c9ed',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '0.9rem' }}>Chargement des offres…</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '14px',
          background: 'rgba(231,76,60,0.08)',
          border: '1px solid rgba(231,76,60,0.2)',
          color: '#e74c3c',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Impossible de charger les offres</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{error}</div>
          <button
            onClick={fetchJobs}
            style={{
              marginTop: '1rem',
              padding: '8px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(231,76,60,0.3)',
              background: 'rgba(231,76,60,0.1)',
              color: '#e74c3c',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔎</div>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Aucune offre trouvée</div>
          <div style={{ fontSize: '0.85rem' }}>Essaie d'autres filtres ou mots-clés</div>
        </div>
      )}

      {/* ── Grille d'offres ───────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {filtered.length} offre{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          </p>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: '1rem',
            }}
          >
            <AnimatePresence>
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
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
