# 🧪 Tester Supabase Storage

## Vérifications à Faire

### 1. Vérifier que vous êtes bien connecté en tant qu'admin

1. Dans l'application, allez dans **Profil**
2. Vérifiez que vous voyez le badge **"Administrateur"**
3. Si vous ne le voyez pas :
   - Allez dans Supabase > Table Editor > profiles
   - Vérifiez que votre compte a `role = 'admin'`
   - Déconnectez-vous et reconnectez-vous dans l'app

### 2. Vérifier les Politiques Storage

1. **Supabase Dashboard** > **Storage** > **Policies**
2. Vous devriez voir 3 politiques pour le bucket `images` :
   - ✅ Public read access
   - ✅ Admin upload access  
   - ✅ Admin delete access

**Si les politiques n'existent pas**, exécutez le script SQL de `SETUP_STORAGE_SIMPLE.md`

### 3. Tester l'Upload Manuellement dans Supabase

1. **Supabase Dashboard** > **Storage** > **Files**
2. Cliquez sur le bucket **`images`**
3. Cliquez sur **"Upload file"**
4. Essayez d'uploader un fichier image

**Si ça ne fonctionne pas** : Le problème vient de Supabase, pas de votre code.

**Si ça fonctionne** : Le problème vient du code ou de l'authentification dans l'app.

### 4. Vérifier les Logs Détaillés

Quand vous essayez d'uploader dans l'app, regardez le terminal où vous avez lancé `npm start`. Vous devriez voir des logs détaillés de l'erreur.

## 🔍 Diagnostic

### Erreur : "Politique RLS"
→ Les politiques Storage ne sont pas correctement configurées ou vous n'êtes pas admin.

### Erreur : "Bucket not found"
→ Le bucket existe mais n'est pas accessible (problème de permissions ou d'authentification).

### Erreur : "Network request failed"
→ Problème de connexion réseau ou les politiques bloquent l'accès.

## ✅ Solution Rapide

1. **Vérifiez** que vous êtes admin dans l'app (badge visible)
2. **Vérifiez** les politiques dans Storage > Policies (3 politiques doivent exister)
3. **Déconnectez-vous** et **reconnectez-vous** dans l'app
4. **Réessayez** l'upload

## 🆘 Si Rien Ne Fonctionne

Utilisez temporairement des **URLs d'images** (ex: Unsplash) en attendant de résoudre le problème Storage.
