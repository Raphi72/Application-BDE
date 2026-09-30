import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Linking,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Text, { TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClubCard, { ClubPatch } from '../components/ClubCard';
import MyClubRow from '../components/MyClubRow';
import { RoleSticker, formStyles } from '../components/clubUi';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, STROKE } from '../constants/theme';
import ClubProposalScreen from './ClubProposalScreen';
import ClubSpaceScreen from './club/ClubSpaceScreen';
import ClubSettingsScreen from './club/ClubSettingsScreen';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useMyClubs } from '../hooks/useMyClubs';
import { plural } from '../utils/plural';
import { confirmAction, showMessage } from '../utils/dialogs';
import {
  MAX_JOIN_MESSAGE,
  cancelJoinRequest,
  clubErrorMessage,
  fetchClub,
  fetchClubs,
  leaveClub,
  parseClubImages,
  requestJoin,
} from '../services/clubService';
import { PopButton, PopCard, PopPressable, RoundButton } from '../components/ui/Pop';
import { EmptyState, SectionTitle, Sticker, Zigzag } from '../components/ui/Deco';
import { Sheet } from '../components/ui/Sheet';
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
 * Écran de liste des clubs : mes clubs (accès direct à leur espace), puis
 * tous les clubs, puis une carte d'appel à proposer son club (avec la charte).
 */
