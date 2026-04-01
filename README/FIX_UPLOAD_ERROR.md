# 🔧 Résoudre l'erreur "Network request failed" lors de l'upload

Cette erreur signifie que l'upload vers Supabase Storage échoue. Voici comment la résoudre.

## ✅ Checklist de Vérification

### 1. Le bucket existe-t-il ?

1. **Allez dans Supabase Dashboard** > **Storage**
2. Vérifiez que vous voyez un bucket nommé **`images`**
3. Si le bucket n'existe pas :
   - Cliquez sur **"New bucket"**
   - Nom : `images`
   - ✅ **Cochez "Public bucket"**
   - Cliquez sur **"Create bucket"**

### 2. Les politiques RLS sont-elles configurées ?

1. Dans **Storage** > **Policies**
2. Vous devriez voir 3 politiques :
   - ✅ Public read access
   - ✅ Admin upload access
   - ✅ Admin delete access

**Si les politiques n'existent pas**, utilisez le SQL Editor (voir `SETUP_STORAGE_SIMPLE.md`)

### 3. Êtes-vous connecté en tant qu'admin ?

1. Vérifiez dans **Table Editor** > **profiles**
2. Votre utilisateur doit avoir `role = 'admin'`
3. Si ce n'est pas le cas, modifiez-le

### 4. Le bucket est-il public ?

1. Dans **Storage**, cliquez sur le bucket `images`
2. Vérifiez que **"Public bucket"** est activé
3. Si ce n'est pas le cas, modifiez les paramètres du bucket

## 🛠️ Solutions

### Solution 1 : Vérifier la Configuration Supabase

Assurez-vous que :
- ✅ Le bucket `images` existe
- ✅ Le bucket est **public**
- ✅ Les politiques RLS sont créées
- ✅ Vous êtes connecté en tant qu'admin

### Solution 2 : Recréer les Politiques via SQL

Si les politiques ne fonctionnent pas, supprimez-les et recréez-les :

1. **SQL Editor** dans Supabase
2. Exécutez d'abord (pour supprimer les anciennes) :
   ```sql
   DROP POLICY IF EXISTS "Public read access" ON storage.objects;
   DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
   DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;
   ```

3. Puis exécutez le script de création (voir `SETUP_STORAGE_SIMPLE.md`)

### Solution 3 : Vérifier les Permissions

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous** avec votre compte admin
3. **Réessayez** l'upload

### Solution 4 : Tester avec une URL d'image

En attendant de résoudre le problème Storage, vous pouvez :
1. Utiliser une **URL d'image** (ex: depuis Unsplash)
2. Coller l'URL dans le champ "Image (URL)"
3. L'image s'affichera normalement

## 🔍 Diagnostic

### Vérifier dans Supabase

1. Allez dans **Storage** > **Files**
2. Essayez d'uploader manuellement un fichier via l'interface
3. Si ça ne fonctionne pas, le problème vient de la configuration Storage
4. Si ça fonctionne, le problème vient du code

### Vérifier les Logs

Dans le terminal où vous avez lancé `npm start`, regardez les erreurs détaillées.

## 📝 Erreurs Courantes

### "Bucket not found"
→ Le bucket `images` n'existe pas. Créez-le.

### "new row violates row-level security policy"
→ Les politiques RLS ne sont pas configurées ou incorrectes.

### "Permission denied"
→ Vous n'êtes pas connecté en tant qu'admin.

### "Network request failed"
→ Problème de connexion ou bucket non configuré.

## ✅ Solution Rapide

1. **Vérifiez** que le bucket `images` existe et est public
2. **Exécutez** le script SQL de `SETUP_STORAGE_SIMPLE.md`
3. **Déconnectez-vous** et **reconnectez-vous** dans l'app
4. **Réessayez** l'upload

## 🆘 Si Rien Ne Fonctionne

Utilisez temporairement des URLs d'images (ex: Unsplash) en attendant de résoudre le problème Storage.
