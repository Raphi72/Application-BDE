import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Text, { TextInput } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabase';
import { COLORS, FONTS, PALETTE, SECTION_COLORS, STROKE } from '../constants/theme';
import { PopButton, PopCard, PopPressable } from '../components/ui/Pop';
import { SectionTitle, Sticker, Wordmark } from '../components/ui/Deco';

// Helper pour les alertes cross-platform
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    if (buttons.length > 1) {
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

/**
 * Écran de profil utilisateur
 */
export default function ProfileScreen() {
  const { user, signOut, isAdmin } = useAuth();
  const { t, language, setLanguage, availableLanguages, getCurrentLanguage } = useLanguage();
  const [userProfile, setUserProfile] = useState(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // États pour la suppression de compte
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: password, 2: first confirm, 3: second confirm
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  React.useEffect(() => {
    loadProfile();
    checkAdminStatus();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const checkAdminStatus = async () => {
    const admin = await isAdmin();
    setAdminStatus(admin);
  };

  const handleSignOut = () => {
    // Sur web, Alert.alert ne gère pas toujours correctement les boutons (confirm/cancel)
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
      if (!ok) return;
      signOut().then(({ error }) => {
        if (error) Alert.alert('Erreur', 'Impossible de se déconnecter');
      });
      return;
    }

    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  // Ouvrir le modal de suppression
  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
    setDeleteModalVisible(true);
  };

  // Fermer le modal de suppression
  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
  };

  // Vérifier le mot de passe
  const verifyPassword = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Veuillez entrer votre mot de passe');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      // Tenter de se reconnecter avec le mot de passe pour vérifier
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (error) {
        setDeleteError('Mot de passe incorrect');
        setDeleteLoading(false);
        return;
      }

      // Mot de passe correct, passer à l'étape 2
      setDeleteStep(2);
    } catch (error) {
      setDeleteError('Erreur lors de la vérification');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Supprimer le compte
  const deleteAccount = async () => {
    setDeleteLoading(true);

    try {
      console.log('Début de la suppression du compte...');
      
      // Appeler la fonction RPC qui supprime tout (données + auth.users)
      const { error } = await supabase.rpc('delete_user');
      
      if (error) {
        console.error('Erreur RPC delete_user:', error);
        
        // Si la fonction RPC échoue, afficher l'erreur
        showAlert(
          'Erreur',
          'Impossible de supprimer le compte. Veuillez contacter l\'administrateur.\n\nDétail: ' + error.message
        );
        return;
      }

      console.log('Compte supprimé avec succès');
      closeDeleteModal();
      
      // Déconnecter l'utilisateur
      await signOut();
      
      showAlert(
        'Compte supprimé',
        'Votre compte a été supprimé avec succès.'
      );
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showAlert('Erreur', 'Impossible de supprimer le compte. Veuillez contacter l\'administrateur.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayName = userProfile?.name || user?.email?.split('@')[0] || t('profile.user');
  const initial = (displayName?.[0] || '?').toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Carte de membre */}
      <PopCard
        color={PALETTE.ink}
        shadowColor={SECTION_COLORS.Profile}
        radius={24}
        containerStyle={{ marginBottom: 26 }}
        style={styles.memberCard}
      >
        <View style={styles.stripes} pointerEvents="none">
          <View style={[styles.stripe, { backgroundColor: PALETTE.tangerine }]} />
          <View style={[styles.stripe, { backgroundColor: PALETTE.sun }]} />
          <View style={[styles.stripe, { backgroundColor: PALETTE.periwinkle }]} />
        </View>
        <View style={styles.cardTop}>
          <Wordmark size={20} color={PALETTE.paper} />
          <Sticker label={t('profile.memberCard')} color={PALETTE.sun} rotate={3} small />
        </View>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {user?.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardFooterText}>BDE AIVANCITY · {new Date().getFullYear()}</Text>
          <Sticker
            label={adminStatus ? t('profile.administrator') : t('profile.member')}
            icon={adminStatus ? 'shield-checkmark' : 'sparkles'}
            color={adminStatus ? PALETTE.tangerine : PALETTE.lime}
            rotate={-3}
            small
          />
        </View>
      </PopCard>

      <SectionTitle title={t('profile.settings')} />

      <PopPressable
        onPress={() => setLanguageModalVisible(true)}
        containerStyle={styles.rowSpacing}
        style={styles.row}
      >
        <View style={[styles.rowIcon, { backgroundColor: PALETTE.periwinkle }]}>
          <Ionicons name="language" size={20} color={PALETTE.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{t('profile.language')}</Text>
          <Text style={styles.rowValue}>
            {getCurrentLanguage().flag} {getCurrentLanguage().name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={PALETTE.ink} />
      </PopPressable>

      <PopCard containerStyle={styles.rowSpacing} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: PALETTE.mint }]}>
          <Ionicons name="mail" size={20} color={PALETTE.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{t('auth.email')}</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {user?.email || t('profile.notSpecified')}
          </Text>
        </View>
      </PopCard>

      <PopButton
        title={t('auth.logout')}
        icon="log-out-outline"
        variant="light"
        onPress={handleSignOut}
        containerStyle={{ marginTop: 10 }}
      />

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{t('profile.dangerZone')}</Text>
        <Pressable onPress={openDeleteModal} hitSlop={8} style={styles.deleteLink} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={styles.deleteLinkText}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Wordmark size={14} />
        <Text style={styles.footerText}>{t('profile.appVersion')}</Text>
      </View>

      {/* Modal de sélection de langue */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('profile.language')}</Text>
            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  language === lang.code && styles.languageNameActive,
                ]}>
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={PALETTE.ink} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal de suppression de compte */}
      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('profile.deleteAccountTitle')}</Text>
            <TouchableOpacity onPress={closeDeleteModal}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {deleteStep === 1 && (
              <>
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={40} color={COLORS.error} />
                  <Text style={styles.warningTitle}>Attention !</Text>
                  <Text style={styles.warningText}>
                    {t('profile.deleteAccountWarning')}
                  </Text>
                </View>

                <Text style={styles.stepLabel}>
                  {t('profile.deleteAccountStep1')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder={t('auth.password')}
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                />

                {deleteError ? (
                  <Text style={styles.errorText}>{deleteError}</Text>
                ) : null}

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={verifyPassword}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator color={PALETTE.ink} />
                  ) : (
                    <Text style={styles.deleteButtonText}>{t('profile.verify')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={40} color={COLORS.error} />
                  <Text style={styles.warningTitle}>{t('profile.firstConfirmation')}</Text>
                  <Text style={styles.warningText}>
                    {t('profile.deleteAccountConfirm1')}{'\n\n'}
                    {t('profile.deleteAccountData')}{'\n'}
                    {t('profile.deleteAccountDataList')}
                  </Text>
                </View>

                <Text style={styles.stepLabel}>
                  {t('profile.deleteAccountStep2')}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setDeleteStep(3)}
                  >
                    <Text style={styles.deleteButtonText}>{t('profile.continue')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {deleteStep === 3 && (
              <>
                <View style={[styles.warningBox, styles.finalWarningBox]}>
                  <Ionicons name="skull" size={40} color={COLORS.error} />
                  <Text style={styles.warningTitle}>{t('profile.lastChance')}</Text>
                  <Text style={styles.warningText}>
                    {t('profile.deleteAccountConfirm2')}
                  </Text>
                </View>

                <Text style={styles.stepLabel}>
                  {t('profile.deleteAccountStep3')}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>

                  <Pressable
                    style={[styles.deleteButton, styles.finalDeleteButton]}
                    onPress={deleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <ActivityIndicator color={PALETTE.ink} />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        {t('profile.deleteAccountFinal')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  memberCard: {
    padding: 18,
    borderColor: PALETTE.ink,
  },
  stripes: {
    position: 'absolute',
    top: -30,
    right: 34,
    flexDirection: 'row',
    gap: 8,
    transform: [{ rotate: '24deg' }],
  },
  stripe: {
    width: 12,
    height: 220,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    gap: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: STROKE,
    borderColor: PALETTE.paper,
    backgroundColor: PALETTE.bubblegum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontSize: 30,
    lineHeight: 38,
    color: PALETTE.ink,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 21,
    lineHeight: 28,
    color: PALETTE.paper,
  },
  email: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PALETTE.paper,
    opacity: 0.8,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  cardFooterText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 1,
    color: PALETTE.paper,
  },
  rowSpacing: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.inkSoft,
  },
  rowValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: PALETTE.ink,
  },
  dangerZone: {
    marginTop: 30,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: COLORS.surfaceLight,
  },
  dangerTitle: {
    fontFamily: FONTS.varsityBold,
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.inkSoft,
    marginBottom: 8,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  deleteLinkText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.error,
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 30,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Modales
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: SECTION_COLORS.Profile,
    borderBottomWidth: STROKE,
    borderBottomColor: PALETTE.ink,
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: PALETTE.ink,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  warningBox: {
    backgroundColor: '#FFE3DD',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  finalWarningBox: {
    backgroundColor: '#FFC9BF',
  },
  warningTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.error,
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    minWidth: 120,
  },
  cancelButtonText: {
    fontFamily: FONTS.varsity,
    fontSize: 18,
    textTransform: 'uppercase',
    color: COLORS.text,
  },
  deleteButton: {
    backgroundColor: PALETTE.cherry,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 150,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  finalDeleteButton: {
    backgroundColor: PALETTE.cherry,
  },
  deleteButtonText: {
    fontFamily: FONTS.varsity,
    fontSize: 18,
    textTransform: 'uppercase',
    color: PALETTE.ink,
  },
  // Sélecteur de langue
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
  },
  languageOptionActive: {
    backgroundColor: PALETTE.sun,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    color: COLORS.text,
  },
  languageNameActive: {
    color: COLORS.text,
  },
});
