// QRCodeGenerator.jsx — QR Code Studio
// npm install qrcode
// Placer dans src/ et ajouter dans App.jsx :
//   import QRCodeGenerator from './QRCodeGenerator';
//   <Route path="/qr" element={<QRCodeGenerator />} />

import React, { useState, useRef, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';

function buildGradient(ctx, type, c1, c2, angle, w, h) {
  if (type === 'solid') return c1;
  const rad = (angle * Math.PI) / 180;
  const cx = w / 2, cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  const x1 = cx - Math.cos(rad) * len, y1 = cy - Math.sin(rad) * len;
  const x2 = cx + Math.cos(rad) * len, y2 = cy + Math.sin(rad) * len;
  if (type === 'radial') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
    g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
  }
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const S = {
  label: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b949e', display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', fontFamily: 'inherit' },
  colorRow: { display: 'flex', alignItems: 'center', gap: 8 },
  colorSwatch: { width: 36, height: 36, padding: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'none', cursor: 'pointer', flexShrink: 0 },
  hexInput: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#e6edf3', fontSize: '0.82rem', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' },
};

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: open ? 20 : 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', color: '#e6edf3' }}>
        <span style={S.label}>{title}</span>
        <span style={{ color: '#13c9ed', fontSize: '0.8rem', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>&#9662;</span>
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

function AngleSlider({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const raw = Math.round(Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI + 90);
        onChange((raw + 360) % 360);
      }} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, border: '2px solid rgba(19,201,237,0.35)', background: 'rgba(19,201,237,0.06)', cursor: 'crosshair', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 2, height: 13, background: '#13c9ed', borderRadius: 2, transformOrigin: '50% 100%', transform: `rotate(${value}deg)`, position: 'absolute', bottom: '50%', left: 'calc(50% - 1px)' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#13c9ed' }} />
      </div>
      <input type="range" min={0} max={359} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: '#13c9ed' }} />
      <span style={{ fontSize: '0.75rem', color: '#8b949e', minWidth: 32, textAlign: 'right' }}>{value}&deg;</span>
    </div>
  );
}

