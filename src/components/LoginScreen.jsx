// src/components/LoginScreen.jsx
// Design : élégant, mode clair, typographie Syne + DM Sans

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

// vue : 'login' | 'register' | 'forgot' | 'forgot_sent' | 'reset_password' | 'reset_done'
export default function LoginScreen({ onLogin }) {
  const [view,      setView]      = useState('login');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [hint,      setHint]      = useState('');
  const emailRef = useRef(null);

  // Détecte le token de recovery Supabase dans l'URL au montage
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset_password');
        setError('');
        setPassword('');
        setConfirm('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { emailRef.current?.focus(); }, [view]);

  const resetFields = () => { setError(''); setHint(''); setPassword(''); setConfirm(''); };

  /* ── Validation ─────────────────────────────────────── */
  const validate = () => {
    if (view === 'reset_password') return null; // validation faite dans le handler
    if (!email.trim())                                   return 'Email requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))     return 'Email invalide.';
    if (view === 'forgot')                               return null; // pas besoin de mdp
    if (!password.trim())                               return 'Mot de passe requis.';
    if (password.length < 6)                            return 'Minimum 6 caractères.';
    if (view === 'register' && password !== confirm)    return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  /* ── Handler principal ───────────────────────────────── */
  const handle = async (e) => {
    e?.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(''); setHint('');

    try {
      /* ── Nouveau mot de passe (après clic sur le lien email) ── */
      if (view === 'reset_password') {
        if (!password.trim() || password.length < 6) {
          setError('Minimum 6 caractères.');
          setLoading(false);
          return;
        }
        if (password !== confirm) {
          setError('Les mots de passe ne correspondent pas.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setView('reset_done');
        setLoading(false);
        return;
      }

      /* ── Mot de passe oublié ── */
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/alternances`,
        });
        if (error) throw error;
        setView('forgot_sent');
        setLoading(false);
        return;
      }

      /* ── Inscription ── */
      if (view === 'register') {
        // Vérifier d'abord si le compte existe déjà (signIn silencieux)
        const probe = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!probe.error) {
          // Connexion réussie → compte existait déjà avec ce mdp
          const user = probe.data.user;
          onLogin({ email: user.email, userId: user.id });
          return;
        }
        if (
          probe.error.message.includes('Invalid login credentials') === false &&
          probe.error.message.includes('Email not confirmed') === false
        ) {
          // Erreur inattendue
          throw probe.error;
        }

        // Si "Email not confirmed" → compte existe mais pas validé
        if (probe.error.message.includes('Email not confirmed')) {
          setError('Un compte existe déjà avec cet email mais n\'est pas encore confirmé. Vérifie ta boîte mail ou connecte-toi.');
          setLoading(false);
          return;
        }

        // Pas de compte existant → création
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        if (signUpError?.message?.includes('User already registered')) {
          setError('Ce compte existe déjà. Connecte-toi ou utilise "Mot de passe oublié".');
          setLoading(false);
          return;
        }

        if (!data.session) {
          setHint('Un email de confirmation t\'a été envoyé. Vérifie ta boîte mail pour activer ton compte.');
          setLoading(false);
          return;
        }

        onLogin({ email: data.user.email, userId: data.user.id });
        return;
      }

      /* ── Connexion ── */
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      onLogin({ email: data.user.email, userId: data.user.id });

    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials'))    setError('Email ou mot de passe incorrect.');
      else if (msg.includes('Email not confirmed'))      setError('Confirme ton email avant de te connecter.');
      else if (msg.includes('User already registered')) setError('Ce compte existe déjà → Connecte-toi ou utilise "Mot de passe oublié".');
      else setError(msg || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  /* ── Labels selon la vue ─────────────────────────────── */
  const isRegister = view === 'register';
  const isLogin    = view === 'login';
  const isForgot   = view === 'forgot';
  const isSent     = view === 'forgot_sent';
  const isReset    = view === 'reset_password';
  const isResetDone = view === 'reset_done';

  const btnLabel = loading
    ? <><div className="ls-spin" />{isRegister ? 'Création…' : isForgot ? 'Envoi…' : isReset ? 'Mise à jour…' : 'Connexion…'}</>
    : isRegister ? 'Créer mon compte →'
    : isForgot   ? 'Envoyer le lien →'
    : isReset    ? 'Mettre à jour le mot de passe →'
    : 'Se connecter →';

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

        .ls-bg-circle { position: absolute; border-radius: 50%; pointer-events: none; }
        .ls-bg-circle-1 {
          width: 500px; height: 500px; top: -180px; right: -120px;
          background: radial-gradient(circle, rgba(19,201,237,0.09) 0%, transparent 70%);
        }
        .ls-bg-circle-2 {
          width: 350px; height: 350px; bottom: -100px; left: -80px;
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

        .ls-header { text-align: center; margin-bottom: 1.75rem; }
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
          font-size: 1.5rem; font-weight: 800;
          color: #111827; letter-spacing: -0.02em;
          margin: 0 0 0.4rem;
        }
        .ls-subtitle {
          font-size: 0.85rem; color: #6b7280;
          font-weight: 300; margin: 0; line-height: 1.5;
        }

        .ls-tabs {
          display: flex;
          background: #f3f4f6;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 1.75rem;
        }
        .ls-tab {
          flex: 1; padding: 0.55rem;
          border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.84rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          background: transparent; color: #6b7280;
        }
        .ls-tab.active {
          background: #ffffff; color: #111827;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }

        .ls-field { margin-bottom: 1rem; }
        .ls-label {
          display: block; font-size: 0.8rem;
          font-weight: 500; color: #374151; margin-bottom: 0.4rem;
        }
        .ls-input {
          width: 100%; box-sizing: border-box;
          padding: 0.72rem 1rem;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem; color: #111827;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .ls-input::placeholder { color: #9ca3af; }
        .ls-input:focus {
          border-color: #13c9ed;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(19,201,237,0.1);
        }
        .ls-input.error {
          border-color: #fca5a5;
          background: #fff8f8;
        }

        .ls-strength {
          margin-top: 0.4rem;
          display: flex; gap: 4px;
        }
        .ls-strength-bar {
          height: 3px; flex: 1; border-radius: 99px;
          background: #e5e7eb;
          transition: background 0.25s;
        }
        .ls-strength-bar.weak   { background: #f87171; }
        .ls-strength-bar.medium { background: #fbbf24; }
        .ls-strength-bar.strong { background: #34d399; }

        .ls-error {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 9px; font-size: 0.82rem;
          color: #dc2626; line-height: 1.4;
        }
        .ls-hint {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #f0fdfe; border: 1px solid #a5f3fc;
          border-radius: 9px; font-size: 0.82rem;
          color: #0891b2; line-height: 1.4;
        }
        .ls-success {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: #f0fdf4; border: 1px solid #86efac;
          border-radius: 9px; font-size: 0.82rem;
          color: #16a34a; line-height: 1.4;
        }

        .ls-btn {
          width: 100%; margin-top: 1.25rem; padding: 0.82rem;
          background: #111827; border: none; border-radius: 10px;
          font-family: 'Syne', sans-serif;
          font-size: 0.92rem; font-weight: 700;
          color: #ffffff; cursor: pointer; letter-spacing: 0.01em;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
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

        .ls-forgot {
          display: block; text-align: right;
          margin-top: -0.4rem; margin-bottom: 0.25rem;
          font-size: 0.78rem; color: #6b7280;
          cursor: pointer; text-decoration: none;
          transition: color 0.15s;
        }
        .ls-forgot:hover { color: #13c9ed; }

        .ls-back {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.8rem; color: #6b7280;
          cursor: pointer; margin-bottom: 1.5rem;
          width: fit-content; transition: color 0.15s;
          background: none; border: none; padding: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .ls-back:hover { color: #111827; }

        .ls-sources {
          display: flex; flex-wrap: wrap;
          justify-content: center; gap: 5px;
          margin-top: 1.75rem; padding-top: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }
        .ls-badge {
          padding: 3px 10px;
          background: #f3f4f6; border-radius: 999px;
          font-size: 0.71rem; color: #6b7280;
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
              {isRegister ? 'Crée ton compte pour sauvegarder tes recherches.'
               : isForgot || isSent ? 'Réinitialise ton mot de passe.'
               : isReset || isResetDone ? 'Choisis ton nouveau mot de passe.'
               : 'Retrouve tes filtres depuis n\'importe où.'}
            </p>
          </div>

          {/* ── Vue "email envoyé" ── */}
          <AnimatePresence mode="wait">
          {isSent ? (
            <motion.div key="sent"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="ls-success">
                <span>✅</span>
                <span>Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifie ta boîte mail (et tes spams).</span>
              </div>
              <button className="ls-btn" style={{ marginTop: '1.5rem' }}
                onClick={() => { setView('login'); resetFields(); }}>
                ← Retour à la connexion
              </button>
            </motion.div>

          ) : isResetDone ? (
            <motion.div key="reset_done"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="ls-success">
                <span>🔐</span>
                <span>Ton mot de passe a bien été mis à jour ! Tu peux maintenant te connecter.</span>
              </div>
              <button className="ls-btn" style={{ marginTop: '1.5rem' }}
                onClick={() => { setView('login'); resetFields(); }}>
                Se connecter →
              </button>
            </motion.div>

          ) : isReset ? (
            <motion.div key="reset_password"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <form onSubmit={handle} noValidate>
                <motion.div className="ls-field"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                  <label className="ls-label">Nouveau mot de passe</label>
                  <input
                    type="password"
                    className="ls-input"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Minimum 6 caractères"
                    autoComplete="new-password"
                    disabled={loading}
                    autoFocus
                  />
                  {password.length > 0 && <PasswordStrength password={password} />}
                </motion.div>

                <motion.div className="ls-field"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <label className="ls-label">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    className={`ls-input${confirm && password !== confirm ? ' error' : ''}`}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Répète ton nouveau mot de passe"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  {confirm && password !== confirm && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#dc2626' }}>
                      Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </motion.div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div key="err" className="ls-error"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <span>⚠</span> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" className="ls-btn" disabled={loading}>
                  {btnLabel}
                </button>
              </form>
            </motion.div>

          ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Bouton retour si on est sur "mot de passe oublié" */}
            {isForgot && (
              <button className="ls-back" onClick={() => { setView('login'); resetFields(); }}>
                ← Retour
              </button>
            )}

            {/* Onglets login / register */}
            {!isForgot && (
              <div className="ls-tabs">
                <button className={`ls-tab${isLogin ? ' active' : ''}`}
                  onClick={() => { setView('login'); resetFields(); }}>
                  Se connecter
                </button>
                <button className={`ls-tab${isRegister ? ' active' : ''}`}
                  onClick={() => { setView('register'); resetFields(); }}>
                  Créer un compte
                </button>
              </div>
            )}

            <form onSubmit={handle} noValidate>
              {/* Email */}
              <motion.div className="ls-field"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                <label className="ls-label">Adresse email</label>
                <input
                  ref={emailRef} type="email" className="ls-input"
                  value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="toi@exemple.com" autoComplete="email" disabled={loading}
                />
              </motion.div>

              {/* Mot de passe (masqué sur "mot de passe oublié") */}
              {!isForgot && (
                <motion.div className="ls-field"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <label className="ls-label">Mot de passe</label>
                  <input
                    type="password"
                    className={`ls-input${isRegister && confirm && password !== confirm ? ' error' : ''}`}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    disabled={loading}
                  />
                  {/* Indicateur de force */}
                  {isRegister && password.length > 0 && (
                    <PasswordStrength password={password} />
                  )}
                </motion.div>
              )}

              {/* Confirmation mot de passe (inscription uniquement) */}
              {isRegister && (
                <motion.div className="ls-field"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                  <label className="ls-label">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    className={`ls-input${confirm && password !== confirm ? ' error' : ''}`}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    placeholder="Répète ton mot de passe"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  {confirm && password !== confirm && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#dc2626' }}>
                      Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </motion.div>
              )}

              {/* Lien mot de passe oublié (connexion uniquement) */}
              {isLogin && (
                <span className="ls-forgot"
                  onClick={() => { setView('forgot'); resetFields(); }}>
                  Mot de passe oublié ?
                </span>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div key="err" className="ls-error"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <span>⚠</span> {error}
                  </motion.div>
                )}
                {hint && (
                  <motion.div key="hint" className="ls-hint"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <span>✉</span> {hint}
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" className="ls-btn" disabled={loading}>
                {btnLabel}
              </button>
            </form>
          </motion.div>
          )}
          </AnimatePresence>

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

/* ── Indicateur de force du mot de passe ── */
function PasswordStrength({ password }) {
  const getStrength = (p) => {
    let score = 0;
    if (p.length >= 8)              score++;
    if (/[A-Z]/.test(p))           score++;
    if (/[0-9]/.test(p))           score++;
    if (/[^A-Za-z0-9]/.test(p))   score++;
    return score; // 0-4
  };
  const score = getStrength(password);
  const levels = ['', 'weak', 'weak', 'medium', 'strong'];
  const labels = ['', 'Faible', 'Faible', 'Moyen', 'Fort'];

  return (
    <div>
      <div className="ls-strength">
        {[1,2,3,4].map(i => (
          <div key={i} className={`ls-strength-bar${score >= i ? ` ${levels[score]}` : ''}`} />
        ))}
      </div>
      {score > 0 && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem',
          color: score <= 2 ? '#f87171' : score === 3 ? '#d97706' : '#059669' }}>
          Force : {labels[score]}
        </p>
      )}
    </div>
  );
}