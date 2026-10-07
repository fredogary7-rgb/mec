# Mec Calme — Site média officiel

Site média statique, rapide et sécurisé de **Mec Calme** (`@mec_calme0` / `¥₵₳₱Ɽł₵ØⱤ₦Ɇ¥`), créateur de contenu togolais basé à Lomé.

> « L'homme calme attire sans parler fort. » — Confiance | Séduction subtile | Mindset

## ✨ Fonctionnalités

- 🎨 **Design média professionnel** : thème sombre élégant + accent doré, thème clair, 100 % responsive, accessible.
- 📰 **Publication d'articles et d'annonces** en **Markdown** (aucune base de données).
- 🔍 **SEO complet** : JSON-LD (`NewsArticle`, `Organization`, `Person`, `WebSite`), Open Graph, Twitter Cards, `sitemap.xml`, **`news-sitemap.xml`** (Google Actualités), flux **RSS**, `robots.txt`, URL canoniques.
- 🔒 **Sécurité** : zéro dépendance, en-têtes CSP (nonce JSON-LD), HSTS, `nosniff`, protection anti path-traversal, échappement du HTML (anti-XSS), filtrage des URL (`javascript:`, `data:` bloqués).
- 🚀 **Prêt pour Railway** (Nixpacks ou Dockerfile) — et compatible Netlify / Vercel / GitHub Pages.
- 🔎 Recherche instantanée, barre de progression de lecture, partage social, formulaire de contact via WhatsApp.

## 📂 Structure

```
content/
  site.json           # Configuration du site (nom, bio, réseaux, contact…)
  articles/*.md       # Vos articles (Markdown + front-matter)
  annonces/*.md       # Vos annonces
assets/
  css/style.css       # Design
  js/main.js          # Interactions
  img/                # Logo, favicon, couvertures
build.js              # Générateur statique (Markdown -> HTML)
server.js             # Serveur statique sécurisé (Railway)
```

## 🛠️ Lancer en local

```bash
npm run dev      # génère le site + démarre le serveur sur http://localhost:3000
# ou
node build.js    # génère uniquement dans public/
node server.js   # sert public/ sur http://localhost:3000
```

## ✍️ Publier un article

1. Créez un fichier dans `content/articles/`, par exemple `mon-article.md` :

```markdown
---
title: "Le titre de mon article"
description: "Une courte description (affichée sur Google et dans les cartes)."
date: 2026-10-10
category: "Confiance"          # Confiance | Séduction | Mindset
tags: "confiance, charisme"
image: "/assets/img/covers/confiance.svg"
featured: false                # true = mis en avant sur l'accueil
---

Votre contenu en **Markdown** (titres `##`, listes, citations `>`, gras, liens…).
```

2. Regénérez : `node build.js` (ou `npm run build`).
3. L'article apparaît automatiquement sur l'accueil, la page Articles, sa catégorie, le sitemap, le news-sitemap et le RSS.

> Les annonces se créent de la même façon dans `content/annonces/` (ajoutez `type: "annonce"`).

## 🚀 Déployer sur Railway

**Méthode A — Nixpacks (recommandé, auto) :**
1. Poussez ce dépôt sur GitHub.
2. Dans Railway → « New Project » → « Deploy from GitHub repo » → sélectionnez ce repo.
3. Railway détecte `package.json` (scripts `build` + `start`) et `railway.json` et déploie tout seul.

**Méthode B — Dockerfile :**
Le `Dockerfile` fourni fait la même chose (`npm run build` puis `npm start`).

Le serveur écoute sur le port de la variable `PORT` (défaut 3000). Aucune autre configuration n'est nécessaire.

## 📰 Apparaître dans Google Actualités / Discover

Le site est déjà techniquement préparé (news-sitemap, JSON-LD `NewsArticle`, RSS). Pour être réellement référencé :

1. **Domaine réel** : reliez votre domaine `meccalme0.com` (dans `content/site.json` → `website`) et activez HTTPS.
2. **Images** : remplacez les couvertures SVG par de **vraies photos JPG/PNG/WebP** (Google Actualités exige des images raster). Déposez-les dans `assets/img/` et mettez à jour le champ `image:` de vos articles.
3. **Contenu original** : publiez régulièrement des articles originaux et datés.
4. **Google News Publisher Center** : soumettez votre site sur [publishercenter.google.com](https://publishercenter.google.com) après avoir un trafic régulier.
5. **Google Search Console** : ajoutez votre site et soumettez `sitemap.xml` et `news-sitemap.xml`.

## 🔧 Personnaliser

- **Identité / réseaux / contact** : modifiez `content/site.json`.
- **Email** : remplacez `contact@meccalme0.com` par votre vraie adresse (dans `site.json`).
- **Couleurs / police** : variables CSS en tête de `assets/css/style.css`.

## 📝 À savoir

- Le dossier `public/` est **généré automatiquement** (ignoré par Git). Ne le modifiez pas à la main.
- Les 6 articles et 3 annonces fournis sont des **exemples** dans votre thématique : remplacez-les par votre vrai contenu.
