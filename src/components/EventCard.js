import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './ui/AppText';
import { PopPressable } from './ui/Pop';
import { Burst, Sticker } from './ui/Deco';
import { dateParts, daysUntil, formatTime } from '../utils/dateUtils';
import { COLORS, FONTS, PALETTE, STROKE, accentFor } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

// Première image d'un champ image (URL simple ou tableau JSON d'URLs)
export const firstImage = (img) => {
  if (!img) return null;
  try {
    const parsed = JSON.parse(img);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed[0] : null;
  } catch (e) {
    // pas du JSON : URL simple
  }
  return img;
};

// Emoji d'affiche déduit du titre, pour les événements sans photo
const EMOJI_RULES = [
  [/(soir[ée]e|party|f[êe]te|gala|bal\b|night)/i, '🎉'],
  [/(after ?work|bar|ap[ée]ro|bi[èe]re|pub)/i, '🍻'],
  [/(sport|foot|match|basket|tournoi|run|rugby|volley)/i, '⚽'],
  [/(jeu|game|gaming|tournament|lan\b)/i, '🎮'],
  [/(conf|talk|atelier|workshop|meetup|hackathon)/i, '🎤'],
  [/(pool|piscine|plage|beach)/i, '🏖️'],
  [/(ski|voyage|trip|week-?end)/i, '✈️'],
];
export const posterEmoji = (title = '') => EMOJI_RULES.find(([re]) => re.test(title))?.[1] ?? '🎟️';

/**
 * Visuel de repli quand un événement n'a pas de photo : aplat de couleur,
 * motif « NØVYX » en filigrane et gros emoji, pour ne jamais laisser de bloc
 * vide dans la liste.
 */
export function PosterFallback({ color, emoji, height }) {
  return (
    <View style={[styles.poster, { backgroundColor: color, height }]}>
      <View style={styles.posterPattern} pointerEvents="none">
        {[0, 1, 2, 3].map((row) => (
          <Text key={row} numberOfLines={1} style={[styles.posterPatternText, { marginLeft: row % 2 ? -40 : 0 }]}>
            NØVYX NØVYX NØVYX NØVYX
          </Text>
        ))}
      </View>
      <Text style={styles.posterEmoji}>{emoji}</Text>
    </View>
  );
}

/**
 * Compte à rebours affiché en étoile sur l'affiche.
 */
export function countdownLabel(days, t) {
  if (days === 0) return { label: t('events.todayShort'), sublabel: null };
  if (days === 1) return { label: t('events.tomorrowShort'), sublabel: null };
  return { label: `J-${days}`, sublabel: null };
}

/**
 * Carte événement en forme de billet : affiche (ou visuel de repli),
 * perforation à encoches, souche date colorée et infos.
 * @param {Object} event - Objet événement
 * @param {Function} onPress - Fonction appelée au clic
 * @param {boolean} featured - Prochain événement : affiche plus grande
 */
