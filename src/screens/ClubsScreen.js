import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Linking,
  ActivityIndicator,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Text from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClubCard, { ClubPatch } from '../components/ClubCard';
import { supabase } from '../config/supabase';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, STROKE } from '../constants/theme';
import ClubProposalScreen from './ClubProposalScreen';
import { useLanguage } from '../context/LanguageContext';
import { plural } from '../utils/plural';
import { PopButton, PopCard, PopPressable, RoundButton } from '../components/ui/Pop';
import { EmptyState, Sticker, Zigzag } from '../components/ui/Deco';
import { ScreenHeader, stackScreenOptions } from '../components/ui/Headers';

const Stack = createNativeStackNavigator();
const COLOR = SECTION_COLORS.Clubs;

/**
 * Contenu de la charte pour affichage rapide
 */
const CHARTE_CONTENT = {
  title: "GUIDE : CRÉER TON CLUB À AIVANCITY",
  subtitle: "Mandat 2026 — BDE&S-Aivancity",
  sections: [
    {
      title: "Les 3 critères de base",
      content: `Pour être éligible, un club doit présenter un dossier solide comprenant :

• L'Objet du Club : Il doit obligatoirement contribuer à l'animation et à la promotion de la vie étudiante ou sportive.

• Une capacité minimale de 10 membres

• La Composition du Bureau : Il est fortement recommandé que le club reflète la diversité de l'école.`
    },
    {
      title: "Le parcours de création",
      content: `Étape 1 : Prépare ton dossier (nom, objectif, capacité, idées d'événements)

Étape 2 : Soumets ta proposition via l'application

Étape 3 : Le BDE examine et valide ton projet

Étape 4 : Lance ton club !`
    },
    {
      title: "Contacts clés",
      content: `• Paperasse : Jason MAROLANY (Secrétaire Général)
• Coaching : Yanis ZOUAOUI (Vice-Président)
• Budget : Raphaël SALÉ (Trésorier)
• Communication : Coralie MBODOUAN (Community Manager)`
    },
    {
      title: "Obligations du président",
      content: `📋 Rapport mensuel obligatoire :
Le président du club doit envoyer chaque mois un rapport au Président du BDE contenant :
• Le nombre de membres actifs
• La liste des noms des membres
• Les activités réalisées durant le mois

👤 Gestion des nouveaux membres :
À chaque nouveau membre, le président doit envoyer au BDE le nom de la personne qui rejoint le club.`
    },
    {
      title: "Règles importantes",
      content: `⚠️ Tous les clubs sont sous la responsabilité du BDE.

• Si un club n'a pas atteint les 3/4 de sa capacité maximale au bout d'un mois, il pourra être suspendu.

• Chaque utilisateur ne peut soumettre qu'une seule proposition de club.

• Le non-respect des obligations de rapport peut entraîner la suspension du club.`
    }
  ]
};

const SECTION_ACCENTS = [PALETTE.lime, PALETTE.sun, PALETTE.periwinkle, PALETTE.bubblegum, PALETTE.tangerine];

/**
 * Modal pour afficher la charte : sections en cartes numérotées.
 */
