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
import ClubCard from '../../components/ClubCard';
import { showImagePicker, uploadImage } from '../../services/imageUpload';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Écran admin pour gérer les clubs
 */
export default function AdminClubsScreen() {
  const { t } = useLanguage();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClub, setEditingClub] = useState(null);

  // Formulaire
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [president, setPresident] = useState('');
  const [category, setCategory] = useState('Art');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [membersCount, setMembersCount] = useState('0');

  const categories = ['Art', 'Technique', 'Engagement', 'Sport', 'Culture', 'Autre'];

  React.useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      Alert.alert(t('common.error'), 'Impossible de charger les clubs');
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
    loadClubs(true);
  };

  // Un champ du formulaire a-t-il été rempli ? (pour confirmer avant de perdre la saisie)
  const hasUnsavedChanges = () => {
    return Boolean(name || description || contact || president || images.length > 0 || membersCount !== '0');
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

  const openModal = (club = null) => {
    if (club) {
      setEditingClub(club);
      setName(club.name);
      setDescription(club.description);
      setContact(club.contact || '');
      setPresident(club.president || '');
      setCategory(club.category || 'Art');
      setMembersCount(String(club.members_count || 0));
      try {
        const parsedImages = club.image ? JSON.parse(club.image) : [];
        if (Array.isArray(parsedImages)) {
          setImages(parsedImages);
        } else {
          setImages(club.image ? [club.image] : []);
        }
      } catch (e) {
        setImages(club.image ? [club.image] : []);
      }
    } else {
      setEditingClub(null);
      setName('');
      setDescription('');
      setContact('');
      setPresident('');
      setCategory('Art');
      setImages([]);
      setMembersCount('0');
    }
    setModalVisible(true);
  };

  const handleImagePicker = async () => {
    try {
      showImagePicker(async (selectedImage) => {
        if (selectedImage) {
          setUploading(true);
          try {
            const uploadedUrl = await uploadImage(selectedImage.uri, 'clubs');
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
    if (!name || !description) {
      Alert.alert(t('common.error'), 'Veuillez remplir le nom et la description');
      return;
    }

    try {
      const clubData = {
        name,
        description,
        contact: contact || null,
        president: president || null,
        category: category || 'Art',
        category: category || 'Art',
        image: JSON.stringify(images),
        members_count: parseInt(membersCount) || 0,
      };

      if (editingClub) {
        const { error } = await supabase
          .from('clubs')
          .update(clubData)
          .eq('id', editingClub.id);

        if (error) throw error;
        Alert.alert(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('clubs')
          .insert([clubData]);

        if (error) throw error;
        Alert.alert(t('common.success'), t('admin.clubCreatedSuccess'));
      }

      setModalVisible(false);
      loadClubs();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDelete = async (club) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`${t('admin.deleteConfirm')}\n\nÊtes-vous sûr de vouloir supprimer le club "${club.name}" ?\n\nL'utilisateur qui a créé ce club pourra soumettre une nouvelle proposition.`)
      : await new Promise((resolve) => {
          Alert.alert(
            t('admin.deleteConfirm'),
            `Êtes-vous sûr de vouloir supprimer le club "${club.name}" ?\n\nL'utilisateur qui a créé ce club pourra soumettre une nouvelle proposition.`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('common.delete'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      // Mettre à jour la proposition associée pour permettre une nouvelle soumission
      // On cherche par nom de club car c'est le lien entre proposal et club
      await supabase
        .from('club_proposals')
        .update({ 
          status: 'rejected',
          admin_notes: 'Club supprimé par l\'administration. Vous pouvez soumettre une nouvelle proposition.'
        })
        .eq('club_name', club.name)
        .eq('status', 'approved');

      // Supprimer le club
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', club.id);

      if (error) throw error;
      
      if (Platform.OS === 'web') {
        window.alert('Club supprimé avec succès');
      } else {
        Alert.alert(t('common.success'), 'Club supprimé avec succès');
      }

      loadClubs();
    } catch (error) {
      console.error('Erreur:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de supprimer le club');
      } else {
        Alert.alert(t('common.error'), t('admin.deleteError'));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add-circle" size={24} color={COLORS.onPrimary} />
          <Text style={styles.addButtonText}>{t('admin.newClub')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clubs}
        renderItem={({ item }) => (
          <View style={styles.clubCard}>
            <ClubCard
              club={{
                ...item,
                members: item.members_count || 0,
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
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
              {editingClub ? t('admin.editClub') : t('admin.newClub')}
            </Text>
            <TouchableOpacity onPress={requestCloseModal}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('auth.name')} *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nom du club"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.description')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description du club"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>{t('clubs.president')}</Text>
            <TextInput
              style={styles.input}
              value={president}
              onChangeText={setPresident}
              placeholder="Nom du président"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('clubs.contact')} (email)</Text>
            <TextInput
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              placeholder="contact@club.fr"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>{t('form.category')}</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre de membres actifs</Text>
            <Text style={styles.hint}>
              Modifiez ce nombre pour refléter les membres actuels du club
            </Text>
            <TextInput
              style={styles.input}
              value={membersCount}
              onChangeText={setMembersCount}
              placeholder="0"
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
                {editingClub ? t('common.update') : t('common.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View >
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
  clubCard: {
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
    padding: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
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
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.neon,
  },
  categoryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: COLORS.onPrimary,
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
