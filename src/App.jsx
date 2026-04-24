// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// ─── Données ──────────────────────────────────────────────────────────────────

const projects = [
  { 
    id: 3, 
    slug: 'zentracker',
    title: 'ZenTracker.online', 
    date: 'Janvier 2026 - Avril 2026',
    dateSort: 2025,
    desc: "Développement d'une plateforme fullstack d'achats automatisés, incluant la création d'une boutique, le scraping de données et un tableau de bord administrateur.", 
    details: "ZenTracker.online est une solution fullstack que j'ai conçue et développée pour répondre à mes propres besoins en tant que vendeur en ligne. Le frontend est développé en React, le backend en Python (Flask), avec une base de données SQL pour le stockage des données clients. La plateforme permet d'automatiser l'achat de produits au Japon, le suivi des stocks... avec des scripts d'automatisation et de scraping pour récupérer les données en temps réel depuis différentes marketplaces. Un des défis majeurs a été de gérer l'authentification sécurisée, les limites des APIs externes, ainsi que la sécurité du site pour faire face à de potentielles attaques de concurrents.",
    tech: 'React, Python, API, SQL', 
    skillIds: ['React', 'Python', 'SQL', "Gestion d'API"],
    link: 'https://zentracker.online',
    images: ['/zentracker.webp', '/zentracker2.webp'],
    imageFit: 'contain',
  },
  { 
    id: 4, 
    slug: 'extension-zentracker',
    title: 'Extension ZenTracker', 
    date: 'Mars 2026',
    dateSort: 20250302,
    desc: "Conception d'une extension navigateur pour ZenTracker, optimisant l'expérience utilisateur via l'intégration d'un flux dynamique, d'un outil d'authentification haute précision et de l'automatisation des transactions e-commerce.", 
    details: "Dans la continuité de ZenTracker.online, j'ai développé une extension navigateur dédiée (Chrome/Firefox) permettant l'optimisation du site ainsi que l'ajout de fonctionnalités supplémentaires. S'intégrant directement aux pages des marketplaces, elle permet d'extraire automatiquement les informations produits, prix et stocks pour les synchroniser avec la plateforme sans quitter la page. L'extension injecte une interface légère dans le DOM et propose des outils avancés comme l'inclusion du feed sur toutes les pages web, l'activation d'une loupe pour l'authentification de produits à forte valeur, ou encore l'automatisation du paiement sur les sites e-commerce directement depuis zentracker.online.",
    tech: 'JavaScript, Extension Chrome, API, Web Scraping', 
    skillIds: ["Gestion d'API"],
    link: 'https://zentracker.online',
    images: ['/extension.webp'],
    imageFit: 'contain',
  },
  { 
    id: 1, 
    slug: 'pacman-c',
    title: 'Pacman en C', 
    date: 'Novembre 2025',
    dateSort: 20241201,
    desc: "Développement d'un clone complet du jeu légendaire Pacman, réalisé entièrement en langage C avec gestion de l'algorithmique des fantômes.", 
    details: "Dans le cadre scolaire, il nous a été demandé de coder un jeu Pac-Man. Pour ce projet fait en binôme, nous avons choisi une direction artistique 'Jurassic Park'. Le programme repose sur le langage C, l'animation des images est gérée par la bibliothèque SDL, et nous avons développé le projet via l'environnement Code::Blocks. Les principaux défis ont été de comprendre le fonctionnement de la SDL et de concevoir une architecture modulaire afin de faciliter le travail collaboratif sur le même code.",
    tech: 'Langage C, SDL, Algorithmie',
    skillIds: ['Langage C'],
    link: 'https://github.com/Emilien0000/2a-pacman',
    images: ['/pacman.webp'],
    imageFit: 'cover',
  },
  { 
    id: 2, 
    slug: 'echecs-c',
    title: "Jeu d'Échecs en C", 
    date: 'Octobre 2024',
    dateSort: 20241001,
    desc: "Conception d'un moteur de jeu d'échecs en C, incluant la logique de déplacement des pièces et la gestion des règles de jeu.", 
    details: "Dans le cadre scolaire, en binôme nous avons conçu un moteur de jeu d'échecs entièrement en langage C. Le projet couvre l'implémentation des règles de déplacement de chaque pièce, la gestion des situations spéciales (roque, prise en passant, promotion du pion), ainsi que la détection des échecs et échecs et mat. L'interface en ligne de commande permet à deux joueurs de s'affronter en local. Le principal défi a été de structurer le code de manière claire et modulaire pour gérer la complexité des règles du jeu.",
    tech: 'Langage C, Structures de données',
    skillIds: ['Langage C'],
    link: 'https://github.com/Emilien0000/echec',
    images: ['/echec.webp'],
    imageFit: 'contain',
  },
];

