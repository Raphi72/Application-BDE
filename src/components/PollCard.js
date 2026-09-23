import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './ui/AppText';
import { PopButton, PopCard, PopPressable } from './ui/Pop';
import { Sticker } from './ui/Deco';
import { dateParts, isPastDate } from '../utils/dateUtils';
import { FONTS, PALETTE, SECTION_COLORS, STROKE } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

const LETTERS = 'ABCDEFGHIJ';

/**
 * Carte sondage avec vote directement dans la liste : tant que l'utilisateur
 * n'a pas voté (et que le sondage est ouvert), les options sont des boutons à
 * sélectionner puis valider ; ensuite (ou une fois clos) on affiche les
 * résultats en barres épaisses.
 * @param {Object} poll - Objet sondage
 * @param {Function} onVote - (poll, optionId) => Promise, enregistre le vote
 */
const PollCard = ({ poll, onVote }) => {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isPast = isPastDate(poll.endDate);
  const hasVoted = !!poll.userVote;
  const canVote = !hasVoted && !isPast;
  const leaderVotes = Math.max(0, ...poll.options.map((o) => o.votes));

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onVote(poll, selected);
    } finally {
      setSubmitting(false);
    }
  };

  let status = { label: t('polls.active'), color: PALETTE.lime, textColor: PALETTE.ink };
  if (isPast) status = { label: t('polls.endedBadge'), color: PALETTE.ink, textColor: PALETTE.paper };
  else if (hasVoted) status = { label: t('polls.voted'), color: PALETTE.sun, textColor: PALETTE.ink };

  const deadline = poll.endDate
    ? `${t('polls.endDate')} ${dateParts(poll.endDate, language).day} ${dateParts(poll.endDate, language).month}`
    : t('polls.noEndDate');

  return (
    <PopCard radius={22} containerStyle={styles.container}>
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Sticker label={status.label} color={status.color} textColor={status.textColor} rotate={-3} small />
          <View style={styles.deadline}>
            <Ionicons name="time" size={14} color={PALETTE.ink} />
            <Text style={styles.deadlineText}>{deadline}</Text>
          </View>
        </View>
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      <View style={styles.body}>
        {canVote ? (
          <>
            <Text style={styles.hint}>{t('polls.pickOne')}</Text>
            {poll.options.map((option, index) => {
              const isSelected = selected === option.id;
              return (
                <PopPressable
                  key={option.id}
                  onPress={() => setSelected(option.id)}
                  color={isSelected ? PALETTE.sun : PALETTE.white}
                  radius={14}
                  offset={{ x: 3, y: 3 }}
                  containerStyle={styles.optionSpacing}
                  style={styles.option}
                  accessibilityLabel={option.text}
                >
                  <View style={[styles.letter, isSelected && styles.letterSelected]}>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={PALETTE.paper} />
                    ) : (
                      <Text style={styles.letterText}>{LETTERS[index]}</Text>
                    )}
                  </View>
                  <Text style={styles.optionText}>{option.text}</Text>
                </PopPressable>
              );
            })}
            <PopButton
              title={t('polls.voteCta')}
              icon="checkmark-done"
              variant="periwinkle"
              disabled={!selected}
              loading={submitting}
              onPress={submit}
              containerStyle={{ marginTop: 6 }}
            />
          </>
        ) : (
          poll.options.map((option) => {
            const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
            const isMine = poll.userVote === option.id;
            const isLeader = option.votes > 0 && option.votes === leaderVotes;
            return (
              <View key={option.id} style={styles.result}>
                <View style={styles.resultHead}>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {option.text}
                  </Text>
                  {isMine ? <Sticker label={t('polls.yourVote')} color={PALETTE.lime} rotate={3} small /> : null}
                  <Text style={styles.percentage}>{percentage}%</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${percentage}%`, backgroundColor: isLeader ? SECTION_COLORS.Polls : PALETTE.paperDeep },
                      percentage === 0 && { borderRightWidth: 0 },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}

        <View style={styles.footer}>
          <Ionicons name="people" size={16} color={PALETTE.ink} />
          <Text style={styles.footerText}>
            {poll.totalVotes} {t('polls.votes')}
          </Text>
        </View>
      </View>
    </PopCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 22,
  },
  head: {
    backgroundColor: SECTION_COLORS.Polls,
    padding: 14,
    borderBottomWidth: STROKE,
    borderBottomColor: PALETTE.ink,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginLeft: 4,
  },
  question: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 25,
    color: PALETTE.ink,
  },
  body: {
    padding: 14,
  },
  hint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PALETTE.inkSoft,
    marginBottom: 10,
  },
  optionSpacing: {
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: PALETTE.paper,
  },
  letterSelected: {
    backgroundColor: PALETTE.ink,
  },
  letterText: {
    fontFamily: FONTS.varsity,
    fontSize: 18,
    lineHeight: 21,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  optionText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PALETTE.ink,
  },
  result: {
    marginBottom: 14,
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  resultText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: PALETTE.ink,
  },
  percentage: {
    fontFamily: FONTS.varsity,
    fontSize: 24,
    lineHeight: 27,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  track: {
    height: 22,
    borderRadius: 11,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRightWidth: STROKE,
    borderRightColor: PALETTE.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginLeft: 6,
  },
});

export default PollCard;
