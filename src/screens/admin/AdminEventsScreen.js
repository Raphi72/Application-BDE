import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import EventCard from '../../components/EventCard';
import { PopButton } from '../../components/ui/Pop';
import { EmptyState } from '../../components/ui/Deco';
import { PALETTE, SECTION_COLORS } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';
import { confirmAction, showMessage } from '../../utils/dialogs';
import {
  AdminFormModal,
  AdminItemActions,
  AdminListHeader,
  FormField,
  FormSection,
  ImagesField,
  dayOnly,
  isValidDate,
  isValidTime,
  parseImages,
  useAdminForm,
  useImageUploader,
} from './AdminKit';

const COLOR = SECTION_COLORS.Events;

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  location: '',
  maxParticipants: '',
  images: [],
};

const formFromEvent = (event) => ({
  title: event.title ?? '',
  description: event.description ?? '',
  date: dayOnly(event.date),
  // "18:00:00" -> "18:00"
  time: event.time ? String(event.time).slice(0, 5) : '',
  location: event.location ?? '',
  maxParticipants: event.max_participants != null ? String(event.max_participants) : '',
  images: parseImages(event.image),
});

/**
 * Écran admin pour gérer les événements
 */
export default function AdminEventsScreen() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { visible, editing, form, setField, open, close, requestClose } = useAdminForm(EMPTY_FORM);
  const { pick, uploading } = useImageUploader('events', (url) => setField('images', (prev) => [...prev, url]));

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
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
    loadEvents(true);
  };

  const openModal = (event = null) => open(event, event ? formFromEvent(event) : EMPTY_FORM);

  const handleSave = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    const location = form.location.trim();
    const date = form.date.trim();
    const time = form.time.trim();

    if (!title || !description || !date || !time || !location) {
      showMessage(t('common.error'), t('admin.requiredFields'));
      return;
    }
    if (!isValidDate(date)) {
      showMessage(t('common.error'), t('admin.invalidDate'));
      return;
    }
    if (!isValidTime(time)) {
      showMessage(t('common.error'), t('admin.invalidTime'));
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title,
        description,
        date,
        time,
        location,
        max_participants: parseInt(form.maxParticipants, 10) || 100,
        image: JSON.stringify(form.images), // Sauvegarde en JSON
        current_participants: editing?.current_participants || 0,
      };

      if (editing) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editing.id);

        if (error) throw error;
        showMessage(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewEvent(title);

        showMessage(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      close();
      loadEvents();
    } catch (error) {
      showMessage(t('common.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    const confirmed = await confirmAction({
      title: t('admin.deleteConfirm'),
      message: t('admin.deleteEventConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;
      loadEvents();
    } catch (error) {
      showMessage(t('common.error'), t('admin.deleteError'));
    }
  };

  const renderEvent = ({ item }) => (
    <View>
      <EventCard
        event={{
          ...item,
          maxParticipants: item.max_participants,
          currentParticipants: item.current_participants || 0,
        }}
        onPress={() => openModal(item)}
        containerStyle={styles.card}
      />
      <AdminItemActions onEdit={() => openModal(item)} onDelete={() => handleDelete(item)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <AdminListHeader
            actionLabel={t('admin.newEvent')}
            onAction={() => openModal()}
            color={COLOR}
            title={t('navigation.events')}
            count={loading ? null : events.length}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={PALETTE.ink} style={styles.loader} />
          ) : (
            <EmptyState emoji="🎟️" title={t('admin.emptyEvents')} message={t('admin.emptyHint')} color={COLOR} />
          )
        }
      />

      <AdminFormModal
        visible={visible}
        title={editing ? t('admin.editEvent') : t('admin.newEvent')}
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
        <FormSection title={t('admin.sectionInfo')}>
          <FormField
            label={t('form.title')}
            required
            value={form.title}
            onChangeText={(value) => setField('title', value)}
            placeholder={t('admin.eventTitlePlaceholder')}
          />
          <FormField
            label={t('form.description')}
            required
            multiline
            value={form.description}
            onChangeText={(value) => setField('description', value)}
            placeholder={t('admin.eventDescriptionPlaceholder')}
          />
        </FormSection>

        <FormSection title={t('admin.sectionWhenWhere')}>
          <View style={styles.row}>
            <FormField
              label={t('form.date')}
              required
              value={form.date}
              onChangeText={(value) => setField('date', value)}
              placeholder={t('form.dateFormat')}
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.rowItem}
            />
            <FormField
              label={t('form.time')}
              required
              value={form.time}
              onChangeText={(value) => setField('time', value)}
              placeholder={t('form.timeFormat')}
              keyboardType="numbers-and-punctuation"
              containerStyle={styles.rowItem}
            />
          </View>
          <FormField
            label={t('form.location')}
            required
            value={form.location}
            onChangeText={(value) => setField('location', value)}
            placeholder={t('admin.eventLocationPlaceholder')}
          />
          <FormField
            label={t('form.maxParticipants')}
            value={form.maxParticipants}
            onChangeText={(value) => setField('maxParticipants', value)}
            placeholder="100"
            keyboardType="number-pad"
          />
        </FormSection>

        <FormSection title={t('admin.images')} style={styles.imagesSection}>
          <ImagesField
            images={form.images}
            onAdd={pick}
            onRemove={(index) => setField('images', (prev) => prev.filter((_, i) => i !== index))}
            uploading={uploading}
            hint={t('admin.imageHint')}
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
  card: {
    marginBottom: 12,
  },
  loader: {
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  imagesSection: {
    paddingBottom: 16,
  },
});
