# 🔍 Diagnostic de l'Erreur

## ✅ Ce qui est fait

- [x] Script SQL exécuté ("Success. No rows returned" = normal)
- [x] Clés Supabase configurées dans `src/config/supabase.js`

## ❓ Quelle erreur voyez-vous maintenant ?

### 1. Dans le terminal

Regardez le terminal où vous avez lancé `npm start`. 

**Copiez le message d'erreur complet** (s'il y en a un).

### 2. Dans Expo Go

1. **Secouez votre téléphone** pour ouvrir le menu
2. Sélectionnez **"View error log"** ou **"Show error log"**
3. **Copiez le message d'erreur** affiché

### 3. Sur l'écran de l'application

- Voyez-vous un écran rouge avec une erreur ?
- Voyez-vous un écran blanc ?
- Voyez-vous l'écran de connexion ?
- Autre chose ?

## 🔍 Vérifications à faire

### Vérification 1 : Les tables sont créées

1. Allez dans **Supabase Dashboard**
2. Cliquez sur **Table Editor** (icône table dans la barre latérale)
3. Vous devriez voir ces tables :
   - `profiles`
   - `events`
   - `polls`
   - `votes`
   - `news`
   - `clubs`
   - `event_registrations`
   - `gallery_albums`
   - `gallery_images`

**Si une table manque** : Réexécutez le script SQL.

### Vérification 2 : Les politiques RLS

1. Dans **Table Editor**, cliquez sur une table (ex: `events`)
2. Cliquez sur l'onglet **"Policies"** en haut
3. Vous devriez voir des politiques créées

**Si pas de politiques** : Réexécutez le script SQL.

### Vérification 3 : Le trigger pour les profils

1. Allez dans **SQL Editor**
2. Exécutez cette requête :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
3. Vous devriez voir une ligne de résultat

**Si pas de résultat** : Le trigger n'est pas créé. Réexécutez le script SQL.

## 🛠️ Solutions selon l'erreur

### Si vous voyez "invalid supabaseUrl"

→ Les clés ne sont pas correctement lues. Vérifiez `src/config/supabase.js` et redémarrez.

### Si vous voyez "relation does not exist"

→ Les tables ne sont pas créées. Réexécutez le script SQL.

### Si vous voyez "permission denied"

→ Les politiques RLS ne sont pas créées. Réexécutez le script SQL.

### Si vous voyez "Failed to fetch" ou erreur réseau

→ Problème de connexion. Vérifiez votre connexion internet.

### Si l'écran reste blanc

→ Regardez les erreurs dans le terminal ou dans Expo Go (secouez le téléphone).

## 📝 Prochaines étapes

1. **Copiez l'erreur exacte** que vous voyez
2. **Vérifiez** que les tables existent dans Supabase
3. **Partagez** ces informations pour un diagnostic précis

## 🔄 Redémarrage complet

Si vous voulez tout redémarrer proprement :

```bash
# 1. Arrêtez Expo (Ctrl+C)

# 2. Nettoyez le cache
npx expo start -c

# 3. Rechargez l'application dans Expo Go
# (Secouez le téléphone > Reload)
```
