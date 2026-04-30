// src/pages/AdminPage.jsx
// Remplace ton ancienne page /admin
// Usage dans App.jsx : <Route path="/admin" element={<AdminPage />} />

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminPage() {
  const { authed, loading, error, login, logout } = useAdminAuth();
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setSubmitting(true);
    await login(pw);
    setPw(''); // efface le champ après tentative, succès ou échec
    setSubmitting(false);
  };

  // ── Chargement initial (vérification du token existant) ──────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={styles.center}>
        <motion.div
          style={styles.card}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 style={styles.title}>
            Accès <span style={{ color: 'var(--highlight-color, #13c9ed)' }}>Admin</span>
          </h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              autoComplete="current-password"
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              type="submit"
              disabled={submitting || !pw.trim()}
              style={styles.button}
            >
              {submitting ? 'Vérification…' : 'Entrer'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── Zone admin authentifiée ───────────────────────────────────────────────
  return (
    <div style={styles.adminWrapper}>
      <div style={styles.adminHeader}>
        <h2 style={styles.title}>
          Zone <span style={{ color: 'var(--highlight-color, #13c9ed)' }}>Admin</span>
        </h2>
        <button onClick={logout} style={styles.logoutBtn}>
          Déconnexion
        </button>
      </div>

      {/* ↓ Mets ton contenu admin ici ↓ */}
      <p style={{ color: 'var(--text-main, #06395c)', marginTop: '1.5rem' }}>
        Contenu admin accessible uniquement après authentification serveur.
      </p>
    </div>
  );
}

// ── Styles inline (cohérents avec ton App.css existant) ──────────────────────
const styles = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  card: {
    background: 'var(--card-bg, rgba(255,255,255,0.06))',
    border: '1px solid var(--border-color, rgba(19,201,237,0.2))',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 8px 32px rgba(19,201,237,0.08)',
  },
  title: {
    margin: '0 0 1.5rem',
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--text-main, #06395c)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid var(--border-color, rgba(19,201,237,0.3))',
    background: 'var(--input-bg, rgba(255,255,255,0.08))',
    color: 'var(--text-main, #06395c)',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--highlight-color, #13c9ed)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  error: {
    color: '#e05555',
    fontSize: '0.875rem',
    margin: '0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(19,201,237,0.2)',
    borderTop: '3px solid #13c9ed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  adminWrapper: {
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  adminHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(19,201,237,0.2)',
    paddingBottom: '1rem',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1.5px solid rgba(19,201,237,0.4)',
    background: 'transparent',
    color: 'var(--highlight-color, #13c9ed)',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
