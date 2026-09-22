import React, { useState, useEffect, useLayoutEffect } from 'react';
import { COLORS, SHADOWS } from '../constants/theme';
import {
  View,
  Text,
  StyleSheet,
  // ... rest of imports
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useOpenProfile } from '../navigation/ProfileNav';
import EventCard from '../components/EventCard';
import { supabase } from '../config/supabase';
import { formatDateTime } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';
import PressableScale from '../components/PressableScale';

const Stack = createNativeStackNavigator();

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

/**
 * Écran de liste des événements
 */

function EventsListScreen({ navigation }) {
  const { t } = useLanguage();
  const openProfile = useOpenProfile();
  // ... state declarations ...
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState('');

  // Use useFocusEffect to refresh data when screen is focused (e.g. coming back from Details)
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
      loadUserRegistrations();
    }, [])
  );

  // Ajouter les boutons dans le header (calendrier à gauche, profil à droite)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
          {/* Bouton calendrier/liste */}
          <TouchableOpacity
            onPress={() => setViewMode(prev => prev === 'list' ? 'calendar' : 'list')}
            style={[styles.headerButton, { marginRight: 16 }]} // décale un peu plus le calendrier
          >
            <Ionicons
              name={viewMode === 'list' ? "calendar" : "list"}
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
          {/* Bouton profil */}
          <TouchableOpacity
            onPress={openProfile}
            style={[styles.headerButton, { marginRight: 0 }]}
          >
            <Ionicons name="person-circle" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, viewMode, openProfile]);

  const loadEvents = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      // Formater les données pour correspondre au format attendu
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
      setUserRegistrations(registrationIds);

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

  const renderEvent = ({ item }) => (
    <EventCard
      event={item}
      onPress={() => navigation.navigate('EventDetails', {
        event: item,
        // Removed onRegister callback to avoid non-serializable warning
      })}
    />
  );

  // Préparer les marqueurs pour le calendrier
  const getMarkedDates = () => {
    const marked = {};

    // Compter les événements par date
    const eventsByDate = {};
    events.forEach(event => {
      if (event.date) {
        const dateStr = event.date.split('T')[0];
        if (!eventsByDate[dateStr]) {
          eventsByDate[dateStr] = 0;
        }
        eventsByDate[dateStr]++;
      }
    });

    // Marquer les jours avec des événements avec un style personnalisé
    Object.keys(eventsByDate).forEach(dateStr => {
      const isSelected = dateStr === selectedDate;
      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: isSelected ? COLORS.primary : 'rgba(124, 92, 255, 0.15)',
            borderRadius: 8,
            borderWidth: isSelected ? 2 : 1,
            borderColor: COLORS.primary,
          },
          text: {
            color: isSelected ? '#ffffff' : COLORS.text,
            fontWeight: '600',
          },
        },
        marked: true,
        dotColor: COLORS.secondary,
        selected: isSelected,
        selectedColor: COLORS.primary,
        selectedTextColor: '#ffffff',
      };
    });

    // Marquer la date sélectionnée si elle n'a pas d'événement
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        customStyles: {
          container: {
            backgroundColor: COLORS.primary,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: COLORS.primary,
          },
          text: {
            color: '#ffffff',
            fontWeight: '600',
          },
        },
        selected: true,
        selectedColor: COLORS.primary,
        selectedTextColor: '#ffffff',
      };
    }

    return marked;
  };

  const selectedDateEvents = selectedDate
    ? events.filter(e => {
        if (!e.date) return false;
        const eventDateStr = e.date.split('T')[0];
        return eventDateStr === selectedDate;
      })
    : [];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'list' ? (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.surfaceLight} />
              <Text style={styles.emptyText}>{t('events.noEvents')}</Text>
            </View>
          }
        />
      ) : (
        <ScrollView style={styles.calendarContainer}>
          <Calendar
            style={styles.calendar}
            firstDay={1}
            markingType={'custom'}
            theme={{
              backgroundColor: COLORS.surface,
              calendarBackground: COLORS.surface,
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: COLORS.secondary,
              dayTextColor: COLORS.text,
              textDisabledColor: COLORS.surfaceLight,
              dotColor: COLORS.primary,
              selectedDotColor: '#ffffff',
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.text,
              indicatorColor: COLORS.primary,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14
            }}
            markedDates={getMarkedDates()}
            onDayPress={day => setSelectedDate(day.dateString)}
            enableSwipeMonths={true}
          />

          <View style={styles.selectedEventsContainer}>
            <Text style={styles.selectedDateTitle}>
              {selectedDate
                ? t('events.eventsOnDate', { date: formatDateTime(selectedDate).split(' à ')[0] })
                : t('events.selectDate')}
            </Text>

            {selectedDate && selectedDateEvents.length === 0 ? (
              <Text style={styles.noEventsText}>{t('events.noEvents')}</Text>
            ) : (
              selectedDateEvents.map(event => (
                <View key={event.id} style={styles.miniEventCardWrapper}>
                  {renderEvent({ item: event })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function EventDetailsScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { event } = route.params;
  const [isRegistered, setIsRegistered] = useState(event.registered);
  // We need local state for counts to update immediately
  const [currentParticipants, setCurrentParticipants] = useState(event.currentParticipants);

  const { width } = Dimensions.get('window');

  // Parse images
  const images = (() => {
    if (!event.image) return [];
    try {
      const parsed = JSON.parse(event.image);
      return Array.isArray(parsed) ? parsed : [event.image];
    } catch {
      return [event.image];
    }
  })();

  const handleRegister = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('common.error'), 'Vous devez être connecté pour vous inscrire');
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

        // Mettre à jour le compteur
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
      Alert.alert(t('common.error'), 'Impossible de modifier l\'inscription');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {images.length > 0 && (
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={[styles.sliderImage, { width }]}
              />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.sliderBadge}>
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={styles.sliderText}>{images.length} photos</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {formatDateTime(event.date, event.time)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {currentParticipants}/{event.maxParticipants} {t('events.participants')}
            </Text>
          </View>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>{t('events.description')}</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <PressableScale
          style={[styles.registerButton, isRegistered && styles.registeredButton]}
          onPress={handleRegister}
        >
          <Ionicons
            name={isRegistered ? "checkmark-circle" : "add-circle-outline"}
            size={20}
            color="#fff"
          />
          <Text style={styles.registerButtonText}>
            {isRegistered ? t('events.unregister') : t('events.register')}
          </Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

/**
 * Navigation pour les événements
 */
export default function EventsScreen() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.text,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={{ title: t('events.title') }}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  list: {
    padding: 16,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  infoSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text, // Or COLORS.secondary for accent
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    ...SHADOWS.neon, // Neon glow for the button
  },
  registeredButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerButton: {
    marginRight: 0,
    padding: 8,
  },
  calendarContainer: {
    flex: 1,
  },
  calendar: {
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedEventsContainer: {
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  noEventsText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  miniEventCardWrapper: {
    marginBottom: 16,
  },
  sliderContainer: {
    height: 250,
    backgroundColor: '#000',
    marginBottom: -20, // Negative margin to overlap with details container if desired, or just 0
    zIndex: 1,
  },
  sliderImage: {
    height: 250,
    resizeMode: 'cover',
  },
  sliderBadge: {
    position: 'absolute',
    bottom: 30, // Above the curved details container
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
