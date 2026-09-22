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
  ScrollView,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
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

const ALLOWED_EMAIL_DOMAINS = ['@aivancity.education', '@aivancity.ai'];

const isEmailAllowed = (email) => {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return ALLOWED_EMAIL_DOMAINS.some(domain => normalizedEmail.endsWith(domain));
};

/**
 * Écran d'inscription
 */
export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { signUp } = useAuth();
  const { t } = useLanguage();

  // Valider l'email en temps réel
  const handleEmailChange = (text) => {
    setEmail(text);
    setErrorMessage(''); // Clear general error
    if (text && !isEmailAllowed(text)) {
      setEmailError(t('auth.emailDomainRestriction'));
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async () => {
    setErrorMessage(''); // Reset error message

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage(t('auth.fillAllFields'));
      return;
    }

    // Vérification du domaine email
    if (!isEmailAllowed(email)) {
      setErrorMessage(t('auth.emailDomainRestrictionRegister'));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t('auth.weakPassword'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      console.log('Tentative d\'inscription...');
      const { data, error } = await signUp(email, password, {
        name: name,
        role: 'user',
      });

      console.log('Réponse inscription:', { data, error });

      if (error) {
        console.error('Erreur inscription:', error);

        // Gestion des erreurs spécifiques
        let message = error.message;
        if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          message = t('auth.tooManyAttempts');
        } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          message = t('auth.emailAlreadyUsed');
        } else if (error.message.includes('invalid') && error.message.includes('email')) {
          message = t('auth.invalidEmailAddress');
        }

        setErrorMessage(message);
        return;
      }

      // Si Supabase a créé une session directement (email confirmation désactivé)
      if (data?.session) {
        showAlert(t('auth.signupSuccessTitle'), t('auth.signupSuccessMessage'));
        return;
      }

      // Email de confirmation nécessaire - afficher le modal de succès
      console.log('Affichage du modal de succès');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Exception inscription:', err);
      setErrorMessage(t('auth.genericErrorRetry'));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <LanguageSwitcher style={styles.languageSwitcher} />

          <View style={styles.header}>
            <Ionicons name="person-add-outline" size={64} color={COLORS.primary} />
            <Text style={styles.title}>{t('auth.registerTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputContainer, nameFocused && styles.inputContainerFocused]}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.fullName')}
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={(text) => { setName(text); setErrorMessage(''); }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
              />
            </View>

            <View style={[
              styles.inputContainer,
              emailFocused && styles.inputContainerFocused,
              emailError ? styles.inputError : null,
            ]}>
              <Ionicons name="mail-outline" size={20} color={emailError ? COLORS.error : COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailDomainPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

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

            <View style={[styles.inputContainer, confirmPasswordFocused && styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth.confirmPassword')}
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(''); }}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={() => setConfirmPasswordFocused(false)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <FadeIn style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorMessageText}>{errorMessage}</Text>
              </FadeIn>
            ) : null}

            <PressableScale
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>{t('auth.signupButton')}</Text>
              )}
            </PressableScale>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                {t('auth.hasAccount')} <Text style={styles.linkTextBold}>{t('auth.loginButton')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de succès - Confirmation email */}
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="mail-unread" size={80} color={COLORS.success} />
            </View>

            <Text style={styles.modalTitle}>{t('auth.checkEmailTitle')}</Text>

            <Text style={styles.modalDescription}>
              {t('auth.confirmationEmailSentTo')}{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
              <Text style={styles.infoText}>
                {t('auth.clickLinkToActivate')}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={24} color={COLORS.warning} />
              <Text style={styles.infoText}>
                {t('auth.linkExpiresIn24h')}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="folder-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>
                {t('auth.checkSpamFolder')}
              </Text>
            </View>

            <PressableScale
              style={styles.modalButton}
              onPress={handleCloseSuccessModal}
            >
              <Text style={styles.modalButtonText}>{t('auth.goToLogin')}</Text>
            </PressableScale>
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
  scrollContent: {
    flexGrow: 1,
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
    zIndex: 1,
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
  inputError: {
    borderColor: COLORS.error,
    marginBottom: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
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
  errorMessageText: {
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
