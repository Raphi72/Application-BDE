import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Text from './AppText';
import { FONTS, PALETTE, STROKE } from '../../constants/theme';

/**
 * Logotype texte « NØVYX ».
 */
export function Wordmark({ size = 16, color = PALETTE.ink, style }) {
  return (
    <Text
      style={[
        { fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.25, color, letterSpacing: size * 0.02 },
        style,
      ]}
    >
      NØVYX
    </Text>
  );
}

/**
 * Pastille autocollante légèrement de travers (statuts, catégories, compteurs).
 */
export function Sticker({ label, color = PALETTE.sun, textColor = PALETTE.ink, rotate = -3, icon, small = false, style }) {
  const fontSize = small ? 13 : 16;
  return (
    <View
      style={[
        styles.sticker,
        small && styles.stickerSmall,
        { backgroundColor: color, transform: [{ rotate: `${rotate}deg` }] },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={fontSize} color={textColor} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.stickerText, { fontSize, lineHeight: fontSize * 1.2, color: textColor }]}>{label}</Text>
    </View>
  );
}

function starPoints(size, spikes, innerRatio, inset) {
  const c = size / 2;
  const outer = c - inset;
  const inner = outer * innerRatio;
  const pts = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Étoile « explosion » façon affiche de soirée, avec un texte au centre
 * (compte à rebours, « NEW », « COMPLET »…).
 */
export function Burst({ label, sublabel, size = 76, color = PALETTE.bubblegum, textColor = PALETTE.ink, rotate = -12, style }) {
  return (
    <View style={[{ width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <Svg width={size} height={size}>
        <Polygon
          points={starPoints(size, 12, 0.78, STROKE)}
          fill={color}
          stroke={PALETTE.ink}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.burstLabel, { color: textColor, fontSize: size * 0.27, lineHeight: size * 0.3 }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.burstSub, { color: textColor, fontSize: size * 0.14, lineHeight: size * 0.16 }]}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Bord inférieur en dents de scie d'un bandeau de couleur (headers).
 */
export function Zigzag({ color, width, depth = 10, period = 18 }) {
  const s = STROKE / 2 + 0.5;
  const zig = [];
  for (let x = 0; x <= width + period; x += period) {
    zig.push(`${x},${s}`, `${x + period / 2},${depth + s}`);
  }
  const end = Math.ceil(width / period) * period + period;
  return (
    <Svg width={width} height={depth + s * 2 + 1} style={{ marginTop: -1 }}>
      <Polygon points={`0,0 ${zig.join(' ')} ${end},0`} fill={color} />
      <Polyline points={zig.join(' ')} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE} strokeLinejoin="miter" />
    </Svg>
  );
}

/**
 * Sélecteur à deux (ou plus) options, en pilule encrée.
 */
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={6}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {opt.icon ? (
              <Ionicons name={opt.icon} size={15} color={active ? PALETTE.paper : PALETTE.ink} style={{ marginRight: 5 }} />
            ) : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Titre de section dans une liste, avec compteur en pastille.
 */
export function SectionTitle({ title, count, color = PALETTE.sun, style }) {
  return (
    <View style={[styles.sectionTitleRow, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count != null ? <Sticker label={String(count)} color={color} rotate={4} small style={{ marginLeft: 10 }} /> : null}
    </View>
  );
}

/**
 * État vide festif : pastille emoji, titre display, message.
 */
export function EmptyState({ emoji, title, message, color = PALETTE.sun, children }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyBadge, { backgroundColor: color }]}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticker: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: PALETTE.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stickerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  stickerText: {
    fontFamily: FONTS.varsity,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  burstLabel: {
    fontFamily: FONTS.varsity,
    textAlign: 'center',
    includeFontPadding: false,
  },
  burstSub: {
    fontFamily: FONTS.varsityBold,
    textAlign: 'center',
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: PALETTE.white,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: PALETTE.ink,
  },
  segmentText: {
    fontFamily: FONTS.varsity,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  segmentTextActive: {
    color: PALETTE.paper,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.varsity,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    color: PALETTE.ink,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: PALETTE.inkSoft,
  },
});
