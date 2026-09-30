import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/ui/AppText';
import { PopButton, PopCard } from '../../components/ui/Pop';
import { EmptyState, Segmented, Sticker } from '../../components/ui/Deco';
import { Avatar, formatStamp, openMail } from '../../components/clubUi';
import { useLanguage } from '../../context/LanguageContext';
import { confirmAction, showMessage } from '../../utils/dialogs';
import { clubErrorMessage, fetchJoinRequests, respondJoinRequest } from '../../services/clubService';
import { FONTS, PALETTE, SECTION_COLORS } from '../../constants/theme';

/**
 * Demandes d'adhésion, réservées au président (et aux admins BDE) : nom,
 * email et message du demandeur, puis Accepter / Refuser. Un second onglet
 * garde l'historique des demandes traitées.
 */
export default function ClubRequestsTab({ club, header, onCoreChange }) {
  const { t, language } = useLanguage();
  const [which, setWhich] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setRequests(await fetchJoinRequests(club.id, which));
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [club.id, which]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const respond = async (request, accept) => {
    if (!accept) {
      const ok = await confirmAction({
        title: t('clubSpace.requests.reject'),
        message: t('clubSpace.requests.rejectConfirm', { name: request.name }),
        confirmLabel: t('clubSpace.requests.reject'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
    }
    setProcessingId(request.id);
    try {
      await respondJoinRequest(request.id, accept);
      await Promise.all([load(), onCoreChange()]);
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setProcessingId(null);
    }
  };

  const listHeader = (
    <View>
      {header}
      <View style={styles.privateRow}>
        <Ionicons name="lock-closed" size={15} color={PALETTE.inkSoft} />
        <Text style={styles.privateText}>{t('clubSpace.requests.privateHint')}</Text>
      </View>
      <Segmented
        options={[
          { key: 'pending', label: t('clubSpace.requests.pending') },
          { key: 'handled', label: t('clubSpace.requests.history') },
        ]}
        value={which}
        onChange={setWhich}
        style={{ marginBottom: 18 }}
      />
    </View>
  );

  const renderPending = ({ item }) => {
    const busy = processingId === item.id;
    return (
      <PopCard containerStyle={{ marginBottom: 16 }} style={styles.card}>
        <Identity request={item} />
        <View style={styles.quote}>
          <Text style={[styles.quoteText, !item.message && styles.noMessage]}>
            {item.message || t('clubSpace.requests.noMessage')}
          </Text>
        </View>
        <Text style={styles.date}>
          {t('clubSpace.requests.sentOn', { date: formatStamp(item.created_at, language) })}
        </Text>
        <View style={styles.actions}>
          <PopButton
            title={t('clubSpace.requests.reject')}
            icon="close"
            variant="danger"
            compact
            onPress={() => respond(item, false)}
            disabled={processingId !== null}
            containerStyle={{ flex: 1 }}
          />
          <PopButton
            title={t('clubSpace.requests.accept')}
            icon="checkmark"
            variant="success"
            compact
            onPress={() => respond(item, true)}
            loading={busy}
            disabled={processingId !== null && !busy}
            containerStyle={{ flex: 1 }}
          />
        </View>
      </PopCard>
    );
  };

  const renderHandled = ({ item }) => {
    const accepted = item.status === 'accepted';
    return (
      <PopCard containerStyle={{ marginBottom: 12 }} style={styles.card}>
        <Identity request={item} />
        {item.message ? (
          <Text style={styles.handledMessage} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}
        <View style={styles.handledFooter}>
          <Sticker
            label={accepted ? t('clubSpace.requests.accepted') : t('clubSpace.requests.rejected')}
            icon={accepted ? 'checkmark' : 'close'}
            color={accepted ? PALETTE.lime : PALETTE.cherry}
            rotate={-2}
            small
          />
          <Text style={styles.date}>{formatStamp(item.handled_at || item.created_at, language)}</Text>
        </View>
      </PopCard>
    );
  };

  return (
    <FlatList
      data={loading ? [] : requests}
      keyExtractor={(item) => item.id}
      renderItem={which === 'pending' ? renderPending : renderHandled}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={PALETTE.ink} style={{ marginTop: 30 }} />
        ) : (
          <EmptyState
            emoji="📬"
            title={loadError ? clubErrorMessage(loadError, t) : t('clubSpace.requests.emptyTitle')}
            message={
              loadError
                ? null
                : which === 'pending'
                  ? t('clubSpace.requests.emptyMessage')
                  : t('clubSpace.requests.emptyHistory')
            }
            color={SECTION_COLORS.Clubs}
          />
        )
      }
      contentContainerStyle={styles.list}
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

/**
 * Qui demande : initiale, nom, email (touché : ouvre la messagerie).
 */
function Identity({ request }) {
  return (
    <View style={styles.identity}>
      <Avatar name={request.name} seed={request.user_id} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {request.name}
        </Text>
        <Pressable onPress={() => openMail(request.email)} hitSlop={6} accessibilityRole="link">
          <Text style={styles.email} numberOfLines={1}>
            {request.email}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  privateText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
  },
  card: {
    padding: 14,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
  },
  email: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: PALETTE.ink,
    textDecorationLine: 'underline',
  },
  quote: {
    backgroundColor: PALETTE.paper,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 12,
    marginTop: 12,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
  },
  noMessage: {
    color: PALETTE.inkSoft,
    fontStyle: 'italic',
  },
  date: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PALETTE.inkSoft,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  handledMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: PALETTE.inkSoft,
    fontStyle: 'italic',
    marginTop: 10,
  },
  handledFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