const skills = [
  { id: 'Langage C',     label: 'Langage C',      desc: 'Programmation système, structures de données, algorithmique.',  projectIds: [1, 2] },
  { id: 'Python',        label: 'Python',          desc: "Scripts d'automatisation, scraping, backend Flask.",            projectIds: [3] },
  { id: 'React',         label: 'React',           desc: 'Interfaces web modernes, composants, état applicatif.',         projectIds: [3] },
  { id: 'SQL',           label: 'SQL',             desc: 'Modélisation et interrogation de bases de données.',            projectIds: [3] },
  { id: 'Cybersécurité', label: 'Cybersécurité',   desc: 'Sécurité applicative, analyse de vulnérabilités, CSP.',         projectIds: [3, 4] },
  { id: "Gestion d'API", label: "Gestion d'API",   desc: "Conception et consommation d'APIs REST sécurisées.",            projectIds: [3, 4] },
  { id: 'Pack Adobe',    label: 'Pack Adobe',       desc: 'Photoshop, Illustrator, Premiere Pro.',                         projectIds: [] },
];

const experiences = [
  {
    category: 'Informatique',
    items: [
      {
        title: 'Technicien Polyvalent — CITYPROTECT',
        period: '2025 · Stage 1 mois',
        tags: ['API', 'Nmap', 'Réseau'],
        desc: "Création d'automatisations via Make (gestion d'API), paramétrage de caméras et switchs, initiation à Nmap.",
        icon: '🏢',
      },
      {
        title: 'Développeur fullstack — Activité personnelle',
        period: '2026',
        tags: ['React', 'Python', 'OVH'],
        desc: "Création et déploiement de sites web fullstack pour mon activité de commerce en ligne via OVH.",
        icon: '💻',
      },
      {
        title: 'Outils Python & Scraping',
        period: '2023 – 2024',
        tags: ['Python', 'Scraping', 'Automatisation'],
        desc: "Développement d'outils Python, d'extensions et de scripts de scraping pour automatiser mon activité de commerce.",
        icon: '🐍',
      },
    ],
  },
  {
    category: 'Engagement & Bénévolat',
    items: [
      {
        title: 'Cadet de la Gendarmerie Nationale — SNU',
        period: 'Sept. 2023 – Juil. 2024',
        tags: ['SNU', 'Gendarmerie', 'Mission d\'intérêt général'],
        desc: "Phase 1 : séjour de cohésion (10 jours). Phase 2 : mission d'intérêt général en tant que Cadet à la gendarmerie nationale d'Amiens.",
        icon: '🛡️',
      },
      {
        title: 'Animateur Vacataire — Amiens Métropole',
        period: '2024 & 2025 · 1 mois/an',
        tags: ['Animation', 'Encadrement'],
        desc: "Encadrement de groupes d'enfants, responsable d'attractions estivales dans le cadre de la mission « Un été à Amiens ».",
        icon: '☀️',
      },
    ],
  },
  {
    category: 'Centres d\'intérêt',
    items: [
      {
        title: 'Pilote de drone cinématographique',
        period: 'Depuis 2025',
        tags: ['Drone', 'Catégorie A1/A3', 'AlphaTango'],
        desc: "Certifié pilote en catégorie ouverte A1/A3, passionné par la prise de vue aérienne.",
        icon: '🚁',
      },
      {
        title: 'Membre d\'une association de magie',
        period: 'Depuis 2018',
        tags: ['Magie', 'Association'],
        desc: "Membre actif d'une association de magie, pratique de tours de cartes et de close-up.",
        icon: '🎩',
      },
      {
        title: 'Commerce & vente en ligne',
        period: 'Depuis 2023',
        tags: ['E-commerce', 'Business', 'Japon'],
        desc: "Gestion d'une activité personnelle de commerce sur catalogue en ligne, spécialisé dans l'import de produits japonais.",
        icon: '🛍️',
      },
    ],
  },
];

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

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const [visits, setVisits] = useState(0);
  const [history, setHistory] = useState([]);

  const tryLogin = () => {
    if (pw === 'CV') {
      setAuthed(true);
      setErr(false);
      const v = parseInt(localStorage.getItem('portfolio_visits') || '0', 10);
      const h = JSON.parse(localStorage.getItem('portfolio_visit_history') || '[]');
      setVisits(v);
      setHistory(h);
    } else {
      setErr(true);
    }
  };

  const resetVisits = () => {
    localStorage.setItem('portfolio_visits', '0');
    localStorage.setItem('portfolio_visit_history', '[]');
    setVisits(0);
    setHistory([]);
  };

  return (
    <div className="admin-page">
      <div className="admin-box">
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
          <div className="admin-dashboard">
            <div className="admin-header-row">
              <h1 className="admin-title">Dashboard</h1>
              <span className="admin-badge">● En ligne</span>
            </div>
            <div className="admin-stat-cards">
              <div className="admin-stat-card">
                <span className="admin-stat-label">Visites totales</span>
                <span className="admin-stat-value">{visits}</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Sessions enregistrées</span>
                <span className="admin-stat-value">{history.length}</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Dernière visite</span>
                <span className="admin-stat-value admin-stat-value--sm">
                  {history.length > 0 ? history[history.length - 1] : '—'}
                </span>
              </div>
            </div>
            {history.length > 0 && (
              <div className="admin-history">
                <h2 className="admin-history-title">Historique</h2>
                <div className="admin-history-list">
                  {[...history].reverse().slice(0, 20).map((date, i) => (
                    <div key={i} className="admin-history-item">
                      <span className="admin-history-dot" />
                      <span>{date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="admin-reset-btn" onClick={resetVisits}>🗑️ Réinitialiser les données</button>
            <a href="/" className="admin-back-link">← Retour au portfolio</a>
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
      sublabel: 'Emilien Vitry-Lhotte',
      href: 'https://www.linkedin.com/in/emilien-vitry-lhotte-0ba17336a/',
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
      sublabel: 'emilien.vitry.lhotte@gmail.com',
      href: 'mailto:emilien.vitry.lhotte@gmail.com',
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

function MainLayout({ dark, onToggleDark }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectSlug } = useParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTechFilter, setActiveTechFilter] = useState(null);
  const [selectedExp, setSelectedExp] = useState(null);

  // Dérive l'onglet actif depuis l'URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathTab = pathSegments[0] || 'home';

  const goTo = (tab) => { navigate(`/${tab}`); setMenuOpen(false); };

  // Ouvrir un projet depuis l'URL /projects/:slug
  useEffect(() => {
    if (pathTab === 'projects' && projectSlug) {
      const found = projects.find(p => p.slug === projectSlug);
      if (found) setSelectedProject(found);
    }
  }, [projectSlug, pathTab]);

  // Fermer modale projet → nettoyer URL
  const closeProject = useCallback(() => {
    setSelectedProject(null);
    if (projectSlug) navigate('/projects', { replace: true });
  }, [projectSlug, navigate]);

  // Ouvrir un projet → mettre à jour l'URL
  const openProject = useCallback((project) => {
    setSelectedProject(project);
    navigate(`/projects/${project.slug}`, { replace: true });
  }, [navigate]);

  // Fermer avec Échap
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedProject) closeProject();
        if (modalOpen) setModalOpen(false);
        if (menuOpen) setMenuOpen(false);
        if (selectedExp) setSelectedExp(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedProject, modalOpen, menuOpen, closeProject]);

  const linkedProjects = selectedSkill
    ? projects.filter(p => selectedSkill.projectIds.includes(p.id))
    : [];

  // Toutes les technos distinctes des projets
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
                Emilien <br /><span className="highlight">Vitry-Lhotte</span>
              </motion.h1>
              <motion.p className="hero-subtitle" variants={itemVariants}>
                Apprenti ingénieur en <span className="highlight">Réseaux Informatiques</span> & Objets connectés — Intéressé par la <span className="highlight">Cybersécurité</span>.
              </motion.p>
              <motion.div className="hero-buttons" variants={itemVariants}>
                <button onClick={() => goTo('contact')} className="cta-button liquid-glass">Me contacter</button>
                <a href="/cv.pdf" download="CV_Emilien_VITRY-LHOTTE.pdf" className="cv-button liquid-glass-outline">📄 Télécharger CV</a>
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
                      onClick={() => setSelectedExp(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="exp-icon">{item.icon}</div>
                      <div className="exp-body">
                        <div className="exp-header">
                          <strong className="exp-title">{item.title}</strong>
                          <span className="exp-period">{item.period}</span>
                        </div>
                        <p className="exp-desc">{item.desc}</p>
                        <div className="exp-tags">
                          {item.tags.map((tag, ti) => (
                            <span key={ti} className="exp-tag">{tag}</span>
                          ))}
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
              <motion.a href="mailto:emilien.vitry.lhotte@gmail.com" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">Email</span>
                  <span className="contact-card-value">emilien.vitry.lhotte@gmail.com</span>
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

              <motion.a href="https://www.linkedin.com/in/emilien-vitry-lhotte-0ba17336a/" target="_blank" rel="noopener noreferrer" className="contact-card" variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(19,201,237,0.18)' }}>
                <div className="contact-card-icon contact-card-icon--linkedin">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </div>
                <div className="contact-card-body">
                  <span className="contact-card-label">LinkedIn</span>
                  <span className="contact-card-value">Emilien Vitry-Lhotte</span>
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
                  <a href="/cv.pdf" download="CV_Emilien_VITRY-LHOTTE.pdf" className="modal-dl-btn">↓ Télécharger</a>
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
          <motion.div className="cv-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setSelectedExp(null)}>
            <motion.div className="exp-modal-box" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={e => e.stopPropagation()}>
              <div className="cv-modal-header">
                <div className="cv-modal-title">
                  <div className="cv-modal-dot" />
                  <span><strong>{selectedExp.title}</strong></span>
                </div>
                <div className="cv-modal-actions">
                  <button className="modal-close-btn" onClick={() => setSelectedExp(null)}>✕</button>
                </div>
              </div>
              <div className="exp-modal-body">
                <div className="exp-modal-icon">{selectedExp.icon}</div>
                <h2 className="exp-modal-title">{selectedExp.title}</h2>
                <span className="exp-modal-period">{selectedExp.period}</span>
                <p className="exp-modal-desc">{selectedExp.desc}</p>
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
