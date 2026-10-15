import { Platform } from 'react-native';

/**
 * Configuration des emails d'authentification (Supabase).
 *
 * IMPORTANT:
 * - La clé SMTP Brevo NE doit PAS être dans l'app mobile.
 * - Elle se configure uniquement dans Supabase > Authentication > SMTP Settings.
 *
 * URL de redirection des emails de confirmation et de réinitialisation :
 * - app mobile : EXPO_PUBLIC_AUTH_REDIRECT_URL (bdeapp://auth/callback) ;
 * - version web : la page de l'app elle-même (https://bde-aivancity.com/app/),
 *   car Safari ne sait pas ouvrir bdeapp:// sans l'app installée. Cette URL
 *   doit figurer dans Supabase > Authentication > URL Configuration >
 *   Redirect URLs, sinon Supabase renvoie vers la Site URL.
 */
export const AUTH_EMAIL_REDIRECT_URL = Platform.OS === 'web'
  ? `${window.location.origin}${window.location.pathname}`
  : process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;
