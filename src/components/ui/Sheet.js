import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './AppText';
import { RoundButton } from './Pop';
import { FONTS, PALETTE, STROKE } from '../../constants/theme';

/**
 * Feuille modale qui monte du bas de l'écran : panneau papier à contour
 * encre, titre Display et bouton fermer rond. Toucher le fond la ferme.
 * Sert aux petits formulaires (demande d'adhésion, projet, rôle d'un membre).
 */
export function Sheet({ visible, onClose, title, children, closeLabel = 'Fermer' }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
        <View style={[styles.panel, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <RoundButton icon="close" size={38} onPress={onClose} accessibilityLabel={closeLabel} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 18, 14, 0.45)',
  },
  panel: {
    maxHeight: '88%',
    backgroundColor: PALETTE.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: STROKE,
    borderBottomWidth: 0,
    borderColor: PALETTE.ink,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 27,
    color: PALETTE.ink,
  },
});
