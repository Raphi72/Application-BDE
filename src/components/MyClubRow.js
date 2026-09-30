import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './ui/AppText';
import { PopPressable } from './ui/Pop';
import { Sticker } from './ui/Deco';
import { ClubPatch } from './ClubCard';
import { RoleSticker } from './clubUi';
import { useLanguage } from '../context/LanguageContext';
import { plural } from '../utils/plural';
import { FONTS, PALETTE } from '../constants/theme';

/**
 * Ligne « un de mes clubs » (liste des clubs, profil) : écusson, nom, rôle et,
 * pour le président, le nombre de demandes d'adhésion à traiter.
 */
export default function MyClubRow({ club, pendingCount = 0, onPress }) {
  const { t, language } = useLanguage();
  return (
    <PopPressable
      onPress={onPress}
      radius={18}
      containerStyle={styles.container}
      style={styles.row}
      accessibilityLabel={club.name}
    >
      <ClubPatch club={club} size={50} rotate={-6} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {club.name}
        </Text>
        <View style={styles.meta}>
          <RoleSticker member={club} t={t} />
          {club.isPresident && pendingCount > 0 ? (
            <Sticker
              label={plural(t, language, pendingCount, 'clubs.pendingCount', 'clubs.pendingCountLabel')}
              color={PALETTE.sun}
              icon="mail-unread"
              rotate={2}
              small
            />
          ) : null}
        </View>
      </View>
      <Ionicons name="arrow-forward" size={20} color={PALETTE.ink} />
    </PopPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
});
