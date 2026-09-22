import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabase';
import { COLORS, SHADOWS } from '../constants/theme';
import PressableScale from '../components/PressableScale';

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
export default function ProfileScreen({ navigation }) {
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>
          {userProfile?.name || user?.email?.split('@')[0] || t('profile.user')}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {adminStatus && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={styles.adminBadgeText}>{t('profile.administrator')}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.accountInfo')}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('auth.email')}</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('auth.name')}</Text>
              <Text style={styles.infoValue}>
                {userProfile?.name || t('profile.notSpecified')}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.role')}</Text>
              <Text style={styles.infoValue}>
                {adminStatus ? t('profile.administrator') : t('profile.user')}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.infoRow, styles.infoRowClickable]}
            onPress={() => setLanguageModalVisible(true)}
          >
            <Ionicons name="language-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.language')}</Text>
              <Text style={styles.infoValue}>
                {getCurrentLanguage().flag} {getCurrentLanguage().name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {adminStatus && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Admin')}
          >
            <Ionicons name="settings" size={24} color={COLORS.primary} />
            <Text style={styles.menuItemText}>{t('profile.adminPanel')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <PressableScale
          style={[styles.menuItem, styles.dangerItem]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={[styles.menuItemText, styles.dangerText]}>
            {t('auth.logout')}
          </Text>
        </PressableScale>

        <PressableScale
          style={[styles.menuItem, styles.deleteItem]}
          onPress={openDeleteModal}
        >
          <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          <Text style={[styles.menuItemText, styles.deleteText]}>
            {t('profile.deleteAccount')}
          </Text>
        </PressableScale>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('profile.appVersion')}</Text>
        <Text style={styles.footerSubText}>{t('profile.appMayContainBugs')}</Text>
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
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
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
                    <ActivityIndicator color="#fff" />
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

                  <PressableScale
                    style={[styles.deleteButton, styles.finalDeleteButton]}
                    onPress={deleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        {t('profile.deleteAccountFinal')}
                      </Text>
                    )}
                  </PressableScale>
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
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  avatarContainer: {
    marginBottom: 16,
    ...SHADOWS.neon,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  adminBadgeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  infoRowClickable: {
    borderBottomWidth: 0,
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 16,
  },
  dangerItem: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  dangerText: {
    color: COLORS.error,
  },
  deleteItem: {
    borderColor: `${COLORS.error}80`,
    backgroundColor: `${COLORS.error}1A`,
  },
  deleteText: {
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerSubText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    opacity: 0.7,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  warningBox: {
    backgroundColor: `${COLORS.error}1A`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${COLORS.error}4D`,
  },
  finalWarningBox: {
    backgroundColor: `${COLORS.error}33`,
    borderColor: COLORS.error,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 120,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 150,
  },
  finalDeleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Language selector styles
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  languageOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageName: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  languageNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