function GradientPicker({ type, setType, c1, setC1, c2, setC2, angle, setAngle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['solid', 'Uni'], ['linear', 'Linear'], ['radial', 'Radial']].map(([t, l]) => (
          <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s', background: type === t ? '#13c9ed' : 'rgba(255,255,255,0.05)', color: type === t ? '#0d1117' : '#8b949e' }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...S.label, marginBottom: 5 }}>{type === 'solid' ? 'Couleur' : 'Couleur 1'}</label>
          <div style={S.colorRow}>
            <input type="color" value={c1} onChange={e => setC1(e.target.value)} style={S.colorSwatch} />
            <input value={c1} onChange={e => setC1(e.target.value)} maxLength={7} style={S.hexInput} />
          </div>
        </div>
        {type !== 'solid' && (
          <div style={{ flex: 1 }}>
            <label style={{ ...S.label, marginBottom: 5 }}>Couleur 2</label>
            <div style={S.colorRow}>
              <input type="color" value={c2} onChange={e => setC2(e.target.value)} style={S.colorSwatch} />
              <input value={c2} onChange={e => setC2(e.target.value)} maxLength={7} style={S.hexInput} />
            </div>
          </div>
        )}
      </div>
      {type === 'linear' && (
        <div>
          <label style={{ ...S.label, marginBottom: 8 }}>Angle</label>
          <AngleSlider value={angle} onChange={setAngle} />
        </div>
      )}
    </div>
  );
}

export default function QRCodeGenerator() {
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
  const previewRef = useRef(null);
  const fileRef = useRef(null);

  const draw = useCallback(async (canvas, size) => {
    if (!canvas) return;
    setError('');
    if (!url.trim()) { setError('Entrez une URL.'); return; }
    try {
      const tmp = document.createElement('canvas');
      await QRCode.toCanvas(tmp, url, { width: size, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'H' });
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = buildGradient(ctx, bgType, bgC1, bgC2, bgAngle, size, size);
      ctx.fillRect(0, 0, size, size);
      const gc = document.createElement('canvas'); gc.width = size; gc.height = size;
      const gCtx = gc.getContext('2d');
      gCtx.fillStyle = buildGradient(gCtx, fgType, fgC1, fgC2, fgAngle, size, size);
      gCtx.fillRect(0, 0, size, size);
      const gradPx = gCtx.getImageData(0, 0, size, size).data;
      const tPx = tmp.getContext('2d').getImageData(0, 0, size, size).data;
      const out = ctx.createImageData(size, size);
      for (let i = 0; i < tPx.length; i += 4) {
        const dark = tPx[i] < 128;
        out.data[i] = dark ? gradPx[i] : 0; out.data[i+1] = dark ? gradPx[i+1] : 0;
        out.data[i+2] = dark ? gradPx[i+2] : 0; out.data[i+3] = dark ? 255 : 0;
      }
      ctx.putImageData(out, 0, 0);
      if (logoMode !== 'none') {
        const ls = size * 0.22; const lx = (size - ls) / 2, ly = (size - ls) / 2; const r = ls * 0.18;
        ctx.save(); roundRect(ctx, lx, ly, ls, ls, r); ctx.fillStyle = logoBg; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = size * 0.003; ctx.stroke(); ctx.restore();
        if (logoMode === 'text' && logoText.trim()) {
          ctx.save(); ctx.fillStyle = logoTextClr;
          ctx.font = `bold ${ls * 0.42}px 'Segoe UI', system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(logoText.trim().toUpperCase().slice(0, 5), size / 2, size / 2); ctx.restore();
        } else if (logoMode === 'image' && logoImage) {
          ctx.save(); roundRect(ctx, lx + 3, ly + 3, ls - 6, ls - 6, r); ctx.clip();
          ctx.drawImage(logoImage, lx + 5, ly + 5, ls - 10, ls - 10); ctx.restore();
        }
      }
    } catch (e) { setError('URL invalide.'); console.error(e); }
  }, [url, fgType, fgC1, fgC2, fgAngle, bgType, bgC1, bgC2, bgAngle, logoMode, logoText, logoImage, logoBg, logoTextClr]);

  useEffect(() => { draw(previewRef.current, 280); }, [draw]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#090d12', color: '#e6edf3', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px 80px' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 45% at 75% 15%, rgba(19,201,237,0.07) 0%, transparent 65%)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 980, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }} className="qr-layout">

        {/* Controls */}
        <div style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(19,201,237,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#13c9ed', boxShadow: '0 0 10px #13c9ed80' }} />
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#13c9ed', fontWeight: 700 }}>QR Code Studio</span>
              <span style={{ fontSize: '0.62rem', padding: '2px 9px', borderRadius: 20, fontWeight: 700, background: 'rgba(19,201,237,0.1)', color: '#13c9ed', border: '1px solid rgba(19,201,237,0.2)' }}>&infin; PERMANENT</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Generateur QR Code</h1>
            <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#8b949e' }}>Degrades orientables &middot; Logo image ou texte &middot; Export HD jusqu'a 2400 px</p>
          </div>

          <div style={{ padding: '0 28px' }}>
            <Section title="URL cible">
              <input style={S.input} value={url} placeholder="https://emilienvl.me" onChange={e => setUrl(e.target.value)}
                onFocus={e => (e.target.style.borderColor = 'rgba(19,201,237,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </Section>

            <Section title="Couleur des modules QR">
              <GradientPicker type={fgType} setType={setFgType} c1={fgC1} setC1={setFgC1} c2={fgC2} setC2={setFgC2} angle={fgAngle} setAngle={setFgAngle} />
            </Section>

            <Section title="Arriere-plan" defaultOpen={false}>
              <GradientPicker type={bgType} setType={setBgType} c1={bgC1} setC1={setBgC1} c2={bgC2} setC2={setBgC2} angle={bgAngle} setAngle={setBgAngle} />
            </Section>

            <Section title="Logo central">
              <div style={{ display: 'flex', gap: 6 }}>
                {[['none', 'Aucun'], ['text', 'Texte'], ['image', 'Image']].map(([m, l]) => (
                  <button key={m} onClick={() => setLogoMode(m)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s', background: logoMode === m ? '#13c9ed' : 'rgba(255,255,255,0.05)', color: logoMode === m ? '#0d1117' : '#8b949e' }}>{l}</button>
                ))}
              </div>
              {logoMode === 'text' && (<>
                <div>
                  <label style={{ ...S.label, marginBottom: 6 }}>Texte (5 car. max)</label>
                  <input style={S.input} value={logoText} onChange={e => setLogoText(e.target.value)} maxLength={5} placeholder="EVL"
                    onFocus={e => (e.target.style.borderColor = 'rgba(19,201,237,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                </div>
                <div>
                  <label style={{ ...S.label, marginBottom: 6 }}>Couleur texte</label>
                  <div style={S.colorRow}>
                    <input type="color" value={logoTextClr} onChange={e => setLogoTextClr(e.target.value)} style={S.colorSwatch} />
                    <input value={logoTextClr} onChange={e => setLogoTextClr(e.target.value)} maxLength={7} style={S.hexInput} />
                  </div>
                </div>
              </>)}
              {logoMode === 'image' && (
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current.click()}
                    style={{ width: '100%', padding: '28px 16px', borderRadius: 12, cursor: 'pointer', border: '2px dashed rgba(19,201,237,0.3)', background: 'rgba(19,201,237,0.04)', color: '#13c9ed', fontWeight: 600, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(19,201,237,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(19,201,237,0.3)')}>
                    {logoImgSrc ? <img src={logoImgSrc} alt="logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8 }} /> : <span style={{ fontSize: '2rem', lineHeight: 1 }}>&#8679;</span>}
                    <span>{logoImgSrc ? "Changer l'image" : 'Uploader une image'}</span>
                    <span style={{ fontSize: '0.7rem', color: '#8b949e' }}>PNG, SVG &mdash; fond transparent recommande</span>
                  </button>
                </div>
              )}
              {logoMode !== 'none' && (
                <div>
                  <label style={{ ...S.label, marginBottom: 6 }}>Fond du logo</label>
                  <div style={S.colorRow}>
                    <input type="color" value={logoBg} onChange={e => setLogoBg(e.target.value)} style={S.colorSwatch} />
                    <input value={logoBg} onChange={e => setLogoBg(e.target.value)} maxLength={7} style={S.hexInput} />
                  </div>
                </div>
              )}
            </Section>

            <Section title="Resolution export" defaultOpen={false}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={S.label}>Taille</label>
                  <span style={{ fontSize: '0.82rem', color: '#13c9ed', fontWeight: 700 }}>{exportSize} x {exportSize} px</span>
                </div>
                <input type="range" min={400} max={2400} step={200} value={exportSize} onChange={e => setExportSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#13c9ed' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#8b949e', marginTop: 4 }}>
                  <span>Web (400)</span><span>Print (1200)</span><span>Ultra (2400)</span>
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 48 }}>
          <div style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <span style={S.label}>Apercu temps reel</span>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
              <canvas ref={previewRef} style={{ display: 'block', maxWidth: '100%' }} />
            </div>
            {error && <p style={{ color: '#f85149', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>&#9888; {error}</p>}
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#8b949e', textAlign: 'center', lineHeight: 1.5 }}>
              Apercu 280 px &mdash; export a <strong style={{ color: '#e6edf3' }}>{exportSize} px</strong>
            </p>
          </div>
          <button onClick={handleDownload}
            style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #13c9ed 0%, #1a6fa8 100%)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.02em', boxShadow: '0 8px 28px rgba(19,201,237,0.28)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(19,201,237,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(19,201,237,0.28)'; }}>
            &#8595; Telecharger PNG &mdash; {exportSize} px
          </button>
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(19,201,237,0.04)', border: '1px solid rgba(19,201,237,0.1)', fontSize: '0.75rem', color: '#8b949e', lineHeight: 1.7, textAlign: 'center' }}>
            QR code <strong style={{ color: '#13c9ed' }}>permanent</strong> &mdash; aucun service tiers, aucune expiration.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 740px) { .qr-layout { grid-template-columns: 1fr !important; } }
        * { box-sizing: border-box; }
        input[type=range] { cursor: pointer; }
      `}</style>
    </div>
  );
}