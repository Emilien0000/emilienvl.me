// src/hooks/useAdminAuth.js
// Remplace le mot de passe en clair dans localStorage
// par un JWT vérifié côté serveur, stocké en sessionStorage
// (sessionStorage = effacé à la fermeture de l'onglet, jamais le mdp lui-même)

import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'adm_token';

export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true); // true pendant la vérification initiale
  const [error, setError] = useState('');

  // Au montage : vérifie si un token existe déjà en sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    // Vérifie côté serveur que le token est encore valide
    fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setAuthed(true);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (pw) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Mot de passe incorrect');
        return false;
      }
      // On stocke le JWT (pas le mot de passe !)
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setAuthed(true);
      return true;
    } catch {
      setError('Erreur réseau, réessaie.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
  }, []);

  return { authed, loading, error, login, logout };
}
