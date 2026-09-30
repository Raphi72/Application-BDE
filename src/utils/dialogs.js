import { Alert, Platform } from 'react-native';

/**
 * Boîtes de dialogue multiplateformes. Sur web, Alert.alert de
 * react-native-web ne fait rien : on passe par window.alert / window.confirm.
 */

/**
 * Message simple (succès, erreur).
 */
export function showMessage(title, message) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Demande de confirmation.
 * @returns {Promise<boolean>} true si l'utilisateur confirme
 */
export function confirmAction({ title, message, confirmLabel, cancelLabel, destructive = false }) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      // Toucher en dehors de la boîte (Android) vaut une annulation.
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
