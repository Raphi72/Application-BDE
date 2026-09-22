import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Apparition en fondu unique pour toute l'app (opacity 0 -> 1, ease-out, ~180ms).
 * À utiliser uniquement quand une apparition soudaine nuirait à la lisibilité
 * (contenu chargé, message d'erreur/succès) — pas pour chaque élément.
 */
export default function FadeIn({ children, style, duration = 180, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}
