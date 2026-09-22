import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

/**
 * Barre d'onglets du bas, visuellement identique à l'ancienne barre native
 * de react-navigation/bottom-tabs, mais pilotée manuellement pour rester
 * synchronisée avec le pager swipeable (catégories) et l'écran Admin,
 * qui vivent tous les deux dans le même conteneur (voir MainTabs).
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
  const basePaddingBottom = Platform.OS === 'android' ? 12 : 5;

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, basePaddingBottom) },
      ]}
    >
      {tabs.map((tab) => {
        const focused = !adminActive && tab.name === activeTabName;
        const color = focused ? COLORS.primary : COLORS.textSecondary;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.name)}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={24} color={color} />
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}

      {isAdmin && (
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.7}
          onPress={onSelectAdmin}
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name={adminActive ? 'settings' : 'settings-outline'}
              size={24}
              color={adminActive ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <Text
            style={[styles.label, { color: adminActive ? COLORS.primary : COLORS.textSecondary }]}
            numberOfLines={1}
          >
            {adminLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    minHeight: 65,
    paddingTop: 5,
    paddingHorizontal: 20,
  },
  item: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 55,
  },
  iconWrapper: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
