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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../constants/theme';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PressableScale from '../components/PressableScale';
import FadeIn from '../components/FadeIn';

/**
 * Écran de réinitialisation de mot de passe
 * Affiché quand l'utilisateur clique sur le lien de reset dans l'email
 */
// Helper pour les alertes cross-platform
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function ResetPasswordScreen({ onPasswordReset }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useLanguage();

  const handleResetPassword = async () => {
    setErrorMessage(''); // Reset error

    // Validation
    if (!password || !confirmPassword) {
      setErrorMessage(t('auth.fillAllFields'));
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
      console.log('Tentative de mise à jour du mot de passe...');

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      console.log('Réponse updateUser:', { data, error });

      if (error) {
        console.error('Erreur updateUser:', error);

        // Messages d'erreur personnalisés
        let message = error.message;
        if (error.message.includes('should be different')) {
          message = t('auth.passwordMustDiffer');
        } else if (error.message.includes('session') || error.status === 422) {
          message = t('auth.sessionExpired');
        }

        setErrorMessage(message);
        return;
      }

      showAlert(
        t('common.success'),
        t('auth.passwordUpdateSuccess'),
        [{ text: t('common.ok'), onPress: onPasswordReset }]
      );
    } catch (error) {
      console.error('Exception:', error);
      setErrorMessage(t('auth.genericErrorRetry'));
    } finally {
      setLoading(false);
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
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>{t('auth.newPasswordTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.newPasswordSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.newPasswordPlaceholder')}
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

          <Text style={styles.hint}>
            {t('auth.weakPassword')}
          </Text>

          {errorMessage ? (
            <FadeIn style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </FadeIn>
          ) : null}

          <PressableScale
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.updatePasswordButton')}</Text>
            )}
          </PressableScale>
        </View>
      </View>
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
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
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
  hint: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
