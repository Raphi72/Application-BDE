import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '../components/ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PopCard } from '../components/ui/Pop';
import { FONTS, PALETTE, SECTION_COLORS } from '../constants/theme';

/**
 * Barre d'onglets du bas : pilule encre flottante. L'onglet actif prend la
 * couleur de sa rubrique (pastille derrière l'icône + libellé), et l'ombre
 * dure de la barre suit cette couleur, ce qui situe la rubrique d'un coup
 * d'œil pendant le swipe. Pilotée manuellement pour rester synchronisée avec
 * le pager de catégories et l'écran Admin (voir CategoryPagerView).
 */
export default function CustomBottomTabBar({
  tabs,
  activeTabName,
  onSelectTab,
  isAdmin,
  adminActive,
  adminLabel,
  onSelectAdmin,
}) {
  const insets = useSafeAreaInsets();
  const activeColor = adminActive
    ? SECTION_COLORS.Admin
    : tabs.find((tab) => tab.name === activeTabName)?.color ?? PALETTE.tangerine;

  const items = tabs.map((tab) => ({
    key: tab.name,
    icon: tab.icon,
    label: tab.title,
    color: tab.color,
    focused: !adminActive && tab.name === activeTabName,
    onPress: () => onSelectTab(tab.name),
  }));
  if (isAdmin) {
    items.push({
      key: 'Admin',
      icon: 'settings',
      label: adminLabel,
      color: SECTION_COLORS.Admin,
      focused: adminActive,
      onPress: onSelectAdmin,
    });
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <PopCard color={PALETTE.ink} shadowColor={activeColor} radius={26} style={styles.bar}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={item.onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.focused }}
            accessibilityLabel={item.label}
          >
            <View style={[styles.iconPill, item.focused && { backgroundColor: item.color }]}>
              <Ionicons
                name={item.focused ? item.icon : `${item.icon}-outline`}
                size={22}
                color={item.focused ? PALETTE.ink : PALETTE.paper}
                style={!item.focused && styles.inactive}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, item.focused ? { color: item.color } : styles.inactive]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </PopCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: PALETTE.paper,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  bar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  iconPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontFamily: FONTS.varsity,
    fontSize: 13,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.paper,
    includeFontPadding: false,
  },
  inactive: {
    color: PALETTE.paper,
    opacity: 0.6,
  },
});
