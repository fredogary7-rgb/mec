(function () {
  'use strict';

  var MENU_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Thème clair / sombre ---
  var themeToggle = qs('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // --- Menu mobile ---
  var navToggle = qs('#navToggle');
  var mainNav = qs('#mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      navToggle.innerHTML = open ? CLOSE_ICON : MENU_ICON;
    });
    qsa('#mainNav a').forEach(function (a) {
      a.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = MENU_ICON;
      });
    });
  }

  // --- Recherche ---
  var searchToggle = qs('#searchToggle');
  var searchOverlay = qs('#searchOverlay');
  var searchClose = qs('#searchClose');
  var searchInput = qs('#searchInput');
  var searchResults = qs('#searchResults');

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 50);
  }
  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.hidden = true;
    document.body.classList.remove('no-scroll');
    if (searchResults) searchResults.innerHTML = '';
    if (searchInput) searchInput.value = '';
  }
  if (searchToggle) searchToggle.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (searchOverlay) searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) closeSearch();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.toLowerCase().trim();
      var items = window.SEARCH_INDEX || [];
      var results = items.filter(function (it) {
        return (it.title || '').toLowerCase().indexOf(q) > -1 ||
          (it.description || '').toLowerCase().indexOf(q) > -1 ||
          (it.category || '').toLowerCase().indexOf(q) > -1;
      }).slice(0, 10);
      searchResults.innerHTML = results.map(function (it) {
        return '<li><a href="' + it.url + '"><span class="sr-cat">' + escapeHtml(it.category) + '</span><strong>' + escapeHtml(it.title) + '</strong><small>' + escapeHtml(it.date) + '</small></a></li>';
      }).join('') || '<li class="empty">Aucun résultat.</li>';
    });
  }

  // --- Barre de progression de lecture & bouton retour haut ---
  var progressBar = qs('#progressBar');
  var backToTop = qs('#backToTop');
  function onScroll() {
    if (progressBar) {
      var top = window.scrollY || document.documentElement.scrollTop || 0;
      var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progressBar.style.width = (height > 0 ? (top / height) * 100 : 0) + '%';
    }
    if (backToTop) backToTop.classList.toggle('show', (window.scrollY || 0) > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTop) backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Copier le lien (boutons partage) ---
  qsa('.copy-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-copy') || window.location.href;
      var old = btn.textContent;
      function done() {
        btn.textContent = '✓';
        setTimeout(function () { btn.textContent = old; }, 1500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });

  // --- Formulaire de contact -> WhatsApp ---
  var contactForm = qs('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (contactForm.elements.name.value || '').trim();
      var email = (contactForm.elements.email.value || '').trim();
      var message = (contactForm.elements.message.value || '').trim();
      var number = contactForm.getAttribute('data-whatsapp') || '22871339325';
      var text = 'Bonjour Mec Calme,\n\n' + message + '\n\n— ' + name + ' (' + email + ')';
      window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  }

})();
