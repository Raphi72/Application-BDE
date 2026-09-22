import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../utils/dateUtils';
import { COLORS, SHADOWS, RADIUS } from '../constants/theme';
import PressableScale from './PressableScale';

/**
 * Composant Card pour afficher une actualité
 * @param {Object} news - Objet actualité
 * @param {Function} onPress - Fonction appelée au clic
 */
const NewsCard = ({ news, onPress }) => {
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
      <Image source={getImageSource(news.image)} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{news.category}</Text>
        </View>
        <Text style={styles.title}>{news.title}</Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {news.content}
        </Text>
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>{formatDate(news.date)}</Text>
          </View>
          <View style={styles.footerInfo}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.footerText}>{news.author}</Text>
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
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  excerpt: {
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
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
});

export default NewsCard;
