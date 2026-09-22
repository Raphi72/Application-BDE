import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import PressableScale from './PressableScale';

/**
 * Composant Card pour afficher un club
 * @param {Object} club - Objet club
 * @param {Function} onPress - Fonction appelée au clic
 */
const ClubCard = ({ club, onPress }) => {
  const { t } = useLanguage();
  // Helper pour gérer les images multiples (JSON) ou simple URL
  const getImageSource = (img) => {
    if (!img) return null;
    try {
      const parsed = JSON.parse(img);
      if (Array.isArray(parsed) && parsed.length > 0) return { uri: parsed[0] };
    } catch (e) { }
    return { uri: img };
  };

  return (
    <PressableScale style={styles.card} onPress={onPress}>
      <Image source={getImageSource(club.image)} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{club.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{club.category}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {club.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.info}>
            <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{club.members} {t('clubs.members')}</Text>
          </View>
          <View style={styles.info}>
            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{club.president}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.m,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
});

export default ClubCard;
