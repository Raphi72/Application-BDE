import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Vérifie si on est dans Expo Go (les notifications ne fonctionnent pas dans Expo Go depuis SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Chargé uniquement hors Expo Go : le simple import d'expo-notifications y
// affiche une erreur (push Android retiré depuis SDK 53) et un avertissement.
const Notifications = isExpoGo ? null : require('expo-notifications');

// Configuration des notifications (seulement si pas dans Expo Go)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Service de gestion des notifications push
 */
class NotificationService {
  /**
   * Demande les permissions de notification et enregistre le token
   * @param {string} userId - L'ID de l'utilisateur connecté
   * @returns {Promise<string|null>} Le token ou null si refusé
   */
  async registerForPushNotifications(userId) {
    let token = null;

    // Les notifications push ne fonctionnent pas dans Expo Go depuis SDK 53
    if (isExpoGo) {
      console.log('⚠️ Notifications push désactivées dans Expo Go. Utilisez un development build pour les tester.');
      return null;
    }

    // Vérifier si c'est un appareil physique
    if (!Device.isDevice) {
      console.log('Les notifications push ne fonctionnent pas sur un émulateur');
      return null;
    }

    try {
      // Vérifier les permissions existantes
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Demander la permission si pas encore accordée
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission de notification refusée');
        return null;
      }

      // Configuration spécifique Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF5A1F',
        });
      }

      // Obtenir le token Expo Push
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('Project ID non trouvé, utilisation du token sans projectId');
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
      } else {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData.data;
      }

      console.log('Token de notification:', token);

      // Sauvegarder le token dans la base de données
      await this.saveTokenToDatabase(userId, token);

      return token;
    } catch (error) {
      console.error('Erreur lors de l\'obtention du token:', error);
      return null;
    }
  }

  /**
   * Sauvegarde le token dans la base de données Supabase
   */
  async saveTokenToDatabase(userId, token) {
    try {
      // Vérifier si le token existe déjà
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('token', token)
        .single();

      if (existing) {
        // Mettre à jour le token existant
        await supabase
          .from('push_tokens')
          .update({ 
            user_id: userId, 
            enabled: true,
            device_type: Platform.OS 
          })
          .eq('token', token);
      } else {
        // Insérer un nouveau token
        await supabase
          .from('push_tokens')
          .insert({
            user_id: userId,
            token: token,
            device_type: Platform.OS,
            enabled: true,
          });
      }

      console.log('Token sauvegardé dans la base de données');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }
  }

  /**
   * Supprime le token lors de la déconnexion
   */
  async removeToken(token) {
    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('token', token);
      console.log('Token supprimé');
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  }

  /**
   * Envoie une notification à tous les utilisateurs
   * @param {string} title - Titre de la notification
   * @param {string} body - Corps de la notification
   * @param {object} data - Données additionnelles (optionnel)
   */
  async sendNotificationToAll(title, body, data = {}) {
    try {
      // Récupérer tous les tokens actifs
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('enabled', true);

      if (error) {
        console.error('Erreur lors de la récupération des tokens:', error);
        return { success: false, error };
      }

      if (!tokens || tokens.length === 0) {
        console.log('Aucun token de notification trouvé');
        return { success: true, sent: 0 };
      }

      // Préparer les messages pour l'API Expo
      const messages = tokens.map(({ token }) => ({
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: data,
      }));

      // Envoyer via l'API Expo Push
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Notifications envoyées:', result);

      return { success: true, sent: tokens.length, result };
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications:', error);
      return { success: false, error };
    }
  }

  /**
   * Notification pour un nouvel événement
   */
  async notifyNewEvent(eventTitle) {
    return this.sendNotificationToAll(
      '🎉 Nouvel événement !',
      `${eventTitle} - Découvrez les détails dans l'application`,
      { type: 'event' }
    );
  }

  /**
   * Notification pour un nouveau sondage
   */
  async notifyNewPoll(pollQuestion) {
    return this.sendNotificationToAll(
      '📊 Nouveau sondage !',
      `${pollQuestion} - Donnez votre avis !`,
      { type: 'poll' }
    );
  }

  /**
   * Notification pour une nouvelle actualité
   */
  async notifyNewNews(newsTitle) {
    return this.sendNotificationToAll(
      '📰 Nouvelle actualité !',
      `${newsTitle}`,
      { type: 'news' }
    );
  }

  /**
   * Notification pour un nouveau club approuvé
   */
  async notifyNewClub(clubName) {
    return this.sendNotificationToAll(
      '🎊 Nouveau club !',
      `Le club "${clubName}" vient d'être créé. Rejoignez-le !`,
      { type: 'club' }
    );
  }

  /**
   * Notification locale (pour les tests)
   */
  async scheduleLocalNotification(title, body) {
    if (isExpoGo) {
      console.log('⚠️ Notifications locales désactivées dans Expo Go');
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: null, // Immédiat
      });
    } catch (error) {
      console.error('Erreur notification locale:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
