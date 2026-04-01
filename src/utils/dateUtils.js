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
