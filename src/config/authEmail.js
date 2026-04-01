/**
 * Configuration des emails d'authentification (Supabase).
 *
 * IMPORTANT:
 * - La clé SMTP Brevo NE doit PAS être dans l'app mobile.
 * - Elle se configure uniquement dans Supabase > Authentication > SMTP Settings.
 *
 * EXPO_PUBLIC_AUTH_REDIRECT_URL:
 * - URL de redirection utilisée dans les emails de confirmation/reset.
 * - Exemple web: https://ton-domaine.com/auth/callback
 * - Exemple deep link app: bdeapp://auth/callback
 */
export const AUTH_EMAIL_REDIRECT_URL = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;