function CharteViewModal({ visible, onClose }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[charteStyles.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={charteStyles.title}>{t('clubs.charterTitle').toUpperCase()}</Text>
            <Text style={charteStyles.subtitle}>{CHARTE_CONTENT.subtitle}</Text>
          </View>
          <RoundButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
        </View>
        <Zigzag color={COLOR} width={width} />

        <ScrollView contentContainerStyle={charteStyles.content} showsVerticalScrollIndicator={false}>
          {CHARTE_CONTENT.sections.map((section, index) => (
            <PopCard key={index} containerStyle={{ marginBottom: 16 }} style={{ padding: 14 }}>
              <View style={charteStyles.sectionHead}>
                <View style={[charteStyles.number, { backgroundColor: SECTION_ACCENTS[index % SECTION_ACCENTS.length] }]}>
                  <Text style={charteStyles.numberText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={charteStyles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={charteStyles.sectionContent}>{section.content}</Text>
            </PopCard>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const charteStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 36,
    color: PALETTE.ink,
  },
  subtitle: {
    fontFamily: FONTS.varsityBold,
    fontSize: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  number: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  numberText: {
    fontFamily: FONTS.varsity,
    fontSize: 26,
    lineHeight: 30,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    lineHeight: 23,
    color: PALETTE.ink,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 23,
    color: PALETTE.ink,
  },
});

/**
 * Écran de liste des clubs : les clubs d'abord, puis une carte d'appel à
 * proposer son club (avec accès à la charte).
 */
function ClubsListScreen({ navigation }) {
  const { t, language } = useLanguage();
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

  const renderFooter = () => (
    <PopCard color={PALETTE.sun} radius={22} containerStyle={{ marginTop: 6 }} style={styles.pitch}>
      <View style={styles.pitchBadge}>
        <Text style={styles.pitchEmoji}>🚀</Text>
      </View>
      <Text style={styles.pitchTitle}>{t('clubs.yourClubTitle')}</Text>
      <Text style={styles.pitchText}>{t('clubs.yourClubMessage')}</Text>
      <PopButton
        title={t('clubs.proposeClub')}
        icon="add-circle"
        variant="primary"
        onPress={() => navigation.navigate('ClubProposal')}
        containerStyle={{ alignSelf: 'stretch', marginBottom: 10 }}
      />
      <PopButton
        title={t('clubs.readCharter')}
        icon="document-text"
        variant="light"
        compact
        onPress={() => setShowCharteModal(true)}
        containerStyle={{ alignSelf: 'stretch' }}
      />
    </PopCard>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('navigation.clubs').toUpperCase()}
        subtitle={plural(t, language, clubs.length, 'clubs.countOne', 'clubs.countLabel')}
        color={COLOR}
      />
      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={PALETTE.ink} />
        </View>
      ) : (
        <FlatList
          data={clubs}
          renderItem={({ item }) => (
            <ClubCard club={item} onPress={() => navigation.navigate('ClubDetails', { club: item })} />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState emoji="🏆" title={t('clubs.emptyTitle')} message={t('clubs.emptyMessage')} color={COLOR} />
          }
          ListFooterComponent={renderFooter}
        />
      )}

      <CharteViewModal visible={showCharteModal} onClose={() => setShowCharteModal(false)} />
    </View>
  );
}

/**
 * Écran de détails d'un club
 */
function ClubDetailsScreen({ route }) {
  const { t } = useLanguage();
  const { club } = route.params;
  const { width } = useWindowDimensions();

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: club.contact ? 110 : 30 }}>
        {images.length > 0 ? (
          <View style={styles.hero}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.detailsContent}>
          <View style={styles.identity}>
            <ClubPatch club={club} size={96} rotate={-8} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{club.name}</Text>
              <Sticker label={club.category} color={COLOR} rotate={-3} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <PopCard containerStyle={{ flex: 1 }} color={PALETTE.periwinkle} style={styles.statCard}>
              <Text style={styles.statNumber}>{club.members}</Text>
              <Text style={styles.statLabel}>{t('clubs.members')}</Text>
            </PopCard>
            {club.president ? (
              <PopCard containerStyle={{ flex: 1.4 }} color={PALETTE.bubblegum} style={styles.statCard}>
                <Ionicons name="star" size={20} color={PALETTE.ink} />
                <Text style={styles.statValue} numberOfLines={2}>{club.president}</Text>
                <Text style={styles.statLabel}>{t('clubs.president')}</Text>
              </PopCard>
            ) : null}
          </View>

          {club.contact ? (
            <PopPressable onPress={handleContactPresident} containerStyle={{ marginBottom: 16 }} style={styles.contactRow}>
              <View style={styles.iconSquare}>
                <Ionicons name="mail" size={20} color={PALETTE.ink} />
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{club.contact}</Text>
              <Ionicons name="arrow-forward" size={20} color={PALETTE.ink} />
            </PopPressable>
          ) : null}

          {club.description ? (
            <>
              <Text style={styles.sectionTitle}>{t('form.description')}</Text>
              <Text style={styles.description}>{club.description}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {club.contact ? (
        <View style={styles.actionBar}>
          <PopButton title={t('clubs.contactPresident')} icon="mail" onPress={handleContactPresident} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Navigation pour les clubs
 */
export default function ClubsScreen() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(COLOR)}>
      <Stack.Screen
        name="ClubsList"
        component={ClubsListScreen}
        options={{ title: t('clubs.pageTitle'), headerShown: false }}
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
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pitch: {
    padding: 18,
    alignItems: 'center',
  },
  pitchBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
    marginBottom: 10,
  },
  pitchEmoji: {
    fontSize: 30,
  },
  pitchTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 30,
    color: PALETTE.ink,
    textAlign: 'center',
  },
  pitchText: {
    fontSize: 15,
    lineHeight: 22,
    color: PALETTE.ink,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  hero: {
    borderBottomWidth: STROKE,
    borderBottomColor: PALETTE.ink,
  },
  heroImage: {
    height: 230,
    resizeMode: 'cover',
    backgroundColor: PALETTE.paperDeep,
  },
  detailsContent: {
    padding: 16,
    paddingTop: 22,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 36,
    color: PALETTE.ink,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    padding: 14,
    minHeight: 104,
    justifyContent: 'flex-end',
  },
  statNumber: {
    fontFamily: FONTS.varsity,
    fontSize: 48,
    lineHeight: 50,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 21,
    color: PALETTE.ink,
    marginTop: 6,
  },
  statLabel: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: PALETTE.ink,
  },
  sectionTitle: {
    fontFamily: FONTS.varsity,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginTop: 8,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: PALETTE.ink,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingTop: 12,
    backgroundColor: PALETTE.paper,
    borderTopWidth: STROKE,
    borderTopColor: PALETTE.ink,
  },
});