function ClubsListScreen({ navigation }) {
  const { t, language } = useLanguage();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCharteModal, setShowCharteModal] = useState(false);
  const { myClubs, pendingForPresident, refresh: refreshMine } = useMyClubs();

  const loadClubs = useCallback(async () => {
    try {
      setClubs(await fetchClubs());
    } catch (error) {
      console.error('Erreur lors du chargement des clubs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Rechargé au retour sur la liste : l'effectif change quand on rejoint ou
  // quitte un club.
  useFocusEffect(
    useCallback(() => {
      loadClubs();
    }, [loadClubs])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadClubs();
    refreshMine();
  };

  const renderHeader = () =>
    myClubs.length > 0 ? (
      <View>
        <SectionTitle title={t('clubs.myClubs')} count={myClubs.length} color={COLOR} />
        {myClubs.map((club) => (
          <MyClubRow
            key={club.id}
            club={club}
            pendingCount={pendingForPresident[club.id]}
            onPress={() => navigation.navigate('ClubSpace', { clubId: club.id })}
          />
        ))}
        <SectionTitle title={t('clubs.allClubs')} style={{ marginTop: 12 }} />
      </View>
    ) : null;

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
          ListHeaderComponent={renderHeader}
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
 * Demande d'adhésion : petit mot facultatif pour le président, qui verra le
 * nom, l'email et le message.
 */
function JoinClubSheet({ club, visible, onClose, onSent }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await requestJoin(club.id, message);
      setMessage('');
      onSent();
      showMessage(t('clubs.requestSent'), t('clubs.requestSentMessage', { club: club.name }));
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('clubs.joinTitle', { club: club.name })} closeLabel={t('common.close')}>
      <Text style={formStyles.label}>{t('clubs.joinMessageLabel')}</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={t('clubs.joinMessagePlaceholder')}
        placeholderTextColor={PALETTE.inkSoft}
        multiline
        maxLength={MAX_JOIN_MESSAGE}
        style={[formStyles.input, formStyles.textArea]}
      />
      <Text style={formStyles.counter}>
        {message.length} / {MAX_JOIN_MESSAGE}
      </Text>
      <View style={styles.privacyRow}>
        <Ionicons name="eye-outline" size={18} color={PALETTE.inkSoft} />
        <Text style={styles.privacyText}>{t('clubs.joinPrivacy')}</Text>
      </View>
      <PopButton title={t('clubs.sendRequest')} icon="send" onPress={submit} loading={sending} />
    </Sheet>
  );
}

/**
 * Écran de détails d'un club. La barre du bas dépend de la relation avec le
 * club : rejoindre, demande en attente (annulable), accès à l'espace du club
 * pour les membres (et les admins), recrutement fermé ou club complet.
 */
function ClubDetailsScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const [club, setClub] = useState(route.params.club);
  const [adminView, setAdminView] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const { myClubs, pendingRequests, loaded, refresh } = useMyClubs();

  useEffect(() => {
    isAdmin().then(setAdminView);
    // isAdmin est recréé à chaque rendu du contexte : lu une seule fois.
  }, []);

  // Effectif et recrutement à jour à chaque passage sur l'écran.
  const refreshClub = useCallback(() => {
    fetchClub(route.params.club.id)
      .then((fresh) => fresh && setClub(fresh))
      .catch((error) => console.warn('Club non rechargé :', error?.message));
  }, [route.params.club.id]);

  useFocusEffect(refreshClub);

  const membership = myClubs.find((c) => c.id === club.id);
  const pending = pendingRequests[club.id];
  const isFull = club.maxCapacity != null && club.members >= club.maxCapacity;
  const images = parseClubImages(club.image);

  const handleContactPresident = () => {
    const subject = encodeURIComponent(`Contact - Club ${club.name}`);
    const body = encodeURIComponent(`Bonjour,

Je vous contacte au sujet du club "${club.name}".



Cordialement`);
    Linking.openURL(`mailto:${club.contact}?subject=${subject}&body=${body}`);
  };

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      await refresh();
      refreshClub();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelRequest = async () => {
    const ok = await confirmAction({
      title: t('clubs.cancelRequest'),
      message: t('clubs.cancelRequestConfirm', { club: club.name }),
      confirmLabel: t('common.yes'),
      cancelLabel: t('common.no'),
    });
    if (ok) run(() => cancelJoinRequest(pending.id));
  };

  const handleLeave = async () => {
    const ok = await confirmAction({
      title: t('clubs.leaveClub'),
      message: t('clubs.leaveConfirm', { club: club.name }),
      confirmLabel: t('clubs.leaveClub'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) run(() => leaveClub(club.id));
  };

  const openSpace = () => navigation.navigate('ClubSpace', { clubId: club.id });

  const renderAction = () => {
    if (!loaded) return <PopButton title={t('common.loading')} loading variant="light" />;
    if (membership) {
      return (
        <PopButton
          title={membership.isPresident ? t('clubs.manageClub') : t('clubs.openSpace')}
          icon={membership.isPresident ? 'star' : 'people'}
          variant={membership.isPresident ? 'dark' : 'primary'}
          onPress={openSpace}
        />
      );
    }
    if (pending) {
      return (
        <>
          <View style={styles.pendingRow}>
            <Sticker label={t('clubs.requestPending')} icon="time" color={PALETTE.sun} rotate={-2} small />
            <Text style={styles.pendingHint} numberOfLines={2}>
              {t('clubs.requestPendingHint')}
            </Text>
          </View>
          <PopButton
            title={t('clubs.cancelRequest')}
            icon="close"
            variant="light"
            compact
            onPress={handleCancelRequest}
            loading={busy}
          />
        </>
      );
    }
    if (!club.recruiting || isFull) {
      return (
        <PopButton
          title={isFull ? t('clubs.clubFull') : t('clubs.recruitingClosed')}
          icon={isFull ? 'people' : 'lock-closed'}
          disabled
        />
      );
    }
    return <PopButton title={t('clubs.joinClub')} icon="person-add" onPress={() => setJoinVisible(true)} />;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: barHeight + 24 }}>
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
              <View style={styles.stickers}>
                <Sticker label={club.category} color={COLOR} rotate={-3} />
                {membership ? <RoleSticker member={membership} t={t} rotate={2} /> : null}
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <PopCard containerStyle={{ flex: 1 }} color={PALETTE.periwinkle} style={styles.statCard}>
              <Text style={styles.statNumber}>{club.members}</Text>
              <Text style={styles.statLabel}>
                {t('clubs.members')}
                {club.maxCapacity ? ` ${t('clubs.capacityOf', { max: club.maxCapacity })}` : ''}
              </Text>
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

          {adminView && !membership ? (
            <PopButton
              title={t('clubs.openSpace')}
              icon="shield-checkmark"
              variant="light"
              compact
              onPress={openSpace}
              containerStyle={{ marginTop: 22 }}
            />
          ) : null}

          {membership && !membership.isPresident ? (
            <Pressable onPress={handleLeave} disabled={busy} hitSlop={8} style={styles.leaveLink} accessibilityRole="button">
              <Ionicons name="exit-outline" size={18} color={COLORS.error} />
              <Text style={styles.leaveText}>{t('clubs.leaveClub')}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.actionBar} onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}>
        {renderAction()}
      </View>

      <JoinClubSheet
        club={club}
        visible={joinVisible}
        onClose={() => setJoinVisible(false)}
        onSent={() => {
          setJoinVisible(false);
          refresh();
        }}
      />
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
      <Stack.Screen
        name="ClubSpace"
        component={ClubSpaceScreen}
        options={{ title: t('clubSpace.title') }}
      />
      <Stack.Screen
        name="ClubSettings"
        component={ClubSettingsScreen}
        options={{ title: t('clubSpace.settingsTitle') }}
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
  stickers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pendingHint: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.inkSoft,
  },
  leaveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 26,
    paddingVertical: 6,
  },
  leaveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
});
