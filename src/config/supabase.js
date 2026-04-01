/**
 * Configuration Supabase
 * 
 * Pour obtenir vos clés :
 * 1. Allez sur https://supabase.com
 * 2. Créez un compte et un nouveau projet
 * 3. Allez dans Settings > API
 * 4. Copiez l'URL et la clé anon (public)
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// ⚠️ REMPLACEZ CES VALEURS PAR VOS VRAIES CLÉS SUPABASE
const SUPABASE_URL = 'https://njuuofkvsncqvfvawhhg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdXVvZmt2c25jcXZmdmF3aGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTQ3MzksImV4cCI6MjA4NTE3MDczOX0.s8BJ73LuJukGae7U9RGtynFiDTuriyubfAAIl9SiYJ8';

// Validation
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  throw new Error('❌ SUPABASE_URL n\'est pas configuré dans src/config/supabase.js');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  throw new Error('❌ SUPABASE_ANON_KEY n\'est pas configuré dans src/config/supabase.js');
}

// Vérifier que l'URL est valide
if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
  throw new Error(`❌ SUPABASE_URL invalide : "${SUPABASE_URL}" doit commencer par http:// ou https://`);
}

// Créer le client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase configuré avec succès');
console.log('📍 URL:', SUPABASE_URL);
