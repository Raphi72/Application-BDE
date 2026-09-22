import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

/**
 * Wrapper de feedback tactile unique pour toute l'app.
 * scale(1) -> scale(0.97) au press-in (rapide, ease-out), retour à 1 au relâché.
 * Utilise l'API Animated native (useNativeDriver) : léger, GPU-friendly, aucune dépendance.
 *
 * @param {number} scaleTo - valeur de scale au press-in (défaut 0.97)
 * @param {boolean} disabled
 */
export default function PressableScale({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = 0.97,
  opacityTo = 0.85,
  disabled = false,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toScale, toOpacity, duration) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: toScale, duration, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: toOpacity, duration, useNativeDriver: true }),
    ]).start();
  };

  const handlePressIn = (e) => {
    animateTo(scaleTo, opacityTo, 90);
    onPressIn?.(e);
  };

  const handlePressOut = (e) => {
    animateTo(1, 1, 130);
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
