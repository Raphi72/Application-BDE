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
import { supabase } from '../config/supabase';
import { AUTH_EMAIL_REDIRECT_URL } from '../config/authEmail';
import { Ionicons } from '@expo/vector-icons';

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

  // États pour le mot de passe oublié
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(''); // Reset error message
    
    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs');
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
        message = 'Email ou mot de passe incorrect';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Veuillez confirmer votre email avant de vous connecter';
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
      showAlert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    // Vérifier le format email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      showAlert('Erreur', 'Veuillez entrer une adresse email valide');
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
          showAlert(
            'Trop de demandes',
            'Vous avez fait trop de demandes. Veuillez attendre quelques minutes avant de réessayer.'
          );
        } else {
          showAlert('Erreur', error.message);
        }
      } else {
        setResetSent(true);
      }
    } catch (error) {
      console.log('Exception reset password:', error);
      showAlert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
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
        <View style={styles.header}>
          <Ionicons name="school-outline" size={64} color="#7C5CFF" />
          <Text style={styles.title}>BDE App</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#888"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#ccc"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={openForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ff6b6b" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Pas encore de compte ? <Text style={styles.linkTextBold}>S'inscrire</Text>
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
            <Text style={styles.modalTitle}>Mot de passe oublié</Text>
            <TouchableOpacity onPress={closeForgotPassword}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {!resetSent ? (
              <>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="key-outline" size={60} color="#7C5CFF" />
                </View>

                <Text style={styles.modalDescription}>
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#ccc" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre adresse email"
                    placeholderTextColor="#888"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.rateLimitWarning}>
                  <Ionicons name="information-circle-outline" size={18} color="#FFB800" />
                  <Text style={styles.rateLimitText}>
                    Pour des raisons de sécurité, vous ne pouvez demander pas plus d'un lien par heure.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, resetLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Envoyer le lien</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                </View>

                <Text style={styles.successTitle}>Email envoyé !</Text>

                <Text style={styles.modalDescription}>
                  Un email de réinitialisation a été envoyé à{'\n'}
                  <Text style={styles.emailHighlight}>{resetEmail}</Text>
                </Text>

                <View style={styles.successInfoBox}>
                  <Ionicons name="mail-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successInfoText}>
                    Vérifiez votre boîte de réception et vos spams.
                  </Text>
                </View>

                <View style={styles.successInfoBox}>
                  <Ionicons name="time-outline" size={20} color="#FFB800" />
                  <Text style={styles.successInfoText}>
                    Le lien expire dans 1 heure.
                  </Text>
                </View>

                <View style={styles.successInfoBox}>
                  <Ionicons name="refresh-outline" size={20} color="#888" />
                  <Text style={styles.successInfoText}>
                    Pas reçu ? Attendez 60 secondes avant de redemander.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={closeForgotPassword}
                >
                  <Text style={styles.buttonText}>Retour à la connexion</Text>
                </TouchableOpacity>
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
    backgroundColor: '#0E0E13',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
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
    borderColor: '#7C5CFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: '#7C5CFF',
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
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#ccc',
  },
  linkTextBold: {
    fontWeight: 'bold',
    color: '#7C5CFF',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#7C5CFF',
    fontSize: 14,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0E0E13',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  emailHighlight: {
    color: '#7C5CFF',
    fontWeight: 'bold',
  },
  modalHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  rateLimitWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  rateLimitText: {
    flex: 1,
    color: '#FFB800',
    fontSize: 13,
    marginLeft: 10,
    lineHeight: 18,
  },
  successInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  successInfoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
  },
});
