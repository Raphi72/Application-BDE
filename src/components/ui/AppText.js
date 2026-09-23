import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/theme';

// Les polices chargées sont des fichiers statiques (une graisse = une famille) :
// on traduit fontWeight en famille Space Grotesk plutôt que de laisser Android
// simuler un faux gras.
const BODY_BY_WEIGHT = {
  normal: FONTS.body,
  100: FONTS.body,
  200: FONTS.body,
  300: FONTS.body,
  400: FONTS.body,
  500: FONTS.bodyMedium,
  600: FONTS.bodySemiBold,
  bold: FONTS.bodyBold,
  700: FONTS.bodyBold,
  800: FONTS.bodyBold,
  900: FONTS.bodyBold,
};

function withBodyFont(style) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style;
  const family = BODY_BY_WEIGHT[flat.fontWeight ?? 400] ?? FONTS.body;
  return [style, { fontFamily: family, fontWeight: 'normal' }];
}

/**
 * Text de l'app : police du thème par défaut (Space Grotesk, graisse déduite
 * de fontWeight). Un fontFamily explicite dans le style est respecté.
 */
export default function Text({ style, ...props }) {
  return <RNText {...props} style={withBodyFont(style)} />;
}

export function TextInput({ style, ...props }) {
  return <RNTextInput {...props} style={withBodyFont(style)} />;
}
