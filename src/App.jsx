// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { supabase } from './supabase';

// ─── Variants animations ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, when: 'beforeChildren', staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  hover: {
    scale: 1.03,
    boxShadow: "0px 10px 30px rgba(19, 201, 237, 0.2)", 
    transition: { duration: 0.3 }
  }
};

const modalVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

// ─── Composant galerie ─────────────────────────────────────────────────────────

function ImageGallery({ images, imageFit, title }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(1);
  if (!images || images.length === 0) return null;

  const goTo = (index, dir = 1) => {
    if (animating || index === current) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setCurrent(index); setAnimating(false); }, 300);
  };

  const prev = () => goTo((current - 1 + images.length) % images.length, -1);
  const next = () => goTo((current + 1) % images.length, 1);

  return (
    <div className="gallery-wrapper">
      <div className="gallery-main">
        <img
          key={current}
          src={images[current]}
          alt={`${title} — vue ${current + 1}`}
          className={`project-modal-hero gallery-img-slide${animating ? (direction > 0 ? ' slide-out-left' : ' slide-out-right') : ' slide-in'}`}
          style={{ objectFit: imageFit || 'cover' }}
        />
        {images.length > 1 && (
          <>
            <button className="gallery-arrow gallery-arrow-left" onClick={prev}>‹</button>
            <button className="gallery-arrow gallery-arrow-right" onClick={next}>›</button>
            <div className="gallery-dots gallery-dots-overlay">
              {images.map((_, i) => (
                <button key={i} className={`gallery-dot${i === current ? ' active' : ''}`} onClick={() => goTo(i, i > current ? 1 : -1)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Scroll Progress Bar ───────────────────────────────────────────────────────

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? (scrolled / max) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="scroll-progress-track">
      <div className="scroll-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

// ─── Dark Mode Toggle ──────────────────────────────────────────────────────────

function DarkModeToggle({ dark, onToggle }) {
  return (
    <button className="darkmode-toggle" onClick={onToggle} aria-label="Toggle dark mode" title={dark ? 'Mode clair' : 'Mode sombre'}>
      <span className="darkmode-icon">{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}

// ─── Page Admin (compteur de visites) ─────────────────────────────────────────

// ─── Page Admin — CMS Portfolio ──────────────────────────────────

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  // States de notre CMS
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formulaire d'ajout
  const [newProject, setNewProject] = useState({
    title: '', slug: '', date: '', desc_short: '', tech: '', link: ''
  });

  const tryLogin = () => {
    if (pw === 'CV') { 
      setAuthed(true); 
      setErr(false); 
      fetchProjectsAdmin(); 
    } else {
      setErr(true);
    }
  };

  // 1. Récupérer les projets actuels
  const fetchProjectsAdmin = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projets').select('*').order('id', { ascending: false });
    if (!error) setProjectsList(data || []);
    setLoading(false);
  };

  // 2. Ajouter un nouveau projet
  const handleAddProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    // On calcule un nouvel ID (le plus grand actuel + 1)
    const newId = projectsList.length > 0 ? Math.max(...projectsList.map(p => p.id)) + 1 : 1;

    const { error } = await supabase.from('projets').insert([{
      id: newId,
      title: newProject.title,
      slug: newProject.slug,
      date: newProject.date,
      desc_short: newProject.desc_short,
      tech: newProject.tech,
      link: newProject.link,
      images: [], // On met un tableau vide par défaut pour l'instant
      image_fit: 'cover'
    }]);

    if (error) {
      alert("Erreur lors de l'ajout : " + error.message);
    } else {
      alert("Projet ajouté avec succès !");
      // On vide le formulaire
      setNewProject({ title: '', slug: '', date: '', desc_short: '', tech: '', link: '' });
      // On rafraîchit la liste
      fetchProjectsAdmin();
    }
    setLoading(false);
  };

  // 3. Supprimer un projet
  const handleDelete = async (id, title) => {
    if (window.confirm(`Es-tu sûr de vouloir supprimer le projet "${title}" ?`)) {
      setLoading(true);
      await supabase.from('projets').delete().eq('id', id);
      fetchProjectsAdmin();
    }
  };

  return (
    <div className="admin-page">
      <div className={`admin-box${authed ? ' admin-box--full' : ''}`}>
        {!authed ? (
          <div className="admin-login">
            <div className="admin-lock">🔐</div>
            <h1 className="admin-title">Zone Admin</h1>
            <p className="admin-sub">Accès restreint — Portfolio EVL</p>
            <div className="admin-input-row">
              <input
                type="password"
                className={`admin-input${err ? ' admin-input--err' : ''}`}
                placeholder="Mot de passe"
                value={pw}
                onChange={e => { setPw(e.target.value); setErr(false); }}
                onKeyDown={e => e.key === 'Enter' && tryLogin()}
                autoFocus
              />
              <button className="admin-btn" onClick={tryLogin}>Entrer</button>
            </div>
            {err && <p className="admin-err">Mot de passe incorrect.</p>}
          </div>
        ) : (
          <div className="admin-dashboard adm-full">
            <div className="adm-header">
              <div className="adm-header-left">
                <h1 className="admin-title">Gestion du Portfolio</h1>
                <span className="admin-badge">● Supabase</span>
              </div>
              <button className="adm-refresh-btn" onClick={fetchProjectsAdmin} title="Actualiser">↻</button>
            </div>

            {loading && <div className="adm-loader"><div className="adm-spinner" /><span>Chargement...</span></div>}

            <div className="adm-two-col" style={{ marginTop: '30px' }}>
              
              {/* COLONNE GAUCHE : Formulaire d'ajout */}
              <div className="adm-section">
                <h2 className="adm-section-title">➕ Ajouter un projet</h2>
                <form className="adm-chart-card" onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input className="admin-input" required placeholder="Titre (ex: Mon Super Projet)" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
                  <input className="admin-input" required placeholder="Slug (ex: mon-super-projet)" value={newProject.slug} onChange={e => setNewProject({...newProject, slug: e.target.value})} />
                  <input className="admin-input" required placeholder="Date (ex: Mars 2026)" value={newProject.date} onChange={e => setNewProject({...newProject, date: e.target.value})} />
                  <input className="admin-input" required placeholder="Technologies (ex: React, Node)" value={newProject.tech} onChange={e => setNewProject({...newProject, tech: e.target.value})} />
                  <input className="admin-input" placeholder="Lien URL (optionnel)" value={newProject.link} onChange={e => setNewProject({...newProject, link: e.target.value})} />
                  <textarea className="admin-input" required placeholder="Courte description..." rows="3" value={newProject.desc_short} onChange={e => setNewProject({...newProject, desc_short: e.target.value})}></textarea>
                  
                  <button type="submit" className="admin-btn" disabled={loading}>Ajouter le projet</button>
                </form>
              </div>

              {/* COLONNE DROITE : Liste des projets actuels */}
              <div className="adm-section">
                <h2 className="adm-section-title">📚 Projets en ligne</h2>
                <div className="adm-chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                  {projectsList.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--bg-color)' }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)' }}>{p.title}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.tech}</div>
                      </div>
                      <button onClick={() => handleDelete(p.id, p.title)} className="admin-reset-btn" style={{ marginRight: 0, padding: '6px 12px' }}>Supprimer</button>
                    </div>
                  ))}
                  {projectsList.length === 0 && !loading && <p className="adm-empty">Aucun projet trouvé.</p>}
                </div>
              </div>

            </div>

            <div className="adm-footer-row">
              <a href="/" className="admin-back-link">← Retour au portfolio public</a>
              <span className="adm-powered">Données synchronisées en direct</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Page Linktree (cachée) ────────────────────────────────────────────────────

function LinksPage() {
  const links = [
    {
      label: 'Portfolio',
      sublabel: 'emilienvl.me',
      href: 'https://emilienvl.me',
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>),
      accent: 'var(--highlight-color)',
      bg: 'rgba(19,201,237,0.08)',
    },
    {
      label: 'LinkedIn',
      sublabel: 'Emilien VITRY-LHOTTE',
      href: 'https://www.linkedin.com/in/emilien-vitry-lhotte/',
      icon: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>),
      accent: '#0a66c2',
      bg: 'rgba(10,102,194,0.08)',
    },
    {
      label: 'GitHub',
      sublabel: 'Emilien0000',
      href: 'https://github.com/Emilien0000',
      icon: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>),
      accent: 'var(--text-main)',
      bg: 'rgba(6,57,92,0.07)',
    },
    {
      label: 'Email',
      sublabel: 'emilien.vitry.lhotte1@gmail.com',
      href: 'mailto:emilien.vitry.lhotte1@gmail.com',
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>),
      accent: 'var(--highlight-color)',
      bg: 'rgba(19,201,237,0.08)',
    },
    {
      label: 'ZenTracker',
      sublabel: 'zentracker.online',
      href: 'https://zentracker.online',
      icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>),
      accent: 'var(--highlight-color)',
      bg: 'rgba(19,201,237,0.08)',
    },
  ];

  return (
    <div className="links-page">
      <motion.div className="links-container" initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div className="links-identity" variants={itemVariants}>
          <div className="links-avatar"><img src="/cv.webp" alt="Émilien Vitry-Lhotte" /></div>
          <h1 className="links-name">Émilien <span className="highlight">Vitry-Lhotte</span></h1>
          <p className="links-bio">Apprenti ingénieur · Réseaux & Cybersécurité</p>
          <div className="links-badge">UniLaSalle Amiens</div>
        </motion.div>
        <motion.div className="links-list" variants={containerVariants}>
          {links.map((link, i) => (
            <motion.a
              key={i}
              href={link.href}
              target={link.href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="link-card"
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(19,201,237,0.15)` }}
              transition={{ duration: 0.2 }}
            >
              <div className="link-card-icon" style={{ background: link.bg, color: link.accent }}>{link.icon}</div>
              <div className="link-card-body">
                <span className="link-card-label">{link.label}</span>
                <span className="link-card-sub">{link.sublabel}</span>
              </div>
              <span className="link-card-arrow" style={{ color: link.accent }}>→</span>
            </motion.a>
          ))}
        </motion.div>
        <motion.p className="links-footer-text" variants={itemVariants}>© 2026 Émilien Vitry-Lhotte</motion.p>
      </motion.div>
    </div>
  );
}

// ─── Layout principal ──────────────────────────────────────────────────────────

// ─── Layout principal ──────────────────────────────────────────────────────────

function MainLayout({ dark, onToggleDark }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectSlug, expSlug } = useParams();

  // 1. --- STATES DE L'INTERFACE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTechFilter, setActiveTechFilter] = useState(null);
  const [selectedExp, setSelectedExp] = useState(null);

  // 2. --- STATES DE LA BASE DE DONNÉES ---
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // 3. --- RÉCUPÉRATION SUPABASE ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [projRes, skillRes, expRes] = await Promise.all([
          supabase.from('projets').select('*').order('id', { ascending: false }),
          supabase.from('skills').select('*'),
          supabase.from('experiences').select('*')
        ]);

        if (projRes.error) throw projRes.error;
        if (skillRes.error) throw skillRes.error;
        if (expRes.error) throw expRes.error;

        const formattedSkills = (skillRes.data || []).map(s => ({
          ...s,
          desc: s.desc_text,
          projectIds: s.project_ids || []
        }));
        setSkills(formattedSkills);

        const formattedProjects = (projRes.data || []).map(p => {
          const linkedSkillTags = formattedSkills
            .filter(skill => skill.projectIds.includes(p.id))
            .map(skill => skill.id);
          return { ...p, desc: p.desc_short, skillIds: linkedSkillTags };
        });
        setProjects(formattedProjects);

        const groupedExp = (expRes.data || []).reduce((acc, currentExp) => {
          const formattedExp = { ...currentExp, desc: currentExp.desc_text };
          const categoryIndex = acc.findIndex(c => c.category === formattedExp.category);
          if (categoryIndex > -1) {
            acc[categoryIndex].items.push(formattedExp);
          } else {
            acc.push({ category: formattedExp.category, items: [formattedExp] });
          }
          return acc;
        }, []);
        setExperiences(groupedExp);

      } catch (error) {
        console.error("Erreur Supabase :", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchAllData();
  }, []);

  // 4. --- NAVIGATION & URL ---
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathTab = pathSegments[0] || 'home';

  const goTo = (tab) => { navigate(`/${tab}`); setMenuOpen(false); };

  // Ouvrir un projet depuis l'URL (attend le chargement Supabase)
  useEffect(() => {
    if (projects.length > 0 && pathTab === 'projects' && projectSlug) {
      const found = projects.find(p => p.slug === projectSlug);
      if (found) setSelectedProject(found);
    }
  }, [projectSlug, pathTab, projects]);

  // Ouvrir une expérience depuis l'URL (attend le chargement Supabase)
  const allExpItems = experiences.flatMap(cat => cat.items);
  useEffect(() => {
    if (allExpItems.length > 0 && pathTab === 'experiences' && expSlug) {
      const found = allExpItems.find(e => e.slug === expSlug);
      if (found) setSelectedExp(found);
    }
  }, [expSlug, pathTab, experiences]);

  const closeExp = useCallback(() => {
    setSelectedExp(null);
    if (expSlug) navigate('/experiences', { replace: true });
  }, [expSlug, navigate]);

  const openExp = useCallback((exp) => {
    setSelectedExp(exp);
    if (exp.slug) navigate(`/experiences/${exp.slug}`, { replace: true });
  }, [navigate]);

  const closeProject = useCallback(() => {
    setSelectedProject(null);
    if (projectSlug) navigate('/projects', { replace: true });
  }, [projectSlug, navigate]);

  const openProject = useCallback((project) => {
    setSelectedProject(project);
    navigate(`/projects/${project.slug}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedProject) closeProject();
        if (modalOpen) setModalOpen(false);
        if (menuOpen) setMenuOpen(false);
        if (selectedExp) closeExp();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedProject, modalOpen, menuOpen, closeProject, selectedExp, closeExp]);

  const linkedProjects = selectedSkill
    ? projects.filter(p => selectedSkill.projectIds.includes(p.id))
    : [];

  const allTechs = [...new Set(projects.flatMap(p => p.skillIds))];

  const filteredProjects = activeTechFilter
    ? projects.filter(p => p.skillIds.includes(activeTechFilter))
    : projects;

  const navLinks = [
    { id: 'home', label: 'Accueil' },
    { id: 'about', label: 'Qui suis-je' },
    { id: 'projects', label: 'Projets' },
    { id: 'experiences', label: 'Expériences' },
    { id: 'skills', label: 'Compétences' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div className="app-container">
      <ScrollProgressBar />

      {/* --- HEADER --- */}
      <header className="app-header">
        <div className="logo" onClick={() => goTo('home')} style={{ cursor: 'pointer' }}>EVL.</div>

        <nav className="nav-desktop">
          {navLinks.map(n => (
            <a key={n.id} className={pathTab === n.id ? 'active' : ''} onClick={() => goTo(n.id)}>{n.label}</a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DarkModeToggle dark={dark} onToggle={onToggleDark} />
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              className="nav-mobile"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {navLinks.map(n => (
                <a key={n.id} className={pathTab === n.id ? 'active' : ''} onClick={() => goTo(n.id)}>{n.label}</a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* --- CONTENU DYNAMIQUE --- */}
      <main className="main-content">

        {/* ONGLET ACCUEIL */}
        {pathTab === 'home' && (
          <motion.section className="hero-section" initial="hidden" animate="visible" variants={containerVariants}>
            <div className="hero-left">
              <motion.h1 className="hero-title" variants={itemVariants}>
                Emilien <br /><span className="highlight">VITRY-LHOTTE</span>
              </motion.h1>
              <motion.p className="hero-subtitle" variants={itemVariants}>
                Apprenti ingénieur en <span className="highlight">Réseaux Informatiques</span> & Objets connectés — Intéressé par la <span className="highlight">Cybersécurité</span>.
              </motion.p>
              <motion.div className="hero-buttons" variants={itemVariants}>
                <button onClick={() => goTo('contact')} className="cta-button">Me contacter</button>
                <a href="/cv.pdf" download="CV-Emilien-VITRY-LHOTTE.pdf" className="cv-button">📄 Télécharger CV</a>
              </motion.div>
            </div>
            <motion.div className="hero-right" variants={itemVariants}>
              <div className="cv-preview-wrapper">
                <img src={dark ? "/cv-nuit.webp" : "/cv.webp"} alt="Aperçu du CV d'Émilien" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <button className="expand-btn" onClick={() => setModalOpen(true)}>
                <span className="expand-icon">⛶</span>
                Vue détaillée
              </button>
            </motion.div>
          </motion.section>
        )}

        {/* ONGLET QUI SUIS-JE */}
        {pathTab === 'about' && (
          <motion.section className="about-section" initial="hidden" animate="visible" variants={containerVariants}>
            <h2>QUI SUIS-JE ?</h2>
            <motion.div className="about-content" variants={itemVariants}>
              <p>Actuellement étudiant à <strong>UniLaSalle Amiens</strong> en cycle Pré-Ingénieur, je me spécialise en Réseaux Informatiques et Objets Connectés (RIOC). Passionné par l'informatique depuis de nombreuses années, je suis activement à la recherche d'un <strong>contrat d'apprentissage de 3 ans dans le domaine de la cybersécurité</strong>, avec un démarrage prévu pour septembre 2026.</p>
              <p>En parallèle de mes études, je développe et gère ma propre activité de commerce en ligne pour laquelle je crée des outils d'automatisation (Python, API) et des sites web fullstack.</p>
              <p>Curieux et engagé, je suis également télépilote de drone certifié (A1/A3), membre d'une association de magie depuis 2018, et j'ai eu l'honneur d'effectuer mon Service National Universel (SNU) au sein de la gendarmerie nationale d'Amiens.</p>
            </motion.div>
          </motion.section>
        )}

        {/* ONGLET PROJETS */}
        {pathTab === 'projects' && (
          <motion.section className="projects-section" initial="hidden" animate="visible" variants={containerVariants}>
            <h2>MES PROJETS</h2>

            {/* Filtres technos */}
            <div className="project-filters">
              <button
                className={`filter-btn${!activeTechFilter ? ' filter-btn--active' : ''}`}
                onClick={() => setActiveTechFilter(null)}
              >
                Tous
              </button>
              {allTechs.map(tech => (
                <button
                  key={tech}
                  className={`filter-btn${activeTechFilter === tech ? ' filter-btn--active' : ''}`}
                  onClick={() => setActiveTechFilter(activeTechFilter === tech ? null : tech)}
                >
                  {tech}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTechFilter || 'all'}
                className="projects-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    className="project-card"
                    variants={cardVariants}
                    whileHover="hover"
                    onClick={() => openProject(project)}
                    style={{ cursor: 'pointer' }}
                  >
                    {project.images && project.images[0] ? (
                      <img src={project.images[0]} alt={project.title} className="project-card-img" style={{ objectFit: project.imageFit || 'cover' }} />
                    ) : (
                      <div className="project-image-placeholder">VOIR LE PROJET</div>
                    )}
                    <div className="project-card-meta">
                      <span className="project-date">📅 {project.date}</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.desc}</p>
                    <span className="tech-stack">{project.tech}</span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filteredProjects.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                Aucun projet pour ce filtre.
              </p>
            )}
          </motion.section>
        )}

        {/* ONGLET EXPÉRIENCES */}
        {pathTab === 'experiences' && (
          <motion.section className="experiences-section" initial="hidden" animate="visible" variants={containerVariants}>
            <h2>EXPÉRIENCES</h2>
            {experiences.map((cat, ci) => (
              <motion.div key={ci} className="exp-category" variants={itemVariants}>
                <h3 className="exp-category-title">{cat.category}</h3>
                <div className="exp-list">
                  {cat.items.map((item, ii) => (
                    <motion.div
                      key={ii}
                      className="exp-card"
                      variants={itemVariants}
                      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(19,201,237,0.15)' }}
                      onClick={() => openExp(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="exp-icon">{item.icon}</div>
                      <div className="exp-body">
                        <div className="exp-header">
                          <strong className="exp-title">{item.title}</strong>
                          <span className="exp-period">{item.period}</span>
                        </div>
                        <p className="exp-desc">{item.desc}</p>
                        <div className="exp-footer-row">
                          <div className="exp-tags">
                            {item.tags.map((tag, ti) => (
                              <span key={ti} className="exp-tag">{tag}</span>
                            ))}
                          </div>
                          <span className="exp-see-more">Voir les missions →</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.section>
        )}

        {/* ONGLET COMPÉTENCES */}
        {pathTab === 'skills' && (
          <motion.section className="skills-section" initial="hidden" animate="visible" variants={containerVariants}>
            <h2>COMPÉTENCES</h2>
            <p className="skills-hint">Clique sur une compétence pour voir les projets associés.</p>
            <div className="skills-tags">
              {skills.map(skill => (
                <motion.button
                  key={skill.id}
                  className={`skill-tag${skill.projectIds.length > 0 ? ' skill-tag--clickable' : ''}${selectedSkill?.id === skill.id ? ' skill-tag--active' : ''}`}
                  variants={itemVariants}
                  onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                  disabled={skill.projectIds.length === 0}
                >
                  {skill.label}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedSkill && linkedProjects.length > 0 && (
                <motion.div
                  className="skill-projects-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="skill-projects-panel-header">
                    <span className="skill-projects-panel-title">Projets illustrant <strong>{selectedSkill.label}</strong></span>
                    <p className="skill-projects-panel-desc">{selectedSkill.desc}</p>
                  </div>
                  <div className="skill-projects-list">
                    {linkedProjects.map(p => (
                      <div key={p.id} className="skill-project-item" onClick={() => { openProject(p); setSelectedSkill(null); }}>
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt={p.title} className="skill-project-thumb" style={{ objectFit: p.imageFit || 'cover' }} />
                        )}
                        <div className="skill-project-info">
                          <strong>{p.title}</strong>
                          <span>{p.date}</span>
                          <span className="tech-stack" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>{p.tech}</span>
                        </div>
                        <span className="skill-project-arrow">→</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* ONGLET CONTACT */}
        {pathTab === 'contact' && (
          <motion.section className="contact-section" initial="hidden" animate="visible" variants={containerVariants}>
            <h2>UNE QUESTION ?</h2>
            <p>Actuellement à la recherche d'un contrat d'apprentissage en cybersécurité pour septembre 2026.</p>
            <div className="contact-cards">
              <motion.a href="mailto:emilien.vitry.lhotte1@gmail.com" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">Email</span>
                  <span className="contact-card-value">emilien.vitry.lhotte1@gmail.com</span>
                </div>
                <span className="contact-card-arrow">→</span>
              </motion.a>

              <motion.a href="tel:+33748614162" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.09 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.95 6.95l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">Téléphone</span>
                  <span className="contact-card-value">+33 7 48 61 41 62</span>
                </div>
                <span className="contact-card-arrow">→</span>
              </motion.a>

              <motion.a href="https://github.com/Emilien0000" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon contact-card-icon--github">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">GitHub</span>
                  <span className="contact-card-value">Emilien0000</span>
                </div>
                <span className="contact-card-arrow">→</span>
              </motion.a>

              <motion.a href="https://www.linkedin.com/in/emilien-vitry-lhotte/" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon contact-card-icon--linkedin">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">LinkedIn</span>
                  <span className="contact-card-value">Emilien VITRY-LHOTTE</span>
                </div>
                <span className="contact-card-arrow">→</span>
              </motion.a>
            </div>
          </motion.section>
        )}
      </main>

      {/* --- MODALES --- */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div className="cv-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setModalOpen(false)}>
            <motion.div className="cv-modal-box" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div className="cv-modal-title">
                  <div className="cv-modal-dot" />
                  <span>CV — <strong>Émilien Vitry-Lhotte</strong></span>
                </div>
                <div className="cv-modal-actions">
                  <a href="/cv.pdf" download="CV-Emilien-VITRY-LHOTTE.pdf" className="modal-dl-btn">↓ Télécharger</a>
                  <button className="modal-close-btn" onClick={() => setModalOpen(false)}>✕</button>
                </div>
              </div>
              <div className="cv-modal-body">
                <img src={dark ? "/cv-nuit.webp" : "/cv.webp"} alt="CV d'Émilien en plein écran" className="cv-modal-img" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedProject && (
          <motion.div className="cv-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={closeProject}>
            <motion.div className="project-modal-box" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div className="cv-modal-title">
                  <div className="cv-modal-dot" />
                  <span>Projet — <strong>{selectedProject.title}</strong></span>
                </div>
                <div className="cv-modal-actions">
                  <button
                    className="modal-share-btn"
                    title="Copier le lien"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/projects/${selectedProject.slug}`);
                    }}
                  >
                    🔗
                  </button>
                  <a href={selectedProject.link} target="_blank" rel="noopener noreferrer" className="modal-dl-btn">Voir le lien</a>
                  <button className="modal-close-btn" onClick={closeProject}>✕</button>
                </div>
              </div>
              <div className="project-modal-body">
                <ImageGallery images={selectedProject.images} imageFit={selectedProject.imageFit} title={selectedProject.title} />
                <div className="project-modal-content">
                  <h2>{selectedProject.title}</h2>
                  <div className="project-modal-meta">
                    <span className="tech-stack">{selectedProject.tech}</span>
                    {selectedProject.date && <span className="project-date-modal">📅 {selectedProject.date}</span>}
                  </div>
                  <p>{selectedProject.details || selectedProject.desc}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedExp && (
          <motion.div className="cv-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={closeExp}>
            <motion.div className="exp-modal-box" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div className="cv-modal-title">
                  <div className="cv-modal-dot" />
                  <span><strong>{selectedExp.title}</strong></span>
                </div>
                <div className="cv-modal-actions">
                  {selectedExp.slug && (
                    <button
                      className="modal-share-btn"
                      title="Copier le lien"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/experiences/${selectedExp.slug}`)}
                    >🔗</button>
                  )}
                  <button className="modal-close-btn" onClick={closeExp}>✕</button>
                </div>
              </div>
              <div className="exp-modal-body">
                <div className="exp-modal-top">
                  <span className="exp-modal-icon">{selectedExp.icon}</span>
                  <div>
                    <h2 className="exp-modal-title">{selectedExp.title}</h2>
                    <span className="exp-modal-period">📅 {selectedExp.period}</span>
                  </div>
                </div>
                <div className="exp-modal-divider" />
                <div className="exp-modal-details">
                  {(selectedExp.details || selectedExp.desc).split('\n\n').map((block, i) => (
                    <p key={i} className={block.startsWith('•') ? 'exp-modal-bullet' : 'exp-modal-intro'}>
                      {block}
                    </p>
                  ))}
                </div>
                <div className="exp-modal-tags">
                  {selectedExp.tags.map((tag, ti) => (
                    <span key={ti} className="exp-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FOOTER --- */}
      <footer className="app-footer">
        <p>© 2026 Émilien Vitry-Lhotte. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

// ─── Compteur de visites (enregistre à chaque chargement) ────────────────────

function VisitTracker({ children }) {
  useEffect(() => {
    const count = parseInt(localStorage.getItem('portfolio_visits') || '0', 10) + 1;
    localStorage.setItem('portfolio_visits', String(count));
    const history = JSON.parse(localStorage.getItem('portfolio_visit_history') || '[]');
    history.push(new Date().toLocaleString('fr-FR'));
    if (history.length > 200) history.shift();
    localStorage.setItem('portfolio_visit_history', JSON.stringify(history));
  }, []);
  return children;
}

// ─── Root App avec Router ──────────────────────────────────────────────────────

function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('portfolio_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('portfolio_dark', String(dark));
  }, [dark]);

  const toggleDark = () => setDark(v => !v);

  return (
    <BrowserRouter>
      <VisitTracker>
        <Routes>
          {/* Page cachée linktree */}
          <Route path="/links" element={<LinksPage />} />

          {/* Page admin */}
          <Route path="/admin" element={<AdminPage />} />

          {/* Routes principales du portfolio */}
          <Route path="/home"     element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/about"    element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/projects" element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/projects/:projectSlug" element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/experiences" element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/experiences/:expSlug" element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/skills"   element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />
          <Route path="/contact"  element={<MainLayout dark={dark} onToggleDark={toggleDark} />} />

          {/* Redirect racine → /home */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </VisitTracker>
    </BrowserRouter>
  );
}

export default App;
