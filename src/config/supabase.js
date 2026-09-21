/**
 * Configuration Supabase
 *
 * Pour obtenir vos clés :
 * 1. Allez sur https://supabase.com
 * 2. Créez un compte et un nouveau projet
 * 3. Allez dans Settings > API
 * 4. Copiez l'URL et la clé anon (public)
 * 5. Renseignez-les dans votre fichier .env (voir .env.example)
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validation
if (!SUPABASE_URL) {
  throw new Error('❌ EXPO_PUBLIC_SUPABASE_URL n\'est pas défini. Renseignez-le dans votre fichier .env (voir .env.example)');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY n\'est pas défini. Renseignez-le dans votre fichier .env (voir .env.example)');
}

// Vérifier que l'URL est valide
if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
  throw new Error(`❌ SUPABASE_URL invalide : "${SUPABASE_URL}" doit commencer par http:// ou https://`);
}

// Créer le client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase configuré avec succès');
console.log('📍 URL:', SUPABASE_URL);
