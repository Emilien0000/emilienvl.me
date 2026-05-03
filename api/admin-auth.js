import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { Resend } from 'resend';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://emilienvl.me';
const JWT_EXPIRY = '8h';
const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { password, action, step, otp, tempToken } = req.body ?? {};

  // ── Restauration de session existante ──────────────────────────────────
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

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!hash || !jwtSecret) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  // ── STEP 1 : Vérification Mdp + Envoi du code par mail ───────────────
  if (step === 1) {
    if (!password) return res.status(400).json({ error: 'Mot de passe manquant' });

    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      await new Promise(r => setTimeout(r, 400)); // Anti-timing attack
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Générer un code à 6 chiffres
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(generatedOtp, 10);

    // Envoi de l'email
    try {
      await resend.emails.send({
        from: 'Admin <onboarding@resend.dev>', // Modifie avec ton domaine vérifié si tu en as un
        to: process.env.ADMIN_EMAIL,
        subject: '🔒 Code de connexion Admin',
        text: `Ton code A2F est : ${generatedOtp}`,
      });
    } catch (e) {
      return res.status(500).json({ error: "Erreur lors de l'envoi de l'email." });
    }

    // Création d'un token temporaire de 5 minutes contenant l'A2F haché
    const tToken = await new SignJWT({ hashedOtp })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(jwtSecret));

    return res.status(200).json({ requireOtp: true, tempToken: tToken });
  }

  // ── STEP 2 : Vérification du code A2F ────────────────────────────────
  if (step === 2) {
    if (!otp || !tempToken) return res.status(400).json({ error: 'Code ou token manquant' });

    try {
      const secret = new TextEncoder().encode(jwtSecret);
      // Vérifier si le token temporaire (5min) est toujours valide
      const { payload } = await jwtVerify(tempToken, secret);

      // Vérifier si le code tapé correspond au code haché dans le token
      const validOtp = await bcrypt.compare(otp, payload.hashedOtp);
      if (!validOtp) return res.status(401).json({ error: 'Code A2F incorrect' });

      // Générer le vrai token de session
      const token = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .setIssuer('emilienvl.me')
        .sign(secret);

      return res.status(200).json({ token });
    } catch (e) {
      return res.status(401).json({ error: 'Session A2F expirée. Recommence.' });
    }
  }

  return res.status(400).json({ error: 'Requête invalide' });
}