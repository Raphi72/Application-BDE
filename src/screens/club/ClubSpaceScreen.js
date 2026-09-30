import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../../components/ui/AppText';
import { PopButton, PopCard, RoundButton } from '../../components/ui/Pop';
import { EmptyState, Sticker } from '../../components/ui/Deco';
import { ClubPatch } from '../../components/ClubCard';
import { CapacityGauge, RoleSticker } from '../../components/clubUi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { plural } from '../../utils/plural';
import {
  charterGoal,
  clubErrorMessage,
  fetchClub,
  fetchJoinRequests,
  fetchMembers,
} from '../../services/clubService';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, STROKE } from '../../constants/theme';
import ClubFeedTab from './ClubFeedTab';
import ClubProjectsTab from './ClubProjectsTab';
import ClubMembersTab from './ClubMembersTab';
import ClubRequestsTab from './ClubRequestsTab';

/**
 * Espace privé d'un club, réservé à ses membres (et aux admins BDE) :
 * - Fil : annonces du bureau ;
 * - Projets : idées proposées par les membres, projets en cours et terminés ;
 * - Membres : liste, rôles ; le président gère les membres ;
 * - Demandes : demandes d'adhésion, visibles du seul président (et des admins).
 * Le président (et l'admin) accède aux réglages via la roue du header.
 */
export default function ClubSpaceScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { t, language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [adminView, setAdminView] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(route.params?.tab ?? 'feed');

  // Club, membres et droits : rechargés au retour sur l'écran (réglages,
  // acceptation d'une demande…) et après chaque action qui les modifie.
  const loadCore = useCallback(async () => {
    try {
      const [freshClub, list, admin] = await Promise.all([fetchClub(clubId), fetchMembers(clubId), isAdmin()]);
      setClub(freshClub);
      setMembers(list);
      setAdminView(admin);
      if (freshClub && (admin || freshClub.presidentId === user?.id)) {
        setPendingCount((await fetchJoinRequests(clubId, 'pending')).length);
      }
      setError(null);
    } catch (e) {
      console.error('Espace club :', e);
      setError(e);
    } finally {
      setLoading(false);
    }
    // isAdmin est recréé à chaque rendu du contexte : volontairement hors deps.
  }, [clubId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCore();
    }, [loadCore])
  );

  const me = members.find((m) => m.userId === user?.id);
  const isPresident = !!club && club.presidentId === user?.id;
  const perms = {
    isMember: !!me || isPresident,
    isPresident,
    isAdmin: adminView,
    // Annonces et projets : président, bureau, admins.
    canManageContent: adminView || isPresident || me?.role === 'bureau',
    // Demandes, membres, réglages : président et admins.
    canManageMembers: adminView || isPresident,
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: club?.name ?? t('clubSpace.title'),
      headerRight: perms.canManageMembers
        ? () => (
            <RoundButton
              icon="settings-sharp"
              size={40}
              onPress={() => navigation.navigate('ClubSettings', { clubId })}
              accessibilityLabel={t('clubSpace.settingsTitle')}
            />
          )
        : undefined,
    });
  }, [navigation, club?.name, perms.canManageMembers, clubId, t]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={PALETTE.ink} />
      </View>
    );
  }

  if (error || !club) {
    return (
      <View style={styles.container}>
        <EmptyState
          emoji="🛠️"
          title={error ? clubErrorMessage(error, t) : t('clubSpace.errors.club_not_found')}
          color={SECTION_COLORS.Clubs}
        >
          <PopButton
            title={t('common.retry')}
            icon="refresh"
            variant="light"
            compact
            onPress={() => {
              setLoading(true);
              loadCore();
            }}
            containerStyle={{ marginTop: 18 }}
          />
        </EmptyState>
      </View>
    );
  }

  if (!perms.isMember && !perms.isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState emoji="🔒" title={t('clubSpace.noAccess')} color={SECTION_COLORS.Clubs} />
      </View>
    );
  }

  const tabs = [
    { key: 'feed', label: t('clubSpace.tabs.feed'), icon: 'megaphone' },
    { key: 'projects', label: t('clubSpace.tabs.projects'), icon: 'bulb' },
    { key: 'members', label: t('clubSpace.tabs.members'), icon: 'people' },
    ...(perms.canManageMembers
      ? [{ key: 'requests', label: t('clubSpace.tabs.requests'), icon: 'mail-unread', badge: pendingCount }]
      : []),
  ];
  const activeTab = tabs.some((x) => x.key === tab) ? tab : 'feed';

  const goal = charterGoal(club.maxCapacity);
  const isFull = club.maxCapacity != null && club.members >= club.maxCapacity;

  // Élément (et non composant) : les onglets le passent tel quel en en-tête de
  // liste, sans démonter les champs de saisie à chaque frappe.
  const header = (
    <View>
      <PopCard containerStyle={{ marginBottom: 16 }} style={styles.identity}>
        <View style={styles.identityRow}>
          <ClubPatch club={club} size={58} rotate={-6} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={2}>
              {club.name}
            </Text>
            {me || isPresident ? (
              <RoleSticker member={{ ...me, isPresident }} t={t} />
            ) : (
              <Sticker label={t('profile.administrator')} icon="shield-checkmark" color={PALETTE.tangerine} rotate={-2} small />
            )}
          </View>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.count}>{club.members}</Text>
          <Text style={styles.countLabel}>
            {t('clubSpace.stats.members')}
            {club.maxCapacity ? ` ${t('clubs.capacityOf', { max: club.maxCapacity })}` : ''}
          </Text>
          {isFull ? <Sticker label={t('clubSpace.stats.full')} color={PALETTE.cherry} rotate={3} small /> : null}
        </View>
        <CapacityGauge count={club.members} max={club.maxCapacity} />
        {goal ? (
          <Text style={styles.goal}>
            {club.members >= goal ? t('clubSpace.stats.goalReached') : t('clubSpace.stats.goal', { goal })}
          </Text>
        ) : null}
        {perms.canManageMembers && pendingCount > 0 ? (
          <Pressable onPress={() => setTab('requests')} style={styles.pendingLink} accessibilityRole="button" hitSlop={6}>
            <Ionicons name="mail-unread" size={16} color={COLORS.primaryText} />
            <Text style={styles.pendingText}>
              {plural(t, language, pendingCount, 'clubs.pendingCount', 'clubs.pendingCountLabel')}
            </Text>
          </Pressable>
        ) : null}
      </PopCard>

      <SpaceTabs tabs={tabs} value={activeTab} onChange={setTab} />
    </View>
  );

  const tabProps = { clubId, club, members, me, perms, header, userId: user?.id, onCoreChange: loadCore };

  return (
    <View style={styles.container}>
      {activeTab === 'feed' && <ClubFeedTab {...tabProps} />}
      {activeTab === 'projects' && <ClubProjectsTab {...tabProps} />}
      {activeTab === 'members' && <ClubMembersTab {...tabProps} />}
      {activeTab === 'requests' && <ClubRequestsTab {...tabProps} />}
    </View>
  );
}

