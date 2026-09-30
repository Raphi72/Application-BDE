import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/ui/AppText';
import { supabase } from '../../config/supabase';
import { PopButton, PopPressable } from '../../components/ui/Pop';
import { EmptyState, Sticker } from '../../components/ui/Deco';
import { FONTS, PALETTE, SECTION_COLORS, STROKE } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';
import { dateParts, isPastDate } from '../../utils/dateUtils';
import { confirmAction, showMessage } from '../../utils/dialogs';
import {
  AdminFormModal,
  AdminItemActions,
  AdminListHeader,
  FormField,
  FormSection,
  dayOnly,
  isValidDate,
  useAdminForm,
} from './AdminKit';

const COLOR = SECTION_COLORS.Polls;
const LETTERS = 'ABCDEFGHIJ';
const MIN_OPTION_FIELDS = 4;

const EMPTY_FORM = {
  question: '',
  options: ['', '', '', ''],
  endDate: '',
};

// Au moins MIN_OPTION_FIELDS champs d'option, même si le sondage en a moins.
const formFromPoll = (poll) => {
  const options = Array.isArray(poll.options) ? poll.options : [];
  return {
    question: poll.question ?? '',
    options: [...options, ...Array(Math.max(0, MIN_OPTION_FIELDS - options.length)).fill('')],
    endDate: dayOnly(poll.end_date),
  };
};

/**
 * Aperçu d'un sondage dans la liste admin : bandeau pervenche (statut,
 * échéance, question) puis ses options lettrées.
 */
function AdminPollCard({ poll, onPress }) {
  const { t, language } = useLanguage();
  const isPast = isPastDate(poll.end_date);
  const options = Array.isArray(poll.options) ? poll.options : [];
  const end = poll.end_date ? dateParts(poll.end_date, language) : null;

  return (
    <PopPressable onPress={onPress} radius={22} containerStyle={styles.card} accessibilityLabel={poll.question}>
      <View style={styles.head}>
        <View style={styles.headRow}>
          <Sticker
            label={isPast ? t('polls.endedBadge') : t('polls.active')}
            color={isPast ? PALETTE.ink : PALETTE.lime}
            textColor={isPast ? PALETTE.paper : PALETTE.ink}
            rotate={-3}
            small
          />
          <View style={styles.deadline}>
            <Ionicons name="time" size={14} color={PALETTE.ink} />
            <Text style={styles.deadlineText}>
              {end ? `${t('polls.endDate')} ${end.day} ${end.month}` : t('polls.noEndDate')}
            </Text>
          </View>
        </View>
        <Text style={styles.question}>{poll.question}</Text>
      </View>
      <View style={styles.body}>
        {options.map((option, index) => (
          <View key={`${index}-${option}`} style={styles.optionRow}>
            <View style={styles.letter}>
              <Text style={styles.letterText}>{LETTERS[index]}</Text>
            </View>
            <Text style={styles.optionText} numberOfLines={2}>
              {option}
            </Text>
          </View>
        ))}
      </View>
    </PopPressable>
  );
}

/**
 * Écran admin pour gérer les sondages
 */
