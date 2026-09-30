import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/ui/AppText';
import { supabase } from '../../config/supabase';
import { PopButton, PopPressable } from '../../components/ui/Pop';
import { EmptyState, SectionTitle, Sticker } from '../../components/ui/Deco';
import { FONTS, PALETTE, STROKE } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';
import { dateParts } from '../../utils/dateUtils';
import { confirmAction, showMessage } from '../../utils/dialogs';
import { AdminFormModal, ChipSelect, FormField, FormSection } from './AdminKit';

// Couleur de l'entrée « Propositions » du menu admin
const COLOR = PALETTE.mint;

// Pastille de chaque statut : fond vif, texte encre (le libellé porte l'info)
const STATUS_COLORS = {
  pending: PALETTE.sun,
  under_review: PALETTE.periwinkle,
  approved: PALETTE.lime,
  rejected: PALETTE.cherry,
};

const STATUS_KEYS = {
  pending: 'admin.pending',
  under_review: 'admin.underReview',
  approved: 'admin.approved',
  rejected: 'admin.rejected',
};

function StatusSticker({ status, style }) {
  const { t } = useLanguage();
  return (
    <Sticker
      label={STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}
      color={STATUS_COLORS[status] ?? PALETTE.white}
      rotate={3}
      small
      style={style}
    />
  );
}

