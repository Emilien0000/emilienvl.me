// QRCodeGenerator.jsx — QR Code Studio v3
// npm install qrcode
// Placer dans src/ et ajouter dans App.jsx :
//   import QRCodeGenerator from './QRCodeGenerator';
//   <Route path="/qr" element={<QRCodeGenerator />} />

import React, { useState, useRef, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';

/* ─────────── gradient helper ─────────── */
function buildGradient(ctx, type, c1, c2, angle, w, h) {
  if (type === 'solid') return c1;
  const rad = (angle * Math.PI) / 180;
  const cx = w / 2, cy = h / 2, len = Math.sqrt(w * w + h * h) / 2;
  if (type === 'radial') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
    g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
  }
  const x1 = cx - Math.cos(rad) * len, y1 = cy - Math.sin(rad) * len;
  const x2 = cx + Math.cos(rad) * len, y2 = cy + Math.sin(rad) * len;
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}

/* ─────────── rounded rect ─────────── */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/* ─────────── draw one finder pattern eye ─────────── */
function drawFinderEye(ctx, x, y, cellPx, outerShape, innerShape, color, bgColor) {
  const total = 7 * cellPx;
  // clear zone with background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, total, total);

  ctx.fillStyle = color;

  // outer ring (7×7 border, 1-cell thick)
  const outerR = cellPx * 1.0;
  if (outerShape === 'circle') {
    const cx = x + total / 2, cy = y + total / 2, rx = total / 2;
    ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
    // punch out inner 5×5
    ctx.fillStyle = bgColor;
    ctx.beginPath(); ctx.arc(cx, cy, rx - cellPx, 0, Math.PI * 2); ctx.fill();
  } else if (outerShape === 'rounded') {
    roundRect(ctx, x, y, total, total, outerR); ctx.fill();
    ctx.fillStyle = bgColor;
    roundRect(ctx, x + cellPx, y + cellPx, 5 * cellPx, 5 * cellPx, outerR * 0.5); ctx.fill();
  } else {
    ctx.fillRect(x, y, total, total);
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + cellPx, y + cellPx, 5 * cellPx, 5 * cellPx);
  }

  // inner dot (3×3)
  ctx.fillStyle = color;
  const dotX = x + 2 * cellPx, dotY = y + 2 * cellPx, dotS = 3 * cellPx;
  const dotR = cellPx * 0.9;
  if (innerShape === 'circle') {
    const cx = dotX + dotS / 2, cy = dotY + dotS / 2;
    ctx.beginPath(); ctx.arc(cx, cy, dotS / 2, 0, Math.PI * 2); ctx.fill();
  } else if (innerShape === 'rounded') {
    roundRect(ctx, dotX, dotY, dotS, dotS, dotR); ctx.fill();
  } else {
    ctx.fillRect(dotX, dotY, dotS, dotS);
  }
}

