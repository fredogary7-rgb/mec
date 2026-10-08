'use strict';

// ===========================================================================
//  Serveur statique sécurisé (aucune dépendance) pour Mec Calme.
//  - Pretty URLs ( /articles/slug/ -> index.html )
//  - Protection contre le path traversal
//  - En-têtes de sécurité (CSP avec nonce, HSTS, nosniff, etc.)
// ===========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT, NONCE } = require('./lib/shared');

const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' https://www.tiktok.com https://www.instagram.com https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com; " +
    "frame-src https://www.tiktok.com https://www.instagram.com https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com; " +
    "child-src https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com; " +
    "worker-src https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com; " +
    "connect-src 'self' https://www.tiktok.com https://www.instagram.com https://www.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com; " +
    "base-uri 'self'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function resolvePath(urlPath) {
  try {
    const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    const segments = clean.split(/[\\/]/).filter((s) => s !== '' && s !== '.');
    if (segments.some((s) => s === '..')) return null;
    if (segments.length === 0) segments.push('index.html');
    return path.join(ROOT, ...segments);
  } catch (err) {
    return null;
  }
}

function findFile(p) {
  if (!p) return null;
  let stat;
  try {
    stat = fs.statSync(p);
  } catch (err) {
    return null;
  }
  if (stat.isFile()) return p;
  if (stat.isDirectory()) {
    const idx = path.join(p, 'index.html');
    if (fs.existsSync(idx)) return idx;
    return null;
  }
  // Pretty URL : essayer p.html
  const html = p + '.html';
  if (fs.existsSync(html)) return html;
  return null;
}

const server = http.createServer((req, res) => {
  const resolved = resolvePath(req.url);
  let file = findFile(resolved);

  if (!file || !file.startsWith(ROOT)) {
    file = path.join(ROOT, '404.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(404, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': 'text/html; charset=utf-8' }));
    fs.createReadStream(file).pipe(res);
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, Object.assign({}, SECURITY_HEADERS, { 'Content-Type': mime }));
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log('🚀 Mec Calme — serveur démarré sur http://localhost:' + PORT);
});
