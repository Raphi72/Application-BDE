import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

/**
 * Petit sélecteur de langue (FR/EN) sous forme de pilule à deux boutons.
 * Utilisé sur les écrans accessibles avant connexion (Login, Register, Reset).
 */
export default function LanguageSwitcher({ style }) {
  const { language, setLanguage, availableLanguages } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      {availableLanguages.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.option, language === lang.code && styles.optionActive]}
          onPress={() => setLanguage(lang.code)}
          accessibilityRole="button"
          accessibilityLabel={lang.name}
        >
          <Text style={styles.flag}>{lang.flag}</Text>
          <Text style={[styles.code, language === lang.code && styles.codeActive]}>
            {lang.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2a2a35',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  optionActive: {
    backgroundColor: '#7C5CFF',
  },
  flag: {
    fontSize: 14,
    marginRight: 6,
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  codeActive: {
    color: '#fff',
  },
});
