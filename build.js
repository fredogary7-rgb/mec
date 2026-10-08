'use strict';

// ===========================================================================
//  MEC CALME — Générateur de site statique
//  Lit le contenu Markdown, génère un site HTML complet optimisé SEO
//  (JSON-LD NewsArticle, Open Graph, sitemap, news-sitemap, RSS, robots).
//  Usage : node build.js
// ===========================================================================

const fs = require('fs');
const path = require('path');
const { markdownToHtml, parseFrontMatter, escapeHtml } = require('./lib/markdown');
const { NONCE } = require('./lib/shared');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');
const ASSETS = path.join(ROOT, 'assets');

const e = escapeHtml;

// --- Chargement de la configuration du site --------------------------------
const site = JSON.parse(fs.readFileSync(path.join(CONTENT, 'site.json'), 'utf8'));
const SITE_URL = site.website.replace(/\/+$/, '');

// --- Utilitaires -----------------------------------------------------------
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatDateFr(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function toIso(iso) {
  return new Date(iso + 'T00:00:00Z').toISOString();
}

// Date au format W3C strict pour les sitemaps (sans millisecondes).
function w3cDate(iso) {
  return new Date(iso + 'T00:00:00Z').toISOString().slice(0, 19) + 'Z';
}

// Google Actualités n'accepte que les articles des 2 derniers jours.
// En l'absence d'article récent, on conserve le plus récent pour éviter un sitemap vide.
function recentArticles() {
  const now = Date.now();
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  const recent = articles.filter((a) => now - new Date(a.date + 'T00:00:00Z').getTime() <= twoDays);
  return recent.length ? recent : articles.slice(0, 1);
}

function excerptFromHtml(html, len) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= len) return text;
  return text.slice(0, len).trimEnd() + '…';
}

function readDir(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}

function loadContent(dir) {
  return readDir(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const { meta, body } = parseFrontMatter(raw);
      const slug = (meta.slug || file.replace(/\.md$/, '')).toLowerCase();
      const html = markdownToHtml(body);
      return {
        slug,
        title: meta.title || slug,
        description: meta.description || excerptFromHtml(html, 160),
        date: meta.date || new Date().toISOString().slice(0, 10),
        category: meta.category || 'Général',
        tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
        image: meta.image || '',
        featured: meta.featured === 'true' || meta.featured === true,
        type: meta.type || 'article',
        author: meta.author || site.founder.name,
        html,
        readingTime: Math.max(1, Math.round(body.split(/\s+/).length / 200)),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

const articles = loadContent(path.join(CONTENT, 'articles'));
const annonces = loadContent(path.join(CONTENT, 'annonces'));
const categories = [...new Set(articles.map((a) => a.category))].sort();
const allPosts = [...articles, ...annonces].sort((a, b) => new Date(b.date) - new Date(a.date));

function categorySlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function byCategory(slug) {
  return articles.filter((a) => categorySlug(a.category) === slug);
}

function absUrl(p) {
  return SITE_URL + (p.startsWith('/') ? p : '/' + p);
}

// --- Données structurées JSON-LD ------------------------------------------
function jsonLd(obj) {
  return '<script type="application/ld+json" nonce="' + NONCE + '">' + JSON.stringify(obj) + '</script>';
}

function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: absUrl('/assets/img/logo.png') },
    slogan: site.tagline,
    founder: { '@type': 'Person', name: site.founder.name },
    address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' },
    contactPoint: { '@type': 'ContactPoint', telephone: site.phone, contactType: 'customer service' },
    sameAs: Object.values(site.social),
  };
}

function personLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.founder.name,
    alternateName: site.founder.stylizedName,
    url: SITE_URL,
    description: site.founder.bio,
    nationality: { '@type': 'Country', name: 'Togo' },
    address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' },
    sameAs: Object.values(site.social),
  };
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: SITE_URL,
    inLanguage: site.language,
    publisher: { '@type': 'Organization', name: site.name, url: SITE_URL },
  };
}

function articleLd(post, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: post.title,
    description: post.description,
    image: [absUrl(post.image || '/assets/img/og-default.png')],
    datePublished: toIso(post.date),
    dateModified: toIso(post.date),
    author: { '@type': 'Person', name: post.author, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: { '@type': 'ImageObject', url: absUrl('/assets/img/logo.png') },
    },
    inLanguage: site.language,
    keywords: post.tags.join(', '),
    articleSection: post.category,
  };
}

// --- Icônes SVG inline -----------------------------------------------------
const SVG = {
  search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
};

