import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import NewsCard from '../../components/NewsCard';
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
  ChipSelect,
  FormField,
  FormGroup,
  FormSection,
  ImagesField,
  parseImages,
  useAdminForm,
  useImageUploader,
} from './AdminKit';

const COLOR = SECTION_COLORS.News;

// Valeurs enregistrées telles quelles en base (affichées sur les cartes).
const CATEGORIES = ['Actualité', 'Événement', 'Sport', 'Partenariat', 'Autre'];

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'Actualité',
  images: [],
};

const formFromNews = (newsItem) => ({
  title: newsItem.title ?? '',
  content: newsItem.content ?? '',
  category: newsItem.category || 'Actualité',
  images: parseImages(newsItem.image),
});

/**
 * Écran admin pour gérer les actualités
 */
export default function AdminNewsScreen() {
  const { t } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { visible, editing, form, setField, open, close, requestClose } = useAdminForm(EMPTY_FORM);
  const { pick, uploading } = useImageUploader('news', (url) => setField('images', (prev) => [...prev, url]));

  useEffect(() => {
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
      console.error('Erreur chargement actualités:', error);
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
    loadNews(true);
  };

  const openModal = (newsItem = null) => open(newsItem, newsItem ? formFromNews(newsItem) : EMPTY_FORM);

  const handleSave = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      showMessage(t('common.error'), t('admin.newsRequired'));
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newsData = {
        title,
        content,
        category: form.category || 'Actualité',
        image: JSON.stringify(form.images),
        author_id: user?.id,
      };

      if (editing) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editing.id);

        if (error) throw error;
        showMessage(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('news')
          .insert([newsData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewNews(title);

        showMessage(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      close();
      loadNews();
    } catch (error) {
      showMessage(t('common.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (newsItem) => {
    const confirmed = await confirmAction({
      title: t('admin.deleteConfirm'),
      message: t('admin.deleteNewsConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsItem.id);

      if (error) throw error;
      loadNews();
    } catch (error) {
      showMessage(t('common.error'), t('admin.deleteError'));
    }
  };

  const renderNews = ({ item }) => (
    <View>
      <NewsCard
        news={{
          ...item,
          author: 'BDE',
          date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
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
        data={news}
        renderItem={renderNews}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <AdminListHeader
            actionLabel={t('admin.newNews')}
            onAction={() => openModal()}
            color={COLOR}
            title={t('navigation.news')}
            count={loading ? null : news.length}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={PALETTE.ink} style={styles.loader} />
          ) : (
            <EmptyState emoji="📰" title={t('admin.emptyNews')} message={t('admin.emptyHint')} color={COLOR} />
          )
        }
      />

      <AdminFormModal
        visible={visible}
        title={editing ? t('admin.editNews') : t('admin.newNews')}
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
            placeholder={t('admin.newsTitlePlaceholder')}
          />
          <FormField
            label={t('form.content')}
            required
            multiline
            value={form.content}
            onChangeText={(value) => setField('content', value)}
            placeholder={t('admin.newsContentPlaceholder')}
            style={styles.contentInput}
          />
          <FormGroup label={t('form.category')}>
            <ChipSelect
              options={CATEGORIES}
              value={form.category}
              onChange={(value) => setField('category', value)}
              color={COLOR}
            />
          </FormGroup>
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
  contentInput: {
    minHeight: 160,
  },
  imagesSection: {
    paddingBottom: 16,
  },
});
