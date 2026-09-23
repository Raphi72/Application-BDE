/**
 * Choisit la forme singulier / pluriel d'un compteur traduit.
 * En français, 0 et 1 prennent le singulier ; en anglais, seul 1.
 * @param {Function} t - fonction de traduction
 * @param {string} language - 'fr' ou 'en'
 * @param {number} count
 * @param {string} oneKey - clé du singulier (ex. 'news.countOne')
 * @param {string} manyKey - clé du pluriel (ex. 'news.countLabel')
 */
export const plural = (t, language, count, oneKey, manyKey) => {
  const isOne = language === 'fr' ? count <= 1 : count === 1;
  return t(isOne ? oneKey : manyKey, { count });
};