/* ─────────── theme tokens ─────────── */
function tokens(dark) {
  if (dark) return {
    bg: '#090d12', panel: 'rgba(255,255,255,0.025)', panelBorder: 'rgba(255,255,255,0.07)',
    panelHeader: 'rgba(19,201,237,0.03)', text: '#e6edf3', subtext: '#8b949e',
    accent: '#13c9ed', accentDim: 'rgba(19,201,237,0.1)', accentBorder: 'rgba(19,201,237,0.2)',
    inputBg: 'rgba(255,255,255,0.04)', inputBorder: 'rgba(255,255,255,0.08)',
    inputBorderFocus: 'rgba(19,201,237,0.5)', btnBg: 'rgba(255,255,255,0.05)',
    btnActive: '#13c9ed', btnActiveTxt: '#0d1117', divider: 'rgba(255,255,255,0.05)',
    previewShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
    globalBg: 'radial-gradient(ellipse 55% 45% at 75% 15%, rgba(19,201,237,0.07) 0%, transparent 65%)',
    labelClr: '#8b949e', hexBg: 'rgba(255,255,255,0.04)', hexBorder: 'rgba(255,255,255,0.08)',
    hexClr: '#e6edf3', noteBg: 'rgba(19,201,237,0.04)', noteBorder: 'rgba(19,201,237,0.1)',
    successBg: 'rgba(35,197,94,0.08)', successBorder: 'rgba(35,197,94,0.25)', successClr: '#23c55e',
    backBg: 'rgba(255,255,255,0.04)', backBorder: 'rgba(255,255,255,0.1)', backClr: '#8b949e',
    toggleBg: 'rgba(255,255,255,0.07)', copyBg: 'rgba(255,255,255,0.05)', copyClr: '#8b949e',
  };
  return {
    bg: '#f0f4f8', panel: 'rgba(255,255,255,0.85)', panelBorder: 'rgba(0,0,0,0.07)',
    panelHeader: 'rgba(19,201,237,0.04)', text: '#0d1117', subtext: '#5a6270',
    accent: '#0e7fa3', accentDim: 'rgba(14,127,163,0.08)', accentBorder: 'rgba(14,127,163,0.22)',
    inputBg: 'rgba(0,0,0,0.04)', inputBorder: 'rgba(0,0,0,0.1)',
    inputBorderFocus: 'rgba(14,127,163,0.5)', btnBg: 'rgba(0,0,0,0.06)',
    btnActive: '#0e7fa3', btnActiveTxt: '#ffffff', divider: 'rgba(0,0,0,0.06)',
    previewShadow: '0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
    globalBg: 'radial-gradient(ellipse 55% 45% at 75% 15%, rgba(14,127,163,0.06) 0%, transparent 65%)',
    labelClr: '#5a6270', hexBg: 'rgba(0,0,0,0.04)', hexBorder: 'rgba(0,0,0,0.09)',
    hexClr: '#0d1117', noteBg: 'rgba(14,127,163,0.04)', noteBorder: 'rgba(14,127,163,0.12)',
    successBg: 'rgba(22,163,74,0.07)', successBorder: 'rgba(22,163,74,0.25)', successClr: '#16a34a',
    backBg: 'rgba(0,0,0,0.04)', backBorder: 'rgba(0,0,0,0.1)', backClr: '#5a6270',
    toggleBg: 'rgba(0,0,0,0.06)', copyBg: 'rgba(0,0,0,0.05)', copyClr: '#5a6270',
  };
}

/* ─────────── presets ─────────── */
const PRESETS = [
  { label: '🌊 Ocean',  fgType:'linear', fgC1:'#0062ff', fgC2:'#13c9ed', fgAngle:135, bgType:'solid', bgC1:'#ffffff', moduleStyle:'rounded', eyeOuter:'rounded', eyeInner:'rounded', eyeColorMode:'match' },
  { label: '🌅 Sunset', fgType:'linear', fgC1:'#ff6b35', fgC2:'#ff2d7a', fgAngle:45,  bgType:'solid', bgC1:'#ffffff', moduleStyle:'dots',    eyeOuter:'circle',  eyeInner:'circle',  eyeColorMode:'match' },
  { label: '🌿 Forest', fgType:'radial', fgC1:'#16a34a', fgC2:'#064e3b', fgAngle:0,   bgType:'solid', bgC1:'#f0fdf4', moduleStyle:'rounded', eyeOuter:'rounded', eyeInner:'circle',  eyeColorMode:'match' },
  { label: '🔥 Fire',   fgType:'linear', fgC1:'#ef4444', fgC2:'#f97316', fgAngle:90,  bgType:'solid', bgC1:'#1c0a00', moduleStyle:'dots',    eyeOuter:'circle',  eyeInner:'rounded', eyeColorMode:'custom', eyeColor:'#f97316' },
  { label: '🖤 Mono',   fgType:'solid',  fgC1:'#000000', fgC2:'#000000', fgAngle:0,   bgType:'solid', bgC1:'#ffffff', moduleStyle:'square',  eyeOuter:'square',  eyeInner:'square',  eyeColorMode:'match' },
  { label: '💜 Violet', fgType:'linear', fgC1:'#7c3aed', fgC2:'#ec4899', fgAngle:135, bgType:'solid', bgC1:'#ffffff', moduleStyle:'rounded', eyeOuter:'rounded', eyeInner:'rounded', eyeColorMode:'match' },
];

