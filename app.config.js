// Configuration Expo : app.json tel quel, plus le sous-chemin de l'export web
// (bde-aivancity.com/app) quand EXPO_WEB_BASE_URL est défini, c'est-à-dire
// seulement pendant `node scripts/build-web.js`. Les builds Android / iOS et
// Expo Go ne voient donc aucune différence.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
