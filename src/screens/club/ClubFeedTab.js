import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, PopCard, RoundButton } from '../../components/ui/Pop';
import { EmptyState, Sticker } from '../../components/ui/Deco';
import { formStyles, formatStamp } from '../../components/clubUi';
import { useLanguage } from '../../context/LanguageContext';
import { confirmAction, showMessage } from '../../utils/dialogs';
import { clubErrorMessage, createPost, deletePost, fetchPosts, setPostPinned } from '../../services/clubService';
import { FONTS, PALETTE, SECTION_COLORS } from '../../constants/theme';

const MAX_POST = 2000;

/**
 * Fil d'annonces du club. Le bureau (président, bureau, admins) publie,
 * épingle et supprime ; les membres lisent.
 */
export default function ClubFeedTab({ clubId, perms, header, onCoreChange }) {
  const { t, language } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      setPosts(await fetchPosts(clubId));
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async () => {
    if (!draft.trim()) return;
    setPublishing(true);
    try {
      await createPost(clubId, draft);
      setDraft('');
      await load();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setPublishing(false);
    }
  };

  const togglePin = async (post) => {
    try {
      await setPostPinned(post.id, !post.pinned);
      await load();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    }
  };

  const remove = async (post) => {
    const ok = await confirmAction({
      title: t('common.delete'),
      message: t('clubSpace.feed.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(post.id);
      await load();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    }
  };

  const listHeader = (
    <View>
      {header}
      {perms.canManageContent ? (
        <PopCard containerStyle={{ marginBottom: 18 }} style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('clubSpace.feed.placeholder')}
            placeholderTextColor={PALETTE.inkSoft}
            multiline
            maxLength={MAX_POST}
            style={[formStyles.input, formStyles.textArea, styles.composerInput]}
          />
          <PopButton
            title={t('clubSpace.feed.publish')}
            icon="megaphone"
            compact
            onPress={publish}
            loading={publishing}
            disabled={!draft.trim()}
            containerStyle={{ alignSelf: 'flex-end', marginTop: 10 }}
          />
        </PopCard>
      ) : null}
    </View>
  );

  const renderPost = ({ item }) => (
    <PopCard
      color={item.pinned ? PALETTE.sun : PALETTE.white}
      containerStyle={{ marginBottom: 14 }}
      style={styles.post}
    >
      {item.pinned ? (
        <Sticker
          label={t('clubSpace.feed.pinned')}
          icon="pin"
          color={PALETTE.white}
          rotate={-3}
          small
          style={{ marginBottom: 8 }}
        />
      ) : null}
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.footer}>
        <Text style={styles.meta} numberOfLines={1}>
          {item.author_name || '—'} · {formatStamp(item.created_at, language)}
        </Text>
        {perms.canManageContent ? (
          <View style={styles.actions}>
            <RoundButton
              icon={item.pinned ? 'pin' : 'pin-outline'}
              size={34}
              onPress={() => togglePin(item)}
              accessibilityLabel={item.pinned ? t('clubSpace.feed.unpin') : t('clubSpace.feed.pin')}
            />
            <RoundButton
              icon="trash-outline"
              size={34}
              onPress={() => remove(item)}
              accessibilityLabel={t('common.delete')}
            />
          </View>
        ) : null}
      </View>
    </PopCard>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={PALETTE.ink} style={{ marginTop: 30 }} />
        ) : (
          <EmptyState
            emoji="📣"
            title={loadError ? clubErrorMessage(loadError, t) : t('clubSpace.feed.emptyTitle')}
            message={
              loadError
                ? null
                : perms.canManageContent
                  ? t('clubSpace.feed.emptyManager')
                  : t('clubSpace.feed.emptyMember')
            }
            color={SECTION_COLORS.Clubs}
          />
        )
      }
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
        onCoreChange();
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  composer: {
    padding: 12,
  },
  composerInput: {
    minHeight: 90,
    backgroundColor: PALETTE.paper,
  },
  post: {
    padding: 14,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: PALETTE.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  meta: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
});
