// src/components/LoginScreen.jsx
// Design : élégant, mode clair, typographie Syne + DM Sans

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

export default function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isNew,    setIsNew]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [hint,     setHint]     = useState('');
  const emailRef = useRef(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const validate = () => {
    if (!email.trim()) return 'Email requis';
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
          setHint('Vérifie ta boîte mail pour confirmer ton compte.');
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .ls-page {
          min-height: 100vh;
          background: #f5f6f8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .ls-bg-circle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .ls-bg-circle-1 {
          width: 500px; height: 500px;
          top: -180px; right: -120px;
          background: radial-gradient(circle, rgba(19,201,237,0.09) 0%, transparent 70%);
        }
        .ls-bg-circle-2 {
          width: 350px; height: 350px;
          bottom: -100px; left: -80px;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
        }

        .ls-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 400px;
          background: #ffffff;
          border-radius: 20px;
          padding: 2.5rem 2.25rem 2rem;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 12px rgba(0,0,0,0.06),
            0 16px 40px rgba(0,0,0,0.07);
        }

        .ls-header {
          text-align: center;
          margin-bottom: 1.75rem;
        }
        .ls-logo {
          width: 54px; height: 54px;
          margin: 0 auto 1rem;
          background: linear-gradient(135deg, #e8fbfe, #c8f4fb);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          box-shadow: 0 2px 10px rgba(19,201,237,0.15);
        }
        .ls-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.02em;
          margin: 0 0 0.4rem;
        }
        .ls-subtitle {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 300;
          margin: 0;
          line-height: 1.5;
        }

        .ls-tabs {
          display: flex;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 1.75rem;
        }
        .ls-tab {
          flex: 1;
          padding: 0.55rem;
          border: none;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.84rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #6b7280;
        }
        .ls-tab.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }

        .ls-field { margin-bottom: 1rem; }
        .ls-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.4rem;
        }
        .ls-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.72rem 1rem;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          color: #111827;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .ls-input::placeholder { color: #9ca3af; }
        .ls-input:focus {
          border-color: #13c9ed;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(19,201,237,0.1);
        }

        .ls-error {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 9px;
          font-size: 0.82rem;
          color: #dc2626;
          line-height: 1.4;
        }
        .ls-hint {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #f0fdfe;
          border: 1px solid #a5f3fc;
          border-radius: 9px;
          font-size: 0.82rem;
          color: #0891b2;
          line-height: 1.4;
        }

        .ls-btn {
          width: 100%;
          margin-top: 1.25rem;
          padding: 0.82rem;
          background: #111827;
          border: none;
          border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ls-btn:hover:not(:disabled) {
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        }
        .ls-btn:active:not(:disabled) { transform: translateY(0); }
        .ls-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .ls-spin {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: ls-rotate 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes ls-rotate { to { transform: rotate(360deg); } }

        .ls-sources {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }
        .ls-badge {
          padding: 3px 10px;
          background: #f3f4f6;
          border-radius: 999px;
          font-size: 0.71rem;
          color: #6b7280;
        }
      `}</style>

      <div className="ls-page">
        <div className="ls-bg-circle ls-bg-circle-1" />
        <div className="ls-bg-circle ls-bg-circle-2" />

        <motion.div
          className="ls-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ls-header">
            <div className="ls-logo">🎯</div>
            <h1 className="ls-title">Job Tracker</h1>
            <p className="ls-subtitle">
              {isNew
                ? 'Crée ton compte pour sauvegarder tes recherches.'
                : 'Retrouve tes filtres depuis n\'importe où.'}
            </p>
          </div>

          <div className="ls-tabs">
            <button
              className={`ls-tab${!isNew ? ' active' : ''}`}
              onClick={() => { setIsNew(false); setError(''); setHint(''); }}
            >
              Se connecter
            </button>
            <button
              className={`ls-tab${isNew ? ' active' : ''}`}
              onClick={() => { setIsNew(true); setError(''); setHint(''); }}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handle} noValidate>
            <motion.div className="ls-field" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <label className="ls-label">Adresse email</label>
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

            <motion.div className="ls-field" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <label className="ls-label">Mot de passe</label>
              <input
                type="password"
                className="ls-input"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={isNew ? 'Minimum 6 caractères' : '••••••••'}
                autoComplete={isNew ? 'new-password' : 'current-password'}
                disabled={loading}
              />
            </motion.div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" className="ls-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <span>⚠</span> {error}
                </motion.div>
              )}
              {hint && (
                <motion.div key="hint" className="ls-hint" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <span>✉</span> {hint}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="ls-btn" disabled={loading}>
              {loading
                ? <><div className="ls-spin" />Connexion…</>
                : isNew ? 'Créer mon compte →' : 'Se connecter →'}
            </button>
          </form>

          <div className="ls-sources">
            {['Indeed', 'LinkedIn', 'HelloWork', 'Adzuna', 'France Travail', 'Stage.fr'].map(s => (
              <span key={s} className="ls-badge">{s}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}