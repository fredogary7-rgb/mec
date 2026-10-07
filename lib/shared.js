'use strict';

// Constantes partagées entre la génération (build.js) et le serveur (server.js).
// Le nonce est utilisé dans la Content-Security-Policy pour autoriser uniquement
// les scripts JSON-LD générés par notre build (aucun script inline arbitraire).
module.exports = {
  NONCE: 'mec-calme-2026-csp-nonce',
  PORT: process.env.PORT || 3000,
};
