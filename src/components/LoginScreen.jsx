// ── Écran de connexion ─────────────────────────────────────────────────────────

// src/components/LoginScreen.jsx
// Remplace le composant LoginScreen dans JobBoard.jsx
// Design : terminal minimaliste avec accent cyan, typographie Syne

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Animations ────────────────────────────────────────────────────────────────
import { supabase } from '../supabase';

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