# 🔧 Résoudre l'erreur "invalid supabaseUrl"

Cette erreur signifie que Supabase n'est **pas configuré** dans votre application.

## ⚠️ Cause

Le fichier `src/config/supabase.js` contient encore les valeurs par défaut :
- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

Ces valeurs ne sont pas valides, d'où l'erreur.

## ✅ Solution : Configurer Supabase

### Étape 1 : Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte (gratuit)
3. Cliquez sur **"New Project"**
4. Remplissez :
   - **Name** : `bde-app` (ou le nom de votre choix)
   - **Database Password** : Choisissez un mot de passe fort ⚠️ **SAVEZ-LE**
   - **Region** : Choisissez la région la plus proche
5. Cliquez sur **"Create new project"**
6. Attendez 2-3 minutes que le projet soit créé

### Étape 2 : Obtenir les clés API

1. Dans votre projet Supabase, allez dans **Settings** (icône engrenage en bas à gauche)
2. Cliquez sur **API**
3. Vous verrez deux valeurs importantes :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : Une longue clé commençant par `eyJ...`

### Étape 3 : Configurer l'application

1. Ouvrez le fichier `src/config/supabase.js` dans votre éditeur
2. Remplacez :
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   
   Par vos vraies valeurs :
   ```javascript
   const SUPABASE_URL = 'https://xxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

   **Exemple concret :**
   ```javascript
   const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
   ```

3. **Sauvegardez** le fichier

### Étape 4 : Créer la base de données

1. Dans Supabase, allez dans **SQL Editor** (icône SQL dans la barre latérale)
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `database/schema.sql` de ce projet
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (ou appuyez sur Ctrl+Enter)
7. Vous devriez voir "Success. No rows returned"

### Étape 5 : Redémarrer l'application

1. **Arrêtez Expo** (Ctrl+C dans le terminal)
2. **Redémarrez** :
   ```bash
   npm start
   ```
3. **Rechargez** l'application dans Expo Go (secouez le téléphone > Reload)

## ✅ Vérification

Une fois configuré, vous devriez :
- ✅ Ne plus voir l'erreur "invalid supabaseUrl"
- ✅ Pouvoir vous inscrire
- ✅ Pouvoir vous connecter

## 🎯 Guide Complet

Pour un guide détaillé avec toutes les étapes, consultez :
- **`SETUP_SUPABASE.md`** : Guide complet de configuration

## ⚠️ Important

- ⚠️ **Ne partagez JAMAIS** vos clés Supabase publiquement
- ⚠️ **Ne commitez JAMAIS** `src/config/supabase.js` avec vos vraies clés dans Git
- ✅ Les clés `anon` sont publiques mais sécurisées par RLS (Row Level Security)

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez** que vous avez bien copié les clés (pas d'espaces avant/après)
2. **Vérifiez** que vous avez exécuté le script SQL
3. **Vérifiez** les erreurs dans le terminal
4. **Redémarrez** Expo avec cache nettoyé : `npx expo start -c`

## 📝 Exemple de Configuration Correcte

```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Une fois que vous avez remplacé les valeurs, l'erreur devrait disparaître ! 🎉
