// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ data, error }) => {
      if (error) console.error('Auth callback error:', error);
      navigate('/alternances', { replace: true });
    });
  }, [navigate]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'sans-serif', color: '#555', fontSize: '1.1rem'
    }}>
      Connexion en cours…
    </div>
  );
}