/* ─────────── sub-components ─────────── */
function Section({ title, children, defaultOpen = true, t }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${t.divider}`, paddingBottom: open ? 20 : 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', color: t.text }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelClr }}>{title}</span>
        <span style={{ color: t.accent, fontSize: '0.8rem', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

function AngleSlider({ value, onChange, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const raw = Math.round(Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 90);
        onChange((raw + 360) % 360);
      }} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: `2px solid ${t.accentBorder}`, background: t.accentDim, cursor: 'crosshair', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 2, height: 13, background: t.accent, borderRadius: 2, transformOrigin: '50% 100%', transform: `rotate(${value}deg)`, position: 'absolute', bottom: '50%', left: 'calc(50% - 1px)' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.accent }} />
      </div>
      <input type="range" min={0} max={359} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: t.accent }} />
      <span style={{ fontSize: '0.75rem', color: t.subtext, minWidth: 32, textAlign: 'right' }}>{value}°</span>
    </div>
  );
}

function GradientPicker({ type, setType, c1, setC1, c2, setC2, angle, setAngle, t }) {
  const hexStyle = { flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.hexBorder}`, background: t.hexBg, color: t.hexClr, fontSize: '0.82rem', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' };
  const swatchStyle = { width: 36, height: 36, padding: 2, border: `1px solid ${t.inputBorder}`, borderRadius: 8, background: 'none', cursor: 'pointer', flexShrink: 0 };
  const segBtn = (active) => ({ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s', background: active ? t.btnActive : t.btnBg, color: active ? t.btnActiveTxt : t.subtext });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['solid', 'Uni'], ['linear', 'Linear'], ['radial', 'Radial']].map(([tp, l]) => (
          <button key={tp} onClick={() => setType(tp)} style={segBtn(type === tp)}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelClr, display: 'block', marginBottom: 5 }}>{type === 'solid' ? 'Couleur' : 'Couleur 1'}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={c1} onChange={e => setC1(e.target.value)} style={swatchStyle} />
            <input value={c1} onChange={e => setC1(e.target.value)} maxLength={7} style={hexStyle} />
          </div>
        </div>
        {type !== 'solid' && (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelClr, display: 'block', marginBottom: 5 }}>Couleur 2</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={c2} onChange={e => setC2(e.target.value)} style={swatchStyle} />
              <input value={c2} onChange={e => setC2(e.target.value)} maxLength={7} style={hexStyle} />
            </div>
          </div>
        )}
      </div>
      {type === 'linear' && (
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelClr, display: 'block', marginBottom: 8 }}>Angle</label>
          <AngleSlider value={angle} onChange={setAngle} t={t} />
        </div>
      )}
    </div>
  );
}

