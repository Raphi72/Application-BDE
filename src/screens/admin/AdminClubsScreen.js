import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../../config/supabase';
import ClubCard from '../../components/ClubCard';
import { PopButton } from '../../components/ui/Pop';
import { EmptyState } from '../../components/ui/Deco';
import { PALETTE, SECTION_COLORS } from '../../constants/theme';
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

const COLOR = SECTION_COLORS.Clubs;

// Valeurs enregistrées telles quelles en base (affichées sur les cartes).
const CATEGORIES = ['Art', 'Technique', 'Engagement', 'Sport', 'Culture', 'Autre'];

const EMPTY_FORM = {
  name: '',
  description: '',
  president: '',
  contact: '',
  category: 'Art',
  membersCount: '0',
  images: [],
};

const formFromClub = (club) => ({
  name: club.name ?? '',
  description: club.description ?? '',
  president: club.president || '',
  contact: club.contact || '',
  category: club.category || 'Art',
  membersCount: String(club.members_count || 0),
  images: parseImages(club.image),
});

/**
 * Écran admin pour gérer les clubs
 */
export default function AdminClubsScreen() {
  const { t } = useLanguage();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { visible, editing, form, setField, open, close, requestClose } = useAdminForm(EMPTY_FORM);
  const { pick, uploading } = useImageUploader('clubs', (url) => setField('images', (prev) => [...prev, url]));

  useEffect(() => {
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
      console.error('Erreur chargement clubs:', error);
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
    loadClubs(true);
  };

  const openModal = (club = null) => open(club, club ? formFromClub(club) : EMPTY_FORM);

  const handleSave = async () => {
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name || !description) {
      showMessage(t('common.error'), t('admin.clubRequired'));
      return;
    }

    setSaving(true);
    try {
      const clubData = {
        name,
        description,
        contact: form.contact.trim() || null,
        president: form.president.trim() || null,
        category: form.category || 'Art',
        image: JSON.stringify(form.images),
        members_count: parseInt(form.membersCount, 10) || 0,
      };

      if (editing) {
        const { error } = await supabase
          .from('clubs')
          .update(clubData)
          .eq('id', editing.id);

        if (error) throw error;
        showMessage(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('clubs')
          .insert([clubData]);

        if (error) throw error;
        showMessage(t('common.success'), t('admin.clubCreatedSuccess'));
      }

      close();
      loadClubs();
    } catch (error) {
      showMessage(t('common.error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (club) => {
    const confirmed = await confirmAction({
      title: t('admin.deleteConfirm'),
      message: t('admin.deleteClubMessage', { name: club.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    try {
      // Mettre à jour la proposition associée pour permettre une nouvelle soumission
      // On cherche par nom de club car c'est le lien entre proposal et club
      await supabase
        .from('club_proposals')
        .update({
          status: 'rejected',
          admin_notes: 'Club supprimé par l\'administration. Vous pouvez soumettre une nouvelle proposition.',
        })
        .eq('club_name', club.name)
        .eq('status', 'approved');

      // Supprimer le club
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', club.id);

      if (error) throw error;

      showMessage(t('common.success'), t('admin.clubDeleted'));
      loadClubs();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage(t('common.error'), t('admin.deleteError'));
    }
  };

  const renderClub = ({ item }) => (
    <View>
      <ClubCard
        club={{
          ...item,
          members: item.members_count || 0,
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
        data={clubs}
        renderItem={renderClub}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <AdminListHeader
            actionLabel={t('admin.newClub')}
            onAction={() => openModal()}
            color={COLOR}
            title={t('navigation.clubs')}
            count={loading ? null : clubs.length}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={PALETTE.ink} style={styles.loader} />
          ) : (
            <EmptyState emoji="🏆" title={t('admin.emptyClubs')} message={t('admin.emptyHint')} color={COLOR} />
          )
        }
      />

      <AdminFormModal
        visible={visible}
        title={editing ? t('admin.editClub') : t('admin.newClub')}
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
            label={t('auth.name')}
            required
            value={form.name}
            onChangeText={(value) => setField('name', value)}
            placeholder={t('admin.clubNamePlaceholder')}
          />
          <FormField
            label={t('form.description')}
            required
            multiline
            value={form.description}
            onChangeText={(value) => setField('description', value)}
            placeholder={t('admin.clubDescriptionPlaceholder')}
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

        <FormSection title={t('admin.sectionPeople')}>
          <FormField
            label={t('clubs.president')}
            value={form.president}
            onChangeText={(value) => setField('president', value)}
            placeholder={t('admin.clubPresidentPlaceholder')}
          />
          <FormField
            label={t('admin.contactEmail')}
            value={form.contact}
            onChangeText={(value) => setField('contact', value)}
            placeholder="contact@club.fr"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            label={t('admin.membersCount')}
            hint={t('admin.membersCountHint')}
            value={form.membersCount}
            onChangeText={(value) => setField('membersCount', value)}
            placeholder="0"
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
  imagesSection: {
    paddingBottom: 16,
  },
});