export default function AdminPollsScreen() {
  const { t } = useLanguage();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { visible, editing, form, setField, open, close, requestClose } = useAdminForm(EMPTY_FORM);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error) {
      console.error('Erreur chargement sondages:', error);
      showMessage(t('common.error'), t('admin.loadError'));
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPolls(true);
  };

  const openModal = (poll = null) => open(poll, poll ? formFromPoll(poll) : EMPTY_FORM);

  const updateOption = (index, text) => {
    setField('options', (prev) => prev.map((option, i) => (i === index ? text : option)));
  };

  const addOption = () => setField('options', (prev) => [...prev, '']);

  const handleSave = async () => {
    const question = form.question.trim();
    const options = form.options.map((option) => option.trim()).filter(Boolean);
    const endDate = form.endDate.trim();

    if (!question || options.length < 2) {
      showMessage(t('common.error'), t('admin.pollRequired'));
      return;
    }
    if (endDate && !isValidDate(endDate)) {
      showMessage(t('common.error'), t('admin.invalidDate'));
      return;
    }

    setSaving(true);
    try {
      const pollData = {
        question,
        options,
        end_date: endDate || null,
      };

      if (editing) {
        const { error } = await supabase
          .from('polls')
          .update(pollData)
          .eq('id', editing.id);

        if (error) throw error;
        showMessage(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('polls')
          .insert([pollData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewPoll(question);

        showMessage(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      close();
      loadPolls();
    } catch (error) {
      showMessage(t('common.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (poll) => {
    const confirmed = await confirmAction({
      title: t('admin.deleteConfirm'),
      message: t('admin.deletePollConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', poll.id);

      if (error) throw error;
      loadPolls();
    } catch (error) {
      showMessage(t('common.error'), t('admin.deleteError'));
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={polls}
        renderItem={({ item }) => (
          <View>
            <AdminPollCard poll={item} onPress={() => openModal(item)} />
            <AdminItemActions onEdit={() => openModal(item)} onDelete={() => handleDelete(item)} />
          </View>
        )}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <AdminListHeader
            actionLabel={t('admin.newPoll')}
            onAction={() => openModal()}
            color={COLOR}
            title={t('navigation.polls')}
            count={loading ? null : polls.length}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={PALETTE.ink} style={styles.loader} />
          ) : (
            <EmptyState emoji="📊" title={t('admin.emptyPolls')} message={t('admin.emptyHint')} color={COLOR} />
          )
        }
      />

      <AdminFormModal
        visible={visible}
        title={editing ? t('admin.editPoll') : t('admin.newPoll')}
        color={COLOR}
        onClose={requestClose}
        footer={
          <PopButton
            title={editing ? t('common.update') : t('common.create')}
            icon="checkmark"
            color={COLOR}
            loading={saving}
            onPress={handleSave}
          />
        }
      >
        <FormSection title={t('form.question')}>
          <FormField
            multiline
            value={form.question}
            onChangeText={(value) => setField('question', value)}
            placeholder={t('admin.pollQuestionPlaceholder')}
            style={styles.questionInput}
          />
        </FormSection>

        <FormSection title={t('form.options')} style={styles.optionsSection}>
          <Text style={styles.sectionHint}>{t('form.minOptions')}</Text>
          {form.options.map((option, index) => (
            <View key={index} style={styles.optionInputRow}>
              <View style={styles.letter}>
                <Text style={styles.letterText}>{LETTERS[index]}</Text>
              </View>
              <FormField
                value={option}
                onChangeText={(value) => updateOption(index, value)}
                placeholder={`${t('form.option')} ${index + 1}`}
                containerStyle={styles.optionField}
              />
            </View>
          ))}
          {form.options.length < LETTERS.length ? (
            <PopButton
              compact
              variant="light"
              icon="add"
              title={t('admin.addOption')}
              onPress={addOption}
              containerStyle={styles.addOption}
            />
          ) : null}
        </FormSection>

        <FormSection title={t('form.endDate')}>
          <FormField
            hint={t('form.endDateHint')}
            value={form.endDate}
            onChangeText={(value) => setField('endDate', value)}
            placeholder={t('form.dateFormat')}
            keyboardType="numbers-and-punctuation"
          />
        </FormSection>
      </AdminFormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.paper,
  },
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    marginBottom: 12,
  },
  head: {
    backgroundColor: COLOR,
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
    paddingBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 15,
    color: PALETTE.ink,
  },
  questionInput: {
    minHeight: 90,
  },
  optionsSection: {
    paddingBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: PALETTE.inkSoft,
    marginTop: -6,
    marginBottom: 12,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionField: {
    flex: 1,
    marginBottom: 0,
  },
  addOption: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
});
