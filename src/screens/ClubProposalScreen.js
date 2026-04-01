import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';

// Helper pour les alertes cross-platform
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result && buttons.length > 0) {
      const okButton = buttons.find(b => b.text === 'OK' || b.text === 'Oui');
      if (okButton && okButton.onPress) {
        okButton.onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Contenu de la charte pour affichage dans l'app
 */
const CHARTE_CONTENT = {
  fr: {
    title: "GUIDE : CRÉER TON CLUB À AIVANCITY",
    subtitle: "Mandat 2026 — BDE&S-Aivancity",
    sections: [
      {
        title: "1. Les 3 critères de base",
        content: `Pour être éligible, un club doit présenter un dossier solide comprenant :

• L'Objet du Club : Il doit obligatoirement contribuer à l'animation et à la promotion de la vie étudiante ou sportive.

• Une capacité minimale de 10 membres

• La Composition du Bureau : Il est fortement recommandé que le club reflète la diversité de l'école :
  - Inclure au moins un représentant de la section française et un de la section anglaise.
  - Viser, dans la mesure du possible, une parité fille-garçon.`
      },
      {
        title: "2. Le parcours de création (4 étapes)",
        content: `Étape 1 : Prépare ton dossier
Rédige un petit document qui explique :
• Le nom de ton club et son objectif.
• La capacité maximale de membres.
• Tes idées d'événements pour l'année.

Étape 2 : Présente ton projet (Le "Pitch")
Soumets ta proposition via l'application. Le BDE examinera ton dossier et te contactera pour présenter ton idée.

Étape 3 : Organise ton budget
Une fois le projet validé, contacte Raphaël SALÉ (Trésorier) pour discuter de tes besoins.

Étape 4 : Fais du bruit !
Dès que tout est signé, Coralie MBODOUAN (Community Manager) t'aidera à annoncer le lancement du club.`
      },
      {
        title: "3. Tes contacts clés",
        content: `• Dépôt du dossier & Paperasse : Jason MAROLANY (Secrétaire Général)
• Organisation & Coaching : Yanis ZOUAOUI (Vice-Président)
• Budget & Financement : Raphaël SALÉ (Trésorier)
• Communication & Pub : Coralie MBODOUAN (Community Manager)`
      },
      {
        title: "4. Obligations du président",
        content: `📋 Rapport mensuel obligatoire :
Le président du club doit envoyer chaque mois un rapport au Président du BDE contenant :
• Le nombre de membres actifs
• La liste des noms des membres
• Les activités réalisées durant le mois

👤 Gestion des nouveaux membres :
À chaque nouveau membre, le président doit envoyer au BDE le nom de la personne qui rejoint le club.`
      },
      {
        title: "5. Règles importantes",
        content: `⚠️ Tous les clubs sont sous la responsabilité du BDE.

• Si un club ne respecte plus les règles ou les statuts, le Bureau peut décider de suspendre son activité.

• Si un club n'a pas atteint les 3/4 de sa capacité maximale de membres au bout d'un mois après sa création, il pourra être suspendu par le BDE.

• Chaque utilisateur ne peut soumettre qu'une seule proposition de club. En cas de refus, vous pourrez soumettre une nouvelle proposition.

• Le non-respect des obligations de rapport mensuel peut entraîner la suspension du club.`
      }
    ]
  }
};

/**
 * Modal pour afficher la charte
 */
function CharteModal({ visible, onClose, onAccept, showAcceptButton = false }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{CHARTE_CONTENT.fr.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.modalSubtitle}>{CHARTE_CONTENT.fr.subtitle}</Text>
          
          {CHARTE_CONTENT.fr.sections.map((section, index) => (
            <View key={index} style={styles.charteSectionModal}>
              <Text style={styles.charteSectionTitle}>{section.title}</Text>
              <Text style={styles.charteSectionContent}>{section.content}</Text>
            </View>
          ))}
          
          <View style={{ height: 100 }} />
        </ScrollView>
        
        {showAcceptButton && (
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.acceptButtonText}>J'accepte la charte</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

/**
 * Écran de proposition de création de club
 */
export default function ClubProposalScreen({ navigation }) {
  const { user } = useAuth();
  const [charteAccepted, setCharteAccepted] = useState(false);
  const [showCharteModal, setShowCharteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingProposal, setExistingProposal] = useState(null);
  const [checkingProposal, setCheckingProposal] = useState(true);

  // Formulaire simplifié
  const [clubName, setClubName] = useState('');
  const [clubObjective, setClubObjective] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [presidentEmail, setPresidentEmail] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [eventIdeas, setEventIdeas] = useState('');
  const [category, setCategory] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const categories = [
    'Sport',
    'Culture',
    'Art',
    'Technologie',
    'Social',
    'Musique',
    'Jeux',
    'Autre'
  ];

  useEffect(() => {
    checkExistingProposal();
  }, []);

  const checkExistingProposal = async () => {
    if (!user) {
      setCheckingProposal(false);
      return;
    }

    try {
      // Vérifier s'il y a une proposition en attente, en cours d'examen, OU approuvée
      // Seules les propositions refusées permettent une nouvelle soumission
      const { data, error } = await supabase
        .from('club_proposals')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'under_review', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !error) {
        setExistingProposal(data[0]);
      }
    } catch (error) {
      // Pas de proposition existante, c'est normal
    } finally {
      setCheckingProposal(false);
    }
  };

  const handleAcceptCharte = () => {
    setCharteAccepted(true);
    setShowCharteModal(false);
  };

  const validateForm = () => {
    if (!clubName.trim()) {
      showAlert('Erreur', 'Le nom du club est requis');
      return false;
    }
    if (!clubObjective.trim()) {
      showAlert('Erreur', 'L\'objectif du club est requis');
      return false;
    }
    if (!presidentName.trim()) {
      showAlert('Erreur', 'Le nom du président est requis');
      return false;
    }
    if (!presidentEmail.trim()) {
      showAlert('Erreur', 'L\'email du président est requis');
      return false;
    }
    
    // Valider l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(presidentEmail.trim())) {
      showAlert('Erreur', 'Veuillez entrer une adresse email valide');
      return false;
    }

    if (!maxCapacity.trim()) {
      showAlert('Erreur', 'La capacité maximale est requise');
      return false;
    }
    
    const capacity = parseInt(maxCapacity, 10);
    if (isNaN(capacity) || capacity < 10) {
      showAlert('Erreur', 'La capacité maximale doit être d\'au moins 10 membres');
      return false;
    }

    if (!eventIdeas.trim()) {
      showAlert('Erreur', 'Les idées d\'événements sont requises');
      return false;
    }
    if (!category) {
      showAlert('Erreur', 'Veuillez sélectionner une catégorie');
      return false;
    }
    if (!charteAccepted) {
      showAlert('Erreur', 'Vous devez accepter la charte pour soumettre votre proposition');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form is valid, submitting...');
    setLoading(true);

    try {
      const proposalData = {
        user_id: user.id,
        club_name: clubName.trim(),
        objective: clubObjective.trim(),
        president_name: presidentName.trim(),
        president_email: presidentEmail.trim(),
        max_capacity: parseInt(maxCapacity, 10),
        event_ideas: eventIdeas.trim(),
        category: category,
        additional_info: additionalInfo.trim() || null,
        charte_accepted: true,
        status: 'pending',
      };

      console.log('Proposal data:', proposalData);

      const { data, error } = await supabase
        .from('club_proposals')
        .insert([proposalData])
        .select();

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      showAlert(
        'Proposition envoyée ! 🎉',
        'Votre demande de création de club a été soumise avec succès. Le BDE examinera votre dossier et vous contactera prochainement.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      showAlert('Erreur', `Une erreur est survenue: ${error.message || 'Veuillez réessayer.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingProposal) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (existingProposal) {
    const isApproved = existingProposal.status === 'approved';
    
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.existingProposalContainer}>
          <View style={styles.existingProposalCard}>
            <Ionicons 
              name={isApproved ? "checkmark-circle" : "document-text"} 
              size={64} 
              color={isApproved ? "#27ae60" : COLORS.primary} 
            />
            <Text style={styles.existingProposalTitle}>
              {isApproved ? 'Club créé !' : 'Proposition en cours'}
            </Text>
            <Text style={styles.existingProposalText}>
              {isApproved 
                ? 'Votre club a été approuvé et créé. Vous ne pouvez pas proposer un autre club.'
                : 'Vous avez déjà soumis une proposition de création de club.'
              }
            </Text>
            
            <View style={styles.proposalInfoBox}>
              <Text style={styles.proposalInfoLabel}>Club :</Text>
              <Text style={styles.proposalInfoValue}>{existingProposal.club_name}</Text>
              
              <Text style={styles.proposalInfoLabel}>Statut :</Text>
              <View style={[
                styles.statusBadge,
                existingProposal.status === 'pending' && styles.statusPending,
                existingProposal.status === 'under_review' && styles.statusReview,
                existingProposal.status === 'approved' && styles.statusApproved,
              ]}>
                <Text style={styles.statusText}>
                  {existingProposal.status === 'pending' && 'En attente'}
                  {existingProposal.status === 'under_review' && 'En cours d\'examen'}
                  {existingProposal.status === 'approved' && 'Approuvé ✓'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.existingProposalHint}>
              {isApproved 
                ? 'Votre club est maintenant visible par tous les utilisateurs dans la liste des clubs.'
                : 'Le BDE vous contactera prochainement pour discuter de votre projet.'
              }
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Proposer un nouveau club</Text>
          <Text style={styles.headerSubtitle}>
            Remplissez ce formulaire pour soumettre votre projet de club au BDE
          </Text>
        </View>

        {/* Section Charte */}
        <View style={styles.charteSection}>
          <View style={styles.charteBanner}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            <View style={styles.charteBannerText}>
              <Text style={styles.charteBannerTitle}>Charte de création de club</Text>
              <Text style={styles.charteBannerSubtitle}>
                Lisez et acceptez la charte avant de continuer
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewCharteButton}
            onPress={() => setShowCharteModal(true)}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            <Text style={styles.viewCharteText}>Voir la charte complète</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.acceptCharteRow,
              charteAccepted && styles.acceptCharteRowActive
            ]}
            onPress={() => {
              if (!charteAccepted) {
                setShowCharteModal(true);
              } else {
                setCharteAccepted(false);
              }
            }}
          >
            <View style={[
              styles.checkbox,
              charteAccepted && styles.checkboxChecked
            ]}>
              {charteAccepted && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.acceptCharteText}>
              J'ai lu et j'accepte la charte de création de club
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire - Informations du club */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations du club</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du club *</Text>
            <TextInput
              style={styles.input}
              value={clubName}
              onChangeText={setClubName}
              placeholder="Ex: Club de programmation"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipSelected
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Objectif du club *</Text>
            <Text style={styles.hint}>
              Décrivez l'objet de votre club et comment il contribuera à la vie étudiante
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={clubObjective}
              onChangeText={setClubObjective}
              placeholder="Décrivez l'objectif et les activités prévues..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Capacité maximale de membres *</Text>
            <Text style={styles.hint}>
              Minimum 10 membres. Attention : le club doit atteindre 3/4 de cette capacité dans le premier mois.
            </Text>
            <TextInput
              style={styles.input}
              value={maxCapacity}
              onChangeText={setMaxCapacity}
              placeholder="Ex: 20"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="number-pad"
            />
            {maxCapacity && parseInt(maxCapacity, 10) >= 10 && (
              <Text style={styles.capacityInfo}>
                Objectif minimum : {Math.ceil(parseInt(maxCapacity, 10) * 0.75)} membres dans le premier mois
              </Text>
            )}
          </View>
        </View>

        {/* Président */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Président du club</Text>
          <Text style={styles.sectionHint}>
            Le président sera le contact principal du club
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du président *</Text>
            <TextInput
              style={styles.input}
              value={presidentName}
              onChangeText={setPresidentName}
              placeholder="Nom et prénom"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email du président *</Text>
            <TextInput
              style={styles.input}
              value={presidentEmail}
              onChangeText={setPresidentEmail}
              placeholder="email@aivancity.ai"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Événements */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Idées d'événements</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Événements prévus pour l'année *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={eventIdeas}
              onChangeText={setEventIdeas}
              placeholder="Décrivez vos idées d'événements et activités..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Informations supplémentaires */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations supplémentaires</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Commentaires (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
              placeholder="Toute information supplémentaire que vous souhaitez partager..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!charteAccepted || loading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!charteAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Soumettre ma proposition</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Charte */}
      <CharteModal
        visible={showCharteModal}
        onClose={() => setShowCharteModal(false)}
        onAccept={handleAcceptCharte}
        showAcceptButton={!charteAccepted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  charteSection: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  charteBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  charteBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  charteBannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewCharteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  viewCharteText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptCharteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
  },
  acceptCharteRowActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  acceptCharteText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  formSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  capacityInfo: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    ...SHADOWS.neon,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  charteSectionModal: {
    marginBottom: 24,
  },
  charteSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  charteSectionContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Existing proposal styles
  existingProposalContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  existingProposalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  existingProposalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  existingProposalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  proposalInfoBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  proposalInfoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  proposalInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusReview: {
    backgroundColor: '#CCE5FF',
  },
  statusApproved: {
    backgroundColor: '#D4EDDA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  existingProposalHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
