import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './ui/AppText';
import { PopPressable } from './ui/Pop';
import { Sticker } from './ui/Deco';
import { firstImage } from './EventCard';
import { FONTS, PALETTE, SECTION_COLORS, STROKE, accentFor } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/**
 * Écusson de club façon patch varsity : pastille ronde colorée, couture en
 * pointillés et initiales (ou la photo du club si elle existe).
 */
export function ClubPatch({ club, size = 76, rotate = -6 }) {
  const image = firstImage(club.image);
  const ring = Math.max(4, size * 0.07);
  return (
    <View
      style={[
        styles.patch,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accentFor(club.id ?? club.name),
          transform: [{ rotate: `${rotate}deg` }],
        },
      ]}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <>
          <View
            style={[
              styles.stitch,
              { top: ring, left: ring, right: ring, bottom: ring, borderRadius: size / 2 },
            ]}
          />
          <Text style={[styles.patchText, { fontSize: size * 0.32, lineHeight: size * 0.4 }]}>
            {initials(club.name)}
          </Text>
        </>
      )}
    </View>
  );
}

/**
 * Carte club : écusson, nom, catégorie en pastille, description courte et
 * infos (membres, président).
 * @param {Object} club - Objet club
 * @param {Function} onPress - Fonction appelée au clic
 */
const ClubCard = ({ club, onPress }) => {
  const { t } = useLanguage();

  return (
    <PopPressable
      onPress={onPress}
      radius={22}
      containerStyle={styles.container}
      style={styles.card}
      accessibilityLabel={club.name}
    >
      <ClubPatch club={club} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {club.name}
        </Text>
        <Sticker label={club.category} color={SECTION_COLORS.Clubs} rotate={-2} small style={{ marginBottom: 8 }} />
        {club.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {club.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.info}>
            <Ionicons name="people" size={15} color={PALETTE.ink} />
            <Text style={styles.infoText}>
              {club.members} {t('clubs.members')}
            </Text>
          </View>
          {club.president ? (
            <View style={[styles.info, { flex: 1 }]}>
              <Ionicons name="star" size={14} color={PALETTE.ink} />
              <Text style={styles.infoText} numberOfLines={1}>
                {club.president}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PopPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 14,
  },
  patch: {
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stitch: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: PALETTE.ink,
    borderStyle: 'dashed',
  },
  patchText: {
    fontFamily: FONTS.display,
    color: PALETTE.ink,
  },
  content: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 19,
    lineHeight: 25,
    color: PALETTE.ink,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: PALETTE.ink,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginLeft: 5,
  },
});

export default ClubCard;
