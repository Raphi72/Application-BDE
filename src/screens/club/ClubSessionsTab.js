import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, PopCard } from '../../components/ui/Pop';
import { EmptyState, Sticker } from '../../components/ui/Deco';
import { Sheet } from '../../components/ui/Sheet';
import { formStyles } from '../../components/clubUi';
import { useLanguage } from '../../context/LanguageContext';
import { dateParts, formatTime } from '../../utils/dateUtils';
import { confirmAction, showMessage } from '../../utils/dialogs';
import {
  clubErrorMessage,
  createClubSession,
  deleteClubSession,
  fetchClubSessions,
  respondClubSession,
  updateClubSession,
} from '../../services/clubService';
import { COLORS, FONTS, PALETTE, SECTION_COLORS } from '../../constants/theme';

const sessionStamp = (session) =>
  new Date(`${session.session_date}T${String(session.session_time).slice(0, 8)}`);

const isValidDateTime = (date, time) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return false;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const parsed = new Date(year, month - 1, day, hour, minute);
  return (
    parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
    && parsed.getHours() === hour
    && parsed.getMinutes() === minute
  );
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

/**
 * Rendez-vous proposés par le bureau. Les membres peuvent uniquement consulter
 * les informations et indiquer s'ils participent.
 */
export default function ClubSessionsTab({
  clubId,
  perms,
  header,
  userId,
  onCoreChange,
}) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editor, setEditor] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setSessions(await fetchClubSessions(clubId));
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedSessions = useMemo(() => {
    const now = new Date();
    const upcoming = sessions.filter((session) => sessionStamp(session) >= now);
    const past = sessions.filter((session) => sessionStamp(session) < now).reverse();
    return [...upcoming, ...past];
  }, [sessions]);

  const answer = async (sessionId, response) => {
    setRespondingId(sessionId);
    try {
      await respondClubSession(sessionId, response);
      await load();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setRespondingId(null);
    }
  };

  const listHeader = (
    <View>
      {header}
      {perms.canManageContent ? (
        <PopButton
          title={t('clubSpace.sessions.new')}
          icon="calendar"
          onPress={() => setEditor({})}
          containerStyle={{ marginBottom: 20 }}
        />
      ) : null}
    </View>
  );
  let emptyMessage = null;
  if (!loadError) {
    const key = perms.canManageContent
      ? 'clubSpace.sessions.emptyManager'
      : 'clubSpace.sessions.emptyMember';
    emptyMessage = t(key);
  }

  const renderSession = ({ item }) => {
    const parts = dateParts(item.session_date, language);
    const responses = item.responses || [];
    const mine = responses.find((response) => response.user_id === userId)?.response;
    const going = responses.filter((response) => response.response === 'going').length;
    const isPast = sessionStamp(item) < new Date();

    return (
      <PopCard
        containerStyle={{ marginBottom: 16 }}
        style={styles.card}
      >
        <View style={styles.cardHead}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateDay}>{parts.day}</Text>
            <Text style={styles.dateMonth}>{parts.month}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {perms.canManageContent ? (
                <Pressable
                  onPress={() => setEditor({ session: item })}
                  accessibilityRole="button"
                  accessibilityLabel={t('clubSpace.sessions.edit')}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={22} color={PALETTE.ink} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={PALETTE.ink} />
              <Text style={styles.infoText}>{formatTime(item.session_time, language)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={PALETTE.ink} />
              <Text style={styles.infoText}>{item.location}</Text>
            </View>
          </View>
        </View>

        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        <View style={styles.responseSummary}>
          <Sticker
            label={
              isPast
                ? t('clubSpace.sessions.past')
                : t('clubSpace.sessions.goingCount', { count: going })
            }
            icon={isPast ? 'time' : 'people'}
            color={isPast ? PALETTE.paperDeep : PALETTE.lime}
            rotate={-2}
            small
          />
          {mine ? (
            <Text style={styles.myResponse}>
              {mine === 'going'
                ? t('clubSpace.sessions.youAreGoing')
                : t('clubSpace.sessions.youAreNotGoing')}
            </Text>
          ) : null}
        </View>

        {!isPast && perms.isMember ? (
          <View style={styles.responseActions}>
            <PopButton
              title={t('clubSpace.sessions.going')}
              icon="checkmark"
              variant={mine === 'going' ? 'success' : 'light'}
              compact
              onPress={() => answer(item.id, 'going')}
              loading={respondingId === item.id && mine !== 'going'}
              disabled={respondingId !== null}
              containerStyle={{ flex: 1 }}
            />
            <PopButton
              title={t('clubSpace.sessions.notGoing')}
              icon="close"
              variant={mine === 'not_going' ? 'danger' : 'light'}
              compact
              onPress={() => answer(item.id, 'not_going')}
              loading={respondingId === item.id && mine !== 'not_going'}
              disabled={respondingId !== null}
              containerStyle={{ flex: 1 }}
            />
          </View>
        ) : null}
      </PopCard>
    );
  };

  return (
    <>
      <FlatList
        data={orderedSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={PALETTE.ink} style={{ marginTop: 30 }} />
          ) : (
            <EmptyState
              emoji="🗓️"
              title={
                loadError
                  ? clubErrorMessage(loadError, t)
                  : t('clubSpace.sessions.emptyTitle')
              }
              message={emptyMessage}
              color={SECTION_COLORS.Clubs}
            />
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
          void onCoreChange();
        }}
      />

      <SessionSheet
        visible={editor !== null}
        session={editor?.session}
        clubId={clubId}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          void load();
        }}
      />
    </>
  );
}

