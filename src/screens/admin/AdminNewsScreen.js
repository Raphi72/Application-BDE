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
import NewsCard from '../../components/NewsCard';
import { showImagePicker, uploadImage } from '../../services/imageUpload';
import { COLORS, SHADOWS } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Écran admin pour gérer les actualités
 */
export default function AdminNewsScreen() {
  const { t } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNews, setEditingNews] = useState(null);

  // Formulaire
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Actualité');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const categories = ['Actualité', 'Événement', 'Sport', 'Partenariat', 'Autre'];

  React.useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      Alert.alert(t('common.error'), 'Impossible de charger les actualités');
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
    loadNews(true);
  };

  // Un champ du formulaire a-t-il été rempli ? (pour confirmer avant de perdre la saisie)
  const hasUnsavedChanges = () => {
    return Boolean(title || content || images.length > 0);
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

  const openModal = (newsItem = null) => {
    if (newsItem) {
      setEditingNews(newsItem);
      setTitle(newsItem.title);
      setContent(newsItem.content);
      setCategory(newsItem.category || 'Actualité');
      try {
        const parsedImages = newsItem.image ? JSON.parse(newsItem.image) : [];
        if (Array.isArray(parsedImages)) {
          setImages(parsedImages);
        } else {
          setImages(newsItem.image ? [newsItem.image] : []);
        }
      } catch (e) {
        setImages(newsItem.image ? [newsItem.image] : []);
      }
    } else {
      setEditingNews(null);
      setTitle('');
      setContent('');
      setCategory('Actualité');
      setImages([]);
    }
    setModalVisible(true);
  };

  const handleImagePicker = async () => {
    try {
      showImagePicker(async (selectedImage) => {
        if (selectedImage) {
          setUploading(true);
          try {
            const uploadedUrl = await uploadImage(selectedImage.uri, 'news');
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
    if (!title || !content) {
      Alert.alert(t('common.error'), 'Veuillez remplir le titre et le contenu');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newsData = {
        title,
        content,
        category: category || 'Actualité',
        image: JSON.stringify(images),
        author_id: user?.id,
      };

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingNews.id);

        if (error) throw error;
        Alert.alert(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('news')
          .insert([newsData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewNews(title);

        Alert.alert(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      setModalVisible(false);
      loadNews();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDelete = async (newsId) => {
    Alert.alert(
      t('admin.deleteConfirm'),
      t('admin.deleteNewsConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('news')
                .delete()
                .eq('id', newsId);

              if (error) throw error;
              loadNews();
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.deleteError'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add-circle" size={24} color={COLORS.onPrimary} />
          <Text style={styles.addButtonText}>{t('admin.newNews')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={news}
        renderItem={({ item }) => (
          <View style={styles.newsCard}>
            <NewsCard
              news={{
                ...item,
                author: 'BDE',
                date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
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
              {editingNews ? t('admin.editNews') : t('admin.newNews')}
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
              placeholder="Titre de l'actualité"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.label}>{t('form.content')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Contenu de l'actualité"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={6}
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
                {editingNews ? t('common.update') : t('common.create')}
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
  newsCard: {
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
    height: 150,
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
