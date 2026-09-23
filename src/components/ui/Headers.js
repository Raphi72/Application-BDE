import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Text from './AppText';
import { RoundButton } from './Pop';
import { Wordmark, Zigzag } from './Deco';
import { useAuth } from '../../context/AuthContext';
import { useOpenProfile } from '../../navigation/ProfileNav';
import { COLORS, FONTS, PALETTE } from '../../constants/theme';

/**
 * Pastille profil (initiale de l'utilisateur) présente dans chaque header de
 * rubrique.
 */
export function ProfileButton() {
  const openProfile = useOpenProfile();
  const { user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase();
  return (
    <RoundButton onPress={openProfile} size={42} color={PALETTE.white} accessibilityLabel="Profil">
      {initial ? (
        <Text style={styles.initial}>{initial}</Text>
      ) : (
        <Ionicons name="person" size={20} color={PALETTE.ink} />
      )}
    </RoundButton>
  );
}

/**
 * Header des rubriques principales : bandeau à la couleur de la rubrique,
 * logotype, grand titre display et bord en dents de scie. Même hauteur sur
 * toutes les rubriques pour que le swipe ne fasse pas sauter le header.
 */
export function ScreenHeader({ title, subtitle, color, right, children }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View>
      <View style={[styles.band, { backgroundColor: color, paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <Wordmark size={15} />
          <View style={{ flex: 1 }} />
          {right}
          <ProfileButton />
        </View>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
      <Zigzag color={color} width={width} />
    </View>
  );
}

/**
 * Header des écrans de détail (utilisé comme `header` des native-stacks) :
 * bouton retour rond + titre varsity sur le bandeau de la rubrique.
 */
export function DetailHeader({ title, color, onBack, right }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View>
      <View style={[styles.band, styles.detailBand, { backgroundColor: color, paddingTop: insets.top + 8 }]}>
        {onBack ? <RoundButton icon="arrow-back" onPress={onBack} size={40} accessibilityLabel="Retour" /> : null}
        <Text style={styles.detailTitle} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      <Zigzag color={color} width={width} />
    </View>
  );
}

/**
 * Options de native-stack pour une rubrique : header de détail maison et fond
 * papier. Les écrans racines masquent le header (ils rendent ScreenHeader).
 */
export function stackScreenOptions(color) {
  return {
    header: ({ navigation, options, back }) => (
      <DetailHeader
        title={options.title}
        color={color}
        onBack={back ? navigation.goBack : undefined}
        right={options.headerRight?.()}
      />
    ),
    contentStyle: { backgroundColor: COLORS.background },
  };
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  initial: {
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 22,
    color: PALETTE.ink,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 44,
    color: PALETTE.ink,
    marginTop: 8,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: PALETTE.ink,
    marginTop: 2,
  },
  detailBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  detailTitle: {
    flex: 1,
    fontFamily: FONTS.varsity,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
});
