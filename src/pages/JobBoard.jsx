// src/pages/JobBoard.jsx
// v3 — Auth Supabase réelle (email/mdp) + scraping non-bloquant (polling)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './JobBoard.css';

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
const IconUser      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLogout    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

// ── Source detection ──────────────────────────────────────────────────────────

const SOURCE_PATTERNS = [
  { id: 'indeed',    label: 'Indeed',               color: '#2557a7', emoji: '💼', pattern: /indeed\.com/i },
  { id: 'hellowork', label: 'HelloWork',            color: '#7c3aed', emoji: '👋', pattern: /hellowork\.com/i },
  { id: 'stagefr',   label: 'Stage.fr',             color: '#f59e0b', emoji: '📋', pattern: /stage\.fr/i },
  { id: 'lba',       label: 'La Bonne Alternance',  color: '#1a73e8', emoji: '🎓', pattern: /labonnealternance\.apprentissage/i },
  { id: 'adzuna',    label: 'Adzuna',               color: '#e64c1f', emoji: '🔍', pattern: /adzuna\.fr/i },
  { id: 'ft',        label: 'France Travail',       color: '#00a651', emoji: '🏛️', pattern: /francetravail\.fr|pole-emploi\.fr/i },
  { id: 'linkedin',  label: 'LinkedIn',             color: '#0a66c2', emoji: '🔗', pattern: /linkedin\.com/i },
  { id: 'welcomejb', label: 'Welcome to the Jungle',color: '#ff4655', emoji: '🌴', pattern: /welcometothejungle\.com/i },
  { id: 'monster',   label: 'Monster',              color: '#6600cc', emoji: '👾', pattern: /monster\.fr/i },
];

function detectSource(url) {
  for (const src of SOURCE_PATTERNS) {
    if (src.pattern.test(url)) return src;
  }
  try {
    return { id: 'other', label: new URL(url).hostname.replace('www.', ''), color: '#555', emoji: '🌐' };
  } catch {
    return { id: 'other', label: 'Source', color: '#555', emoji: '🌐' };
  }
}

const TYPE_LABELS = {
  alternance: { label: 'Alternance', color: '#13c9ed' },
  stage:      { label: 'Stage',      color: '#7c3aed' },
  emploi:     { label: 'Emploi',     color: '#1a73e8' },
};

// ── Auth Supabase ──────────────────────────────────────────────────────────────
// On utilise Supabase Auth (email + mot de passe) pour une vraie vérification
// côté serveur. Le userId = supabase user.id (UUID stable, jamais modifié).

// ── Écran de connexion ─────────────────────────────────────────────────────────

// src/components/LoginScreen.jsx
// Remplace le composant LoginScreen dans JobBoard.jsx
// Design : terminal minimaliste avec accent cyan, typographie Syne

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Animations ────────────────────────────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

const boxVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

const fieldVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07 + 0.18, duration: 0.3 } }),
};

// ── Curseur clignotant ────────────────────────────────────────────────────────