/* ─────────── main component ─────────── */
export default function QRCodeGenerator() {
  const [dark, setDark] = useState(true);
  const t = tokens(dark);

  const [url, setUrl] = useState('https://emilienvl.me');
  const [fgType, setFgType] = useState('linear');
  const [fgC1, setFgC1] = useState('#1a6fa8');
  const [fgC2, setFgC2] = useState('#13c9ed');
  const [fgAngle, setFgAngle] = useState(135);
  const [bgType, setBgType] = useState('solid');
  const [bgC1, setBgC1] = useState('#ffffff');
  const [bgC2, setBgC2] = useState('#e8f4fb');
  const [bgAngle, setBgAngle] = useState(45);
  const [logoMode, setLogoMode] = useState('text');
  const [logoText, setLogoText] = useState('EVL');
  const [logoImage, setLogoImage] = useState(null);
  const [logoImgSrc, setLogoImgSrc] = useState(null);
  const [logoBg, setLogoBg] = useState('#ffffff');
  const [logoTextClr, setLogoTextClr] = useState('#1a6fa8');
  const [exportSize, setExportSize] = useState(1200);
  const [error, setError] = useState('');
  const [moduleStyle, setModuleStyle] = useState('rounded'); // square | rounded | dots
  const [eyeOuter, setEyeOuter] = useState('rounded');
  const [eyeInner, setEyeInner] = useState('rounded');
  const [padding, setPadding] = useState(2);
  const [eccLevel, setEccLevel] = useState('H');
  const [eyeColorMode, setEyeColorMode] = useState('match');
  const [eyeColor, setEyeColor] = useState('#1a6fa8');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef(null);
  const fileRef = useRef(null);

  /* ── core draw using QRCode.create matrix ── */
  const draw = useCallback(async (canvas, size) => {
    if (!canvas) return;
    setError('');
    if (!url.trim()) { setError('Entrez une URL.'); return; }
    try {
      // Get raw QR matrix
      const qr = QRCode.create(url, { errorCorrectionLevel: eccLevel });
      const modules = qr.modules;
      const numCells = modules.size;
      const totalCells = numCells + padding * 2;
      const cellPx = Math.floor(size / totalCells);
      const actualSize = cellPx * totalCells;

      canvas.width = actualSize;
      canvas.height = actualSize;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = buildGradient(ctx, bgType, bgC1, bgC2, bgAngle, actualSize, actualSize);
      ctx.fillRect(0, 0, actualSize, actualSize);

      // Build gradient pixel lookup for FG color
      const gc = document.createElement('canvas');
      gc.width = actualSize; gc.height = actualSize;
      const gCtx = gc.getContext('2d');
      gCtx.fillStyle = buildGradient(gCtx, fgType, fgC1, fgC2, fgAngle, actualSize, actualSize);
      gCtx.fillRect(0, 0, actualSize, actualSize);
      const gradData = gCtx.getImageData(0, 0, actualSize, actualSize).data;

      // Finder pattern cell regions to skip during module draw
      const finderCells = new Set();
      // top-left: rows 0..8, cols 0..8 (7 finder + 1 separator + timing)
      // but we only need to skip the 7x7 finder squares themselves
      const addFinder = (startRow, startCol) => {
        for (let r = startRow; r < startRow + 7; r++)
          for (let c = startCol; c < startCol + 7; c++)
            finderCells.add(r * numCells + c);
      };
      addFinder(0, 0);
      addFinder(0, numCells - 7);
      addFinder(numCells - 7, 0);

      // Draw data modules cell by cell
      for (let row = 0; row < numCells; row++) {
        for (let col = 0; col < numCells; col++) {
          if (finderCells.has(row * numCells + col)) continue;
          if (!modules.data[row * numCells + col]) continue;

          const px = (padding + col) * cellPx;
          const py = (padding + row) * cellPx;
          // pick gradient color from center of cell
          const cx = Math.min(px + Math.floor(cellPx / 2), actualSize - 1);
          const cy = Math.min(py + Math.floor(cellPx / 2), actualSize - 1);
          const gi = (cy * actualSize + cx) * 4;
          ctx.fillStyle = `rgb(${gradData[gi]},${gradData[gi+1]},${gradData[gi+2]})`;

          if (moduleStyle === 'dots') {
            const r = cellPx * 0.42;
            ctx.beginPath();
            ctx.arc(px + cellPx / 2, py + cellPx / 2, r, 0, Math.PI * 2);
            ctx.fill();
          } else if (moduleStyle === 'rounded') {
            const r = cellPx * 0.28;
            roundRect(ctx, px + 0.5, py + 0.5, cellPx - 1, cellPx - 1, r);
            ctx.fill();
          } else {
            ctx.fillRect(px, py, cellPx, cellPx);
          }
        }
      }

      // Draw finder eyes with custom style
      const eyeClr = eyeColorMode === 'custom' ? eyeColor : fgC1;
      const bgSample = bgC1; // use solid bg color for eye background

      const finderPositions = [
        [0, 0],
        [0, numCells - 7],
        [numCells - 7, 0],
      ];

      finderPositions.forEach(([startRow, startCol]) => {
        const px = (padding + startCol) * cellPx;
        const py = (padding + startRow) * cellPx;
        drawFinderEye(ctx, px, py, cellPx, eyeOuter, eyeInner, eyeClr, bgSample);
      });

      // Logo
      if (logoMode !== 'none') {
        const ls = actualSize * 0.22;
        const lx = (actualSize - ls) / 2, ly = (actualSize - ls) / 2;
        const rr = ls * 0.18;
        ctx.save(); roundRect(ctx, lx, ly, ls, ls, rr);
        ctx.fillStyle = logoBg; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = actualSize * 0.003; ctx.stroke();
        ctx.restore();
        if (logoMode === 'text' && logoText.trim()) {
          ctx.save(); ctx.fillStyle = logoTextClr;
          ctx.font = `bold ${ls * 0.42}px 'Segoe UI', system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(logoText.trim().toUpperCase().slice(0, 5), actualSize / 2, actualSize / 2);
          ctx.restore();
        } else if (logoMode === 'image' && logoImage) {
          ctx.save(); roundRect(ctx, lx + 3, ly + 3, ls - 6, ls - 6, rr); ctx.clip();
          ctx.drawImage(logoImage, lx + 5, ly + 5, ls - 10, ls - 10); ctx.restore();
        }
      }
    } catch (e) {
      setError('URL invalide ou QR trop complexe.');
      console.error(e);
    }
  }, [url, fgType, fgC1, fgC2, fgAngle, bgType, bgC1, bgC2, bgAngle, logoMode, logoText, logoImage, logoBg, logoTextClr, moduleStyle, eyeOuter, eyeInner, padding, eccLevel, eyeColorMode, eyeColor]);

  useEffect(() => { draw(previewRef.current, 300); }, [draw]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => { setLogoImage(img); setLogoImgSrc(ev.target.result); setLogoMode('image'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    const hd = document.createElement('canvas');
    await draw(hd, exportSize);
    const a = document.createElement('a');
    a.download = `qr-evl-${exportSize}px.png`;
    a.href = hd.toDataURL('image/png'); a.click();
  };

  const handleCopy = async () => {
    const hd = document.createElement('canvas');
    await draw(hd, 600);
    hd.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      } catch { setError('Copie non supportée par ce navigateur.'); }
    });
  };

  const applyPreset = (p) => {
    setFgType(p.fgType); setFgC1(p.fgC1); setFgC2(p.fgC2); setFgAngle(p.fgAngle);
    setBgType(p.bgType); setBgC1(p.bgC1);
    setModuleStyle(p.moduleStyle); setEyeOuter(p.eyeOuter); setEyeInner(p.eyeInner);
    setEyeColorMode(p.eyeColorMode);
    if (p.eyeColor) setEyeColor(p.eyeColor);
  };

  /* ── shared style helpers ── */
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', fontFamily: 'inherit' };
  const hexStyle   = { flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.hexBorder}`, background: t.hexBg, color: t.hexClr, fontSize: '0.82rem', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' };
  const swatchStyle = { width: 36, height: 36, padding: 2, border: `1px solid ${t.inputBorder}`, borderRadius: 8, background: 'none', cursor: 'pointer', flexShrink: 0 };
  const labelStyle  = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.labelClr, display: 'block' };
  const segBtn = (active) => ({ flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.73rem', fontWeight: 700, transition: 'all 0.15s', background: active ? t.btnActive : t.btnBg, color: active ? t.btnActiveTxt : t.subtext });
  const segBtnV = (active) => ({ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${active ? t.accent : 'transparent'}`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.15s', background: active ? t.accentDim : t.btnBg, color: active ? t.accent : t.subtext });

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px 80px', transition: 'background 0.3s, color 0.3s' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: t.globalBg, transition: 'background 0.3s' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1020 }}>

        {/* ── top bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 30, background: t.backBg, border: `1px solid ${t.backBorder}`, color: t.backClr, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = t.accentDim; e.currentTarget.style.color = t.accent; e.currentTarget.style.borderColor = t.accentBorder; }}
            onMouseLeave={e => { e.currentTarget.style.background = t.backBg; e.currentTarget.style.color = t.backClr; e.currentTarget.style.borderColor = t.backBorder; }}>
            ← Retour au portfolio
          </a>
          <button onClick={() => setDark(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 30, background: t.toggleBg, border: `1px solid ${t.panelBorder}`, color: t.subtext, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>
            {dark ? '☀️ Mode clair' : '🌙 Mode sombre'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }} className="qr-layout">

          {/* ── Panel controls ── */}
          <div style={{ background: t.panel, backdropFilter: 'blur(20px)', border: `1px solid ${t.panelBorder}`, borderRadius: 20, overflow: 'hidden', transition: 'background 0.3s, border-color 0.3s' }}>
            <div style={{ padding: '22px 26px', borderBottom: `1px solid ${t.divider}`, background: t.panelHeader }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent, boxShadow: `0 0 10px ${t.accent}80` }} />
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: t.accent, fontWeight: 700 }}>QR Code Studio</span>
                <span style={{ fontSize: '0.62rem', padding: '2px 9px', borderRadius: 20, fontWeight: 700, background: t.accentDim, color: t.accent, border: `1px solid ${t.accentBorder}` }}>∞ PERMANENT</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Générateur QR Code</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: t.subtext }}>Dégradés · Formes · Coins personnalisables · Logo · Export HD</p>
            </div>

            <div style={{ padding: '0 26px' }}>

              {/* URL */}
              <Section title="URL cible" t={t}>
                <input style={inputStyle} value={url} placeholder="https://emilienvl.me" onChange={e => setUrl(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = t.inputBorderFocus)}
                  onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
              </Section>

              {/* Presets */}
              <Section title="Préréglages rapides" t={t}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PRESETS.map((p) => (
                    <button key={p.label} onClick={() => applyPreset(p)} style={{ padding: '10px 6px', borderRadius: 10, border: `1px solid ${t.panelBorder}`, background: t.btnBg, color: t.text, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.panelBorder; e.currentTarget.style.color = t.text; }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Module + eye style */}
              <Section title="Style des modules & coins" t={t}>

                {/* Module shape */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Forme des pixels QR</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['square', '▪ Carré'], ['rounded', '◼ Arrondi'], ['dots', '● Dots']].map(([v, l]) => (
                      <button key={v} onClick={() => setModuleStyle(v)} style={segBtn(moduleStyle === v)}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Eye shapes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 8 }}>Coin extérieur</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[['square', '▪ Carré'], ['rounded', '⬜ Arrondi'], ['circle', '○ Cercle']].map(([v, l]) => (
                        <button key={v} onClick={() => setEyeOuter(v)} style={segBtnV(eyeOuter === v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 8 }}>Point intérieur</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[['square', '▪ Carré'], ['rounded', '◻ Arrondi'], ['circle', '● Cercle']].map(([v, l]) => (
                        <button key={v} onClick={() => setEyeInner(v)} style={segBtnV(eyeInner === v)}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Eye color */}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Couleur des coins</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: eyeColorMode === 'custom' ? 10 : 0 }}>
                    {[['match', 'Identique FG'], ['custom', 'Personnalisée']].map(([v, l]) => (
                      <button key={v} onClick={() => setEyeColorMode(v)} style={segBtn(eyeColorMode === v)}>{l}</button>
                    ))}
                  </div>
                  {eyeColorMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={eyeColor} onChange={e => setEyeColor(e.target.value)} style={swatchStyle} />
                      <input value={eyeColor} onChange={e => setEyeColor(e.target.value)} maxLength={7} style={hexStyle} />
                    </div>
                  )}
                </div>
              </Section>

              {/* FG color */}
              <Section title="Couleur des modules" t={t}>
                <GradientPicker type={fgType} setType={setFgType} c1={fgC1} setC1={setFgC1} c2={fgC2} setC2={setFgC2} angle={fgAngle} setAngle={setFgAngle} t={t} />
              </Section>

              {/* BG */}
              <Section title="Arrière-plan" defaultOpen={false} t={t}>
                <GradientPicker type={bgType} setType={setBgType} c1={bgC1} setC1={setBgC1} c2={bgC2} setC2={setBgC2} angle={bgAngle} setAngle={setBgAngle} t={t} />
              </Section>

              {/* Logo */}
              <Section title="Logo central" defaultOpen={false} t={t}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['none', 'Aucun'], ['text', 'Texte'], ['image', 'Image']].map(([m, l]) => (
                    <button key={m} onClick={() => setLogoMode(m)} style={segBtn(logoMode === m)}>{l}</button>
                  ))}
                </div>
                {logoMode === 'text' && (<>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>Texte (5 car. max)</label>
                    <input style={inputStyle} value={logoText} onChange={e => setLogoText(e.target.value)} maxLength={5} placeholder="EVL"
                      onFocus={e => (e.target.style.borderColor = t.inputBorderFocus)}
                      onBlur={e => (e.target.style.borderColor = t.inputBorder)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>Couleur texte</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={logoTextClr} onChange={e => setLogoTextClr(e.target.value)} style={swatchStyle} />
                      <input value={logoTextClr} onChange={e => setLogoTextClr(e.target.value)} maxLength={7} style={hexStyle} />
                    </div>
                  </div>
                </>)}
                {logoMode === 'image' && (
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileRef.current.click()}
                      style={{ width: '100%', padding: '28px 16px', borderRadius: 12, cursor: 'pointer', border: `2px dashed ${t.accentBorder}`, background: t.accentDim, color: t.accent, fontWeight: 600, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = t.accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = t.accentBorder)}>
                      {logoImgSrc ? <img src={logoImgSrc} alt="logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8 }} /> : <span style={{ fontSize: '2rem' }}>⬆</span>}
                      <span>{logoImgSrc ? "Changer l'image" : 'Uploader une image'}</span>
                      <span style={{ fontSize: '0.7rem', color: t.subtext }}>PNG, SVG — fond transparent recommandé</span>
                    </button>
                  </div>
                )}
                {logoMode !== 'none' && (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>Fond du logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={logoBg} onChange={e => setLogoBg(e.target.value)} style={swatchStyle} />
                      <input value={logoBg} onChange={e => setLogoBg(e.target.value)} maxLength={7} style={hexStyle} />
                    </div>
                  </div>
                )}
              </Section>

              {/* Advanced */}
              <Section title="Paramètres avancés" defaultOpen={false} t={t}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={labelStyle}>Marge (quiet zone)</label>
                    <span style={{ fontSize: '0.82rem', color: t.accent, fontWeight: 700 }}>{padding} modules</span>
                  </div>
                  <input type="range" min={0} max={6} step={1} value={padding} onChange={e => setPadding(Number(e.target.value))} style={{ width: '100%', accentColor: t.accent }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: t.subtext, marginTop: 4 }}>
                    <span>0</span><span>3 (standard)</span><span>6</span>
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Correction d'erreur</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['L','7%'],['M','15%'],['Q','25%'],['H','30%']].map(([v,pct]) => (
                      <button key={v} onClick={() => setEccLevel(v)} style={segBtn(eccLevel === v)}>{v} — {pct}</button>
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: t.subtext, lineHeight: 1.5 }}>Niveau H requis avec logo central.</p>
                </div>
              </Section>

              {/* Export size */}
              <Section title="Résolution export" defaultOpen={false} t={t}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={labelStyle}>Taille</label>
                    <span style={{ fontSize: '0.82rem', color: t.accent, fontWeight: 700 }}>{exportSize} × {exportSize} px</span>
                  </div>
                  <input type="range" min={400} max={2400} step={200} value={exportSize} onChange={e => setExportSize(Number(e.target.value))} style={{ width: '100%', accentColor: t.accent }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: t.subtext, marginTop: 4 }}>
                    <span>Web (400)</span><span>Print (1200)</span><span>Ultra (2400)</span>
                  </div>
                </div>
              </Section>

            </div>
          </div>

          {/* ── Preview panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 20 }}>
            <div style={{ background: t.panel, backdropFilter: 'blur(20px)', border: `1px solid ${t.panelBorder}`, borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transition: 'background 0.3s' }}>
              <span style={{ ...labelStyle, color: t.subtext }}>Aperçu temps réel</span>
              <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: t.previewShadow }}>
                <canvas ref={previewRef} style={{ display: 'block', maxWidth: '100%' }} />
              </div>
              {error && <p style={{ color: '#f85149', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>⚠ {error}</p>}
              <p style={{ margin: 0, fontSize: '0.72rem', color: t.subtext, textAlign: 'center', lineHeight: 1.5 }}>
                Aperçu 300 px — export à <strong style={{ color: t.text }}>{exportSize} px</strong>
              </p>
            </div>

            <button onClick={handleDownload}
              style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${t.accent} 0%, #1a6fa8 100%)`, color: '#fff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.02em', boxShadow: `0 8px 28px ${t.accent}44`, transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 36px ${t.accent}66`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 8px 28px ${t.accent}44`; }}>
              ↓ Télécharger PNG — {exportSize} px
            </button>

            <button onClick={handleCopy}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${copied ? t.successBorder : t.panelBorder}`, cursor: 'pointer', background: copied ? t.successBg : t.copyBg, color: copied ? t.successClr : t.copyClr, fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' }}>
              {copied ? '✓ Copié dans le presse-papier !' : '⧉ Copier l\'image (PNG)'}
            </button>

            <div style={{ padding: '14px 16px', borderRadius: 12, background: t.noteBg, border: `1px solid ${t.noteBorder}`, fontSize: '0.75rem', color: t.subtext, lineHeight: 1.7, textAlign: 'center' }}>
              QR code <strong style={{ color: t.accent }}>permanent</strong> — aucun service tiers, aucune expiration.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) { .qr-layout { grid-template-columns: 1fr !important; } }
        * { box-sizing: border-box; }
        input[type=range] { cursor: pointer; }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}