const EventCard = ({ event, onPress, featured = false }) => {
  const { t, language } = useLanguage();
  const days = daysUntil(event.date);
  const isPast = days < 0;
  const isFull = event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants;
  const accent = accentFor(event.id);
  const parts = dateParts(event.date, language);
  const image = firstImage(event.image);
  const visualHeight = featured ? 190 : 140;
  const fill = event.maxParticipants > 0 ? Math.min(1, event.currentParticipants / event.maxParticipants) : 0;
  const countdown = countdownLabel(days, t);

  return (
    <PopPressable
      onPress={onPress}
      radius={22}
      containerStyle={[styles.container, isPast && styles.past]}
      accessibilityLabel={event.title}
    >
      <View>
        {image ? (
          <Image source={{ uri: image }} style={[styles.image, { height: visualHeight }]} />
        ) : (
          <PosterFallback color={accent} emoji={posterEmoji(event.title)} height={visualHeight} />
        )}

        <View style={styles.stickersLeft}>
          {featured && !isPast ? <Sticker label={t('events.nextUp')} color={PALETTE.sun} rotate={-4} /> : null}
          {event.registered ? (
            <Sticker label={t('events.registered')} icon="checkmark" color={PALETTE.lime} rotate={3} style={{ marginTop: 6 }} />
          ) : null}
          {isFull && !isPast ? (
            <Sticker label={t('events.full')} color={PALETTE.cherry} rotate={-2} style={{ marginTop: 6 }} />
          ) : null}
        </View>

        {isPast ? (
          <Sticker
            label={t('events.pastBadge')}
            color={PALETTE.ink}
            textColor={PALETTE.paper}
            rotate={6}
            style={styles.pastStamp}
          />
        ) : (
          <Burst
            label={countdown.label}
            size={featured ? 78 : 66}
            color={PALETTE.bubblegum}
            style={styles.burst}
          />
        )}
      </View>

      {/* Perforation : ligne pointillée entre deux encoches */}
      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashes}>
          {Array.from({ length: 16 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.body}>
        <View style={[styles.stub, { backgroundColor: isPast ? COLORS.surfaceLight : accent }]}>
          <Text style={styles.stubWeekday}>{parts.weekday}</Text>
          <Text style={styles.stubDay}>{parts.day}</Text>
          <Text style={styles.stubMonth}>{parts.month}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, featured && styles.titleFeatured]} numberOfLines={2}>
            {event.title}
          </Text>

          {event.time ? (
            <View style={styles.metaRow}>
              <Ionicons name="time" size={15} color={PALETTE.ink} />
              <Text style={styles.metaText}>{formatTime(event.time, language)}</Text>
            </View>
          ) : null}
          {event.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location" size={15} color={PALETTE.ink} />
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}

          <View style={styles.capacityRow}>
            <View style={styles.capacityTrack}>
              <View style={[styles.capacityFill, { width: `${fill * 100}%`, backgroundColor: accent }]} />
            </View>
            <Text style={styles.capacityText}>
              {event.currentParticipants}/{event.maxParticipants}
            </Text>
          </View>
        </View>
      </View>
    </PopPressable>
  );
};

const NOTCH = 26;

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  past: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
    backgroundColor: PALETTE.paperDeep,
  },
  poster: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  posterPattern: {
    position: 'absolute',
    top: -20,
    left: -30,
    right: -30,
    transform: [{ rotate: '-10deg' }],
    opacity: 0.13,
  },
  posterPatternText: {
    fontFamily: FONTS.display,
    fontSize: 38,
    lineHeight: 48,
    color: PALETTE.ink,
  },
  posterEmoji: {
    fontSize: 64,
    transform: [{ rotate: '-8deg' }],
  },
  stickersLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'flex-start',
  },
  burst: {
    position: 'absolute',
    top: 8,
    right: 10,
  },
  pastStamp: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  perforation: {
    height: STROKE,
    backgroundColor: PALETTE.white,
    justifyContent: 'center',
    // au-dessus de la souche : les encoches débordent sur le haut du corps
    zIndex: 2,
  },
  dashes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: NOTCH,
  },
  dash: {
    width: 9,
    height: STROKE,
    backgroundColor: PALETTE.ink,
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: PALETTE.paper,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    top: -NOTCH / 2 + STROKE / 2,
  },
  notchLeft: {
    left: -NOTCH / 2 - STROKE,
  },
  notchRight: {
    right: -NOTCH / 2 - STROKE,
  },
  body: {
    flexDirection: 'row',
  },
  stub: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: STROKE,
    borderRightColor: PALETTE.ink,
  },
  stubWeekday: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    lineHeight: 17,
    letterSpacing: 1,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  stubDay: {
    fontFamily: FONTS.varsity,
    fontSize: 48,
    lineHeight: 50,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  stubMonth: {
    fontFamily: FONTS.varsity,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
    marginBottom: 6,
  },
  titleFeatured: {
    fontSize: 21,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  metaText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PALETTE.ink,
    marginLeft: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  capacityTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paper,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRightWidth: 2,
    borderRightColor: PALETTE.ink,
  },
  capacityText: {
    fontFamily: FONTS.varsity,
    fontSize: 17,
    lineHeight: 20,
    color: PALETTE.ink,
    marginLeft: 8,
    includeFontPadding: false,
  },
});

export default EventCard;
