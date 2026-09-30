import React, { useEffect, useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, PopPressable } from '../../components/ui/Pop';
import { Segmented } from '../../components/ui/Deco';
import { Sheet } from '../../components/ui/Sheet';
import { Avatar, RoleSticker, formStyles, openMail } from '../../components/clubUi';
import { useLanguage } from '../../context/LanguageContext';
import { formatShortDate } from '../../utils/dateUtils';
import { confirmAction, showMessage } from '../../utils/dialogs';
import {
  clubErrorMessage,
  removeMember,
  setMemberRole,
  transferPresidency,
} from '../../services/clubService';
import { FONTS, PALETTE } from '../../constants/theme';

/**
 * Membres du club. Tout membre voit la liste ; le président (et l'admin) voit
 * les emails et gère chaque membre : bureau, présidence, retrait.
 */
export default function ClubMembersTab({ clubId, club, members, perms, header, userId, onCoreChange }) {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const emails = members.filter((m) => m.email && m.userId !== userId).map((m) => m.email);

  const emailAll = () => {
    const subject = encodeURIComponent(club.name);
    Linking.openURL(`mailto:?bcc=${emails.join(',')}&subject=${subject}`).catch(() => {});
  };

  const listHeader = (
    <View>
      {header}
      {perms.canManageMembers ? (
        <View style={{ marginBottom: 18 }}>
          <Text style={formStyles.hint}>{t('clubSpace.members.bureauHint')}</Text>
          {emails.length > 0 ? (
            <PopButton title={t('clubSpace.members.emailAll')} icon="mail" variant="light" compact onPress={emailAll} />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderMember = ({ item }) => {
    // Le président se gère par transmission, pas depuis sa propre ligne.
    const manageable = perms.canManageMembers && !item.isPresident;
    const isMe = item.userId === userId;
    return (
      <PopPressable
        onPress={manageable ? () => setSelected(item) : undefined}
        disabled={!manageable}
        dimWhenDisabled={false}
        containerStyle={{ marginBottom: 12 }}
        style={styles.row}
        accessibilityLabel={item.name}
      >
        <Avatar name={item.name} seed={item.userId} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
            {isMe ? ` (${t('clubSpace.members.you')})` : ''}
          </Text>
          {item.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
          <RoleSticker member={item} t={t} style={styles.role} />
          <Text style={styles.since} numberOfLines={1}>
            {t('clubSpace.members.since', { date: formatShortDate(item.joinedAt, language) })}
          </Text>
        </View>
        {manageable ? <Ionicons name="ellipsis-vertical" size={20} color={PALETTE.ink} /> : null}
      </PopPressable>
    );
  };

  return (
    <>
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={renderMember}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await onCoreChange();
          setRefreshing(false);
        }}
      />

      <MemberSheet
        member={selected}
        clubId={clubId}
        canTransfer={perms.isPresident || perms.isAdmin}
        onClose={() => setSelected(null)}
        onChanged={async () => {
          setSelected(null);
          await onCoreChange();
        }}
      />
    </>
  );
}

/**
 * Gestion d'un membre : email, rôle au bureau (avec intitulé), transmission
 * de la présidence, retrait du club.
 */
function MemberSheet({ member, clubId, canTransfer, onClose, onChanged }) {
  const { t } = useLanguage();
  const [role, setRole] = useState('member');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setRole(member.role);
    setTitle(member.title ?? '');
  }, [member]);

  if (!member) return <Sheet visible={false} onClose={onClose} title="" />;

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      await onChanged();
    } catch (error) {
      showMessage(t('common.error'), clubErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const saveRole = () => run(() => setMemberRole(clubId, member.userId, role, role === 'bureau' ? title : null));

  const transfer = async () => {
    const ok = await confirmAction({
      title: t('clubSpace.members.transfer'),
      message: t('clubSpace.members.transferConfirm', { name: member.name }),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) run(() => transferPresidency(clubId, member.userId));
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: t('clubSpace.members.remove'),
      message: t('clubSpace.members.removeConfirm', { name: member.name }),
      confirmLabel: t('clubSpace.members.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) run(() => removeMember(clubId, member.userId));
  };

  const roleChanged = role !== member.role || (role === 'bureau' && title.trim() !== (member.title ?? ''));

  return (
    <Sheet visible onClose={onClose} title={member.name} closeLabel={t('common.close')}>
      {member.email ? (
        <PopPressable
          onPress={() => openMail(member.email)}
          containerStyle={{ marginBottom: 18 }}
          style={styles.emailCard}
          accessibilityLabel={t('clubSpace.members.sendEmail')}
        >
          <View style={styles.emailIcon}>
            <Ionicons name="mail" size={18} color={PALETTE.ink} />
          </View>
          <Text style={styles.emailText} numberOfLines={1}>
            {member.email}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={PALETTE.ink} />
        </PopPressable>
      ) : null}

      <View style={formStyles.field}>
        <Text style={formStyles.label}>{t('clubSpace.members.titleLabel')}</Text>
        <Segmented
          options={[
            { key: 'member', label: t('clubSpace.members.roles.member') },
            { key: 'bureau', label: t('clubSpace.members.roles.bureau') },
          ]}
          value={role}
          onChange={setRole}
          style={{ marginBottom: 10 }}
        />
        {role === 'bureau' ? (
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('clubSpace.members.titlePlaceholder')}
            placeholderTextColor={PALETTE.inkSoft}
            maxLength={40}
            style={formStyles.input}
          />
        ) : null}
      </View>
      <PopButton
        title={t('common.save')}
        icon="checkmark"
        onPress={saveRole}
        loading={busy}
        disabled={!roleChanged}
        containerStyle={{ marginBottom: 22 }}
      />

      {canTransfer ? (
        <PopButton
          title={t('clubSpace.members.transfer')}
          icon="star"
          variant="sun"
          compact
          onPress={transfer}
          disabled={busy}
          containerStyle={{ marginBottom: 12 }}
        />
      ) : null}
      <PopButton
        title={t('clubSpace.members.remove')}
        icon="person-remove"
        variant="danger"
        compact
        onPress={remove}
        disabled={busy}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 22,
    color: PALETTE.ink,
  },
  email: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PALETTE.inkSoft,
  },
  role: {
    marginTop: 6,
  },
  since: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PALETTE.inkSoft,
    marginTop: 6,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  emailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailText: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: PALETTE.ink,
  },
});
