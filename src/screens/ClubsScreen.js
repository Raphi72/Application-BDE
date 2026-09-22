import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useOpenProfile } from '../navigation/ProfileNav';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClubCard from '../components/ClubCard';
import { supabase } from '../config/supabase';
import { COLORS, SHADOWS } from '../constants/theme';
import ClubProposalScreen from './ClubProposalScreen';
import { useLanguage } from '../context/LanguageContext';
import PressableScale from '../components/PressableScale';

const Stack = createNativeStackNavigator();

/**
 * Contenu de la charte pour affichage rapide
 */
const CHARTE_CONTENT = {
  title: "GUIDE : CRÉER TON CLUB À AIVANCITY",
  subtitle: "Mandat 2026 — BDE&S-Aivancity",
  sections: [
    {
      title: "1. Les 3 critères de base",
      content: `Pour être éligible, un club doit présenter un dossier solide comprenant :

• L'Objet du Club : Il doit obligatoirement contribuer à l'animation et à la promotion de la vie étudiante ou sportive.

• Une capacité minimale de 10 membres

• La Composition du Bureau : Il est fortement recommandé que le club reflète la diversité de l'école.`
    },
    {
      title: "2. Le parcours de création",
      content: `Étape 1 : Prépare ton dossier (nom, objectif, capacité, idées d'événements)

Étape 2 : Soumets ta proposition via l'application

Étape 3 : Le BDE examine et valide ton projet

Étape 4 : Lance ton club !`
    },
    {
      title: "3. Contacts clés",
      content: `• Paperasse : Jason MAROLANY (Secrétaire Général)
• Coaching : Yanis ZOUAOUI (Vice-Président)
• Budget : Raphaël SALÉ (Trésorier)
• Communication : Coralie MBODOUAN (Community Manager)`
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

• Si un club n'a pas atteint les 3/4 de sa capacité maximale au bout d'un mois, il pourra être suspendu.

• Chaque utilisateur ne peut soumettre qu'une seule proposition de club.

• Le non-respect des obligations de rapport peut entraîner la suspension du club.`
    }
  ]
};

/**
 * Modal pour afficher la charte
 */
function CharteViewModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={charteStyles.modalContainer}>
        <View style={charteStyles.modalHeader}>
          <Text style={charteStyles.modalTitle}>{CHARTE_CONTENT.title}</Text>
          <TouchableOpacity onPress={onClose} style={charteStyles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={charteStyles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={charteStyles.modalSubtitle}>{CHARTE_CONTENT.subtitle}</Text>
          
          {CHARTE_CONTENT.sections.map((section, index) => (
            <View key={index} style={charteStyles.charteSection}>
              <Text style={charteStyles.charteSectionTitle}>{section.title}</Text>
              <Text style={charteStyles.charteSectionContent}>{section.content}</Text>
            </View>
          ))}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const charteStyles = StyleSheet.create({
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
    fontSize: 16,
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
  charteSection: {
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
});

/**
 * Écran de liste des clubs
 */
function ClubsListScreen({ navigation }) {
  const { t } = useLanguage();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCharteModal, setShowCharteModal] = useState(false);

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

      const formattedClubs = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        contact: item.contact,
        president: item.president,
        category: item.category || 'Autre',
        image: item.image,
        members: item.members_count || 0,
      }));

      setClubs(formattedClubs);
    } catch (error) {
      console.error('Erreur lors du chargement des clubs:', error);
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

  const renderClub = ({ item }) => (
    <ClubCard
      club={item}
      onPress={() => navigation.navigate('ClubDetails', { club: item })}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Bouton Voir la Charte */}
      <PressableScale
        style={styles.charteButton}
        onPress={() => setShowCharteModal(true)}
      >
        <View style={styles.charteButtonIcon}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.charteButtonContent}>
          <Text style={styles.charteButtonTitle}>{t('clubs.charter')}</Text>
          <Text style={styles.charteButtonSubtitle}>
            Consultez les règles et critères
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </PressableScale>

      {/* Bouton Proposer un Club */}
      <PressableScale
        style={styles.proposeButton}
        onPress={() => navigation.navigate('ClubProposal')}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.proposeButtonText}>{t('clubs.proposeClub')}</Text>
      </PressableScale>

      {/* Titre de la liste */}
      <Text style={styles.listTitle}>{t('clubs.pageTitle')}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clubs}
        renderItem={renderClub}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.surfaceLight} />
            <Text style={styles.emptyText}>{t('clubs.noClubs')}</Text>
          </View>
        }
      />
      
      {/* Modal Charte */}
      <CharteViewModal
        visible={showCharteModal}
        onClose={() => setShowCharteModal(false)}
      />
    </View>
  );
}

/**
 * Écran de détails d'un club
 */
function ClubDetailsScreen({ route }) {
  const { t } = useLanguage();
  const { club } = route.params;
  const { width } = Dimensions.get('window');

  // Parse images
  const images = (() => {
    if (!club.image) return [];
    try {
      const parsed = JSON.parse(club.image);
      return Array.isArray(parsed) ? parsed : [club.image];
    } catch {
      return [club.image];
    }
  })();

  const handleContactPresident = () => {
    const subject = encodeURIComponent(`Contact - Club ${club.name}`);
    const body = encodeURIComponent(`Bonjour,

Je vous contacte au sujet du club "${club.name}".



Cordialement`);
    Linking.openURL(`mailto:${club.contact}?subject=${subject}&body=${body}`);
  };

  return (
    <ScrollView style={styles.container}>
      {images.length > 0 && (
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={[styles.sliderImage, { width }]}
              />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.sliderBadge}>
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={styles.sliderText}>{images.length} photos</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.detailsContainer}>
        <Text style={styles.name}>{club.name}</Text>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{club.category}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{club.members} {t('clubs.members')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.infoText}>{t('clubs.president')} : {club.president}</Text>
          </View>

          {club.contact && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{club.contact}</Text>
            </View>
          )}
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>{t('form.description')}</Text>
          <Text style={styles.description}>{club.description}</Text>
        </View>

        {/* Bouton Contacter le président */}
        <PressableScale
          style={styles.contactButton}
          onPress={handleContactPresident}
        >
          <Ionicons name="mail-outline" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>{t('clubs.contactPresident')}</Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

/**
 * Navigation pour les clubs
 */
export default function ClubsScreen() {
  const openProfile = useOpenProfile();
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.text,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ClubsList"
        component={ClubsListScreen}
        options={{
          title: t('clubs.pageTitle'),
          headerRight: () => (
            <TouchableOpacity
              onPress={openProfile}
              style={{ marginRight: 16, padding: 8 }}
            >
              <Ionicons name="person-circle" size={32} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="ClubDetails"
        component={ClubDetailsScreen}
        options={{ title: t('clubs.clubDetailsTitle') }}
      />
      <Stack.Screen
        name="ClubProposal"
        component={ClubProposalScreen}
        options={{ title: t('clubs.proposeClub') }}
      />
    </Stack.Navigator>
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
  list: {
    padding: 16,
  },
  // Header section styles
  headerSection: {
    marginBottom: 16,
  },
  charteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  charteButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  charteButtonContent: {
    flex: 1,
  },
  charteButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  charteButtonSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  proposeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.neon,
  },
  proposeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  categoryText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    ...SHADOWS.neon,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sliderContainer: {
    height: 250,
    backgroundColor: '#000',
    marginBottom: -20,
    zIndex: 1,
  },
  sliderImage: {
    height: 250,
    resizeMode: 'cover',
  },
  sliderBadge: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
