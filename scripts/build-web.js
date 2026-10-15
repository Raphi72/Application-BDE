/**
 * Export web de l'app, servi sur bde-aivancity.com/app (iPhone en attendant
 * l'App Store : Safari > Partager > Sur l'écran d'accueil).
 *
 * Utilisation (depuis la racine du projet) :
 *   node scripts/build-web.js                   → dist-web/
 *   node scripts/build-web.js ../site_bde/app   → copie aussi le résultat dans le site
 *
 * Le contenu du dossier obtenu va dans public_html/app sur Hostinger.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist-web');
const BASE_URL = '/app';

// Commande fixe, sans argument utilisateur (npx a besoin d'un shell sous Windows).
execSync('npx expo export --platform web --output-dir dist-web --clear', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, EXPO_WEB_BASE_URL: BASE_URL },
});

const destination = process.argv[2];
if (destination) {
  const target = path.resolve(ROOT, destination);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(OUT, target, { recursive: true });
  console.log(`Export web copié dans ${target}`);
}
