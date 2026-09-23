import React, { useState, useMemo } from 'react';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, accentFor } from '../constants/theme';
import {
  View,
  StyleSheet,
  SectionList,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Text from '../components/ui/AppText';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import EventCard, { PosterFallback, countdownLabel, posterEmoji } from '../components/EventCard';
import { supabase } from '../config/supabase';
import { dateParts, daysUntil, formatTime } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';
import { plural } from '../utils/plural';
import { PopButton, PopCard, PopPressable } from '../components/ui/Pop';
import { Burst, EmptyState, Segmented, SectionTitle, Sticker } from '../components/ui/Deco';
import { ScreenHeader, stackScreenOptions } from '../components/ui/Headers';

const Stack = createNativeStackNavigator();
const COLOR = SECTION_COLORS.Events;

// Configuration de la locale française pour le calendrier
LocaleConfig.locales['fr'] = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';
// La semaine commence le lundi (1 = lundi, 0 = dimanche)
LocaleConfig.locales['fr'].firstDay = 1;

const dayKey = (date) => (date ? String(date).split('T')[0] : '');

/**
 * Écran de liste des événements : « À venir » (le plus proche en premier, mis
 * en avant) puis « Passés » (le plus récent en premier), ou vue calendrier.
 */
function EventsListScreen({ navigation }) {
  const { t, language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState('');

  // Recharge à chaque retour sur l'écran (ex. après une inscription)
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
      loadUserRegistrations();
    }, [])
  );

  const loadEvents = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedEvents = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        image: event.image,
        maxParticipants: event.max_participants,
        currentParticipants: event.current_participants || 0,
        registered: false, // Sera mis à jour par loadUserRegistrations
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      Alert.alert(t('common.error'), t('errors.generic'));
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
    loadEvents(true);
    loadUserRegistrations();
  };

  const loadUserRegistrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const registrationIds = (data || []).map(r => r.event_id);
      setEvents(prevEvents =>
        prevEvents.map(event => ({
          ...event,
          registered: registrationIds.includes(event.id),
        }))
      );
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions:', error);
    }
  };

  const { upcoming, past } = useMemo(() => {
    const up = events.filter((e) => daysUntil(e.date) >= 0);
    const old = events.filter((e) => daysUntil(e.date) < 0).reverse();
    return { upcoming: up, past: old };
  }, [events]);

  const sections = [
    upcoming.length > 0 && { key: 'upcoming', title: t('events.upcoming'), color: PALETTE.sun, data: upcoming },
    past.length > 0 && { key: 'past', title: t('events.past'), color: COLORS.surfaceLight, data: past },
  ].filter(Boolean);

  const openEvent = (item) => navigation.navigate('EventDetails', { event: item });

  // Marqueurs du calendrier : jours avec événement + jour sélectionné
  const markedDates = useMemo(() => {
    const marked = {};
    const dayStyle = (bg) => ({
      customStyles: {
        container: { backgroundColor: bg, borderRadius: 10, borderWidth: 2, borderColor: PALETTE.ink },
        text: { color: PALETTE.ink, fontFamily: FONTS.bodyBold },
      },
    });
    events.forEach((e) => {
      const key = dayKey(e.date);
      if (key) marked[key] = dayStyle(PALETTE.sun);
    });
    if (selectedDate) marked[selectedDate] = dayStyle(COLOR);
    return marked;
  }, [events, selectedDate]);

  const selectedDateEvents = selectedDate ? events.filter((e) => dayKey(e.date) === selectedDate) : [];

  const header = (
    <ScreenHeader
      title={t('events.title').toUpperCase()}
      subtitle={plural(t, language, upcoming.length, 'events.countOne', 'events.upcomingCount')}
      color={COLOR}
    >
      <Segmented
        style={{ marginTop: 12 }}
        value={viewMode}
        onChange={setViewMode}
        options={[
          { key: 'list', label: t('events.list'), icon: 'list' },
          { key: 'calendar', label: t('events.calendar'), icon: 'calendar' },
        ]}
      />
    </ScreenHeader>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={PALETTE.ink} />
        </View>
      </View>
    );
  }

  if (viewMode === 'calendar') {
    const calendarEvents = selectedDate ? selectedDateEvents : upcoming.slice(0, 3);
    return (
      <View style={styles.container}>
        {header}
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <PopCard containerStyle={{ marginBottom: 22 }} style={{ paddingBottom: 6 }}>
            <Calendar
              firstDay={1}
              markingType="custom"
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate((prev) => (prev === day.dateString ? '' : day.dateString))}
              enableSwipeMonths
              renderArrow={(direction) => (
                <View style={styles.calendarArrow}>
                  <Ionicons name={direction === 'left' ? 'arrow-back' : 'arrow-forward'} size={18} color={PALETTE.ink} />
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

          <SectionTitle
            title={
              selectedDate
                ? t('events.eventsOnDate', {
                    date: `${dateParts(selectedDate, language).day} ${dateParts(selectedDate, language).month}`,
                  })
                : t('events.nextEvents')
            }
            count={calendarEvents.length}
            color={selectedDate ? COLOR : PALETTE.sun}
          />
          {calendarEvents.length === 0 ? (
            <EmptyState emoji="🗓️" title={t('events.noEventsThatDay')} color={PALETTE.sun} />
          ) : (
            calendarEvents.map((item) => (
              <EventCard key={item.id} event={item} onPress={() => openEvent(item)} />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, section, index }) => (
          <EventCard
            event={item}
            featured={section.key === 'upcoming' && index === 0}
            onPress={() => openEvent(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <SectionTitle title={section.title} count={section.data.length} color={section.color} style={styles.sectionHeader} />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState
            emoji="🎟️"
            title={t('events.emptyTitle')}
            message={t('events.emptyMessage')}
            color={COLOR}
          />
        }
      />
    </View>
  );
}

/**
 * Détail d'un événement : grande affiche, infos en cartes, bouton
 * d'inscription toujours visible en bas.
 */
function EventDetailsScreen({ route }) {
  const { t, language } = useLanguage();
  const { width } = useWindowDimensions();
  const { event } = route.params;
  const [isRegistered, setIsRegistered] = useState(event.registered);
  // État local pour que le compteur se mette à jour immédiatement
  const [currentParticipants, setCurrentParticipants] = useState(event.currentParticipants);
  const [submitting, setSubmitting] = useState(false);

  const days = daysUntil(event.date);
  const isPast = days < 0;
  const isFull = event.maxParticipants > 0 && currentParticipants >= event.maxParticipants;
  const parts = dateParts(event.date, language);
  const accent = accentFor(event.id);
  const fill = event.maxParticipants > 0 ? Math.min(1, currentParticipants / event.maxParticipants) : 0;

  const images = (() => {
    if (!event.image) return [];
    try {
      const parsed = JSON.parse(event.image);
      return Array.isArray(parsed) ? parsed : [event.image];
    } catch {
      return [event.image];
    }
  })();

  const openMaps = () => {
    if (!event.location) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`);
  };

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('common.error'), t('events.loginRequired'));
        return;
      }

      const eventId = event.id;

      if (isRegistered) {
        // Désinscription
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        await supabase
          .from('events')
          .update({ current_participants: Math.max(0, currentParticipants - 1) })
          .eq('id', eventId);

        setIsRegistered(false);
        setCurrentParticipants(prev => Math.max(0, prev - 1));
        Alert.alert(t('common.success'), t('events.unregisterSuccess'));
      } else {
        // Inscription
        if (currentParticipants >= event.maxParticipants) {
          Alert.alert(t('events.full'), t('events.eventFull'));
          return;
        }

        const { error } = await supabase
          .from('event_registrations')
          .insert([{ event_id: eventId, user_id: user.id }]);

        if (error) throw error;

        await supabase
          .from('events')
          .update({ current_participants: currentParticipants + 1 })
          .eq('id', eventId);

        setIsRegistered(true);
        setCurrentParticipants(prev => prev + 1);
        Alert.alert(t('common.success'), t('events.registerSuccess'));
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      Alert.alert(t('common.error'), t('events.registerError'));
    } finally {
      setSubmitting(false);
    }
  };

  let action = { title: t('events.registerCta'), variant: 'primary', icon: 'ticket', disabled: false };
  if (isPast) action = { title: t('events.endedCta'), variant: 'light', icon: 'time', disabled: true };
  else if (isRegistered) action = { title: t('events.unregister'), variant: 'light', icon: 'close', disabled: false };
  else if (isFull) action = { title: t('events.full'), variant: 'light', icon: 'sad', disabled: true };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          {images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
              ))}
            </ScrollView>
          ) : (
            <PosterFallback color={accent} emoji={posterEmoji(event.title)} height={240} />
          )}
          {images.length > 1 ? (
            <Sticker
              label={`${images.length} photos`}
              icon="images"
              color={PALETTE.white}
              rotate={0}
              small
              style={styles.photoCount}
            />
          ) : null}
          {!isPast ? (
            <Burst label={countdownLabel(days, t).label} size={88} color={PALETTE.bubblegum} style={styles.heroBurst} />
          ) : (
            <Sticker label={t('events.pastBadge')} color={PALETTE.ink} textColor={PALETTE.paper} rotate={6} style={styles.heroBurst} />
          )}
        </View>

        <View style={styles.detailsContent}>
          {isRegistered ? (
            <Sticker label={t('events.registered')} icon="checkmark" color={PALETTE.lime} rotate={-3} style={{ marginBottom: 10 }} />
          ) : null}
          <Text style={styles.detailTitle}>{event.title}</Text>

          <PopCard containerStyle={styles.cardSpacing} style={styles.whenCard}>
            <View style={[styles.detailStub, { backgroundColor: accent }]}>
              <Text style={styles.detailStubWeekday}>{parts.weekday}</Text>
              <Text style={styles.detailStubDay}>{parts.day}</Text>
              <Text style={styles.detailStubMonth}>{parts.month}</Text>
            </View>
            <View style={styles.whenInfo}>
              <Text style={styles.whenLong}>{parts.long}</Text>
              {event.time ? (
                <View style={styles.infoLine}>
                  <Ionicons name="time" size={18} color={PALETTE.ink} />
                  <Text style={styles.infoLineText}>{formatTime(event.time, language)}</Text>
                </View>
              ) : null}
            </View>
          </PopCard>

          {event.location ? (
            <PopPressable onPress={openMaps} containerStyle={styles.cardSpacing} style={styles.placeCard}>
              <View style={[styles.iconSquare, { backgroundColor: PALETTE.mint }]}>
                <Ionicons name="location" size={22} color={PALETTE.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{t('events.location')}</Text>
                <Text style={styles.cardValue}>{event.location}</Text>
              </View>
              <Ionicons name="navigate" size={20} color={PALETTE.ink} />
            </PopPressable>
          ) : null}

          <PopCard containerStyle={styles.cardSpacing} style={styles.capacityCard}>
            <View style={styles.capacityHeader}>
              <Text style={styles.cardLabel}>{t('events.participantsTitle')}</Text>
              <Text style={styles.capacityBig}>
                {currentParticipants}
                <Text style={styles.capacityMax}>/{event.maxParticipants}</Text>
              </Text>
            </View>
            <View style={styles.bigTrack}>
              <View style={[styles.bigFill, { width: `${fill * 100}%`, backgroundColor: accent }]} />
            </View>
          </PopCard>

          {event.description ? (
            <>
              <SectionTitle title={t('events.description')} style={{ marginTop: 8 }} />
              <Text style={styles.description}>{event.description}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        <PopButton
          title={action.title}
          icon={action.icon}
          variant={action.variant}
          disabled={action.disabled}
          loading={submitting}
          onPress={handleRegister}
        />
      </View>
    </View>
  );
}

/**
 * Navigation pour les événements
 */
export default function EventsScreen() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(COLOR)}>
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={{ title: t('events.title'), headerShown: false }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{ title: t('events.eventDetailsTitle') }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    marginTop: 4,
  },
  calendarArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    borderBottomWidth: 2.5,
    borderBottomColor: PALETTE.ink,
  },
  heroImage: {
    height: 260,
    resizeMode: 'cover',
    backgroundColor: PALETTE.paperDeep,
  },
  heroBurst: {
    position: 'absolute',
    right: 14,
    bottom: -30,
  },
  photoCount: {
    position: 'absolute',
    left: 14,
    bottom: 14,
  },
  detailsContent: {
    padding: 16,
    paddingTop: 20,
  },
  detailTitle: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 36,
    color: PALETTE.ink,
    marginBottom: 18,
    paddingRight: 70,
  },
  cardSpacing: {
    marginBottom: 14,
  },
  whenCard: {
    flexDirection: 'row',
  },
  detailStub: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: 2.5,
    borderRightColor: PALETTE.ink,
  },
  detailStubWeekday: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    lineHeight: 17,
    letterSpacing: 1,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  detailStubDay: {
    fontFamily: FONTS.varsity,
    fontSize: 50,
    lineHeight: 52,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  detailStubMonth: {
    fontFamily: FONTS.varsity,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  whenInfo: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  whenLong: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: PALETTE.ink,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLineText: {
    fontFamily: FONTS.varsity,
    fontSize: 24,
    lineHeight: 28,
    color: PALETTE.ink,
    marginLeft: 6,
    includeFontPadding: false,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.inkSoft,
  },
  cardValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: PALETTE.ink,
  },
  capacityCard: {
    padding: 14,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  capacityBig: {
    fontFamily: FONTS.varsity,
    fontSize: 34,
    lineHeight: 36,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  capacityMax: {
    fontFamily: FONTS.varsity,
    fontSize: 20,
    color: PALETTE.inkSoft,
  },
  bigTrack: {
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paper,
    overflow: 'hidden',
  },
  bigFill: {
    height: '100%',
    borderRightWidth: 2.5,
    borderRightColor: PALETTE.ink,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: PALETTE.ink,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: PALETTE.paper,
    borderTopWidth: 2.5,
    borderTopColor: PALETTE.ink,
  },
});
