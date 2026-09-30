import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, PopPressable } from '../../components/ui/Pop';
import { EmptyState, SectionTitle, Segmented, Sticker } from '../../components/ui/Deco';
import { Sheet } from '../../components/ui/Sheet';
import { formStyles, formatStamp } from '../../components/clubUi';
import { useLanguage } from '../../context/LanguageContext';
import { confirmAction, showMessage } from '../../utils/dialogs';
import {
  PROJECT_STATUSES,
  clubErrorMessage,
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from '../../services/clubService';
import { COLORS, FONTS, PALETTE, SECTION_COLORS } from '../../constants/theme';

// Ordre d'affichage : ce qui bouge d'abord, puis la boîte à idées, puis le bilan.
const SECTION_ORDER = ['in_progress', 'idea', 'done'];

const STATUS_COLORS = {
  idea: PALETTE.sun,
  in_progress: PALETTE.periwinkle,
  done: PALETTE.lime,
};

/**
 * Projets et idées du club. Le bureau crée et gère ; les membres consultent.
 */
export default function ClubProjectsTab({ clubId, perms, header, onCoreChange }) {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editor, setEditor] = useState(null); // null | { project } (project absent = création)

  const load = useCallback(async () => {
    try {
      setProjects(await fetchProjects(clubId));
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

  const sections = SECTION_ORDER.map((status) => ({
    status,
    data: projects.filter((p) => p.status === status),
  })).filter((section) => section.data.length > 0);
  let emptyMessage = null;
  if (!loadError) {
    const key = perms.canManageContent
      ? 'clubSpace.projects.emptyManager'
      : 'clubSpace.projects.emptyMember';
    emptyMessage = t(key);
  }

  const listHeader = (
    <View>
      {header}
      {perms.canManageContent ? (
        <PopButton
          title={t('clubSpace.projects.newProject')}
          icon="add-circle"
          onPress={() => setEditor({})}
          containerStyle={{ marginBottom: 20 }}
        />
      ) : null}
    </View>
  );

  const renderProject = ({ item }) => {
    const editable = perms.canManageContent;
    return (
      <PopPressable
        onPress={editable ? () => setEditor({ project: item }) : undefined}
        disabled={!editable}
        dimWhenDisabled={false}
        containerStyle={{ marginBottom: 14 }}
        style={styles.card}
        accessibilityLabel={item.title}
      >
        <View style={styles.cardHead}>
          <Text style={styles.title}>{item.title}</Text>
          {editable ? <Ionicons name="create-outline" size={20} color={PALETTE.ink} /> : null}
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={4}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Sticker
            label={t(`clubSpace.projects.statusOne.${item.status}`)}
            color={STATUS_COLORS[item.status]}
            rotate={-2}
            small
          />
          <Text style={styles.meta} numberOfLines={1}>
            {item.author_name ? t('clubSpace.projects.proposedBy', { name: item.author_name }) : ''}
            {item.author_name ? ' · ' : ''}
            {formatStamp(item.status === 'done' && item.completed_at ? item.completed_at : item.created_at, language)}
          </Text>
        </View>
      </PopPressable>
    );
  };

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        renderSectionHeader={({ section }) => (
          <SectionTitle
            title={t(`clubSpace.projects.status.${section.status}`)}
            count={section.data.length}
            color={STATUS_COLORS[section.status]}
            style={{ marginTop: 4 }}
          />
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={PALETTE.ink} style={{ marginTop: 30 }} />
          ) : (
            <EmptyState
              emoji="💡"
              title={loadError ? clubErrorMessage(loadError, t) : t('clubSpace.projects.emptyTitle')}
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

      <ProjectSheet
        visible={editor !== null}
        project={editor?.project}
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

/**
 * Création / modification d'un projet, réservée au bureau.
 */
function ProjectSheet({ visible, project, clubId, onClose, onSaved }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idea');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(project?.title ?? '');
    setDescription(project?.description ?? '');
    setStatus(project?.status ?? 'in_progress');
  }, [visible, project]);

  const save = async () => {
    if (!title.trim()) {
      showMessage(t('common.error'), t('admin.requiredFields'));
      return;
    }
    setSaving(true);
    try {
      const fields = { title, description, status };
      if (project) await updateProject(project.id, fields);
      else await createProject(clubId, fields);
      onSaved();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: t('common.delete'),
      message: t('clubSpace.projects.deleteConfirm', { title: project.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProject(project.id);
      onSaved();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    }
  };

  const sheetTitle = project
    ? t('clubSpace.projects.editTitle')
    : t('clubSpace.projects.newProject');

  return (
    <Sheet visible={visible} onClose={onClose} title={sheetTitle} closeLabel={t('common.close')}>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.projects.titleLabel')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('clubSpace.projects.titlePlaceholder')}
          placeholderTextColor={PALETTE.inkSoft}
          maxLength={120}
          style={formStyles.input}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.projects.descriptionLabel')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('clubSpace.projects.descriptionPlaceholder')}
          placeholderTextColor={PALETTE.inkSoft}
          multiline
          maxLength={2000}
          style={[formStyles.input, formStyles.textArea]}
        />
      </View>
      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.projects.statusLabel')}</Text>
        <Segmented
          options={PROJECT_STATUSES.map((key) => ({ key, label: t(`clubSpace.projects.statusOne.${key}`) }))}
          value={status}
          onChange={setStatus}
        />
      </View>

      <PopButton
        title={t('common.save')}
        icon="checkmark"
        onPress={save}
        loading={saving}
        containerStyle={{ marginTop: 6 }}
      />
      {project ? (
        <Pressable onPress={remove} style={styles.deleteLink} accessibilityRole="button" hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteText}>{t('common.delete')}</Text>
        </Pressable>
      ) : null}
    </Sheet>
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
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  meta: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  deleteText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
});
