import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, isPastDate } from '../utils/dateUtils';
import { COLORS, SHADOWS, RADIUS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import PressableScale from './PressableScale';

/**
 * Composant Card pour afficher un sondage
 * @param {Object} poll - Objet sondage
 * @param {Function} onPress - Fonction appelée au clic
 */
const PollCard = ({ poll, onPress }) => {
  const { t } = useLanguage();
  const isPast = isPastDate(poll.endDate);
  const hasVoted = poll.userVote !== null;

  return (
    <PressableScale style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.question}>{poll.question}</Text>
        {hasVoted && (
          <View style={styles.votedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.votedText}>{t('polls.voted')}</Text>
          </View>
        )}
      </View>

      <View style={styles.options}>
        {poll.options.map((option, index) => {
          const percentage = poll.totalVotes > 0
            ? Math.round((option.votes / poll.totalVotes) * 100)
            : 0;

          return (
            <View key={option.id} style={styles.option}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionText}>{option.text}</Text>
                <Text style={styles.percentage}>{percentage}%</Text>
              </View>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.votesCount}>{option.votes} vote{option.votes > 1 ? 's' : ''}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.footerText}>{poll.totalVotes} vote{poll.totalVotes > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={[styles.footerText, isPast && styles.pastDate]}>
            {isPast
              ? t('polls.ended')
              : poll.endDate
                ? `${t('polls.endDate')} ${formatDate(poll.endDate)}`
                : t('polls.noEndDate')
            }
          </Text>
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.m,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  votedText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  options: {
    marginBottom: 12,
  },
  option: {
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  votesCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
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
    marginLeft: 4,
  },
  pastDate: {
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});

export default PollCard;
