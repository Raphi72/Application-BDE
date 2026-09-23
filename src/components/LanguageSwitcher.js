import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from './ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { FONTS, PALETTE, STROKE } from '../constants/theme';

/**
 * Petit sélecteur de langue (FR/EN) sous forme de pilule à deux boutons.
 * Utilisé sur les écrans accessibles avant connexion (Login, Register, Reset).
 * `floating` : positionné en haut à droite, sous la barre d'état.
 */
export default function LanguageSwitcher({ style, floating = false }) {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, floating && { position: 'absolute', top: insets.top + 10, right: 16, zIndex: 2 }, style]}>
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
    backgroundColor: PALETTE.white,
    borderRadius: 999,
    padding: 3,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  optionActive: {
    backgroundColor: PALETTE.ink,
  },
  flag: {
    fontSize: 14,
    marginRight: 6,
  },
  code: {
    fontFamily: FONTS.varsity,
    fontSize: 15,
    lineHeight: 18,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  codeActive: {
    color: PALETTE.paper,
  },
});
