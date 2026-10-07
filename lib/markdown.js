'use strict';

// ---------------------------------------------------------------------------
// Mini-convertisseur Markdown -> HTML, sans dépendance externe.
// Conçu pour être SÛR : tout HTML brut est échappé (pas d'injection XSS),
// et les URL sont filtrées (blocage de javascript:, data:, etc.).
// Supporte : titres, gras, italique, barré, liens, images, listes, citations,
// blocs de code, code inline, séparateurs et paragraphes.
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  const u = (url || '').trim();
  // Autorise uniquement les protocoles/chemins sûrs.
  if (/^(https?:|mailto:|tel:|\/|#|\.)/i.test(u)) return u;
  return '#';
}

// Extrait le front-matter YAML simplifié en tête de fichier :
//   ---
//   title: "..."
//   description: "..."
//   ---
//   corps en markdown
function parseFrontMatter(text) {
  const meta = {};
  let body = text || '';
  const normalized = body.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  if (lines.length && lines[0].trim() === '---') {
    let i = 1;
    const header = [];
    while (i < lines.length && lines[i].trim() !== '---') {
      header.push(lines[i]);
      i++;
    }
    body = lines.slice(i + 1).join('\n');

    let lastKey = null;
    for (const line of header) {
      const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (m) {
        lastKey = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        meta[lastKey] = val;
      } else if (lastKey && line.trim()) {
        meta[lastKey] += ' ' + line.trim();
      }
    }
  }

  return { meta, body };
}

// Transformations inline (liens, images, gras, italique, etc.)
function inline(text) {
  let s = String(text);

  // Code inline (prioritaire pour ne pas altérer le contenu)
  s = s.replace(/`([^`\n]+)`/g, (m, c) => '<code>' + escapeHtml(c) + '</code>');

  // Images
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, alt, src, title) => {
    const t = title ? ' title="' + escapeHtml(title) + '"' : '';
    return '<img src="' + safeUrl(src) + '" alt="' + escapeHtml(alt || '') + '" loading="lazy"' + t + '>';
  });

  // Liens
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, label, href, title) => {
    const t = title ? ' title="' + escapeHtml(title) + '"' : '';
    const ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a href="' + safeUrl(href) + '"' + ext + t + '>' + label + '</a>';
  });

  // Gras
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italique
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Barré
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return s;
}

function markdownToHtml(md) {
  const normalized = String(md || '').replace(/\r\n?/g, '\n');

  // 1) Extraire les blocs de code afin de protéger leur contenu.
  const codeBlocks = [];
  const src = normalized.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (m, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push('<pre><code>' + escapeHtml(code.replace(/\n$/, '')) + '</code></pre>');
    return '\u0000CODE' + idx + '\u0000';
  });

  // 2) Échapper tout le HTML brut restant.
  const lines = escapeHtml(src).split('\n');
  const out = [];
  let i = 0;
  let listTag = null;

  const closeList = () => {
    if (listTag) {
      out.push('</' + listTag + '>');
      listTag = null;
    }
  };

  const isCodeToken = (l) => /^\u0000CODE\d+\u0000$/.test(l.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isCodeToken(line)) {
      closeList();
      const idx = parseInt(trimmed.match(/\d+/)[0], 10);
      out.push(codeBlocks[idx]);
      i++;
      continue;
    }

    if (trimmed === '') {
      closeList();
      i++;
      continue;
    }

    // Titres
    let m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      closeList();
      const level = m[1].length;
      out.push('<h' + level + '>' + inline(m[2]) + '</h' + level + '>');
      i++;
      continue;
    }

    // Séparateur horizontal
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      out.push('<hr>');
      i++;
      continue;
    }

    // Citation (le « > » a déjà été échappé en « &gt; »)
    if (/^&gt;\s?/.test(trimmed)) {
      closeList();
      const q = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i].trim())) {
        q.push(lines[i].trim().replace(/^&gt;\s?/, ''));
        i++;
      }
      out.push('<blockquote><p>' + inline(q.join(' ')) + '</p></blockquote>');
      continue;
    }

    // Liste non ordonnée
    m = line.match(/^[-*+]\s+(.*)$/);
    if (m) {
      if (listTag !== 'ul') { closeList(); out.push('<ul>'); listTag = 'ul'; }
      out.push('<li>' + inline(m[1]) + '</li>');
      i++;
      continue;
    }

    // Liste ordonnée
    m = line.match(/^\d+\.\s+(.*)$/);
    if (m) {
      if (listTag !== 'ol') { closeList(); out.push('<ol>'); listTag = 'ol'; }
      out.push('<li>' + inline(m[1]) + '</li>');
      i++;
      continue;
    }

    // Paragraphe
    closeList();
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^&gt;/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim()) &&
      !isCodeToken(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push('<p>' + inline(para.join('\n').replace(/\n/g, '<br>')) + '</p>');
  }

  closeList();
  return out.join('\n');
}

module.exports = { markdownToHtml, parseFrontMatter, escapeHtml, safeUrl };