/**
 * Onglets de l'espace club : largeur égale (tiennent sur un écran de 360 dp),
 * icône + libellé, onglet actif sur fond encre, compteur en pastille.
 */
function SpaceTabs({ tabs, value, onChange }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {tabs.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.badge ? `${item.label} (${item.badge})` : item.label}
          >
            <View>
              <Ionicons
                name={active ? item.icon : `${item.icon}-outline`}
                size={20}
                color={active ? PALETTE.paper : PALETTE.ink}
              />
              {item.badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  identity: {
    padding: 14,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 27,
    color: PALETTE.ink,
    marginBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  count: {
    fontFamily: FONTS.varsity,
    fontSize: 40,
    lineHeight: 42,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  countLabel: {
    flex: 1,
    fontFamily: FONTS.varsityBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  goal: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
    marginTop: 6,
  },
  pendingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
  },
  pendingText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.primaryText,
    textDecorationLine: 'underline',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: PALETTE.white,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    borderRadius: 20,
    padding: 3,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 16,
    gap: 2,
  },
  tabActive: {
    backgroundColor: PALETTE.ink,
  },
  tabText: {
    fontFamily: FONTS.varsity,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  tabTextActive: {
    color: PALETTE.paper,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.sun,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FONTS.varsity,
    fontSize: 11,
    lineHeight: 13,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
});
