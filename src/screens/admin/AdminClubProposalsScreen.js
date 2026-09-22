import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { COLORS, SHADOWS } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';

// Helper pour les alertes cross-platform
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    // Pour les confirmations avec plusieurs boutons
    if (buttons.length > 1) {
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

/**
 * Écran admin pour gérer les propositions de clubs
 */
export default function AdminClubProposalsScreen() {
  const { t } = useLanguage();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true); // premier chargement uniquement
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh manuel
  const isFirstLoad = useRef(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
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
      showAlert(t('common.error'), 'Impossible de charger les propositions');
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

    const confirmApprove = Platform.OS === 'web' 
      ? window.confirm(`Approuver la proposition\n\nÊtes-vous sûr de vouloir approuver le club "${selectedProposal.club_name}" ?\n\nUn nouveau club sera créé automatiquement.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Approuver la proposition',
            `Êtes-vous sûr de vouloir approuver le club "${selectedProposal.club_name}" ?\n\nUn nouveau club sera créé automatiquement.`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('admin.approve'), onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmApprove) return;

    setProcessing(true);
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

      showAlert(t('common.success'), `${t('admin.clubCreatedSuccess')} ${t('admin.notificationSent')}`);
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showAlert(t('common.error'), 'Impossible d\'approuver la proposition');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProposal) return;

    if (!adminNotes.trim()) {
      showAlert('Attention', t('admin.noteRequired'));
      return;
    }

    const confirmReject = Platform.OS === 'web'
      ? window.confirm(`Refuser la proposition\n\nÊtes-vous sûr de vouloir refuser le club "${selectedProposal.club_name}" ?\n\nL'utilisateur pourra soumettre une nouvelle proposition.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Refuser la proposition',
            `Êtes-vous sûr de vouloir refuser le club "${selectedProposal.club_name}" ?\n\nL'utilisateur pourra soumettre une nouvelle proposition.`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('admin.reject'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmReject) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('club_proposals')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      showAlert(t('clubs.proposalRejected'), 'L\'utilisateur peut maintenant soumettre une nouvelle proposition.');
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showAlert(t('common.error'), 'Impossible de refuser la proposition');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetUnderReview = async () => {
    if (!selectedProposal) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('club_proposals')
        .update({
          status: 'under_review',
          admin_notes: adminNotes,
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      showAlert(t('common.success'), 'La proposition est maintenant en cours d\'examen.');
      setModalVisible(false);
      loadProposals();
    } catch (error) {
      console.error('Erreur:', error);
      showAlert(t('common.error'), 'Impossible de mettre à jour le statut');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'under_review': return COLORS.primary;
      case 'approved': return COLORS.success;
      case 'rejected': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return t('admin.pending');
      case 'under_review': return t('admin.underReview');
      case 'approved': return t('admin.approved');
      case 'rejected': return t('admin.rejected');
      default: return status;
    }
  };

  const renderProposal = ({ item }) => (
    <TouchableOpacity
      style={styles.proposalCard}
      onPress={() => openProposalDetails(item)}
    >
      <View style={styles.proposalHeader}>
        <Text style={styles.proposalName}>{item.club_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.proposalInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.president_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="folder-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.category || t('profile.notSpecified')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Capacité max: {item.max_capacity}</Text>
        </View>
      </View>

      <Text style={styles.proposalDate}>
        Soumis le {new Date(item.created_at).toLocaleDateString('fr-FR')}
      </Text>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
    >
      {[
        { key: 'pending', label: t('admin.pending') },
        { key: 'under_review', label: t('admin.underReview') },
        { key: 'approved', label: t('admin.approved') },
        { key: 'rejected', label: t('admin.rejected') },
        { key: 'all', label: t('admin.all') },
      ].map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[
            styles.filterButton,
            filter === f.key && styles.filterButtonActive,
          ]}
          onPress={() => setFilter(f.key)}
        >
          <Text style={[
            styles.filterButtonText,
            filter === f.key && styles.filterButtonTextActive,
          ]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderFilters()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={proposals}
          renderItem={renderProposal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.surfaceLight} />
              <Text style={styles.emptyText}>Aucune proposition</Text>
            </View>
          }
        />
      )}

      {/* Modal de détails */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails de la proposition</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {selectedProposal && (
            <ScrollView style={styles.modalContent}>
              {/* Statut actuel */}
              <View style={[styles.currentStatus, { backgroundColor: `${getStatusColor(selectedProposal.status)}15` }]}>
                <Text style={styles.currentStatusLabel}>Statut actuel:</Text>
                <Text style={[styles.currentStatusValue, { color: getStatusColor(selectedProposal.status) }]}>
                  {getStatusText(selectedProposal.status)}
                </Text>
              </View>

              {/* Informations du club */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informations du club</Text>
                
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('clubs.clubName')}</Text>
                  <Text style={styles.fieldValue}>{selectedProposal.club_name}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('form.category')}</Text>
                  <Text style={styles.fieldValue}>{selectedProposal.category || t('profile.notSpecified')}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('clubs.objective')}</Text>
                  <Text style={styles.fieldValueMultiline}>{selectedProposal.objective}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('clubs.maxCapacity')}</Text>
                  <Text style={styles.fieldValue}>{selectedProposal.max_capacity} {t('clubs.members')}</Text>
                  <Text style={styles.fieldHint}>
                    Objectif 3/4: {Math.ceil(selectedProposal.max_capacity * 0.75)} {t('clubs.members')} minimum dans le 1er mois
                  </Text>
                </View>
              </View>

              {/* Président */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('clubs.president')}</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('auth.name')}</Text>
                  <Text style={styles.fieldValue}>{selectedProposal.president_name}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
                  <Text style={[styles.fieldValue, { color: COLORS.primary }]}>
                    {selectedProposal.president_email}
                  </Text>
                </View>
              </View>

              {/* Événements */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('clubs.eventIdeas')}</Text>
                <Text style={styles.fieldValueMultiline}>{selectedProposal.event_ideas}</Text>
              </View>

              {/* Infos supplémentaires */}
              {selectedProposal.additional_info && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('clubs.additionalInfo')}</Text>
                  <Text style={styles.fieldValueMultiline}>{selectedProposal.additional_info}</Text>
                </View>
              )}

              {/* Notes admin */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('admin.adminNotes')}</Text>
                <TextInput
                  style={styles.notesInput}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="Ajoutez des notes (obligatoire en cas de refus)..."
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Actions */}
              {selectedProposal.status !== 'approved' && (
                <View style={styles.actionsSection}>
                  {selectedProposal.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={handleSetUnderReview}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="eye" size={20} color="#fff" />
                          <Text style={styles.reviewButtonText}>Mettre en examen</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={handleApprove}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.approveButtonText}>Approuver et créer le club</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {selectedProposal.status !== 'rejected' && (
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={handleReject}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.rejectButtonText}>{t('admin.reject')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {selectedProposal.status === 'approved' && (
                <View style={styles.approvedNotice}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <Text style={styles.approvedNoticeText}>
                    Cette proposition a été approuvée et le club a été créé.
                  </Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  proposalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  proposalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  proposalInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  proposalDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  currentStatusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  fieldValueMultiline: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  fieldHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  notesInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionsSection: {
    marginTop: 8,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 12,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    padding: 16,
    borderRadius: 12,
  },
  approvedNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.success,
  },
});
