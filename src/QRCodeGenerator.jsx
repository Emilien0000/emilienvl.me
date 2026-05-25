// QRCodeGenerator.jsx
// Dépendances : npm install qrcode
// Usage dans App.jsx : import QRCodeGenerator from './QRCodeGenerator';
// Puis ajouter une route : <Route path="/qr" element={<QRCodeGenerator />} />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

const LOGO_TEXT = 'EVL';

// Couleurs calquées sur le thème du portfolio
const THEME = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#21262d',
  highlight: '#13c9ed',
  highlightDim: 'rgba(19,201,237,0.15)',
  highlightDim2: 'rgba(19,201,237,0.08)',
  text: '#e6edf3',
  textMuted: '#8b949e',
  error: '#f85149',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: THEME.bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: THEME.text,
  },
  card: {
    background: THEME.surface,
    border: `1px solid ${THEME.border}`,
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: THEME.text,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: THEME.textMuted,
    margin: '0.25rem 0 0 0',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: `1px solid ${THEME.border}`,
    background: THEME.bg,
    color: THEME.text,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  row: {
    display: 'flex',
    gap: '1rem',
  },
  col: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  colorWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  colorInput: {
    width: '2.5rem',
    height: '2.2rem',
    padding: '2px',
    border: `1px solid ${THEME.border}`,
    borderRadius: '6px',
    background: 'none',
    cursor: 'pointer',
  },
  colorHex: {
    flex: 1,
    padding: '0.6rem 0.8rem',
    borderRadius: '8px',
    border: `1px solid ${THEME.border}`,
    background: THEME.bg,
    color: THEME.text,
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  canvasWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '260px',
    background: THEME.bg,
    borderRadius: '12px',
    border: `1px solid ${THEME.border}`,
    overflow: 'hidden',
    position: 'relative',
  },
  btnRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  btnPrimary: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    background: THEME.highlight,
    color: '#0d1117',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.15s',
  },
  btnSecondary: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '8px',
    border: `1px solid ${THEME.border}`,
    background: 'transparent',
    color: THEME.text,
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  note: {
    textAlign: 'center',
    fontSize: '0.78rem',
    color: THEME.textMuted,
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    background: THEME.highlightDim2,
    color: THEME.highlight,
    fontSize: '0.72rem',
    fontWeight: 600,
    border: `1px solid ${THEME.highlightDim}`,
    marginLeft: '0.5rem',
    verticalAlign: 'middle',
  },
};

export default function QRCodeGenerator() {
  const [url, setUrl] = useState('https://emilienvl.me');
  const [logoText, setLogoText] = useState(LOGO_TEXT);
  const [fgColor, setFgColor] = useState('#1a6fa8');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [size, setSize] = useState(280);
  const [showLogo, setShowLogo] = useState(true);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef(null);

  const drawQR = useCallback(async (targetUrl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError('');

    if (!targetUrl.trim()) {
      setError('Entrez une URL valide.');
      return;
    }

    try {
      // QR en haute qualité — pas de date d'expiration côté QR lui-même
      await QRCode.toCanvas(canvas, targetUrl, {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: 'H', // Niveau H requis pour le logo
      });

      // Superposer le logo au centre
      if (showLogo && logoText.trim()) {
        const ctx = canvas.getContext('2d');
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        const radius = logoSize * 0.2;

        // Fond blanc du logo
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + logoSize - radius, y);
        ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
        ctx.lineTo(x + logoSize, y + logoSize - radius);
        ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
        ctx.lineTo(x + radius, y + logoSize);
        ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Bordure légère
        ctx.strokeStyle = fgColor + '44';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Texte du logo
        ctx.fillStyle = fgColor;
        ctx.font = `bold ${logoSize * 0.42}px 'Segoe UI', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(logoText.trim().toUpperCase(), x + logoSize / 2, y + logoSize / 2);
      }

      setGenerated(true);
    } catch (e) {
      setError("Erreur lors de la génération : URL invalide ?");
      console.error(e);
    }
  }, [url, fgColor, bgColor, size, showLogo, logoText]);

  // Génère au chargement initial
  useEffect(() => {
    drawQR(url);
  }, []);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !generated) return;
    const link = document.createElement('a');
    link.download = `qrcode-evl-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !generated) return;
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Image copiée dans le presse-papiers !');
      } catch {
        alert('Copie non supportée par ce navigateur.');
      }
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* En-tête */}
        <div>
          <h1 style={styles.title}>
            Générateur QR Code
            <span style={styles.badge}>∞ illimité</span>
          </h1>
          <p style={styles.subtitle}>Sans expiration · PNG haute qualité · Logo personnalisable</p>
        </div>

        {/* URL */}
        <div>
          <label style={styles.label}>URL cible</label>
          <input
            style={styles.input}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://emilienvl.me"
            onFocus={e => (e.target.style.borderColor = THEME.highlight)}
            onBlur={e => (e.target.style.borderColor = THEME.border)}
          />
        </div>

        {/* Couleurs */}
        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Couleur QR</label>
            <div style={styles.colorWrap}>
              <input type="color" style={styles.colorInput} value={fgColor}
                onChange={e => setFgColor(e.target.value)} />
              <input style={styles.colorHex} value={fgColor}
                onChange={e => setFgColor(e.target.value)} maxLength={7} />
            </div>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Fond</label>
            <div style={styles.colorWrap}>
              <input type="color" style={styles.colorInput} value={bgColor}
                onChange={e => setBgColor(e.target.value)} />
              <input style={styles.colorHex} value={bgColor}
                onChange={e => setBgColor(e.target.value)} maxLength={7} />
            </div>
          </div>
        </div>

        {/* Logo & Taille */}
        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Texte du logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showLogo}
                onChange={e => setShowLogo(e.target.checked)}
                style={{ accentColor: THEME.highlight, width: '1rem', height: '1rem' }}
              />
              <input
                style={{ ...styles.input, flex: 1 }}
                value={logoText}
                onChange={e => setLogoText(e.target.value)}
                placeholder="EVL"
                maxLength={5}
                disabled={!showLogo}
              />
            </div>
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Taille : {size}px</label>
            <input
              type="range"
              min={180} max={400} step={20}
              value={size}
              onChange={e => setSize(Number(e.target.value))}
              style={{ accentColor: THEME.highlight, width: '100%', marginTop: '0.6rem' }}
            />
          </div>
        </div>

        {/* Canvas QR */}
        <div style={styles.canvasWrap}>
          <canvas ref={canvasRef} style={{ borderRadius: '8px', maxWidth: '100%' }} />
        </div>

        {error && (
          <p style={{ color: THEME.error, fontSize: '0.85rem', margin: 0 }}>⚠ {error}</p>
        )}

        {/* Actions */}
        <div style={styles.btnRow}>
          <button
            style={styles.btnPrimary}
            onClick={() => drawQR(url)}
            onMouseEnter={e => (e.target.style.opacity = '0.85')}
            onMouseLeave={e => (e.target.style.opacity = '1')}
          >
            ↻ Générer
          </button>
          <button
            style={styles.btnSecondary}
            onClick={handleDownload}
            disabled={!generated}
            onMouseEnter={e => (e.target.style.background = THEME.highlightDim2)}
            onMouseLeave={e => (e.target.style.background = 'transparent')}
          >
            ↓ Télécharger PNG
          </button>
        </div>

        <p style={styles.note}>
          Ce QR code est <strong style={{ color: THEME.highlight }}>permanent</strong> — il ne contient que l'URL, sans service tiers ni date d'expiration.
        </p>
      </div>
    </div>
  );
}
