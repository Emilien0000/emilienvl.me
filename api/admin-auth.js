// api/admin-auth.js — Vercel Serverless Function
//
// 1. Crée cette variable dans Vercel Dashboard → Settings → Environment Variables :
//    ADMIN_PASSWORD_HASH  =  le hash bcrypt de ton vrai mot de passe
//
// 2. Pour générer le hash, lance UNE FOIS en local :
//    node -e "require('bcryptjs').hash('TON_NOUVEAU_MDP', 12).then(console.log)"
//    Copie le résultat dans Vercel. Ne mets JAMAIS le mot de passe lui-même.
//
// 3. Ajoute aussi :
//    JWT_SECRET  =  une chaîne aléatoire longue
//    Lance : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://emilienvl.me';
const JWT_EXPIRY = '8h'; // session admin de 8h

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, action } = req.body ?? {};

  // ── Vérification token existant (pour restaurer la session) ──────────────
  if (action === 'verify') {
    const token = req.body?.token;
    if (!token) return res.status(401).json({ valid: false });
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret, { issuer: 'emilienvl.me' });
      return res.status(200).json({ valid: true });
    } catch {
      return res.status(401).json({ valid: false });
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe manquant' });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;
  if (!hash || !jwtSecret) {
    console.error('Variables manquantes : ADMIN_PASSWORD_HASH ou JWT_SECRET');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    // Délai fixe anti-timing-attack
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .setIssuer('emilienvl.me')
    .sign(new TextEncoder().encode(jwtSecret));

  return res.status(200).json({ token });
}
