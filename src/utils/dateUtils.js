/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Formate une date au format français
 * @param {string} dateString - Date au format ISO (YYYY-MM-DD)
 * @returns {string} Date formatée (ex: "15 octobre 2024")
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
};

/**
 * Formate une date avec l'heure
 * @param {string} dateString - Date au format ISO
 * @param {string} timeString - Heure au format HH:MM
 * @returns {string} Date et heure formatées
 */
export const formatDateTime = (dateString, timeString) => {
  const formattedDate = formatDate(dateString);
  return `${formattedDate} à ${timeString}`;
};

/**
 * Vérifie si une date est passée
 * @param {string} dateString - Date au format ISO (peut être null)
 * @returns {boolean} True si la date est passée, false si null ou future
 */
export const isPastDate = (dateString) => {
  if (!dateString) return false; // Pas de date de fin = toujours actif
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Morceaux d'une date pour les blocs date façon billet (jour en gros chiffres,
 * mois et jour de la semaine abrégés, en capitales).
 * @param {string} dateString - Date au format ISO
 * @param {string} locale - 'fr' ou 'en'
 * @returns {{ day: string, month: string, weekday: string, year: string, long: string }}
 */
export const dateParts = (dateString, locale = 'fr') => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return { day: '--', month: '', weekday: '', year: '', long: '' };
  }
  const loc = locale === 'en' ? 'en-GB' : 'fr-FR';
  const clean = (s) => s.replace('.', '').toUpperCase();
  return {
    day: String(date.getDate()),
    month: clean(date.toLocaleDateString(loc, { month: 'short' })),
    weekday: clean(date.toLocaleDateString(loc, { weekday: 'short' })),
    year: String(date.getFullYear()),
    long: date.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

/**
 * Heure courte : "18:00:00" -> "18h00" (fr) ou "18:00" (en).
 * @param {string} timeString - Heure au format HH:MM[:SS]
 * @param {string} locale - 'fr' ou 'en'
 */
export const formatTime = (timeString, locale = 'fr') => {
  if (!timeString) return '';
  const [h, m = '00'] = String(timeString).split(':');
  return locale === 'en' ? `${h}:${m}` : `${h}h${m}`;
};

/**
 * Calcule le nombre de jours jusqu'à une date
 * @param {string} dateString - Date au format ISO
 * @returns {number} Nombre de jours (négatif si passé)
 */
export const daysUntil = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