const SOCIAL_LABELS = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube',
  x: 'X (Twitter)', facebook: 'Facebook', threads: 'Threads',
  snapchat: 'Snapchat', linktree: 'Linktree',
};
const SOCIAL_HANDLES = {
  tiktok: '@mec_calme0', instagram: '@mec_calme0', youtube: '@mec_calme0',
  x: '@mec_calme0', facebook: 'mec_calme0', threads: '@mec_calme0',
  snapchat: '¥Čaprįčørñę¥', linktree: 'mec_calme0',
};

function socialIcon(key) {
  const paths = {
    facebook: '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>',
    instagram: '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>',
    youtube: '<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>',
    x: '<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z"/>',
    tiktok: '<path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  };
  const p = paths[key];
  if (p) return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">' + p + '</svg>';
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>';
}

// --- Structure HTML commune ------------------------------------------------
function layout(opts) {
  const title = opts.title || site.name;
  const description = opts.description || site.description;
  const canonical = opts.canonical || SITE_URL + '/';
  const type = opts.type || 'website';
  const image = absUrl(opts.image || '/assets/img/og-default.png');
  const fullTitle = opts.title ? opts.title + ' — ' + site.name : site.name + ' · ' + site.tagline;
  const jsonLdList = [organizationLd(), websiteLd()].concat(opts.jsonLd || []);

  return `<!DOCTYPE html>
<html lang="${site.language}" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(fullTitle)}</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="${e(site.founder.name)}">
<meta name="theme-color" content="#0e1116">
${opts.keywords ? '<meta name="news_keywords" content="' + e(opts.keywords) + '">' : ''}
<link rel="alternate" type="application/rss+xml" title="Mec Calme — Flux RSS" href="/rss.xml">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/img/favicon.png">
<link rel="icon" type="image/x-icon" href="/assets/img/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${e(site.name)}">
<meta property="og:title" content="${e(fullTitle)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:locale" content="${site.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(fullTitle)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${e(image)}">
<meta name="twitter:site" content="@mec_calme0">
<script nonce="${NONCE}">(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(err){}})();</script>
${jsonLdList.map(jsonLd).join('\n')}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="${opts.bodyClass || ''}">
<a class="skip-link" href="#main">Aller au contenu</a>
<div class="progress-bar" id="progressBar" aria-hidden="true"></div>
${renderHeader(opts.active || '')}
<main id="main">${opts.content || ''}</main>
${renderFooter()}
<div class="search-overlay" id="searchOverlay" hidden>
  <div class="search-panel" role="dialog" aria-modal="true" aria-label="Recherche">
    <div class="search-head">
      <input type="search" id="searchInput" placeholder="Rechercher un article…" autocomplete="off">
      <button class="icon-btn" id="searchClose" aria-label="Fermer">${SVG.close}</button>
    </div>
    <ul class="search-results" id="searchResults"></ul>
  </div>
</div>
<button class="back-to-top" id="backToTop" aria-label="Remonter en haut">${SVG.arrow}</button>
<script src="/assets/js/search-index.js" defer></script>
<script src="/assets/js/main.js" defer></script>
</body>
</html>`;
}

function renderHeader(active) {
  const links = site.nav.map((item) => {
    const isActive = item.href === active ||
      (active !== '/' && item.href !== '/' && active.startsWith(item.href));
    return '<a class="nav-link' + (isActive ? ' active' : '') + '" href="' + e(item.href) + '">' + e(item.label) + '</a>';
  }).join('');

  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="Mec Calme — Accueil">
      <span class="brand-mark" aria-hidden="true">MC</span>
      <span class="brand-text">
        <strong>${e(site.name)}</strong>
        <small>${e(site.stylizedName)}</small>
      </span>
    </a>
    <nav class="main-nav" id="mainNav" aria-label="Navigation principale">${links}</nav>
    <div class="header-actions">
      <button class="icon-btn" id="searchToggle" aria-label="Rechercher">${SVG.search}</button>
      <button class="icon-btn" id="themeToggle" aria-label="Changer de thème">${SVG.moon}<span class="sun-icon">${SVG.sun}</span></button>
      <button class="icon-btn nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false">${SVG.menu}</button>
    </div>
  </div>
</header>`;
}

function renderFooter() {
  const socialLinks = Object.keys(site.social).map((key) => {
    return '<a class="social-link" href="' + e(site.social[key]) + '" target="_blank" rel="noopener noreferrer" aria-label="' + e(SOCIAL_LABELS[key] || key) + '">' + socialIcon(key) + '<span>' + e(SOCIAL_LABELS[key] || key) + '</span></a>';
  }).join('');

  const catLinks = categories.map((c) => {
    const slug = categorySlug(c);
    return '<a href="/categorie/' + slug + '/">' + e(c) + '</a>';
  }).join('');

  const navLinks = site.nav.map((n) => '<a href="' + e(n.href) + '">' + e(n.label) + '</a>').join('');

  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-col footer-brand">
      <a class="brand" href="/" aria-label="Mec Calme">
        <span class="brand-mark" aria-hidden="true">MC</span>
        <span class="brand-text"><strong>${e(site.name)}</strong><small>${e(site.stylizedName)}</small></span>
      </a>
      <p>${e(site.tagline)}. ${e(site.slogan)}.</p>
      <div class="social-links">${socialLinks}</div>
    </div>
    <div class="footer-col">
      <h4>Navigation</h4>
      ${navLinks}
    </div>
    <div class="footer-col">
      <h4>Catégories</h4>
      ${catLinks}
    </div>
    <div class="footer-col">
      <h4>Contact</h4>
      <p><span class="muted">📍</span> ${e(site.location)}</p>
      <p><a href="mailto:${e(site.email)}">✉️ ${e(site.email)}</a></p>
      <p><a href="https://wa.me/${e(site.whatsapp)}" target="_blank" rel="noopener noreferrer">💬 ${e(site.phone)}</a></p>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© ${new Date().getFullYear()} ${e(site.name)}. Tous droits réservés.</p>
    <p>Fait avec calme à Lomé 🇹🇬</p>
  </div>
</footer>`;
}

function postUrl(post) {
  const section = post.type === 'annonce' ? 'annonces' : 'articles';
  return '/' + section + '/' + post.slug + '/';
}

function postBadge(post) {
  return post.type === 'annonce' ? 'Annonce' : (post.category || 'Article');
}

function card(post) {
  const url = postUrl(post);
  const img = post.image || '/assets/img/og-default.png';
  return `<article class="card">
    <a class="card-media" href="${url}" aria-hidden="true" tabindex="-1">
      <img src="${img}" alt="${e(post.title)}" loading="lazy">
      <span class="card-cat">${e(postBadge(post))}</span>
    </a>
    <div class="card-body">
      <div class="card-meta"><time datetime="${toIso(post.date)}">${formatDateFr(post.date)}</time><span class="dot">·</span><span>${post.readingTime} min</span></div>
      <h3 class="card-title"><a href="${url}">${e(post.title)}</a></h3>
      <p class="card-desc">${e(post.description)}</p>
      <a class="card-more" href="${url}">Lire la suite ${SVG.arrow}</a>
    </div>
  </article>`;
}

function hero(post) {
  const url = postUrl(post);
  const img = post.image || '/assets/img/og-default.png';
  return `<section class="hero">
    <div class="container hero-grid">
      <div class="hero-content">
        <span class="eyebrow">${SVG.pin} À la une</span>
        <h1><a href="${url}">${e(post.title)}</a></h1>
        <p class="hero-desc">${e(post.description)}</p>
        <div class="hero-meta">
          <span class="avatar-dot" aria-hidden="true">MC</span>
          <span>${e(post.author)}</span>
          <span class="dot">·</span>
          <time datetime="${toIso(post.date)}">${formatDateFr(post.date)}</time>
          <span class="dot">·</span>
          <span>${post.readingTime} min de lecture</span>
        </div>
        <a class="btn btn-primary" href="${url}">Lire l'article ${SVG.arrow}</a>
      </div>
      <a class="hero-media" href="${url}" aria-hidden="true" tabindex="-1">
        <img src="${img}" alt="${e(post.title)}">
      </a>
    </div>
  </section>`;
}

function sectionHead(title, href, linkLabel) {
  return `<div class="section-head">
    <h2 class="section-title">${e(title)}</h2>
    ${href ? '<a class="section-link" href="' + href + '">' + e(linkLabel || 'Tout voir') + ' ' + SVG.arrow + '</a>' : ''}
  </div>`;
}

function socialEmbeds() {
  const tiktokUrl = site.social.tiktok;
  const tiktokHandle = (tiktokUrl.split('@').pop() || 'mec_calme0').replace(/\/+$/, '');
  const instagramUrl = site.social.instagram;
  const instagramHandle = (instagramUrl.replace(/\/+$/, '').split('/').pop() || 'mec_calme0');

  // Carte TikTok fiable (s'affiche toujours, même sans l'embed)
  const tiktokCard = '<div class="profile-card">' +
    '<div class="profile-card-head"><span class="social-avatar">' + socialIcon('tiktok') + '</span><div><h4>@' + e(tiktokHandle) + '</h4><span class="muted">' + e(site.tagline) + '</span></div></div>' +
    '<div class="stats">' +
      '<div class="stat"><strong>' + e(site.stats.tiktokFollowers) + '</strong><span>abonnés</span></div>' +
      '<div class="stat"><strong>' + e(site.stats.tiktokLikes) + '</strong><span>likes</span></div>' +
    '</div>' +
    '<a class="btn btn-primary" href="' + tiktokUrl + '" target="_blank" rel="noopener">Voir mon profil TikTok ' + SVG.arrow + '</a>' +
  '</div>';

  // TikTok : embed officiel (vidéos + stats, une fois la date de naissance réglée dans TikTok)
  const tiktokEmbed = '<blockquote class="tiktok-embed" cite="' + tiktokUrl + '" data-unique-id="' + e(tiktokHandle) + '" data-embed-type="creator" style="max-width: 720px; min-width: 288px;"><section><a target="_blank" rel="noopener" href="' + tiktokUrl + '?refer=creator_embed">@' + e(tiktokHandle) + '</a></section></blockquote>';

  // Instagram : carte simple avec bouton (s'affiche toujours)
  const instagramCard = '<div class="profile-card">' +
    '<div class="profile-card-head"><span class="social-avatar">' + socialIcon('instagram') + '</span><div><h4>@' + e(instagramHandle) + '</h4><span class="muted">' + e(site.tagline) + '</span></div></div>' +
    '<a class="btn btn-primary" href="' + instagramUrl + '" target="_blank" rel="noopener">Voir mon profil Instagram ' + SVG.arrow + '</a>' +
  '</div>';

  return '<div class="embeds-grid">' +
    '<div class="embed-card"><h3>TikTok</h3>' + tiktokCard + tiktokEmbed + '</div>' +
    '<div class="embed-card"><h3>Instagram</h3>' + instagramCard + '</div>' +
    '</div>' +
    '<script async src="https://www.tiktok.com/embed.js"></script>';
}

function homePage() {
  const featured = articles.find((a) => a.featured) || articles[0];
  const latest = articles.filter((a) => a !== featured).slice(0, 5);
  const cats = categories.map((c) => {
    const slug = categorySlug(c);
    return '<a class="category-chip" href="/categorie/' + slug + '/">' + e(c) + '</a>';
  }).join('');

  const socialLinks = Object.keys(site.social).slice(0, 6).map((key) => {
    return '<a class="social-link" href="' + e(site.social[key]) + '" target="_blank" rel="noopener noreferrer" aria-label="' + e(SOCIAL_LABELS[key]) + '">' + socialIcon(key) + '<span>' + e(SOCIAL_LABELS[key]) + '</span></a>';
  }).join('');

  return `
  ${hero(featured)}
  <section class="section">
    <div class="container">
      ${sectionHead('Derniers articles', '/articles/')}
      <div class="grid grid-3">${latest.map(card).join('')}</div>
    </div>
  </section>
  <section class="section section-alt">
    <div class="container">
      ${sectionHead('Explorer par catégorie')}
      <div class="category-row">${cats}</div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      ${sectionHead('Annonces', '/annonces/')}
      <div class="grid grid-3">${annonces.slice(0, 3).map(card).join('')}</div>
    </div>
  </section>
  <section class="section about-teaser">
    <div class="container about-grid">
      <div class="about-card">
        <span class="avatar" aria-hidden="true">MC</span>
        <h2>${e(site.founder.name)}</h2>
        <p class="muted">${e(site.founder.stylizedName)} · ${e(site.location)}</p>
        <p>${e(site.founder.bio)}</p>
        <div class="stats">
          <div class="stat"><strong>${e(site.stats.tiktokFollowers)}</strong><span>abonnés TikTok</span></div>
          <div class="stat"><strong>${e(site.stats.tiktokLikes)}</strong><span>mentions J'aime</span></div>
          <div class="stat"><strong>${site.birthsign}</strong><span>signe</span></div>
        </div>
        <a class="btn btn-primary" href="/a-propos/">En savoir plus ${SVG.arrow}</a>
      </div>
      <div class="social-card">
        <h3>Suivez Mec Calme</h3>
        <p class="muted">Retrouvez-moi sur tous mes réseaux.</p>
        <div class="social-links social-grid">${socialLinks}</div>
      </div>
    </div>
  </section>
  <section class="section section-alt">
    <div class="container">
      ${sectionHead('Mes réseaux sociaux')}
      <p class="section-sub">Retrouvez mes derniers contenus directement ici.</p>
      ${socialEmbeds()}
    </div>
  </section>`;
}

function breadcrumb(items) {
  return '<nav class="breadcrumb" aria-label="Fil d’ariane">' +
    items.map((it, i) => {
      if (i === items.length - 1) return '<span aria-current="page">' + e(it.label) + '</span>';
      return '<a href="' + it.href + '">' + e(it.label) + '</a>';
    }).join('<span class="sep">/</span>') + '</nav>';
}

function shareButtons(url, title) {
  const enc = encodeURIComponent;
  const shareUrl = SITE_URL + url;
  return `<div class="share">
    <span>Partager :</span>
    <a href="https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}" target="_blank" rel="noopener noreferrer" aria-label="Partager sur X">${socialIcon('x')}</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Partager sur Facebook">${socialIcon('facebook')}</a>
    <a href="https://wa.me/?text=${enc(title + ' ' + shareUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp">💬</a>
    <button class="copy-link" data-copy="${e(shareUrl)}" aria-label="Copier le lien">🔗</button>
  </div>`;
}

function articlePage(post) {
  const url = postUrl(post);
  const absolute = absUrl(url);
  const img = post.image || '/assets/img/og-default.png';
  const tagsHtml = post.tags.map((t) => '<span class="tag">#' + e(t) + '</span>').join('');

  let related = articles.filter((a) => a.slug !== post.slug && a.category === post.category);
  if (related.length < 3) {
    related = related.concat(articles.filter((a) => a.slug !== post.slug && a.category !== post.category));
  }
  related = related.slice(0, 3);

  const content = `
  <article class="article">
    <div class="container article-container">
      ${breadcrumb([{ label: 'Accueil', href: '/' }, { label: 'Articles', href: '/articles/' }, { label: post.title }])}
      <header class="article-header">
        <a class="card-cat" href="/categorie/${categorySlug(post.category)}/">${e(post.category)}</a>
        <h1>${e(post.title)}</h1>
        <p class="article-lead">${e(post.description)}</p>
        <div class="article-meta">
          <span class="avatar-dot" aria-hidden="true">MC</span>
          <span>${e(post.author)}</span>
          <span class="dot">·</span>
          <time datetime="${toIso(post.date)}">${formatDateFr(post.date)}</time>
          <span class="dot">·</span>
          <span>${SVG.clock} ${post.readingTime} min</span>
        </div>
      </header>
      <figure class="article-cover">
        <img src="${img}" alt="${e(post.title)}">
      </figure>
      <div class="article-body">${post.html}</div>
      <div class="article-tags">${tagsHtml}</div>
      ${shareButtons(url, post.title)}
      <div class="author-box">
        <span class="avatar" aria-hidden="true">MC</span>
        <div>
          <h3>${e(post.author)}</h3>
          <p>${e(site.founder.bio)}</p>
        </div>
      </div>
    </div>
  </article>
  ${related.length ? '<section class="section"><div class="container">' + sectionHead('À lire aussi', '/articles/') + '<div class="grid grid-3">' + related.map(card).join('') + '</div></div></section>' : ''}`;

  return layout({
    title: post.title,
    description: post.description,
    canonical: absolute,
    type: 'article',
    image: img,
    jsonLd: [articleLd(post, absolute)],
    keywords: post.tags.join(', '),
    active: '/articles/',
    bodyClass: 'article-page',
    content,
  });
}

function pageHero(title, lead, crumbs) {
  return `<section class="page-hero">
    <div class="container">
      ${breadcrumb(crumbs)}
      <h1>${e(title)}</h1>
      ${lead ? '<p class="lead">' + e(lead) + '</p>' : ''}
    </div>
  </section>`;
}

function articlesPage() {
  const content = pageHero('Articles', site.slogan, [{ label: 'Accueil', href: '/' }, { label: 'Articles' }]) +
    '<section class="section"><div class="container"><div class="grid grid-3">' + articles.map(card).join('') + '</div></div></section>';
  return layout({
    title: 'Articles',
    description: 'Tous les articles de Mec Calme sur la confiance en soi, la séduction subtile et le mindset.',
    canonical: absUrl('/articles/'),
    active: '/articles/',
    content,
  });
}

function annoncesPage() {
  const content = pageHero('Annonces', 'Les nouveautés et actualités de Mec Calme.', [{ label: 'Accueil', href: '/' }, { label: 'Annonces' }]) +
    '<section class="section"><div class="container"><div class="grid grid-3">' + annonces.map(card).join('') + '</div></div></section>';
  return layout({
    title: 'Annonces',
    description: 'Les annonces et actualités officielles de Mec Calme.',
    canonical: absUrl('/annonces/'),
    active: '/annonces/',
    content,
  });
}

function annoncePage(post) {
  const url = postUrl(post);
  const absolute = absUrl(url);
  const content = `
  <article class="article">
    <div class="container article-container">
      ${breadcrumb([{ label: 'Accueil', href: '/' }, { label: 'Annonces', href: '/annonces/' }, { label: post.title }])}
      <header class="article-header">
        <span class="card-cat">Annonce</span>
        <h1>${e(post.title)}</h1>
        <p class="article-lead">${e(post.description)}</p>
        <div class="article-meta"><time datetime="${toIso(post.date)}">${formatDateFr(post.date)}</time></div>
      </header>
      <div class="article-body">${post.html}</div>
      ${shareButtons(url, post.title)}
    </div>
  </article>`;
  return layout({
    title: post.title,
    description: post.description,
    canonical: absolute,
    type: 'article',
    image: post.image || '/assets/img/og-default.png',
    jsonLd: [articleLd(post, absolute)],
    keywords: 'annonce',
    active: '/annonces/',
    bodyClass: 'article-page',
    content,
  });
}

function categoryPage(slug) {
  const name = categories.find((c) => categorySlug(c) === slug) || 'Catégorie';
  const list = byCategory(slug);
  const content = pageHero(name, 'Tous les articles de la catégorie « ' + name + ' ».', [{ label: 'Accueil', href: '/' }, { label: 'Articles', href: '/articles/' }, { label: name }]) +
    '<section class="section"><div class="container"><div class="grid grid-3">' + list.map(card).join('') + '</div></div></section>';
  return layout({
    title: name,
    description: 'Articles de la catégorie ' + name + ' sur Mec Calme.',
    canonical: absUrl('/categorie/' + slug + '/'),
    active: '/articles/',
    content,
  });
}

function aboutPage() {
  const socialLinks = Object.keys(site.social).map((key) => {
    return '<a class="social-link" href="' + e(site.social[key]) + '" target="_blank" rel="noopener noreferrer">' + socialIcon(key) + '<span>' + e(SOCIAL_LABELS[key]) + '</span><small>' + e(SOCIAL_HANDLES[key]) + '</small></a>';
  }).join('');

  const values = [
    { icon: '🛡️', title: 'Confiance', desc: 'Construire une assurance réelle, durable et silencieuse.' },
    { icon: '✨', title: 'Séduction subtile', desc: 'Marquer les esprits par la nuance et le charisme.' },
    { icon: '🧠', title: 'Mindset', desc: 'Adopter une mentalité de gagnant au quotidien.' },
  ];

  const content = pageHero('À propos', site.tagline + '.', [{ label: 'Accueil', href: '/' }, { label: 'À propos' }]) +
    `<section class="section">
      <div class="container about-grid">
        <div class="about-card">
          <span class="avatar" aria-hidden="true">MC</span>
          <h2>${e(site.founder.name)}</h2>
          <p class="muted">${e(site.founder.stylizedName)} · ${e(site.location)} · ${e(site.birthsign)}</p>
          <p>${e(site.founder.bio)}</p>
          <div class="stats">
            <div class="stat"><strong>${e(site.stats.tiktokFollowers)}</strong><span>abonnés TikTok</span></div>
            <div class="stat"><strong>${e(site.stats.tiktokLikes)}</strong><span>mentions J'aime</span></div>
            <div class="stat"><strong>${e(site.birthsign)}</strong><span>signe astro</span></div>
          </div>
        </div>
        <div class="social-card">
          <h3>Mes réseaux sociaux</h3>
          <p class="muted">Suivez-moi partout pour ne rien manquer.</p>
          <div class="social-links social-grid">${socialLinks}</div>
        </div>
      </div>
    </section>
    <section class="section section-alt">
      <div class="container">
        ${sectionHead('Mes valeurs')}
        <div class="grid grid-3">${values.map((v) => '<div class="value-card"><span class="value-icon">' + v.icon + '</span><h3>' + e(v.title) + '</h3><p>' + e(v.desc) + '</p></div>').join('')}</div>
      </div>
    </section>
    <section class="section">
      <div class="container cta">
        <h2>Une idée de collaboration ?</h2>
        <p class="muted">Partenariats, sponsoring, contenus… écrivez-moi.</p>
        <a class="btn btn-primary" href="/contact/">Me contacter ${SVG.arrow}</a>
      </div>
    </section>`;

  return layout({
    title: 'À propos',
    description: 'Découvrez Mec Calme, créateur de contenu togolais : confiance en soi, séduction subtile et mindset.',
    canonical: absUrl('/a-propos/'),
    jsonLd: [personLd()],
    active: '/a-propos/',
    content,
  });
}

function contactPage() {
  const content = pageHero('Contact', 'Une question, un partenariat ou une collaboration ? Écrivez-moi.', [{ label: 'Accueil', href: '/' }, { label: 'Contact' }]) +
    `<section class="section">
      <div class="container contact-grid">
        <div class="contact-info">
          <h2>Restons en contact</h2>
          <p class="muted">${e(site.tagline)}. ${e(site.slogan)}.</p>
          <a class="contact-item" href="https://wa.me/${e(site.whatsapp)}" target="_blank" rel="noopener noreferrer"><span>💬</span><div><strong>WhatsApp</strong><small>${e(site.phone)}</small></div></a>
          <a class="contact-item" href="mailto:${e(site.email)}"><span>✉️</span><div><strong>Email</strong><small>${e(site.email)}</small></div></a>
          <a class="contact-item" href="${e(site.social.linktree)}" target="_blank" rel="noopener noreferrer"><span>🔗</span><div><strong>Linktree</strong><small>Tous mes liens</small></div></a>
          <div class="contact-item"><span>📍</span><div><strong>Localisation</strong><small>${e(site.location)}</small></div></div>
        </div>
        <form class="contact-form" id="contactForm" data-whatsapp="${e(site.whatsapp)}">
          <label>Nom<input type="text" name="name" required placeholder="Votre nom"></label>
          <label>Email<input type="email" name="email" required placeholder="votre@email.com"></label>
          <label>Message<textarea name="message" rows="5" required placeholder="Votre message…"></textarea></label>
          <button type="submit" class="btn btn-primary">Envoyer via WhatsApp ${SVG.arrow}</button>
          <p class="form-hint muted">Le formulaire ouvre WhatsApp avec votre message pré-rempli.</p>
        </form>
      </div>
    </section>`;

  return layout({
    title: 'Contact',
    description: 'Contacter Mec Calme : collaboration, partenariat ou simple message.',
    canonical: absUrl('/contact/'),
    active: '/contact/',
    content,
  });
}

function soutienPage() {
  const paypalSdk = '<script src="https://www.paypal.com/sdk/js?client-id=BAAxzUhzOi6zXbs3gcQ-9QobiCgkGXJe0bZt8Adb4Pnn__lAeTOi3ElGEbq2Ba5AkyvjhcIRtKA8SFKbc8&components=hosted-buttons&disable-funding=venmo&currency=USD"></script>';
  const paypalButton = '<div id="paypal-container-Y54VTFCLXVBNN" class="paypal-container"></div>' +
    '<script nonce="' + NONCE + '">paypal.HostedButtons({ hostedButtonId: "Y54VTFCLXVBNN" }).render("#paypal-container-Y54VTFCLXVBNN");</script>';

  const content = pageHero(
    "Soutenez Mec Calme",
    "Votre soutien m'aide à créer plus de contenu sur la confiance, la séduction subtile et le mindset.",
    [{ label: "Accueil", href: "/" }, { label: "Soutien" }]
  ) + `<section class="section"><div class="container support-container"><div class="support-card">
    <h2>Me soutenir 💛</h2>
    <p class="muted">Chaque contribution, même petite, m'encourage à produire plus de contenus de qualité. Vous choisissez librement le montant.</p>
    <div class="support-note">
      <strong>💡 Comment ça marche :</strong>
      <ul>
        <li>Cliquez sur le bouton PayPal ci-dessous</li>
        <li>Choisissez le montant de votre choix</li>
        <li>Payez par PayPal ou carte bancaire</li>
      </ul>
    </div>
    ${paypalButton}
  </div></div></section>`;

  return layout({
    title: "Soutien",
    description: "Soutenez Mec Calme : faites un don libre pour encourager la création de contenu.",
    canonical: absUrl("/soutien/"),
    active: "/soutien/",
    content: paypalSdk + content,
  });
}

function notFoundPage() {
  const content = `<section class="section">
    <div class="container notfound">
      <h1>404</h1>
      <p>Cette page n'existe pas ou a été déplacée.</p>
      <a class="btn btn-primary" href="/">Retour à l'accueil ${SVG.arrow}</a>
    </div>
  </section>`;
  return layout({ title: 'Page introuvable', canonical: SITE_URL + '/404.html', content });
}

function writeFile(relPath, content) {
  const full = path.join(PUBLIC, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

function copyAssets() {
  fs.cpSync(ASSETS, path.join(PUBLIC, 'assets'), { recursive: true });
}

function sitemapXml() {
  const urls = [
    { loc: SITE_URL + '/', lastmod: allPosts[0] ? allPosts[0].date : '' },
    { loc: SITE_URL + '/articles/' },
    { loc: SITE_URL + '/annonces/' },
    { loc: SITE_URL + '/a-propos/' },
    { loc: SITE_URL + '/contact/' },
    { loc: SITE_URL + '/soutien/' },
  ];
  categories.forEach((c) => urls.push({ loc: SITE_URL + '/categorie/' + categorySlug(c) + '/' }));
  articles.forEach((a) => urls.push({ loc: SITE_URL + postUrl(a), lastmod: a.date }));
  annonces.forEach((a) => urls.push({ loc: SITE_URL + postUrl(a), lastmod: a.date }));

  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + u.loc + '</loc>' + (u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '') + '</url>').join('\n') +
    '\n</urlset>';
}

function newsSitemapXml() {
  const items = recentArticles().map((a) => {
    return '  <url><loc>' + SITE_URL + postUrl(a) + '</loc>' +
      '<news:news><news:publication><news:name>' + e(site.name) + '</news:name><news:language>' + site.language + '</news:language></news:publication>' +
      '<news:publication_date>' + w3cDate(a.date) + '</news:publication_date>' +
      '<news:title>' + e(a.title) + '</news:title></news:news></url>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n' + items + '\n</urlset>';
}

function rssXml() {
  const items = articles.map((a) => {
    return '  <item><title>' + e(a.title) + '</title><link>' + SITE_URL + postUrl(a) + '</link><guid isPermaLink="true">' + SITE_URL + postUrl(a) + '</guid><pubDate>' + new Date(toIso(a.date)).toUTCString() + '</pubDate><description>' + e(a.description) + '</description><category>' + e(a.category) + '</category></item>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel>\n<title>' + e(site.name) + '</title>\n<link>' + SITE_URL + '</link>\n<description>' + e(site.description) + '</description>\n<language>' + site.language + '</language>\n<lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n' + items + '\n</channel>\n</rss>';
}

function robotsTxt() {
  return 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\nSitemap: ' + SITE_URL + '/news-sitemap.xml\n';
}

function manifestJson() {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0e1116',
    theme_color: '#0e1116',
    lang: site.language,
    icons: [
      { src: '/assets/img/favicon.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
      { src: '/assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}

function searchIndexJs() {
  const items = allPosts.map((p) => ({
    title: p.title,
    description: p.description,
    url: postUrl(p),
    category: postBadge(p),
    date: formatDateFr(p.date),
  }));
  return 'window.SEARCH_INDEX = ' + JSON.stringify(items) + ';';
}

function build() {
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  copyAssets();

  writeFile('index.html', layout({
    canonical: SITE_URL + '/',
    active: '/',
    content: homePage(),
    jsonLd: [personLd()],
  }));

  writeFile('articles/index.html', articlesPage());
  writeFile('annonces/index.html', annoncesPage());
  writeFile('a-propos/index.html', aboutPage());
  writeFile('contact/index.html', contactPage());
  writeFile('soutien/index.html', soutienPage());
  writeFile('404.html', notFoundPage());

  articles.forEach((a) => writeFile('articles/' + a.slug + '/index.html', articlePage(a)));
  annonces.forEach((a) => writeFile('annonces/' + a.slug + '/index.html', annoncePage(a)));
  categories.forEach((c) => writeFile('categorie/' + categorySlug(c) + '/index.html', categoryPage(categorySlug(c))));

  writeFile('sitemap.xml', sitemapXml());
  writeFile('news-sitemap.xml', newsSitemapXml());
  writeFile('rss.xml', rssXml());
  writeFile('robots.txt', robotsTxt());
  writeFile('manifest.json', JSON.stringify(manifestJson(), null, 2));
  writeFile('assets/js/search-index.js', searchIndexJs());

  console.log('✅ Site généré dans public/');
  console.log('   Articles : ' + articles.length);
  console.log('   Annonces : ' + annonces.length);
  console.log('   Catégories : ' + categories.join(', '));
}

build();








