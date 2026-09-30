import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, PopCard } from '../../components/ui/Pop';
import { EmptyState, SectionTitle, Segmented } from '../../components/ui/Deco';
import { formStyles } from '../../components/clubUi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { showMessage } from '../../utils/dialogs';
import { pickImage, uploadImage } from '../../services/imageUpload';
import {
  MIN_CLUB_CAPACITY,
  adminSetPresident,
  buildMonthlyReport,
  clubErrorMessage,
  fetchClub,
  fetchMembers,
  fetchPosts,
  fetchProjects,
  parseClubImages,
  updateClubInfo,
} from '../../services/clubService';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, STROKE } from '../../constants/theme';

// Mêmes catégories que le formulaire de proposition de club.
const CATEGORIES = ['Sport', 'Culture', 'Art', 'Technologie', 'Social', 'Musique', 'Jeux', 'Autre'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Réglages d'un club, pour son président (et les admins BDE) : infos
 * publiques, capacité, recrutement, photos, rapport mensuel pour le BDE.
 * Les admins peuvent aussi désigner le président par email.
 */
export default function ClubSettingsScreen({ route }) {
  const { clubId } = route.params;
  const { t, language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [club, setClub] = useState(null);
  const [adminView, setAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('Autre');
  const [capacity, setCapacity] = useState('');
  const [recruiting, setRecruiting] = useState(true);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [presidentEmail, setPresidentEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fillForm = (c) => {
    setClub(c);
    setDescription(c.description ?? '');
    setContact(c.contact ?? '');
    setCategory(c.category || 'Autre');
    setCapacity(c.maxCapacity ? String(c.maxCapacity) : '');
    setRecruiting(c.recruiting);
    setImages(parseClubImages(c.image));
  };

  const load = useCallback(async () => {
    try {
      const [fresh, admin] = await Promise.all([fetchClub(clubId), isAdmin()]);
      if (fresh) fillForm(fresh);
      setAdminView(admin);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
    // isAdmin est recréé à chaque rendu du contexte : volontairement hors deps.
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={PALETTE.ink} />
      </View>
    );
  }

  const allowed = club && (adminView || club.presidentId === user?.id);
  if (!allowed) {
    return (
      <View style={styles.container}>
        <EmptyState
          emoji="🔒"
          title={loadError ? clubErrorMessage(loadError, t) : t('clubSpace.errors.not_allowed')}
          color={SECTION_COLORS.Clubs}
        />
      </View>
    );
  }

  const addPhoto = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      setUploading(true);
      const url = await uploadImage(picked.uri, 'clubs');
      setImages((prev) => [...prev, url]);
    } catch (error) {
      showMessage(t('common.error'), error.message || t('errors.generic'));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!description.trim()) {
      showMessage(t('common.error'), t('clubSpace.errors.description_required'));
      return;
    }
    if (contact.trim() && !EMAIL_RE.test(contact.trim())) {
      showMessage(t('common.error'), t('auth.enterValidEmail'));
      return;
    }
    const maxCapacity = capacity.trim() ? parseInt(capacity, 10) : null;
    if (maxCapacity !== null && (Number.isNaN(maxCapacity) || maxCapacity < MIN_CLUB_CAPACITY)) {
      showMessage(t('common.error'), t('clubSpace.errors.capacity_too_low'));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateClubInfo(clubId, {
        description,
        contact,
        category,
        images,
        maxCapacity,
        recruiting,
      });
      fillForm(updated);
      showMessage(t('clubSpace.settings.saved'));
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  // Rapport mensuel de la charte : préparé à partir des données du club,
  // envoyé par le président avec l'app de son choix (mail, messagerie…).
  const shareReport = async () => {
    setReporting(true);
    try {
      const [members, projects, posts] = await Promise.all([
        fetchMembers(clubId),
        fetchProjects(clubId),
        fetchPosts(clubId),
      ]);
      const { subject, body } = buildMonthlyReport({ club, members, projects, posts, t, language });
      if (Platform.OS === 'web') {
        await Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      } else {
        await Share.share({ title: subject, message: body }, { subject, dialogTitle: subject });
      }
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setReporting(false);
    }
  };

  const assignPresident = async () => {
    if (!EMAIL_RE.test(presidentEmail.trim())) {
      showMessage(t('common.error'), t('auth.enterValidEmail'));
      return;
    }
    setAssigning(true);
    try {
      fillForm(await adminSetPresident(clubId, presidentEmail));
      setPresidentEmail('');
      showMessage(t('clubSpace.settings.presidentUpdated'));
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setAssigning(false);
    }
  };

  const categories = CATEGORIES.includes(category) ? CATEGORIES : [...CATEGORIES, category];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle title={t('clubSpace.settings.publicInfo')} />
      <PopCard containerStyle={{ marginBottom: 24 }} style={styles.card}>
        <Text style={styles.clubName}>{club.name}</Text>
        <Text style={[formStyles.hint, { marginBottom: 16 }]}>{t('clubSpace.settings.nameHint')}</Text>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>{t('clubSpace.settings.description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
            style={[formStyles.input, formStyles.textArea, styles.paperInput]}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>{t('clubSpace.settings.contact')}</Text>
          <Text style={formStyles.hint}>{t('clubSpace.settings.contactHint')}</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="club@aivancity.ai"
            placeholderTextColor={PALETTE.inkSoft}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[formStyles.input, styles.paperInput]}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>{t('clubSpace.settings.category')}</Text>
          <View style={styles.chips}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, category === cat && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: category === cat }}
              >
                <Text style={styles.chipText}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>{t('clubSpace.settings.capacity')}</Text>
          <Text style={formStyles.hint}>{t('clubSpace.settings.capacityHint')}</Text>
          <TextInput
            value={capacity}
            onChangeText={(value) => setCapacity(value.replace(/[^0-9]/g, ''))}
            placeholder="20"
            placeholderTextColor={PALETTE.inkSoft}
            keyboardType="number-pad"
            maxLength={4}
            style={[formStyles.input, styles.paperInput, { width: 120 }]}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>{t('clubSpace.settings.recruitment')}</Text>
          <Text style={formStyles.hint}>{t('clubSpace.settings.recruitmentHint')}</Text>
          <Segmented
            options={[
              { key: 'open', label: t('clubSpace.settings.open'), icon: 'lock-open' },
              { key: 'closed', label: t('clubSpace.settings.closed'), icon: 'lock-closed' },
            ]}
            value={recruiting ? 'open' : 'closed'}
            onChange={(key) => setRecruiting(key === 'open')}
          />
        </View>

        <View style={[formStyles.field, { marginBottom: 20 }]}>
          <Text style={formStyles.label}>{t('clubSpace.settings.photos')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photo}>
                <Image source={{ uri }} style={styles.photoImage} />
                <Pressable
                  onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  style={styles.photoRemove}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.delete')}
                >
                  <Ionicons name="close" size={16} color={PALETTE.ink} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={addPhoto}
              disabled={uploading}
              style={styles.photoAdd}
              accessibilityRole="button"
              accessibilityLabel={t('clubSpace.settings.addPhoto')}
            >
              {uploading ? (
                <ActivityIndicator color={PALETTE.ink} />
              ) : (
                <Ionicons name="add" size={30} color={PALETTE.ink} />
              )}
            </Pressable>
          </ScrollView>
        </View>

        <PopButton title={t('clubSpace.settings.save')} icon="checkmark" onPress={save} loading={saving} />
      </PopCard>

      <SectionTitle title={t('clubSpace.settings.report')} />
      <PopCard color={PALETTE.sun} containerStyle={{ marginBottom: 24 }} style={styles.card}>
        <Text style={styles.reportText}>{t('clubSpace.settings.reportHint')}</Text>
        <PopButton
          title={t('clubSpace.settings.reportButton')}
          icon="document-text"
          variant="dark"
          onPress={shareReport}
          loading={reporting}
        />
      </PopCard>

      {adminView ? (
        <>
          <SectionTitle title={t('clubSpace.settings.president')} />
          <PopCard color={PALETTE.bubblegum} style={styles.card}>
            <Text style={styles.reportText}>{t('clubSpace.settings.presidentHint')}</Text>
            <Text style={styles.current}>
              {club.presidentId
                ? t('clubSpace.settings.currentPresident', { name: club.president || '—' })
                : t('clubSpace.settings.noPresident')}
            </Text>
            <TextInput
              value={presidentEmail}
              onChangeText={setPresidentEmail}
              placeholder="prenom.nom@aivancity.ai"
              placeholderTextColor={PALETTE.inkSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[formStyles.input, { marginBottom: 12 }]}
            />
            <PopButton
              title={t('clubSpace.settings.setPresident')}
              icon="star"
              variant="light"
              onPress={assignPresident}
              loading={assigning}
              disabled={!presidentEmail.trim()}
            />
          </PopCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 48,
  },
  card: {
    padding: 16,
  },
  clubName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 29,
    color: PALETTE.ink,
  },
  paperInput: {
    backgroundColor: PALETTE.paper,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
  },
  chipActive: {
    backgroundColor: SECTION_COLORS.Clubs,
  },
  chipText: {
    fontFamily: FONTS.varsity,
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  photo: {
    marginRight: 12,
    marginTop: 6,
  },
  photoImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paperDeep,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 96,
    height: 96,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    borderStyle: 'dashed',
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
    marginBottom: 14,
  },
  current: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: PALETTE.ink,
    marginBottom: 10,
  },
});
