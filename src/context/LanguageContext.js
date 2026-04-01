import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, languages } from '../translations';

const LANGUAGE_KEY = '@app_language';

/**
 * Contexte de langue
 * Gère la langue de l'application
 */
const LanguageContext = createContext({});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('fr'); // Français par défaut
  const [loading, setLoading] = useState(true);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage && translations[savedLanguage]) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la langue:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change la langue de l'application
   * @param {string} langCode - Code de la langue ('fr' ou 'en')
   */
  const setLanguage = async (langCode) => {
    if (!translations[langCode]) {
      console.error(`Langue non supportée: ${langCode}`);
      return;
    }

    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, langCode);
      setLanguageState(langCode);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la langue:', error);
    }
  };

  /**
   * Obtient une traduction
   * @param {string} key - Clé de traduction (ex: 'common.loading')
   * @param {object} params - Paramètres de substitution (optionnel)
   * @returns {string} Texte traduit
   */
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Clé non trouvée, retourner la clé elle-même
        console.warn(`Traduction manquante: ${key}`);
        return key;
      }
    }

    // Substitution des paramètres {{param}}
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
      });
    }

    return value;
  };

  /**
   * Obtient les informations de la langue actuelle
   */
  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === language) || languages[0];
  };

  /**
   * Liste des langues disponibles
   */
  const availableLanguages = languages;

  const value = {
    language,
    setLanguage,
    t,
    getCurrentLanguage,
    availableLanguages,
    loading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
