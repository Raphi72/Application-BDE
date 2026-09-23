import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './AppText';
import { Burst, Sticker, Wordmark } from './Deco';
import { COLORS, FONTS, PALETTE, STROKE } from '../../constants/theme';

/**
 * Décor des écrans d'accès (connexion, inscription, réinitialisation) :
 * grosses formes pop qui débordent des coins, derrière le contenu.
 */
export function AuthBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />
      <View style={[styles.pill, styles.pillBottomLeft]} />
      <Burst label="" size={120} color={PALETTE.sun} rotate={14} style={styles.burstTopRight} />
    </View>
  );
}

/**
 * Bloc de marque : logotype géant, pastille « BDE AIVANCITY » et accroche
 * (ou un titre d'écran à la place du logotype géant).
 */
export function AuthBrand({ title, subtitle, compact = false }) {
  return (
    <View style={styles.brand}>
      {title ? (
        <>
          <Wordmark size={22} />
          <Text style={styles.title}>{title}</Text>
        </>
      ) : (
        <Wordmark size={compact ? 44 : 60} style={styles.bigWordmark} />
      )}
      <Sticker
        label="BDE AIVANCITY"
        color={PALETTE.periwinkle}
        rotate={-4}
        style={[styles.brandSticker, title && { marginTop: 12 }]}
      />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/**
 * Styles partagés des champs et liens des écrans d'accès.
 */
export const authStyles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.white,
    borderRadius: 16,
    marginBottom: 14,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  inputContainerFocused: {
    backgroundColor: '#FFF3CF',
    borderWidth: 3,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: PALETTE.ink,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE3DD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
  },
  link: {
    fontFamily: FONTS.bodyBold,
    color: PALETTE.ink,
    textDecorationLine: 'underline',
  },
});

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  blobTopLeft: {
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -110,
    left: -80,
    backgroundColor: PALETTE.tangerine,
  },
  blobBottomRight: {
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -90,
    right: -60,
    backgroundColor: PALETTE.periwinkle,
  },
  pill: {
    position: 'absolute',
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  pillBottomLeft: {
    width: 150,
    height: 54,
    borderRadius: 27,
    bottom: 60,
    left: -70,
    backgroundColor: PALETTE.lime,
    transform: [{ rotate: '-18deg' }],
  },
  burstTopRight: {
    position: 'absolute',
    top: 60,
    right: -40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 34,
  },
  bigWordmark: {
    letterSpacing: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 30,
    lineHeight: 38,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 10,
  },
  brandSticker: {
    alignSelf: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 14,
  },
});
