import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Text, { TextInput } from '../../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import EventCard from '../../components/EventCard';
import { showImagePicker, uploadImage } from '../../services/imageUpload';
import { COLORS, SHADOWS } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Écran admin pour gérer les événements
 */
export default function AdminEventsScreen() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
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
      Alert.alert(t('common.error'), 'Impossible de charger les événements');
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

  // Un champ du formulaire a-t-il été rempli ? (pour confirmer avant de perdre la saisie)
  const hasUnsavedChanges = () => {
    return Boolean(
      title || description || date || time || location || maxParticipants || images.length > 0
    );
  };

  const requestCloseModal = async () => {
    if (hasUnsavedChanges()) {
      const confirmClose = Platform.OS === 'web'
        ? window.confirm(`${t('admin.discardChangesTitle')}\n\n${t('admin.discardChangesConfirm')}`)
        : await new Promise((resolve) => {
            Alert.alert(
              t('admin.discardChangesTitle'),
              t('admin.discardChangesConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                { text: t('admin.discardChanges'), style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
      if (!confirmClose) return;
    }
    setModalVisible(false);
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setDescription(event.description);
      setDate(event.date);
      setTime(event.time);
      setLocation(event.location);
      setMaxParticipants(event.max_participants?.toString() || '');

      let imgList = [];
      try {
        if (event.image) {
          const parsed = JSON.parse(event.image);
          imgList = Array.isArray(parsed) ? parsed : [event.image];
        }
      } catch (e) {
        imgList = event.image ? [event.image] : [];
      }
      setImages(imgList);
    } else {
      setEditingEvent(null);
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setLocation('');
    setMaxParticipants('');
    setImages([]);
  };

  const handleImagePicker = async () => {
    try {
      showImagePicker(async (selectedImage) => {
        if (selectedImage) {
          setUploading(true);
          try {
            const uploadedUrl = await uploadImage(selectedImage.uri, 'events');
            setImages(prev => [...prev, uploadedUrl]);
            Alert.alert(t('common.success'), 'Image ajoutée !');
          } catch (error) {
            console.error('Erreur upload:', error);
            Alert.alert(t('common.error'), "Impossible d'uploader l'image.");
          } finally {
            setUploading(false);
          }
        }
      });
    } catch (error) {
      Alert.alert(t('common.error'), error.message || 'Impossible de sélectionner une image');
    }
  };

  const handleSave = async () => {
    if (!title || !description || !date || !time || !location) {
      Alert.alert(t('common.error'), t('admin.requiredFields'));
      return;
    }

    try {
      const eventData = {
        title,
        description,
        date,
        time,
        location,
        location,
        max_participants: parseInt(maxParticipants) || 100,
        image: JSON.stringify(images), // Sauvegarde en JSON
        current_participants: editingEvent?.current_participants || 0,
      };

      if (editingEvent) {
        // Mise à jour
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        Alert.alert(t('common.success'), t('admin.saveSuccess'));
      } else {
        // Création
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewEvent(title);

        Alert.alert(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      setModalVisible(false);
      resetForm();
      loadEvents();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDelete = async (eventId) => {
    Alert.alert(
      t('admin.deleteConfirm'),
      t('admin.deleteEventConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;
              loadEvents();
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.deleteError'));
            }
          },
        },
      ]
    );
  };

  const renderEvent = ({ item }) => (
    <View style={styles.eventCard}>
      <EventCard
        event={{
          ...item,
          maxParticipants: item.max_participants,
          currentParticipants: item.current_participants,
        }}
        onPress={() => openModal(item)}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openModal(item)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primaryText} />
          <Text style={styles.editButtonText}>{t('common.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add-circle" size={24} color={COLORS.onPrimary} />
          <Text style={styles.addButtonText}>{t('admin.newEvent')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={requestCloseModal}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEvent ? t('admin.editEvent') : t('admin.newEvent')}
            </Text>
            <TouchableOpacity onPress={requestCloseModal}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('form.title')} *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l'événement"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.description')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description de l'événement"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>{t('form.date')} *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder={t('form.dateFormat')}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.time')} *</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder={t('form.timeFormat')}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.location')} *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Lieu de l'événement"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.maxParticipants')}</Text>
            <TextInput
              style={styles.input}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="100"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('admin.images')}</Text>
            <View style={styles.imageSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButtonAbsolute}
                      onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleImagePicker}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={COLORS.primaryText} />
                  ) : (
                    <Ionicons name="add" size={32} color={COLORS.primaryText} />
                  )}
                </TouchableOpacity>
              </ScrollView>

              <Text style={styles.imageHint}>
                {t('admin.imageHint')}
              </Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingEvent ? t('common.update') : t('common.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    ...SHADOWS.neon,
  },
  addButtonText: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  list: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    color: COLORS.primaryText,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  deleteButtonText: {
    color: COLORS.error,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    ...SHADOWS.neon,
  },
  saveButtonText: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageSection: {
    marginTop: 8,
  },
  imageHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  imageList: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButtonAbsolute: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
});
