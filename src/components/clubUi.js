import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Text from './ui/AppText';
import { Sticker } from './ui/Deco';
import { formatShortDate, formatTime } from '../utils/dateUtils';
import { charterGoal } from '../services/clubService';
import { FONTS, PALETTE, STROKE, accentFor } from '../constants/theme';

/**
 * Petits éléments partagés par l'espace club (onglets, réglages).
 */

// "12 septembre · 18h30"
export function formatStamp(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${formatShortDate(value, language)} · ${formatTime(time, language)}`;
}

export function openMail(to, subject) {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  Linking.openURL(`mailto:${to}${query}`).catch(() => {});
}

/**
 * Libellé et couleur du rôle d'un membre (ou de l'utilisateur dans un club).
 * @param {{ isPresident?: boolean, role?: string, title?: string }} member
 */
export function roleInfo(member, t) {
  if (member?.isPresident) {
    return { label: t('clubSpace.members.roles.president'), color: PALETTE.bubblegum, icon: 'star' };
  }
  if (member?.role === 'bureau') {
    return { label: member.title || t('clubSpace.members.roles.bureau'), color: PALETTE.periwinkle, icon: 'ribbon' };
  }
  return { label: t('clubSpace.members.roles.member'), color: PALETTE.white, icon: undefined };
}

export function RoleSticker({ member, t, rotate = -2, style }) {
  const info = roleInfo(member, t);
  return <Sticker label={info.label} color={info.color} icon={info.icon} rotate={rotate} small style={style} />;
}

/**
 * Pastille ronde avec l'initiale d'une personne, couleur stable par identifiant.
 */
export function Avatar({ name, seed, size = 44 }) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: accentFor(seed ?? name) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.42, lineHeight: size * 0.56 }]}>{initial}</Text>
    </View>
  );
}

/**
 * Jauge d'effectif : remplissage lime, repère vertical à l'objectif de la
 * charte (3/4 de la capacité).
 */
export function CapacityGauge({ count, max }) {
  if (!max) return null;
  const fill = Math.min(1, count / max);
  const goal = charterGoal(max);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${fill * 100}%` }, fill >= 1 && styles.fillFull]} />
      <View style={[styles.goalMark, { left: `${(goal / max) * 100}%` }]} />
    </View>
  );
}

/**
 * Styles de formulaire communs (sections blanches, champs papier).
 */
export const formStyles = StyleSheet.create({
  label: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: PALETTE.inkSoft,
    marginBottom: 8,
  },
  input: {
    backgroundColor: PALETTE.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: PALETTE.ink,
    borderWidth: 2,
    borderColor: PALETTE.ink,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  counter: {
    fontFamily: FONTS.varsityBold,
    fontSize: 13,
    color: PALETTE.inkSoft,
    textAlign: 'right',
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
});

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.display,
    color: PALETTE.ink,
  },
  track: {
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paper,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: PALETTE.lime,
    borderRightWidth: 2,
    borderRightColor: PALETTE.ink,
  },
  fillFull: {
    borderRightWidth: 0,
  },
  goalMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: STROKE,
    marginLeft: -1,
    backgroundColor: PALETTE.ink,
  },
});
