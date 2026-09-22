import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabase';
import { AUTH_EMAIL_REDIRECT_URL } from '../config/authEmail';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PressableScale from '../components/PressableScale';
import FadeIn from '../components/FadeIn';

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
 * Écran de connexion
 */
export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn } = useAuth();

  // État de focus des champs (pour un contour visible uniquement sur le champ actif)
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resetEmailFocused, setResetEmailFocused] = useState(false);

  // États pour le mot de passe oublié
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { t } = useLanguage();

  const handleLogin = async () => {
    setErrorMessage(''); // Reset error message

    if (!email || !password) {
      setErrorMessage(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      console.log('Erreur de connexion:', error);
      // Message d'erreur plus clair pour l'utilisateur
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) {
        message = t('auth.loginError');
      } else if (error.message.includes('Email not confirmed')) {
        message = t('auth.emailConfirmRequired');
      }
      setErrorMessage(message);
    }
    // La navigation se fera automatiquement via AuthProvider
  };

  // Ouvrir le modal de réinitialisation
  const openForgotPassword = () => {
    setResetEmail(email); // Pré-remplir avec l'email déjà saisi
    setResetSent(false);
    setForgotPasswordModal(true);
  };

  // Fermer le modal
  const closeForgotPassword = () => {
    setForgotPasswordModal(false);
    setResetEmail('');
    setResetSent(false);
  };

  // Envoyer l'email de réinitialisation
  const handleResetPassword = async () => {
    if (!resetEmail) {
      showAlert(t('common.error'), t('auth.enterYourEmail'));
      return;
    }

    // Vérifier le format email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      showAlert(t('common.error'), t('auth.enterValidEmail'));
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        ...(AUTH_EMAIL_REDIRECT_URL ? { redirectTo: AUTH_EMAIL_REDIRECT_URL } : {}),
      });

      if (error) {
        console.log('Erreur reset password:', error);

        // Gérer l'erreur de trop de requêtes
        if (error.status === 429 || error.message?.includes('rate limit')) {
          showAlert(t('auth.tooManyRequests'), t('auth.tooManyRequestsMessage'));
        } else {
          showAlert(t('common.error'), error.message);
        }
      } else {
        setResetSent(true);
      }
    } catch (error) {
      console.log('Exception reset password:', error);
      showAlert(t('common.error'), t('auth.genericErrorRetry'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <LanguageSwitcher style={styles.languageSwitcher} />

        <View style={styles.header}>
          <Ionicons name="school-outline" size={64} color={COLORS.primary} />
          <Text style={styles.title}>BDE App</Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={openForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <FadeIn style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </FadeIn>
          ) : null}

          <PressableScale
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.loginButton')}</Text>
            )}
          </PressableScale>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              {t('auth.noAccount')} <Text style={styles.linkTextBold}>{t('auth.signupButton')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal mot de passe oublié */}
      <Modal
        visible={forgotPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForgotPassword}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('auth.forgotPasswordTitle')}</Text>
            <TouchableOpacity onPress={closeForgotPassword} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {!resetSent ? (
              <>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="key-outline" size={60} color={COLORS.primary} />
                </View>

                <Text style={styles.modalDescription}>
                  {t('auth.forgotPasswordDescription')}
                </Text>

                <View style={[styles.inputContainer, resetEmailFocused && styles.inputContainerFocused]}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.yourEmailAddress')}
                    placeholderTextColor={COLORS.textSecondary}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    onFocus={() => setResetEmailFocused(true)}
                    onBlur={() => setResetEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.rateLimitWarning}>
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                  <Text style={styles.rateLimitText}>
                    {t('auth.rateLimitWarning')}
                  </Text>
                </View>

                <PressableScale
                  style={[styles.button, resetLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.sendLink')}</Text>
                  )}
                </PressableScale>
              </>
            ) : (
              <>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                </View>

                <Text style={styles.successTitle}>{t('auth.emailSentTitle')}</Text>

                <Text style={styles.modalDescription}>
                  {t('auth.emailSentTo')}{'\n'}
                  <Text style={styles.emailHighlight}>{resetEmail}</Text>
                </Text>

                <View style={styles.successInfoBox}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.success} />
                  <Text style={styles.successInfoText}>
                    {t('auth.checkInboxSpam')}
                  </Text>
                </View>

                <View style={styles.successInfoBox}>
                  <Ionicons name="time-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.successInfoText}>
                    {t('auth.linkExpiresIn1h')}
                  </Text>
                </View>

                <View style={styles.successInfoBox}>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.successInfoText}>
                    {t('auth.resendWait60s')}
                  </Text>
                </View>

                <PressableScale
                  style={styles.button}
                  onPress={closeForgotPassword}
                >
                  <Text style={styles.buttonText}>{t('auth.backToLogin')}</Text>
                </PressableScale>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  languageSwitcher: {
    position: 'absolute',
    top: 8,
    right: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}26`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${COLORS.error}4D`,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkTextBold: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: 16,
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  modalHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  rateLimitWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.warning}1A`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${COLORS.warning}4D`,
  },
  rateLimitText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 13,
    marginLeft: 10,
    lineHeight: 18,
  },
  successInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  successInfoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 12,
  },
});
