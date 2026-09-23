import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './AppText';
import { COLORS, FONTS, HARD_SHADOW, PALETTE, RADIUS, STROKE } from '../../constants/theme';

/**
 * Carte « pop » : contour encre épais + ombre dure décalée (une vraie vue
 * posée derrière, pour un rendu identique sur Android, iOS et web, là où
 * elevation ne sait faire que des ombres floues).
 * Le conteneur réserve la place de l'ombre avec du padding, donc les marges
 * passées dans containerStyle restent libres.
 */
export function PopCard({
  children,
  style,
  containerStyle,
  color = COLORS.surface,
  shadowColor = PALETTE.ink,
  offset = HARD_SHADOW,
  radius = RADIUS.m,
}) {
  return (
    <View style={[{ paddingRight: offset.x, paddingBottom: offset.y }, containerStyle]}>
      <View
        pointerEvents="none"
        style={[styles.shadow, { top: offset.y, left: offset.x, borderRadius: radius, backgroundColor: shadowColor }]}
      />
      <View style={[styles.face, { backgroundColor: color, borderRadius: radius }, style]}>
        {children}
      </View>
    </View>
  );
}

/**
 * Variante pressable de PopCard : au toucher, la carte glisse sur son ombre
 * (effet « bouton enfoncé »), puis revient au relâchement.
 */
export function PopPressable({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  containerStyle,
  color = COLORS.surface,
  shadowColor = PALETTE.ink,
  offset = HARD_SHADOW,
  radius = RADIUS.m,
  accessibilityLabel,
  dimWhenDisabled = true,
}) {
  const press = useRef(new Animated.Value(0)).current;
  const animate = (toValue) =>
    Animated.spring(press, { toValue, speed: 40, bounciness: 0, useNativeDriver: true }).start();

  const translateX = press.interpolate({ inputRange: [0, 1], outputRange: [0, offset.x] });
  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, offset.y] });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{ paddingRight: offset.x, paddingBottom: offset.y }, containerStyle]}
    >
      <View
        pointerEvents="none"
        style={[styles.shadow, { top: offset.y, left: offset.x, borderRadius: radius, backgroundColor: shadowColor }]}
      />
      <Animated.View
        style={[
          styles.face,
          { backgroundColor: color, borderRadius: radius, transform: [{ translateX }, { translateY }] },
          disabled && dimWhenDisabled && styles.disabled,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { color: PALETTE.tangerine, text: PALETTE.ink },
  dark: { color: PALETTE.ink, text: PALETTE.paper },
  light: { color: PALETTE.white, text: PALETTE.ink },
  success: { color: PALETTE.lime, text: PALETTE.ink },
  danger: { color: PALETTE.cherry, text: PALETTE.ink },
  periwinkle: { color: PALETTE.periwinkle, text: PALETTE.ink },
  sun: { color: PALETTE.sun, text: PALETTE.ink },
};

/**
 * Bouton principal de l'app : gros libellé varsity en capitales sur un bloc
 * de couleur, contour encre et ombre dure.
 */
export function PopButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  color,
  loading = false,
  disabled = false,
  compact = false,
  style,
  containerStyle,
}) {
  const base = BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary;
  // Désactivé : aplat crème et texte adouci plutôt qu'une opacité, qui se
  // mélangerait à l'ombre encre et salirait la couleur.
  const v = disabled && !loading ? { color: PALETTE.paperDeep, text: PALETTE.inkSoft } : base;
  const shadowColor = variant === 'dark' && !disabled ? PALETTE.tangerine : PALETTE.ink;
  return (
    <PopPressable
      onPress={onPress}
      disabled={disabled || loading}
      dimWhenDisabled={false}
      color={disabled && !loading ? v.color : color ?? v.color}
      shadowColor={shadowColor}
      radius={compact ? 14 : 16}
      containerStyle={containerStyle}
      accessibilityLabel={title}
      style={[styles.button, compact && styles.buttonCompact, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 18 : 22} color={v.text} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: v.text }]}>
            {title}
          </Text>
        </>
      )}
    </PopPressable>
  );
}

/**
 * Bouton rond (retour, profil, actions de header).
 */
export function RoundButton({ icon, onPress, size = 42, color = PALETTE.white, iconColor = PALETTE.ink, accessibilityLabel, children }) {
  return (
    <PopPressable
      onPress={onPress}
      color={color}
      radius={size / 2}
      offset={{ x: 2, y: 3 }}
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      {children ?? <Ionicons name={icon} size={size * 0.5} color={iconColor} />}
    </PopPressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  face: {
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.55,
  },
  button: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonCompact: {
    minHeight: 44,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontFamily: FONTS.varsity,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  buttonTextCompact: {
    fontSize: 18,
    lineHeight: 21,
  },
});