function BlinkCursor() {
  return <span className="ls-blink">_</span>;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isNew,    setIsNew]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hint,     setHint]     = useState('');
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  // Pseudo-log de boot
  const [bootDone, setBootDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 600);
    return () => clearTimeout(t);
  }, []);

  const validate = () => {
    if (!email.trim())    return 'Email requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide';
    if (!password.trim()) return 'Mot de passe requis';
    if (password.length < 6) return 'Min. 6 caractères';
    return null;
  };

  const handle = async (e) => {
    e?.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    setHint('');

    try {
      // importer supabase depuis le contexte du projet
      const { supabase } = await import('../supabase');
      let result;
      if (isNew) {
        result = await supabase.auth.signUp({ email: email.trim(), password });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setHint('✉ Vérifie ta boîte mail pour confirmer ton compte.');
          setLoading(false);
          return;
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      }
      const user = result.data.user;
      onLogin({ email: user.email, userId: user.id });
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) setError('Email ou mot de passe incorrect.');
      else if (msg.includes('Email not confirmed'))   setError('Confirme ton email avant de te connecter.');
      else if (msg.includes('User already registered')) setError('Ce compte existe déjà → Connecte-toi.');
      else setError(msg || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── LoginScreen styles ─────────────────────────────────── */
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

        .ls-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: var(--bg-color, #0d0f11);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
        }

        .ls-noise {
          position: fixed; inset: 0; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none; opacity: 0.4;
        }

        .ls-glow {
          position: fixed; z-index: 0;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(19,201,237,0.06) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .ls-box {
          position: relative; z-index: 1;
          width: 100%; max-width: 420px;
          background: var(--card-bg, #141618);
          border: 1px solid rgba(19,201,237,0.18);
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 32px 64px rgba(0,0,0,0.45), 0 0 80px rgba(19,201,237,0.04);
        }

        /* Barre de titre style fenêtre terminal */
        .ls-titlebar {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }
        .ls-dot {
          width: 10px; height: 10px; border-radius: 50%;
        }
        .ls-dot:nth-child(1) { background: #ff5f57; }
        .ls-dot:nth-child(2) { background: #febc2e; }
        .ls-dot:nth-child(3) { background: #28c840; }
        .ls-titlebar-label {
          margin-left: auto; margin-right: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem; color: rgba(255,255,255,0.3);
          letter-spacing: 0.05em;
        }

        /* Corps */
        .ls-body { padding: 2rem 2rem 1.75rem; }

        /* Branding */
        .ls-brand {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 1.75rem;
        }
        .ls-brand-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(19,201,237,0.15), rgba(19,201,237,0.05));
          border: 1px solid rgba(19,201,237,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.25rem;
        }
        .ls-brand-text { }
        .ls-brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 1.1rem; font-weight: 800;
          color: var(--text-main, #f0f2f5);
          letter-spacing: -0.01em; line-height: 1;
        }
        .ls-brand-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem; color: rgba(19,201,237,0.7);
          margin-top: 3px;
        }

        /* Prompt de terminal */
        .ls-prompt {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem; color: rgba(255,255,255,0.25);
          margin-bottom: 1.25rem;
          display: flex; align-items: center; gap: 6px;
        }
        .ls-prompt-arrow { color: rgba(19,201,237,0.5); }

        /* Champs */
        .ls-field { margin-bottom: 1rem; }
        .ls-label {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem; font-weight: 500;
          color: rgba(19,201,237,0.6);
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .ls-input {
          width: 100%; box-sizing: border-box;
          padding: 0.7rem 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          color: var(--text-main, #f0f2f5);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .ls-input::placeholder { color: rgba(255,255,255,0.2); }
        .ls-input:focus {
          border-color: rgba(19,201,237,0.45);
          background: rgba(19,201,237,0.03);
          box-shadow: 0 0 0 3px rgba(19,201,237,0.08);
        }

        /* Erreur / Hint */
        .ls-error {
          margin-top: 0.6rem;
          padding: 0.6rem 0.85rem;
          background: rgba(255,80,80,0.07);
          border: 1px solid rgba(255,80,80,0.2);
          border-radius: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.73rem; color: #ff8080;
        }
        .ls-hint {
          margin-top: 0.6rem;
          padding: 0.6rem 0.85rem;
          background: rgba(19,201,237,0.06);
          border: 1px solid rgba(19,201,237,0.2);
          border-radius: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.73rem; color: rgba(19,201,237,0.85);
        }

        /* Bouton principal */
        .ls-submit {
          width: 100%; margin-top: 1.25rem;
          padding: 0.8rem 1rem;
          background: rgba(19,201,237,0.12);
          border: 1px solid rgba(19,201,237,0.35);
          border-radius: 8px;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          color: #13c9ed;
          cursor: pointer; letter-spacing: 0.02em;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .ls-submit:hover:not(:disabled) {
          background: rgba(19,201,237,0.2);
          border-color: rgba(19,201,237,0.6);
          box-shadow: 0 0 20px rgba(19,201,237,0.12);
          transform: translateY(-1px);
        }
        .ls-submit:disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        /* Spinner dans le bouton */
        .ls-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(19,201,237,0.2);
          border-top-color: #13c9ed;
          border-radius: 50%;
          animation: ls-spin 0.7s linear infinite;
        }
        @keyframes ls-spin { to { transform: rotate(360deg); } }

        /* Switch mode */
        .ls-switch {
          margin-top: 1.25rem; text-align: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.83rem; color: rgba(255,255,255,0.3);
        }
        .ls-switch button {
          background: none; border: none; cursor: pointer;
          color: rgba(19,201,237,0.7);
          font-family: 'DM Sans', sans-serif; font-size: 0.83rem;
          padding: 0; margin-left: 4px;
          text-decoration: underline; text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .ls-switch button:hover { color: #13c9ed; }

        /* Divider footer */
        .ls-divider {
          margin: 1.5rem -2rem 0;
          padding: 0.75rem 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.01);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.68rem; color: rgba(255,255,255,0.12);
          text-align: center;
          letter-spacing: 0.04em;
        }

        /* Curseur clignotant */
        .ls-blink {
          display: inline-block;
          animation: ls-blink 1s step-end infinite;
          color: rgba(19,201,237,0.6);
          font-weight: 400;
        }
        @keyframes ls-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

        /* Boot animation */
        .ls-boot {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem; color: rgba(19,201,237,0.4);
          margin-bottom: 1.5rem; line-height: 1.7;
        }
        .ls-boot-line { display: flex; gap: 8px; }
        .ls-boot-ok { color: #28c840; }
      `}</style>

      <motion.div className="ls-overlay" variants={overlayVariants} initial="hidden" animate="visible">
        <div className="ls-noise" aria-hidden />
        <div className="ls-glow" aria-hidden />

        <motion.div className="ls-box" variants={boxVariants} initial="hidden" animate="visible">
          {/* Barre de fenêtre */}
          <div className="ls-titlebar">
            <div className="ls-dot" /><div className="ls-dot" /><div className="ls-dot" />
            <span className="ls-titlebar-label">job-tracker — session</span>
          </div>

          <div className="ls-body">
            {/* Brand */}
            <div className="ls-brand">
              <div className="ls-brand-icon">🎯</div>
              <div className="ls-brand-text">
                <div className="ls-brand-name">Job Tracker</div>
                <div className="ls-brand-sub">v3.0 · multi-source</div>
              </div>
            </div>

            {/* Boot log (animation de chargement) */}
            <AnimatePresence>
              {!bootDone && (
                <motion.div className="ls-boot" exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.25 }}>
                  <div className="ls-boot-line"><span className="ls-boot-ok">✓</span> supabase.init</div>
                  <div className="ls-boot-line"><span className="ls-boot-ok">✓</span> scrapers.ready</div>
                  <div className="ls-boot-line"><span>→</span> awaiting auth<BlinkCursor /></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt */}
            {bootDone && (
              <div className="ls-prompt">
                <span className="ls-prompt-arrow">›</span>
                {isNew ? 'create_account' : 'sign_in'}
                <BlinkCursor />
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handle} noValidate>
              <motion.div className="ls-field" custom={0} variants={fieldVariants} initial="hidden" animate="visible">
                <label className="ls-label">email</label>
                <input
                  ref={emailRef}
                  type="email"
                  className="ls-input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="toi@exemple.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </motion.div>

              <motion.div className="ls-field" custom={1} variants={fieldVariants} initial="hidden" animate="visible">
                <label className="ls-label">password</label>
                <input
                  type="password"
                  className="ls-input"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={isNew ? 'min. 6 caractères' : '••••••••'}
                  autoComplete={isNew ? 'new-password' : 'current-password'}
                  disabled={loading}
                />
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div className="ls-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    ⚠ {error}
                  </motion.div>
                )}
                {hint && (
                  <motion.div className="ls-hint" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {hint}
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" className="ls-submit" disabled={loading}>
                {loading ? (
                  <><div className="ls-spinner" /> Connexion…</>
                ) : (
                  isNew ? '→ Créer le compte' : '→ Se connecter'
                )}
              </button>
            </form>

            <div className="ls-switch">
              {isNew ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              <button
                type="button"
                onClick={() => { setIsNew(v => !v); setError(''); setHint(''); }}
                disabled={loading}
              >
                {isNew ? 'Se connecter' : 'Créer un compte'}
              </button>
            </div>

            <div className="ls-divider">
              données isolées par compte · aucun tracking · 100% local
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
// ── LocalStorage helpers ──────────────────────────────────────────────────────

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

function formatNextRefresh(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// ── Composant JobCard ─────────────────────────────────────────────────────────

function JobCard({ job, index, saved, onSave }) {
  const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS.emploi;
  const source   = detectSource(job.sourceUrl || job.url || '');
  const color    = source.color;

  return (
    <motion.div
      className="jb-card"
      style={{ '--source-color': color }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.6) }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <div className="jb-card-accent" />
      <div className="jb-card-inner">
        <div className="jb-card-top">
          <div className="jb-card-badges">
            <span className="jb-source-badge" style={{ background: color + '18', color }}>
              {source.emoji} {source.label}
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
              style={{ color: saved ? '#13c9ed' : undefined }}
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
        <div className="jb-sk-row" style={{ width: '45%', height: 18, marginBottom: 12 }} />
        <div className="jb-sk-row" style={{ width: '88%', height: 22, marginBottom: 8 }} />
        <div className="jb-sk-row" style={{ width: '55%', height: 15, marginBottom: 6 }} />
        <div className="jb-sk-row" style={{ width: '38%', height: 13, marginBottom: 14 }} />
        <div className="jb-sk-row" style={{ width: '72%', height: 11 }} />
        <div className="jb-sk-row" style={{ width: '52%', height: 11, marginTop: 4 }} />
      </div>
    </div>
  );
}

// ── FilterRow ─────────────────────────────────────────────────────────────────

function FilterRow({ filter, onToggle, onDelete, isNew }) {
  let source = null;
  try { source = detectSource(filter.url); } catch {}

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
          title={filter.enabled ? 'Désactiver' : 'Activer'}
        >
          {filter.enabled ? <IconCheck /> : null}
        </button>
        <div className="jb-filter-info">
          {source && (
            <span className="jb-filter-source" style={{ color: source.color }}>
              {source.emoji} {source.label}
            </span>
          )}
          <a href={filter.url} target="_blank" rel="noopener noreferrer" className="jb-filter-url" title={filter.url}>
            {filter.label || filter.url}
            <IconExternal />
          </a>
          {filter.lastScraped && (
            <span className="jb-filter-meta">
              <IconClock /> Scrapé {timeAgo(filter.lastScraped)} · {filter.jobCount ?? 0} offre{filter.jobCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <button className="jb-filter-del" onClick={() => onDelete(filter.id)} title="Supprimer">
        <IconTrash />
      </button>
    </motion.div>
  );
}

// ── IconClock (manquait dans la liste en haut) ────────────────────────────────

const IconClockInline = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

// ── FiltersPanel ──────────────────────────────────────────────────────────────

function FiltersPanel({ filters, onChange, onScrapeNow, scrapeStatus }) {
  const [urlInput,   setUrlInput]   = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [urlError,   setUrlError]   = useState('');
  const [newId,      setNewId]      = useState(null);
  const inputRef = useRef(null);

  const addFilter = () => {
    const url = urlInput.trim();
    if (!url) return;
    try { new URL(url); } catch {
      setUrlError('URL invalide — commence par https://');
      return;
    }
    if (filters.some(f => f.url === url)) {
      setUrlError('Ce lien est déjà dans la liste');
      return;
    }
    const id = `f-${Date.now()}`;
    const label = labelInput.trim() || null;
    onChange([...filters, { id, url, label, enabled: true, lastScraped: null, jobCount: null }]);
    setNewId(id);
    setUrlInput('');
    setLabelInput('');
    setUrlError('');
    setTimeout(() => setNewId(null), 2000);
  };

  const toggleFilter = (id) => onChange(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  const deleteFilter = (id) => onChange(filters.filter(f => f.id !== id));
  const enabledCount = filters.filter(f => f.enabled).length;

  const scrapeLabel =
    scrapeStatus === 'running' || scrapeStatus === 'pending' ? '⟳ Scraping…'
    : scrapeStatus === 'done'  ? '✓ Terminé'
    : 'Scraper maintenant';

  return (
    <div className="jb-panel">
      <p className="jb-panel-hint">
        Colle directement l'URL d'une page de résultats (Indeed, HelloWork, LBA…). Le scraper visitera chaque lien actif et en extraira les offres automatiquement.
      </p>

      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconLink /> Ajouter un lien de recherche</h4>
        <div className="jb-url-form">
          <div className={`jb-url-input-wrap ${urlError ? 'error' : ''}`}>
            <span className="jb-url-prefix">🔗</span>
            <input
              ref={inputRef}
              className="jb-input"
              value={urlInput}
              onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
              onKeyDown={e => e.key === 'Enter' && addFilter()}
              placeholder="https://fr.indeed.com/jobs?q=alternance+dev&l=Paris"
            />
            {urlInput && (
              <button className="jb-url-clear" onClick={() => { setUrlInput(''); setUrlError(''); inputRef.current?.focus(); }}>
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
            placeholder="Nom optionnel (ex: Dev React Paris)"
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
            <button
              className="jb-ghost-btn"
              style={{ marginTop: 0, fontSize: '0.78rem' }}
              onClick={onScrapeNow}
              disabled={scrapeStatus === 'running' || scrapeStatus === 'pending' || enabledCount === 0}
            >
              <IconRefresh spinning={scrapeStatus === 'running' || scrapeStatus === 'pending'} />
              {scrapeLabel}
            </button>
          </div>

          <div className="jb-filter-list">
            <AnimatePresence>
              {filters.map(f => (
                <FilterRow
                  key={f.id}
                  filter={f}
                  onToggle={toggleFilter}
                  onDelete={deleteFilter}
                  isNew={f.id === newId}
                />
              ))}
            </AnimatePresence>
          </div>

          {filters.length > 0 && (
            <button className="jb-ghost-btn danger" onClick={() => onChange([])}>
              <IconTrash /> Tout supprimer
            </button>
          )}
        </div>
      )}

      {filters.length === 0 && (
        <div className="jb-empty" style={{ padding: '2rem 0' }}>
          <div className="jb-empty-icon">🔗</div>
          <h3>Aucun lien ajouté</h3>
          <p>Colle l'URL d'une page de résultats depuis Indeed, HelloWork, LBA…</p>
        </div>
      )}
    </div>
  );
}

// ── BanwordsPanel ─────────────────────────────────────────────────────────────

function BanwordsPanel({ banwords, onChange }) {
  const [val, setVal] = useState('');
  const add = () => {
    const trimmed = val.trim();
    if (trimmed && !banwords.includes(trimmed)) onChange([...banwords, trimmed]);
    setVal('');
  };

  return (
    <div className="jb-panel">
      <p className="jb-panel-hint">
        Les offres contenant ces mots (titre, entreprise ou description) seront automatiquement masquées.
      </p>
      <div className="jb-panel-section">
        <h4 className="jb-panel-label"><IconBan /> Mots bannis</h4>
        <div className="jb-tag-input-wrap">
          <div className="jb-tags-list">
            {banwords.map(t => (
              <span key={t} className="jb-tag" style={{ '--tag-color': '#ef4444' }}>
                {t}
                <button className="jb-tag-rm" onClick={() => onChange(banwords.filter(b => b !== t))}><IconX /></button>
              </span>
            ))}
          </div>
          <div className="jb-tag-field">
            <input
              className="jb-input jb-tag-input"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="Ex : senior, manager, stagiaire…"
            />
            <button className="jb-tag-add-btn" onClick={add} style={{ color: '#ef4444' }}><IconPlus /></button>
          </div>
        </div>
      </div>
      {banwords.length > 0 && (
        <button className="jb-ghost-btn danger" onClick={() => onChange([])}>
          <IconTrash /> Tout effacer
        </button>
      )}
    </div>
  );
}

// ── SavesPanel ────────────────────────────────────────────────────────────────

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
        {saves.map((job) => {
          let source = { color: '#555', emoji: '🌐', label: 'Source' };
          try { source = detectSource(job.sourceUrl || job.url || ''); } catch {}
          const typeInfo = TYPE_LABELS[job.type] || TYPE_LABELS.emploi;
          return (
            <div key={job.id} className="jb-card" style={{ '--source-color': source.color }}>
              <div className="jb-card-accent" />
              <div className="jb-card-inner">
                <div className="jb-card-top">
                  <div className="jb-card-badges">
                    <span className="jb-source-badge" style={{ background: source.color + '18', color: source.color }}>
                      {source.emoji} {source.label}
                    </span>
                    <span className="jb-type-badge" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>
                      {typeInfo.label}
                    </span>
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

// ── RefreshBar ────────────────────────────────────────────────────────────────

function RefreshBar({ nextRefreshIn, lastRefresh, loading, scrapeStatus }) {
  const INTERVAL = 30 * 60 * 1000;
  const pct = nextRefreshIn != null ? Math.max(0, Math.min(100, (nextRefreshIn / INTERVAL) * 100)) : 100;

  const label =
    scrapeStatus === 'running' || scrapeStatus === 'pending' ? '⟳ Scraping en arrière-plan…'
    : scrapeStatus === 'done'  ? '✓ Scraping terminé — offres mises à jour'
    : loading ? '⟳ Chargement…'
    : nextRefreshIn != null ? `⟳ Prochain refresh dans ${formatNextRefresh(nextRefreshIn)}`
    : lastRefresh ? `Dernière mise à jour ${timeAgo(lastRefresh)}`
    : 'Prêt';

  return (
    <div className="jb-refresh-bar-wrap">
      <div className="jb-refresh-bar-track">
        <div className="jb-refresh-bar-fill" style={{ width: `${100 - pct}%`, transition: 'width 1s linear' }} />
      </div>
      <span className="jb-refresh-bar-label">{label}</span>
    </div>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'results',  label: 'Résultats',   icon: '🔍' },
  { id: 'filters',  label: 'Mes liens',   icon: '🔗' },
  { id: 'banwords', label: 'Banwords',    icon: '🚫' },
  { id: 'saves',    label: 'Sauvegardes', icon: '🔖' },
];

const REFRESH_INTERVAL = 30 * 60 * 1000;
const POLL_INTERVAL    = 3000; // Poll le statut du scrape toutes les 3s

// ── Helper : appels API avec header userId ────────────────────────────────────

function apiFetch(url, options = {}, userId = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (userId) headers['X-User-Id'] = userId;
  return fetch(url, { ...options, headers });
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function JobBoard() {
  const navigate = useNavigate();

  // ── Session (Supabase Auth) ───────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // évite le flash de l'écran login

  useEffect(() => {
    // Récupère la session active au montage (token stocké par Supabase dans localStorage)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession({ email: data.session.user.email, userId: data.session.user.id });
      }
      setAuthLoading(false);
    });

    // Écoute les changements d'état auth (login/logout depuis un autre onglet, expiration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        setSession({ email: s.user.email, userId: s.user.id });
      } else {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (s) => setSession(s);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUrlFilters([]);
    setJobs([]);
    setFetched(false);
  };

  const userId = session?.userId ?? null;

  // ── State principal ───────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState('results');
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [jobs,           setJobs]           = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [fetched,        setFetched]        = useState(false);
  const [warnings,       setWarnings]       = useState([]);
  const [lastRefresh,    setLastRefresh]    = useState(null);
  const [nextRefreshIn,  setNextRefreshIn]  = useState(null);

  // Scrape async
  const [scrapeJobId,    setScrapeJobId]    = useState(null);
  const [scrapeStatus,   setScrapeStatus]   = useState(null); // pending | running | done | error

  // Persistent
  const [urlFilters,     setUrlFilters]     = useState([]);
  const [filtersLoaded,  setFiltersLoaded]  = useState(false);
  const [banwords,       setBanwords]       = useState(() => LS.get('jb_banwords', []));
  const [saves,          setSaves]          = useState(() => LS.get('jb_saves', []));

  const abortRef     = useRef(null);
  const timerRef     = useRef(null);
  const countdownRef = useRef(null);
  const pollRef      = useRef(null);

  // ── Persist filtres en DB ──────────────────────────────────────────────────
  // On utilise un ref pour stocker le userId sous lequel les filtres ont été chargés,
  // afin d'éviter d'écraser les filtres d'un autre utilisateur si la session change.
  const filtersOwnerRef = useRef(null);

  useEffect(() => {
    // Ne sauvegarde que si les filtres appartiennent bien à l'utilisateur courant
    if (!filtersLoaded || !session || filtersOwnerRef.current !== userId) return;
    apiFetch('/api/filters', {
      method: 'PUT',
      body: JSON.stringify({ filters: urlFilters }),
    }, userId).catch(() => {});
  }, [urlFilters, filtersLoaded, session]);

  useEffect(() => { LS.set('jb_banwords', banwords); }, [banwords]);
  useEffect(() => { LS.set('jb_saves',    saves);    }, [saves]);

  // ── Fetch offres depuis Supabase ───────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setJobs([]);
    setFetched(false);
    if (activeTab !== 'results') setActiveTab('results');

    try {
      const res = await apiFetch('/api/jobs?limit=30', { signal: abortRef.current.signal }, userId);
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const data = await res.json();

      setJobs(data.jobs || []);
      setWarnings(data.errors || []);
      setFetched(true);
      setLastRefresh(Date.now());
      setNextRefreshIn(REFRESH_INTERVAL);

      if (data.sourceMeta) {
        setUrlFilters(prev => prev.map(f => {
          const meta = data.sourceMeta[f.url];
          return meta ? { ...f, lastScraped: meta.scrapedAt, jobCount: meta.count } : f;
        }));
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [activeTab, userId]);

  // ── Polling du statut du scrape ────────────────────────────────────────────
  const startPolling = useCallback((jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scrape?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = await res.json();
        setScrapeStatus(data.status);

        if (data.status === 'done') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          // Recharge les offres maintenant que le scrape est fini
          await fetchJobs();
          setScrapeStatus('done');
          // Reset après 5s
          setTimeout(() => setScrapeStatus(null), 5000);
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setError(`Scraping échoué : ${data.result?.error ?? 'Erreur inconnue'}`);
          setScrapeStatus(null);
        }
      } catch {}
    }, POLL_INTERVAL);
  }, [fetchJobs]);

  // ── Déclenche le scraping (non-bloquant) ──────────────────────────────────
  const triggerScrape = useCallback(async () => {
    setScrapeStatus('pending');
    setError(null);
    if (activeTab !== 'results') setActiveTab('results');

    try {
      const res = await apiFetch('/api/scrape', { method: 'POST' }, userId);
      if (!res.ok) throw new Error(`Erreur scraping : ${res.status}`);
      const data = await res.json();

      if (data.jobId) {
        setScrapeJobId(data.jobId);
        setScrapeStatus('running');
        startPolling(data.jobId);
      } else {
        // Fallback si pas de jobId (ancienne version du backend)
        await fetchJobs();
        setScrapeStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
      setScrapeStatus(null);
    }
  }, [fetchJobs, activeTab, userId, startPolling]);

  // ── Countdown + auto-refresh ───────────────────────────────────────────────
  useEffect(() => {
    if (!lastRefresh) return;
    countdownRef.current = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev == null) return null;
        const next = prev - 1000;
        return next <= 0 ? null : next;
      });
    }, 1000);
    timerRef.current = setTimeout(() => { fetchJobs(); }, REFRESH_INTERVAL);
    return () => {
      clearInterval(countdownRef.current);
      clearTimeout(timerRef.current);
    };
  }, [lastRefresh]);

  // ── Cleanup polling au démontage ──────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Chargement initial (quand session disponible) ─────────────────────────
  useEffect(() => {
    if (!session) return;
    async function init() {
      filtersOwnerRef.current = null; // bloque la sauvegarde pendant le chargement
      setFiltersLoaded(false);
      try {
        const res = await apiFetch('/api/filters', {}, userId);
        if (res.ok) {
          const filters = await res.json();
          setUrlFilters(Array.isArray(filters) ? filters : []);
        }
      } catch {}
      filtersOwnerRef.current = userId; // autorise la sauvegarde pour cet utilisateur
      setFiltersLoaded(true);
    }
    init();
  }, [session]);

  useEffect(() => {
    if (filtersLoaded && session) fetchJobs();
  }, [filtersLoaded]);

  // ── Filtres visuels ────────────────────────────────────────────────────────
  const visibleJobs = jobs
    .filter(j => !jobMatchesBanwords(j, banwords))
    .filter(j => typeFilter === 'all' || j.type === typeFilter);

  const savedIds = new Set(saves.map(s => s.id));

  const tabBadge = {
    results:  fetched ? visibleJobs.length : null,
    filters:  urlFilters.length || null,
    banwords: banwords.length   || null,
    saves:    saves.length      || null,
  };

  const toggleSave  = (job) => setSaves(prev => {
    const exists = prev.find(s => s.id === job.id);
    return exists ? prev.filter(s => s.id !== job.id) : [job, ...prev];
  });
  const removeSave  = (id) => setSaves(prev => prev.filter(s => s.id !== id));
  const enabledCount = urlFilters.filter(f => f.enabled).length;
  const isScraping   = scrapeStatus === 'pending' || scrapeStatus === 'running';

  // ── Écran de login si pas de session ──────────────────────────────────────
  if (authLoading) {
    return (
      <div className="jb-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ opacity: 0.5, fontSize: '1.1rem' }}>Chargement…</span>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ── UI principale ─────────────────────────────────────────────────────────
  return (
    <div className="jb-root">

      {/* ── Header ── */}
      <div className="jb-header">
        <div className="jb-header-top">
          <button className="jb-back-btn" onClick={() => navigate(-1)}>
            <IconBack /> Retour
          </button>
          <div className="jb-session-info">
            <span className="jb-session-email"><IconUser /> {session.email}</span>
            <button className="jb-logout-btn" onClick={handleLogout} title="Se déconnecter">
              <IconLogout /> Déconnexion
            </button>
          </div>
        </div>

        <motion.div className="jb-hero" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="jb-hero-badge">🎯 Job Tracker · URL Scraper</div>
          <h1 className="jb-hero-title">
            Scrape tes <span className="highlight">offres d'emploi</span>
          </h1>
          <p className="jb-hero-sub">
            Ajoute des liens de recherche → le scraper fait le reste, toutes les 30 min
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

          <button
            className="jb-tab jb-tab-refresh"
            onClick={() => triggerScrape()}
            disabled={loading || isScraping || enabledCount === 0}
            title={enabledCount === 0 ? 'Ajoute des liens dans "Mes liens"' : 'Scraper maintenant'}
          >
            <IconRefresh spinning={loading || isScraping} />
            {isScraping ? 'Scraping…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Barre de statut */}
      {(fetched || loading || isScraping) && (
        <RefreshBar
          nextRefreshIn={nextRefreshIn}
          lastRefresh={lastRefresh}
          loading={loading}
          scrapeStatus={scrapeStatus}
        />
      )}

      {warnings.length > 0 && (
        <p className="jb-warn">⚠️ {warnings.join(' · ')}</p>
      )}

      {/* ── Contenu ── */}
      <main className="jb-main">
        <AnimatePresence mode="wait">

          {/* RÉSULTATS */}
          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>

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

              {/* Bandeau scraping en cours */}
              {isScraping && (
                <motion.div className="jb-scrape-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="jb-scrape-spinner">⟳</span>
                  Scraping en arrière-plan… Les offres apparaîtront dès que c'est terminé.
                </motion.div>
              )}

              {error && !loading && (
                <motion.div className="jb-error-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p>😕 {error}</p>
                  <button className="jb-search-btn" onClick={() => triggerScrape()}>Réessayer</button>
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
                  <p>Ajoute ou active des liens dans <strong>Mes liens</strong>, ou retire des banwords.</p>
                </div>
              )}

              {!loading && !fetched && !error && (
                <div className="jb-empty">
                  <div className="jb-empty-icon">🔗</div>
                  <h3>{enabledCount === 0 ? 'Ajoute un lien de recherche' : 'Lance le scraping'}</h3>
                  <p>
                    {enabledCount === 0
                      ? <>Va dans l'onglet <strong>Mes liens</strong> et colle une URL de recherche.</>
                      : <>Clique sur <strong>Actualiser</strong> ou attends le refresh automatique.</>}
                  </p>
                  {enabledCount > 0 && (
                    <button className="jb-search-btn" style={{ marginTop: '1rem' }} onClick={() => triggerScrape()}>
                      <IconRefresh spinning={false} /> Scraper maintenant
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* MES LIENS */}
          {activeTab === 'filters' && (
            <motion.div key="filters" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <FiltersPanel
                filters={urlFilters}
                onChange={setUrlFilters}
                onScrapeNow={() => triggerScrape()}
                scrapeStatus={scrapeStatus}
              />
            </motion.div>
          )}

          {/* BANWORDS */}
          {activeTab === 'banwords' && (
            <motion.div key="banwords" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <BanwordsPanel banwords={banwords} onChange={setBanwords} />
            </motion.div>
          )}

          {/* SAUVEGARDES */}
          {activeTab === 'saves' && (
            <motion.div key="saves" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <SavesPanel saves={saves} onRemove={removeSave} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="jb-footer">
        <p>Indeed · HelloWork · La Bonne Alternance · Adzuna · France Travail · LinkedIn · Stage.fr</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.6, fontSize: '0.75rem' }}>© 2026 Émilien Vitry-Lhotte · Refresh auto toutes les 30 min</p>
      </footer>
    </div>
  );
}