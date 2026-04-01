# ✅ Vérification de la Configuration Supabase

## Checklist de Vérification

### 1. ✅ Script SQL exécuté
Vous avez vu "Success. No rows returned" → **C'est normal et correct !**

### 2. Vérifier les clés dans `src/config/supabase.js`

Ouvrez le fichier et vérifiez que vous avez remplacé :

```javascript
// ❌ MAUVAIS (ne fonctionnera pas)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ✅ BON (doit ressembler à ça)
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

**Vérifiez :**
- [ ] L'URL commence par `https://`
- [ ] L'URL se termine par `.supabase.co`
- [ ] La clé commence par `eyJ`
- [ ] La clé est très longue (plusieurs centaines de caractères)
- [ ] Pas d'espaces avant/après les valeurs
- [ ] Les guillemets sont bien présents

### 3. Vérifier dans Supabase Dashboard

1. Allez dans **Settings** > **API**
2. Vérifiez que l'URL correspond à celle dans votre code
3. Vérifiez que la clé "anon public" correspond

### 4. Vérifier les tables créées

1. Dans Supabase, allez dans **Table Editor**
2. Vous devriez voir ces tables :
   - [ ] `profiles`
   - [ ] `events`
   - [ ] `polls`
   - [ ] `votes`
   - [ ] `news`
   - [ ] `clubs`
   - [ ] `event_registrations`
   - [ ] `gallery_albums`
   - [ ] `gallery_images`

Si une table manque, réexécutez le script SQL.

### 5. Vérifier les politiques RLS

1. Dans Supabase, allez dans **Authentication** > **Policies**
2. Ou dans **Table Editor**, cliquez sur une table > **Policies**
3. Vous devriez voir des politiques créées pour chaque table

### 6. Tester la connexion

Dans le terminal où vous avez lancé `npm start`, regardez les logs. Vous ne devriez **PAS** voir :
- ❌ "invalid supabaseUrl"
- ❌ "Failed to fetch"
- ❌ "Network request failed"

## 🔍 Diagnostic de l'Erreur

### Quelle erreur voyez-vous exactement ?

1. **Dans le terminal** : Copiez le message d'erreur complet
2. **Dans Expo Go** : Secouez le téléphone > "View error log" > Copiez l'erreur
3. **Dans la console** : Si vous avez activé le debug, regardez la console

### Erreurs courantes après configuration :

#### Erreur : "invalid supabaseUrl"
→ Les clés ne sont pas correctement configurées dans `src/config/supabase.js`

#### Erreur : "relation does not exist"
→ Le script SQL n'a pas été exécuté ou a échoué

#### Erreur : "permission denied"
→ Les politiques RLS ne sont pas créées

#### Erreur : "Failed to fetch"
→ Problème de connexion réseau ou clés incorrectes

## 🛠️ Solutions

### Solution 1 : Vérifier le fichier de configuration

1. Ouvrez `src/config/supabase.js`
2. Vérifiez que les valeurs sont bien remplacées
3. Vérifiez qu'il n'y a pas d'erreur de syntaxe
4. Sauvegardez le fichier

### Solution 2 : Redémarrer complètement

```bash
# Arrêtez Expo (Ctrl+C)

# Nettoyez le cache
npx expo start -c

# Ou supprimez le cache manuellement
Remove-Item -Recurse -Force .expo
npm start
```

### Solution 3 : Vérifier dans Supabase

1. Allez dans **Settings** > **API**
2. Copiez à nouveau l'URL et la clé
3. Collez-les dans `src/config/supabase.js`
4. Sauvegardez et redémarrez

### Solution 4 : Tester la connexion manuellement

Créez un fichier de test temporaire :

```javascript
// test-supabase.js (à supprimer après)
import { supabase } from './src/config/supabase.js';

async function test() {
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Test Supabase:', error ? '❌ Erreur: ' + error.message : '✅ Connecté !');
}

test();
```

## 📝 Format Correct des Clés

### URL Supabase :
```
https://[votre-id-projet].supabase.co
```

Exemple :
```
https://abcdefghijklmnop.supabase.co
```

### Clé Anon :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI5MCwiZXhwIjoxOTU0NTQzMjkwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

(La clé est beaucoup plus longue, environ 200-300 caractères)

## 🆘 Si Rien Ne Fonctionne

1. **Copiez le message d'erreur exact** du terminal
2. **Copiez le message d'erreur** d'Expo Go (si visible)
3. **Vérifiez** que `src/config/supabase.js` contient bien vos vraies clés
4. **Vérifiez** dans Supabase Dashboard que le projet est actif

Ensuite, partagez ces informations pour un diagnostic plus précis.
