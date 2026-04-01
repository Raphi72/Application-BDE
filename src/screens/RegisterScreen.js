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
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { signUp } = useAuth();

  // Valider l'email en temps réel
  const handleEmailChange = (text) => {
    setEmail(text);
    setErrorMessage(''); // Clear general error
    if (text && !isEmailAllowed(text)) {
      setEmailError('Seules les adresses @aivancity.education et @aivancity.ai sont autorisées');
    } else {
      setEmailError('');
    }
  };

  const handleRegister = async () => {
    setErrorMessage(''); // Reset error message
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }

    // Vérification du domaine email
    if (!isEmailAllowed(email)) {
      setErrorMessage('Seules les adresses @aivancity.education et @aivancity.ai peuvent s\'inscrire.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas');
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
          message = 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
        } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          message = 'Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.';
        } else if (error.message.includes('invalid') && error.message.includes('email')) {
          message = 'Adresse email invalide.';
        }
        
        setErrorMessage(message);
        return;
      }

      // Si Supabase a créé une session directement (email confirmation désactivé)
      if (data?.session) {
        showAlert(
          'Inscription réussie',
          'Votre compte a été créé et vous êtes connecté. Bienvenue !'
        );
        return;
      }

      // Email de confirmation nécessaire - afficher le modal de succès
      console.log('Affichage du modal de succès');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Exception inscription:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
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
          <View style={styles.header}>
            <Ionicons name="person-add-outline" size={64} color="#7C5CFF" />
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez la communauté BDE</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#ccc" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                placeholderTextColor="#888"
                value={name}
                onChangeText={(text) => { setName(text); setErrorMessage(''); }}
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={20} color={emailError ? '#ff4444' : '#ccc'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email (@aivancity.education / .ai)"
                placeholderTextColor="#888"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#ccc" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setErrorMessage(''); }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#ccc"
                />
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ff6b6b" />
                <Text style={styles.errorMessageText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Déjà un compte ? <Text style={styles.linkTextBold}>Se connecter</Text>
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
              <Ionicons name="mail-unread" size={80} color="#4CAF50" />
            </View>

            <Text style={styles.modalTitle}>Vérifiez votre email !</Text>

            <Text style={styles.modalDescription}>
              Un email de confirmation a été envoyé à{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.infoText}>
                Cliquez sur le lien dans l'email pour activer votre compte
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={24} color="#FFB800" />
              <Text style={styles.infoText}>
                Le lien expire dans 24 heures
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="folder-outline" size={24} color="#888" />
              <Text style={styles.infoText}>
                Pensez à vérifier vos spams si vous ne trouvez pas l'email
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseSuccessModal}
            >
              <Text style={styles.modalButtonText}>Aller à la connexion</Text>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
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
  inputError: {
    borderColor: '#ff4444',
    marginBottom: 4,
  },
  errorText: {
    color: '#ff4444',
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
  errorMessageText: {
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0E0E13',
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
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emailHighlight: {
    color: '#7C5CFF',
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
