// src/pages/AdminPage.jsx
// Remplace ton ancienne page /admin
// Usage dans App.jsx : <Route path="/admin" element={<AdminPage />} />

import React, { useState, useEffect, useRef } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

export default function AdminPage() {
  // ── États d'authentification ──
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('adm_auth') === 'true');
  const [step, setStep] = useState(1); // 1 = Mot de passe, 2 = Code A2F
  const [pw, setPw] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── États du Dashboard Admin ──
  const [activeTab, setActiveTab] = useState('projects'); 
  const [projectsList, setProjectsList] = useState([]);
  const [expList, setExpList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [cropperTarget, setCropperTarget] = useState(null);

  // ── 1. LOGIQUE D'AUTHENTIFICATION ──

  const handlePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!pw.trim()) return;
    setAuthSubmitting(true);
    setAuthError('');
    
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, password: pw })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
      
      if (data.requireOtp) {
        setTempToken(data.tempToken);
        setStep(2);
        setPw(''); // On vide le mdp par sécurité
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!otp.trim()) return;
    setAuthSubmitting(true);
    setAuthError('');
    
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, otp, tempToken })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      
      // Succès de l'A2F
      sessionStorage.setItem('adm_auth', 'true');
      sessionStorage.setItem('adm_token', data.token); // Optionnel : pour sécuriser tes requêtes futures
      setAuthed(true);
    } catch (err) {
      setAuthError(err.message);
      setOtp(''); // On vide le champ si erreur
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    setAuthed(false);
    setStep(1);
    setTempToken(null);
    sessionStorage.removeItem('adm_auth');
    sessionStorage.removeItem('adm_token');
  };

  // ── 2. LOGIQUE DU DASHBOARD (Inchangée) ──

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, e, s] = await Promise.all([
        supabase.from('projets').select('*').order('position', { ascending: true }).order('id', { ascending: false }),
        supabase.from('experiences').select('*').order('position', { ascending: true }).order('id', { ascending: false }),
        supabase.from('skills').select('*').order('id', { ascending: false })
      ]);
      setProjectsList(p.data || []);
      setExpList(e.data || []);
      setSkillsList(s.data || []);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) fetchAll(); }, [authed]);

  const saveItem = async () => {
    setLoading(true);
    const table = activeTab === 'projects' ? 'projets' : activeTab === 'exp' ? 'experiences' : 'skills';
    
    const { isDuplicate, id, ...cleanItem } = editItem;

    if (activeTab !== 'skills' && !cleanItem.slug?.trim()) {
      cleanItem.slug = (cleanItem.title || 'item')
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now();
    }

    if (typeof cleanItem.tags === 'string') cleanItem.tags = cleanItem.tags.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof cleanItem.images === 'string') cleanItem.images = cleanItem.images.split(',').map(s => s.trim()).filter(Boolean);

    let res;
    if (id && !isDuplicate) {
      res = await supabase.from(table).update(cleanItem).eq('id', id);
    } else {
      res = await supabase.from(table).insert([cleanItem]);
    }

    if (res.error) {
      if (res.error.code === '23505') alert("Erreur : Ce slug ou nom existe déjà. Modifie le slug manuellement.");
      else alert("Erreur : " + res.error.message);
    } else { 
      setEditItem(null); 
      setPreviewItem(null);
      fetchAll(); 
    }
    setLoading(false);
  };

  const togglePublish = async (item) => {
    const table = activeTab === 'projects' ? 'projets' : 'experiences';
    await supabase.from(table).update({ is_published: !item.is_published }).eq('id', item.id);
    fetchAll();
  };

  const duplicate = (item) => {
    const { id, ...rest } = item;
    setEditItem({ 
      ...rest, 
      title: item.title ? item.title + " (Copie)" : item.label + " (Copie)", 
      slug: item.slug ? item.slug + "-copy" : undefined, 
      is_published: false, 
      isDuplicate: true 
    });
  };

  const saveOrder = async (newList) => {
    const table = activeTab === 'projects' ? 'projets' : 'experiences';
    await Promise.all(
      newList.map((item, idx) =>
        supabase.from(table).update({ position: idx }).eq('id', item.id)
      )
    );
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id === draggedId) return;
    const setter = activeTab === 'projects' ? setProjectsList : setExpList;
    const list = activeTab === 'projects' ? projectsList : expList;
    const from = list.findIndex(x => x.id === draggedId);
    const to = list.findIndex(x => x.id === id);
    if (from === -1 || to === -1) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setter(next);
  };

  const handleDrop = async () => {
    if (activeTab === 'skills') return;
    const list = activeTab === 'projects' ? projectsList : expList;
    await saveOrder(list);
    setDraggedId(null);
  };

  const openCropper = (src, target) => {
    setCropperSrc(src);
    setCropperTarget(target);
  };

  const handleCropSave = (dataUrl) => {
    (async () => {
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const fileName = `cropped_${Date.now()}.png`;
        const { error } = await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/png' });
        if (error) throw error;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        if (cropperTarget === 'new') {
          setEditItem(prev => ({ ...prev, images: [...(prev.images || []), data.publicUrl] }));
        } else if (typeof cropperTarget === 'number') {
          setEditItem(prev => {
            const imgs = [...(prev.images || [])];
            imgs[cropperTarget] = data.publicUrl;
            return { ...prev, images: imgs };
          });
        }
      } catch (err) {
        alert("Erreur upload image rognée : " + err.message);
      }
      setCropperSrc(null);
      setCropperTarget(null);
    })();
  };

  const initNew = () => {
    if (activeTab === 'projects') setEditItem({ title: '', slug: '', is_published: true, details: '', date: '', tech: '', link: '', images: [], desc_short: '', image_fit: 'cover' });
    else if (activeTab === 'exp') setEditItem({ title: '', slug: '', is_published: true, details: '', period: '', category: '', icon: '💼', tags: [], desc_text: '' });
    else setEditItem({ label: '', desc_text: '', project_ids: [], experience_ids: [] });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
      setEditItem(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
    } catch (err) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── 3. RENDU DE L'AUTHENTIFICATION ──
  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <div className="admin-lock">🔐</div>
          <h1 className="admin-title">Panel Admin</h1>
          
          {step === 1 ? (
            <>
              <p className="admin-sub">Entre ton mot de passe pour continuer.</p>
              <form className="admin-input-row" onSubmit={handlePasswordSubmit}>
                <input 
                  type="password" 
                  placeholder="Mot de passe" 
                  className={`admin-input ${authError ? 'admin-input--err' : ''}`} 
                  value={pw} 
                  onChange={e => setPw(e.target.value)} 
                  autoFocus
                />
                <button type="submit" className="admin-btn" disabled={authSubmitting || !pw}>
                  {authSubmitting ? '...' : 'Entrer'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="admin-sub">Un code à 6 chiffres a été envoyé par email.</p>
              <form className="admin-input-row" onSubmit={handleOtpSubmit}>
                <input 
                  type="text" 
                  placeholder="Code A2F" 
                  maxLength="6"
                  className={`admin-input ${authError ? 'admin-input--err' : ''}`} 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  autoFocus
                />
                <button type="submit" className="admin-btn" disabled={authSubmitting || !otp}>
                  {authSubmitting ? '...' : 'Valider'}
                </button>
              </form>
            </>
          )}
          
          {authError && <p className="admin-err">{authError}</p>}
        </div>
      </div>
    );
  }

  const currentList = activeTab === 'projects' ? projectsList : activeTab === 'exp' ? expList : skillsList;

  // ── 4. RENDU DU DASHBOARD ADMIN ──
  return (
    <div className="adm-layout">
      <aside className="adm-sidebar">
        <div className="adm-logo">EVL<span>.</span></div>
        <button className={`adm-nav-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => {setActiveTab('projects'); setEditItem(null)}}>📂 Projets</button>
        <button className={`adm-nav-btn ${activeTab === 'exp' ? 'active' : ''}`} onClick={() => {setActiveTab('exp'); setEditItem(null)}}>💼 Expériences</button>
        <button className={`adm-nav-btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => {setActiveTab('skills'); setEditItem(null)}}>🧠 Compétences</button>
        
        <div style={{ marginTop: 'auto' }}>
          <a href="/" className="admin-back-link">← Voir le site</a>
          <button onClick={handleLogout} className="adm-mini-btn" style={{width:'100%', marginTop:'15px'}}>Déconnexion</button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-header-row">
          <h1 className="admin-title">
            {activeTab === 'projects' ? 'Gestion Projets' : activeTab === 'exp' ? 'Gestion Expériences' : 'Gestion Compétences'}
          </h1>
          {!editItem && <button className="adm-primary-btn" onClick={initNew}>+ Nouveau</button>}
        </header>

        {editItem ? (
          <div className="adm-form-container">
            {activeTab !== 'skills' ? (
              <div className="adm-form-grid">
                <div className="adm-input-group">
                  <label>Titre</label>
                  <input className="adm-field" value={editItem.title || ''} onChange={e=>setEditItem({...editItem, title: e.target.value})} />
                </div>
                <div className="adm-input-group">
                  <label>Slug (URL)</label>
                  <input className="adm-field" value={editItem.slug || ''} onChange={e=>setEditItem({...editItem, slug: e.target.value})} />
                </div>
                <div className="adm-input-group">
                  <label>{activeTab === 'projects' ? 'Date' : 'Période'}</label>
                  <input className="adm-field" value={editItem.date || editItem.period || ''} onChange={e=>setEditItem({...editItem, [activeTab === 'projects' ? 'date' : 'period']: e.target.value})} />
                </div>

                {activeTab === 'projects' ? (
                  <>
                    <div className="adm-input-group">
                      <label>Lien du projet</label>
                      <input className="adm-field" value={editItem.link || ''} onChange={e=>setEditItem({...editItem, link: e.target.value})} />
                    </div>
                    <div className="adm-input-group full-width">
                      <label>Images du projet (Drag & Drop)</label>
                      <label className="adm-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
                        <span className="adm-dropzone-icon">📥</span>
                        <span>{uploading ? 'Upload en cours...' : 'Dépose tes fichiers ici ou clique'}</span>
                        <input type="file" multiple accept="image/*" style={{display:'none'}} onChange={e => handleFiles(e.target.files)} />
                      </label>
                      {editItem.images?.length > 0 && (
                        <div className="adm-image-preview-list">
                          {editItem.images.map((img, i) => (
                            <div key={i} className="adm-img-preview">
                              <img src={img} alt="preview" />
                              <button className="adm-img-del" onClick={() => setEditItem({...editItem, images: editItem.images.filter((_, idx) => idx !== i)})}>×</button>
                              <button className="adm-img-crop" onClick={() => openCropper(img, i)} title="Recadrer">✂️</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="adm-input-group full-width">
                      <label>Technologies (Texte brut)</label>
                      <input className="adm-field" value={editItem.tech || ''} onChange={e=>setEditItem({...editItem, tech: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="adm-input-group">
                      <label>Catégorie</label>
                      <input className="adm-field" value={editItem.category || ''} onChange={e=>setEditItem({...editItem, category: e.target.value})} />
                    </div>
                    <div className="adm-input-group">
                      <label>Icône (Emoji)</label>
                      <input className="adm-field" value={editItem.icon || ''} onChange={e=>setEditItem({...editItem, icon: e.target.value})} />
                    </div>
                  </>
                )}

                <div className="adm-input-group full-width">
                  <label>Description Courte</label>
                  <textarea className="adm-field" rows="2" value={editItem.desc_short || editItem.desc_text || ''} 
                    onChange={e=>setEditItem({...editItem, [activeTab === 'projects' ? 'desc_short' : 'desc_text']: e.target.value})} />
                </div>
                <div className="adm-input-group full-width">
                  <label>Missions détaillées (Modale)</label>
                  <textarea className="adm-field" rows="5" placeholder="Utilise • pour les listes" value={editItem.details || ''} onChange={e=>setEditItem({...editItem, details: e.target.value})} />
                </div>
              </div>
            ) : (
              <div className="adm-form-grid">
                <div className="adm-input-group full-width">
                  <label>Nom de la compétence</label>
                  <input className="adm-field" value={editItem.label || ''} onChange={e=>setEditItem({...editItem, label: e.target.value})} />
                </div>
                <div className="adm-input-group full-width">
                  <label>Description</label>
                  <textarea className="adm-field" rows="2" value={editItem.desc_text || ''} onChange={e=>setEditItem({...editItem, desc_text: e.target.value})} />
                </div>
                <div className="adm-input-group full-width">
                  <label>Lier aux projets :</label>
                  <div className="adm-checkbox-grid">
                    {projectsList.map(p => (
                      <label key={p.id} className="adm-checkbox-label">
                        <input type="checkbox" checked={editItem.project_ids?.includes(p.id)} 
                          onChange={e => {
                            const ids = e.target.checked 
                              ? [...(editItem.project_ids || []), p.id] 
                              : (editItem.project_ids || []).filter(id => id !== p.id);
                            setEditItem({...editItem, project_ids: ids});
                          }} />
                        {p.title}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="adm-form-footer">
              {activeTab !== 'skills' ? (
                <label className="adm-publish-toggle">
                  <input type="checkbox" checked={editItem.is_published} onChange={e=>setEditItem({...editItem, is_published: e.target.checked})} />
                  <span>Public sur le site</span>
                </label>
              ) : <div />}
              <div className="adm-form-actions">
                {activeTab !== 'skills' && (
                  <button className="adm-mini-btn adm-mini-btn--preview" onClick={() => setPreviewItem(editItem)}>👁️ Prévisualiser</button>
                )}
                <button className="adm-primary-btn" onClick={saveItem} disabled={loading || uploading}>Enregistrer</button>
                <button className="adm-mini-btn" onClick={() => setEditItem(null)}>Annuler</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {activeTab !== 'skills' && (
              <p className="adm-drag-hint">↕ Glisse les cartes pour réordonner</p>
            )}
            <div className="adm-grid">
              {currentList.map(item => (
                <div
                  key={item.id}
                  className={`adm-card${draggedId === item.id ? ' adm-card--dragging' : ''}`}
                  draggable={activeTab !== 'skills'}
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragOver={e => handleDragOver(e, item.id)}
                  onDrop={handleDrop}
                >
                  <div className="adm-card-header">
                    {activeTab !== 'skills' ? (
                      <>
                        <span className="adm-drag-handle">⠿</span>
                        <span className={`status-badge ${item.is_published ? 'status-published' : 'status-draft'}`}>
                          {item.is_published ? 'Public' : 'Brouillon'}
                        </span>
                      </>
                    ) : <span className="status-badge" style={{background: 'rgba(19, 201, 237, 0.1)', color: 'var(--highlight-color)'}}>Compétence</span>}
                    <span className="adm-card-id">#{item.id}</span>
                  </div>
                  <h3 className="adm-card-title">{item.title || item.label}</h3>
                  <div className="adm-actions-row">
                    <button className="adm-mini-btn" onClick={() => setEditItem(item)}>✏️ Modifier</button>
                    {activeTab !== 'skills' && (
                      <>
                        <button className="adm-mini-btn" onClick={() => togglePublish(item)}>{item.is_published ? '👁️‍🗨️ Masquer' : '🚀 Publier'}</button>
                        <button className="adm-mini-btn" onClick={() => duplicate(item)}>📄 Dupliquer</button>
                      </>
                    )}
                    <button className="adm-mini-btn adm-mini-btn--del" onClick={async () => { if(window.confirm("Supprimer ?")) { await supabase.from(activeTab === 'projects' ? 'projets' : activeTab === 'exp' ? 'experiences' : 'skills').delete().eq('id', item.id); fetchAll(); } }}>🗑️ Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

{/* ── Prévisualisation Modal ── */}
      <AnimatePresence>
        {previewItem && (
          <motion.div className="cv-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 99999 }} onClick={() => setPreviewItem(null)}>
            <motion.div className={activeTab === 'projects' ? "project-modal-box" : "exp-modal-box"} onClick={e => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div className="cv-modal-title"><div className="cv-modal-dot" /><span><strong>{previewItem.title}</strong></span></div>
                <button className="modal-close-btn" onClick={() => setPreviewItem(null)}>✕</button>
              </div>
              <div className={activeTab === 'projects' ? "project-modal-body" : "exp-modal-body"}>
                {activeTab === 'projects' ? (
                  <>
                    {/* On affiche la galerie d'images */}
                    <ImageGallery images={previewItem.images} imageFit={previewItem.imageFit} title={previewItem.title} />
                    <div className="project-modal-content">
                      <h2>{previewItem.title}</h2>
                      <div className="project-modal-meta">
                        <span className="tech-stack">{previewItem.tech}</span>
                        <span className="project-date-modal">📅 {previewItem.date}</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-line' }}>{previewItem.details || previewItem.desc_short}</p>
                    </div>
                  </>
                ) : (
                  <div style={{padding: '30px'}}>
                    <div className="exp-modal-top">
                      <span className="exp-modal-icon">{previewItem.icon}</span>
                      <div><h2>{previewItem.title}</h2><span className="exp-modal-period">📅 {previewItem.period}</span></div>
                    </div>
                    <div className="exp-modal-divider" />
                    <div className="exp-modal-details">
                      {(previewItem.details || previewItem.desc_text || '').split('\n\n').map((block, i) => (
                        <p key={i} className={block.startsWith('•') ? 'exp-modal-bullet' : 'exp-modal-intro'}>{block}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cropper d'image ── */}
      {cropperSrc && (
        <ImageCropper
          src={cropperSrc}
          onSave={handleCropSave}
          onCancel={() => { setCropperSrc(null); setCropperTarget(null); }}
        />
      )}
    </div>
  );
}
// ─── Composant ImageCropper (style Discord) ────────────────────────────────────

function ImageCropper({ src, onSave, onCancel, borderOptions = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [border, setBorder] = useState('none');
  const [borderColor, setBorderColor] = useState('#13c9ed');
  const imgRef = useRef(null);
  // Ratio card projet : largeur libre, hauteur fixe 180px → on travaille en 360x180
  const W = 360;
  const H = 180;

  const borders = [
    { id: 'none', label: 'Aucune' },
    { id: 'rounded', label: 'Arrondi' },
    { id: 'glow', label: 'Lueur' },
    { id: 'double', label: 'Double' },
    { id: 'circle', label: 'Cercle' },
  ];

  useEffect(() => { drawCanvas(); }, [scale, offset, border, borderColor, src]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // S'assure que le canvas interne est bien en haute résolution
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const img = imgRef.current;
    if (!img || !img.complete || !img.naturalWidth) return;

    ctx.clearRect(0, 0, W, H);

    // Clip shape
    ctx.save();
    ctx.beginPath();
    if (border === 'circle') {
      const r = Math.min(W, H) / 2 - 2;
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
    } else if (border === 'rounded') {
      roundRect(ctx, 4, 4, W - 8, H - 8, 12);
    } else {
      ctx.rect(0, 0, W, H);
    }
    ctx.clip();

    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (W - w) / 2 + offset.x, (H - h) / 2 + offset.y, w, h);
    ctx.restore();

    // Overlay border
    if (border === 'circle') {
      const r = Math.min(W, H) / 2 - 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (border === 'glow') {
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, W - 6, H - 6);
      ctx.shadowBlur = 0;
    } else if (border === 'double') {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.strokeRect(7, 7, W - 14, H - 14);
    } else if (border === 'rounded') {
      ctx.beginPath();
      roundRect(ctx, 4, 4, W - 8, H - 8, 12);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Grille d'aide au cadrage (légère)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H);
    ctx.moveTo((W / 3) * 2, 0); ctx.lineTo((W / 3) * 2, H);
    ctx.moveTo(0, H / 3); ctx.lineTo(W, H / 3);
    ctx.moveTo(0, (H / 3) * 2); ctx.lineTo(W, (H / 3) * 2);
    ctx.stroke();
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Auto-fit image au premier chargement
  const onImgLoad = () => {
    const img = imgRef.current;
    const scaleW = W / img.naturalWidth;
    const scaleH = H / img.naturalHeight;
    setScale(Math.max(scaleW, scaleH));
    setOffset({ x: 0, y: 0 });
    drawCanvas();
  };

  // Charge avec crossOrigin pour éviter le tainted canvas
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      img.crossOrigin = 'anonymous';
      img.src = src;
    }
  }, [src]);

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    const cx = (e.touches ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches ? e.touches[0].clientY : e.clientY);
    return { x: (cx - r.left) * scaleX, y: (cy - r.top) * scaleY };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    const pos = getPos(e);
    setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y });
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const pos = getPos(e);
    setOffset({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
  };
  const onPointerUp = () => setDragging(false);

  const handleSave = () => {
    // Export dans un canvas propre à la taille logique pour éviter tout problème
    const src = canvasRef.current;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');
    ctx.drawImage(src, 0, 0, W, H);
    const dataUrl = out.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper-box" onClick={e => e.stopPropagation()}>
        <div className="cropper-header">
          <span>✂️ Recadrer l'image</span>
          <button className="modal-close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="cropper-body">
          <p className="cropper-hint">Glisse pour repositionner · Zoom pour cadrer</p>
          <div className="cropper-canvas-wrap"
            ref={containerRef}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          >
            <canvas ref={canvasRef} width={W} height={H} className="cropper-canvas" />
            <img ref={imgRef} alt="source" crossOrigin="anonymous" style={{ display: 'none' }} onLoad={onImgLoad} />
          </div>

          <div className="cropper-controls">
            <label className="cropper-label">Zoom</label>
            <input
              type="range" min="0.1" max="4" step="0.01"
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              className="cropper-range"
            />
            <span className="cropper-zoom-val">{Math.round(scale * 100)}%</span>
          </div>

          {borderOptions && (
            <>
              <div className="cropper-border-btns">
                {borders.map(b => (
                  <button key={b.id} className={`cropper-border-btn${border === b.id ? ' active' : ''}`} onClick={() => setBorder(b.id)}>
                    {b.label}
                  </button>
                ))}
              </div>
              {border !== 'none' && (
                <div className="cropper-color-row">
                  <label className="cropper-label">Couleur de bordure</label>
                  <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="cropper-color-input" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="cropper-footer">
          <button className="adm-mini-btn" onClick={onCancel}>Annuler</button>
          <button className="adm-primary-btn" onClick={handleSave}>Appliquer</button>
        </div>
      </div>
    </div>
  );
}