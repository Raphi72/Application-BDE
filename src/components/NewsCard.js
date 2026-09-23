import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './ui/AppText';
import { PopPressable } from './ui/Pop';
import { Sticker } from './ui/Deco';
import { firstImage } from './EventCard';
import { dateParts } from '../utils/dateUtils';
import { FONTS, PALETTE, SECTION_COLORS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

/**
 * Carte actualité façon fanzine : photo si elle existe (jamais de bloc vide),
 * pastille catégorie, date varsity, gros titre et chapeau. La plus récente
 * (featured) passe « à la une » sur fond jaune.
 * @param {Object} news - Objet actualité
 * @param {Function} onPress - Fonction appelée au clic
 * @param {boolean} featured - Actualité mise en avant
 */
const NewsCard = ({ news, onPress, featured = false }) => {
  const { t, language } = useLanguage();
  const image = firstImage(news.image);
  const parts = dateParts(news.date, language);

  return (
    <PopPressable
      onPress={onPress}
      radius={20}
      color={featured ? SECTION_COLORS.News : PALETTE.white}
      containerStyle={styles.container}
      accessibilityLabel={news.title}
    >
      {image ? <Image source={{ uri: image }} style={[styles.image, featured && styles.imageFeatured]} /> : null}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Sticker
            label={news.category}
            color={featured ? PALETTE.white : SECTION_COLORS.News}
            rotate={-3}
            small
          />
          <Text style={styles.date}>
            {parts.day} {parts.month} {parts.year}
          </Text>
        </View>
        <Text style={[styles.title, featured && styles.titleFeatured]}>{news.title}</Text>
        <Text style={styles.excerpt} numberOfLines={featured ? 4 : 3}>
          {news.content}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.by}>{t('news.by')}</Text>
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={18} color={PALETTE.ink} />
          </View>
        </View>
      </View>
    </PopPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    borderBottomWidth: 2.5,
    borderBottomColor: PALETTE.ink,
    backgroundColor: PALETTE.paperDeep,
  },
  imageFeatured: {
    height: 200,
  },
  content: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  date: {
    fontFamily: FONTS.varsityBold,
    fontSize: 16,
    letterSpacing: 0.8,
    color: PALETTE.ink,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 19,
    lineHeight: 26,
    color: PALETTE.ink,
    marginBottom: 6,
  },
  titleFeatured: {
    fontSize: 24,
    lineHeight: 32,
  },
  excerpt: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  by: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NewsCard;