function InfoRow({ icon, children }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={PALETTE.ink} />
      <Text style={styles.infoText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

// Libellé + valeur dans le détail d'une proposition
function InfoField({ label, children, hint }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Text style={styles.fieldValue} selectable>
        {children}
      </Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * Écran admin pour gérer les propositions de clubs
 */
export default function AdminClubProposalsScreen() {
  const { t, language } = useLanguage();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true); // premier chargement uniquement
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh manuel
  const isFirstLoad = useRef(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  // Action en cours ('review' | 'approve' | 'reject'), pour son indicateur
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, under_review, approved, rejected, all

  useEffect(() => {
    loadProposals();
  }, [filter]);

  const loadProposals = async (isRefresh = false) => {
    try {
      let query = supabase
        .from('club_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      showMessage(t('common.error'), t('admin.loadError'));
    } finally {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        setLoading(false);
      }
      if (isRefresh) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProposals(true);
  };

  const openProposalDetails = (proposal) => {
    setSelectedProposal(proposal);
    setAdminNotes(proposal.admin_notes || '');
    setModalVisible(true);
  };

  const handleApprove = async () => {
    if (!selectedProposal) return;

    const confirmed = await confirmAction({
      title: t('admin.approveTitle'),
      message: t('admin.approveMessage', { name: selectedProposal.club_name }),
      confirmLabel: t('admin.approve'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    setProcessing('approve');
    try {
      // Créer le club
      const { error: clubError } = await supabase
        .from('clubs')
        .insert([{
          name: selectedProposal.club_name,
          description: selectedProposal.objective,
          contact: selectedProposal.president_email,
          president: selectedProposal.president_name,
          category: selectedProposal.category || 'Autre',
          members_count: 0,
        }]);

      if (clubError) throw clubError;

      // Mettre à jour le statut de la proposition
      const { error: updateError } = await supabase
        .from('club_proposals')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
        })
        .eq('id', selectedProposal.id);

      if (updateError) throw updateError;

      // Envoyer une notification à tous les utilisateurs
      await notificationService.notifyNewClub(selectedProposal.club_name);

      showMessage(t('common.success'), `${t('admin.clubCreatedSuccess')} ${t('admin.notificationSent')}`);
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage(t('common.error'), t('admin.approveError'));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedProposal) return;

    if (!adminNotes.trim()) {
      showMessage(t('admin.attention'), t('admin.noteRequired'));
      return;
    }

    const confirmed = await confirmAction({
      title: t('admin.rejectTitle'),
      message: t('admin.rejectMessage', { name: selectedProposal.club_name }),
      confirmLabel: t('admin.reject'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;

    setProcessing('reject');
    try {
      const { error } = await supabase
        .from('club_proposals')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      showMessage(t('clubs.proposalRejected'), t('admin.rejectedInfo'));
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage(t('common.error'), t('admin.rejectError'));
    } finally {
      setProcessing(null);
    }
  };

  const handleSetUnderReview = async () => {
    if (!selectedProposal) return;

    setProcessing('review');
    try {
      const { error } = await supabase
        .from('club_proposals')
        .update({
          status: 'under_review',
          admin_notes: adminNotes,
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      showMessage(t('common.success'), t('admin.underReviewInfo'));
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage(t('common.error'), t('admin.statusError'));
    } finally {
      setProcessing(null);
    }
  };

  const submittedOn = (value) => {
    const parts = dateParts(value, language);
    return t('admin.submittedOn', { date: `${parts.day} ${parts.month} ${parts.year}` });
  };

  const filters = [
    { key: 'pending', label: t('admin.pending') },
    { key: 'under_review', label: t('admin.underReview') },
    { key: 'approved', label: t('admin.approved') },
    { key: 'rejected', label: t('admin.rejected') },
    { key: 'all', label: t('admin.all') },
  ];

  const renderProposal = ({ item }) => (
    <PopPressable
      onPress={() => openProposalDetails(item)}
      radius={20}
      containerStyle={styles.card}
      style={styles.cardFace}
      accessibilityLabel={item.club_name}
    >
      <View style={styles.cardTop}>
        <Text style={styles.proposalName} numberOfLines={2}>
          {item.club_name}
        </Text>
        <StatusSticker status={item.status} />
      </View>
      <InfoRow icon="person">{item.president_name}</InfoRow>
      <InfoRow icon="pricetag">{item.category || t('profile.notSpecified')}</InfoRow>
      <InfoRow icon="people">{t('admin.maxCapacityShort', { count: item.max_capacity })}</InfoRow>
      <View style={styles.cardFooter}>
        <Text style={styles.proposalDate}>{submittedOn(item.created_at)}</Text>
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={18} color={PALETTE.ink} />
        </View>
      </View>
    </PopPressable>
  );

  const busy = processing !== null;

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <ChipSelect options={filters} value={filter} onChange={setFilter} color={COLOR} />
      </View>

      <FlatList
        data={proposals}
        renderItem={renderProposal}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <SectionTitle
            title={filters.find((f) => f.key === filter)?.label}
            count={loading ? null : proposals.length}
            color={COLOR}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={PALETTE.ink} style={styles.loader} />
          ) : (
            <EmptyState
              emoji="📬"
              title={t('admin.emptyProposals')}
              message={t('admin.emptyProposalsHint')}
              color={COLOR}
            />
          )
        }
      />

      {/* Modal de détails */}
      <AdminFormModal
        visible={modalVisible}
        title={t('admin.proposal')}
        color={COLOR}
        onClose={() => setModalVisible(false)}
      >
        {selectedProposal && (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('admin.currentStatus')}</Text>
              <StatusSticker status={selectedProposal.status} />
            </View>

            <FormSection title={t('admin.clubInfo')}>
              <InfoField label={t('clubs.clubName')}>{selectedProposal.club_name}</InfoField>
              <InfoField label={t('form.category')}>
                {selectedProposal.category || t('profile.notSpecified')}
              </InfoField>
              <InfoField label={t('clubs.objective')}>{selectedProposal.objective}</InfoField>
              <InfoField
                label={t('clubs.maxCapacity')}
                hint={t('admin.targetMembers', { count: Math.ceil(selectedProposal.max_capacity * 0.75) })}
              >
                {selectedProposal.max_capacity} {t('clubs.members')}
              </InfoField>
            </FormSection>

            <FormSection title={t('clubs.president')}>
              <InfoField label={t('auth.name')}>{selectedProposal.president_name}</InfoField>
              <InfoField label={t('auth.email')}>{selectedProposal.president_email}</InfoField>
            </FormSection>

            <FormSection title={t('clubs.eventIdeas')}>
              <InfoField>{selectedProposal.event_ideas}</InfoField>
            </FormSection>

            {selectedProposal.additional_info ? (
              <FormSection title={t('clubs.additionalInfo')}>
                <InfoField>{selectedProposal.additional_info}</InfoField>
              </FormSection>
            ) : null}

            <FormSection title={t('admin.adminNotes')}>
              <FormField
                multiline
                value={adminNotes}
                onChangeText={setAdminNotes}
                placeholder={t('admin.notesPlaceholder')}
              />
            </FormSection>

            {selectedProposal.status !== 'approved' ? (
              <View style={styles.actions}>
                {selectedProposal.status === 'pending' ? (
                  <PopButton
                    title={t('admin.setUnderReview')}
                    icon="eye"
                    variant="periwinkle"
                    loading={processing === 'review'}
                    disabled={busy && processing !== 'review'}
                    onPress={handleSetUnderReview}
                  />
                ) : null}

                <PopButton
                  title={t('admin.approveAndCreate')}
                  icon="checkmark-circle"
                  variant="success"
                  loading={processing === 'approve'}
                  disabled={busy && processing !== 'approve'}
                  onPress={handleApprove}
                />

                {selectedProposal.status !== 'rejected' ? (
                  <PopButton
                    title={t('admin.reject')}
                    icon="close-circle"
                    variant="danger"
                    loading={processing === 'reject'}
                    disabled={busy && processing !== 'reject'}
                    onPress={handleReject}
                  />
                ) : null}
              </View>
            ) : (
              <View style={styles.approvedNotice}>
                <Ionicons name="checkmark-circle" size={24} color={PALETTE.ink} />
                <Text style={styles.approvedNoticeText}>{t('admin.approvedNotice')}</Text>
              </View>
            )}
          </>
        )}
      </AdminFormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.paper,
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    marginBottom: 20,
  },
  cardFace: {
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  proposalName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 24,
    color: PALETTE.ink,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PALETTE.ink,
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  proposalDate: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusLabel: {
    fontFamily: FONTS.varsity,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 23,
    color: PALETTE.ink,
  },
  fieldHint: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PALETTE.inkSoft,
    marginTop: 4,
  },
  actions: {
    gap: 14,
    marginTop: 4,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.lime,
    borderRadius: 16,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    padding: 14,
    gap: 10,
  },
  approvedNoticeText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: PALETTE.ink,
  },
});
