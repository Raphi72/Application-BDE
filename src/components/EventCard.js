import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime, daysUntil } from '../utils/dateUtils';
import { COLORS, SHADOWS } from '../constants/theme';

/**
 * Composant Card pour afficher un événement
 * @param {Object} event - Objet événement
 * @param {Function} onPress - Fonction appelée au clic
 */
const EventCard = ({ event, onPress }) => {
  const days = daysUntil(event.date);
  const isPast = days < 0;
  const isToday = days === 0;

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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image source={getImageSource(event.image)} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{event.title}</Text>
          {event.registered && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.badgeText}>Inscrit</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {formatDateTime(event.date, event.time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.participants}>
            <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.participantsText}>
              {event.currentParticipants}/{event.maxParticipants} participants
            </Text>
          </View>

          {!isPast && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {isToday ? "Aujourd'hui" : `Dans ${days} jour${days > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
    opacity: 0.9, // Slightly dim the image for better vibe
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  badgeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  dateBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'normal',
  },
});

export default EventCard;