function SessionSheet({ visible, session, clubId, onClose, onSaved }) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [openPicker, setOpenPicker] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(session?.title ?? '');
    setDescription(session?.description ?? '');
    setDate(session?.session_date ?? '');
    setTime(session?.session_time ? String(session.session_time).slice(0, 5) : '');
    setLocation(session?.location ?? '');
    setOpenPicker(null);
  }, [visible, session]);

  const selectedHour = time ? time.slice(0, 2) : '18';
  const selectedMinute = time ? time.slice(3, 5) : '00';
  const setTimePart = (hour, minute) => setTime(`${hour}:${minute}`);

  const toggleTimePicker = () => {
    if (!time) setTime('18:00');
    setOpenPicker((current) => (current === 'time' ? null : 'time'));
  };

  const save = async () => {
    if (!title.trim() || !location.trim() || !date.trim() || !time.trim()) {
      showMessage(t('common.error'), t('admin.requiredFields'));
      return;
    }
    if (!isValidDateTime(date, time)) {
      showMessage(t('common.error'), t('clubSpace.sessions.invalidDate'));
      return;
    }

    setSaving(true);
    try {
      const fields = { title, description, date, time, location };
      if (session) await updateClubSession(session.id, fields);
      else await createClubSession(clubId, fields);
      onSaved();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirmAction({
      title: t('common.delete'),
      message: t('clubSpace.sessions.deleteConfirm', { title: session.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteClubSession(session.id);
      onSaved();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        session
          ? t('clubSpace.sessions.edit')
          : t('clubSpace.sessions.new')
      }
      closeLabel={t('common.close')}
    >
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.sessions.title')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('clubSpace.sessions.titlePlaceholder')}
          placeholderTextColor={PALETTE.inkSoft}
          maxLength={120}
          style={formStyles.input}
        />
      </View>
      <View style={styles.formRow}>
        <View style={[formStyles.field, styles.formHalf]}>
          <Text style={formStyles.label}>{t('clubSpace.sessions.date')}</Text>
          <Pressable
            onPress={() => setOpenPicker((current) => (current === 'date' ? null : 'date'))}
            style={({ pressed }) => [
              formStyles.input,
              styles.pickerField,
              pressed && styles.pickerFieldPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('clubSpace.sessions.chooseDate')}
            accessibilityState={{ expanded: openPicker === 'date' }}
          >
            <Text
              style={[styles.pickerValue, !date && styles.pickerPlaceholder]}
              numberOfLines={1}
            >
              {date ? date.split('-').reverse().join('/') : t('clubSpace.sessions.choose')}
            </Text>
            <Ionicons name="calendar-outline" size={22} color={PALETTE.ink} />
          </Pressable>
        </View>
        <View style={[formStyles.field, styles.formHalf]}>
          <Text style={formStyles.label}>{t('clubSpace.sessions.time')}</Text>
          <Pressable
            onPress={toggleTimePicker}
            style={({ pressed }) => [
              formStyles.input,
              styles.pickerField,
              pressed && styles.pickerFieldPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('clubSpace.sessions.chooseTime')}
            accessibilityState={{ expanded: openPicker === 'time' }}
          >
            <Text style={[styles.pickerValue, !time && styles.pickerPlaceholder]}>
              {time ? formatTime(time, language) : t('clubSpace.sessions.choose')}
            </Text>
            <Ionicons name="time-outline" size={22} color={PALETTE.ink} />
          </Pressable>
        </View>
      </View>

      {openPicker === 'date' ? (
        <PopCard containerStyle={styles.pickerCardContainer} style={styles.pickerCard}>
          <Calendar
            current={date || undefined}
            firstDay={1}
            enableSwipeMonths
            markingType="custom"
            markedDates={
              date
                ? {
                    [date]: {
                      customStyles: {
                        container: styles.selectedDay,
                        text: styles.selectedDayText,
                      },
                    },
                  }
                : {}
            }
            onDayPress={(day) => {
              setDate(day.dateString);
              setOpenPicker(null);
            }}
            renderArrow={(direction) => (
              <View style={styles.calendarArrow}>
                <Ionicons
                  name={direction === 'left' ? 'arrow-back' : 'arrow-forward'}
                  size={18}
                  color={PALETTE.ink}
                />
              </View>
            )}
            theme={{
              calendarBackground: PALETTE.white,
              textSectionTitleColor: PALETTE.inkSoft,
              dayTextColor: PALETTE.ink,
              todayTextColor: COLORS.primaryText,
              textDisabledColor: '#C9BBA7',
              monthTextColor: PALETTE.ink,
              textDayFontFamily: FONTS.bodySemiBold,
              textMonthFontFamily: FONTS.display,
              textDayHeaderFontFamily: FONTS.varsityBold,
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 15,
            }}
          />
        </PopCard>
      ) : null}

      {openPicker === 'time' ? (
        <PopCard containerStyle={styles.pickerCardContainer} style={styles.timePicker}>
          <Text style={styles.pickerSectionTitle}>{t('clubSpace.sessions.hours')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {HOURS.map((hour) => (
              <TimeChip
                key={hour}
                label={hour}
                selected={selectedHour === hour}
                onPress={() => setTimePart(hour, selectedMinute)}
              />
            ))}
          </ScrollView>
          <Text style={styles.pickerSectionTitle}>{t('clubSpace.sessions.minutes')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {MINUTES.map((minute) => (
              <TimeChip
                key={minute}
                label={minute}
                selected={selectedMinute === minute}
                onPress={() => setTimePart(selectedHour, minute)}
              />
            ))}
          </ScrollView>
          <PopButton
            title={t('common.confirm')}
            icon="checkmark"
            compact
            onPress={() => setOpenPicker(null)}
            containerStyle={styles.confirmTime}
          />
        </PopCard>
      ) : null}

      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.sessions.location')}</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder={t('clubSpace.sessions.locationPlaceholder')}
          placeholderTextColor={PALETTE.inkSoft}
          maxLength={200}
          style={formStyles.input}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.sessions.description')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('clubSpace.sessions.descriptionPlaceholder')}
          placeholderTextColor={PALETTE.inkSoft}
          multiline
          maxLength={2000}
          style={[formStyles.input, formStyles.textArea]}
        />
      </View>

      <PopButton
        title={t('common.save')}
        icon="checkmark"
        onPress={save}
        loading={saving}
      />
      {session ? (
        <Pressable
          onPress={remove}
          disabled={saving}
          style={styles.deleteLink}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteText}>{t('common.delete')}</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

function TimeChip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.timeChip, selected && styles.timeChipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={styles.timeChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
  },
  cardHead: {
    flexDirection: 'row',
    gap: 12,
  },
  dateBlock: {
    width: 62,
    minHeight: 66,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    borderRadius: 14,
    backgroundColor: PALETTE.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontFamily: FONTS.varsity,
    fontSize: 34,
    lineHeight: 34,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  dateMonth: {
    fontFamily: FONTS.varsityBold,
    fontSize: 14,
    lineHeight: 16,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PALETTE.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
    marginTop: 12,
  },
  responseSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  myResponse: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    textAlign: 'right',
    color: PALETTE.inkSoft,
  },
  responseActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formHalf: {
    flex: 1,
  },
  pickerField: {
    minHeight: 50,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerFieldPressed: {
    backgroundColor: PALETTE.paperDeep,
  },
  pickerValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: PALETTE.ink,
  },
  pickerPlaceholder: {
    color: PALETTE.inkSoft,
  },
  pickerCardContainer: {
    marginBottom: 20,
  },
  pickerCard: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  selectedDay: {
    backgroundColor: PALETTE.lime,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    borderRadius: 10,
  },
  selectedDayText: {
    color: PALETTE.ink,
    fontFamily: FONTS.bodyBold,
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePicker: {
    padding: 14,
  },
  pickerSectionTitle: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 14,
  },
  timeChip: {
    minWidth: 48,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipSelected: {
    backgroundColor: PALETTE.lime,
  },
  timeChipText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 18,
    color: PALETTE.ink,
  },
  confirmTime: {
    marginTop: 2,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  deleteText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
});
