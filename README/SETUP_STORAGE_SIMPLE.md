# 📸 Configuration Supabase Storage - Guide Simplifié

## 🚀 Configuration Rapide (5 minutes)

### Étape 1 : Créer le Bucket

1. **Supabase Dashboard** > **Storage**
2. Cliquez sur **"New bucket"**
3. Nom : `images`
4. ✅ **Cochez "Public bucket"** (très important !)
5. Cliquez sur **"Create bucket"**

### Étape 2 : Créer les Politiques via SQL Editor (Plus Simple)

1. Allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. **Copiez-collez** ce script complet :

```sql
-- Politique 1 : Tout le monde peut lire les images
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Politique 2 : Seuls les admins peuvent uploader
CREATE POLICY "Admin upload access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Politique 3 : Seuls les admins peuvent supprimer
CREATE POLICY "Admin delete access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
```

4. Cliquez sur **"Run"** (ou Ctrl+Enter)
5. Vous devriez voir "Success. No rows returned"

### Étape 3 : Vérifier

1. Allez dans **Storage** > **Policies**
2. Vous devriez voir 3 politiques créées :
   - ✅ Public read access
   - ✅ Admin upload access
   - ✅ Admin delete access

## ✅ C'est Fait !

Maintenant vous pouvez :
- ✅ Uploader des images depuis le mobile
- ✅ Prendre des photos avec l'appareil photo
- ✅ Les images seront visibles par tous les utilisateurs

## 🐛 Si vous avez une erreur

### Erreur : "policy already exists"
→ Les politiques existent déjà, c'est bon !

### Erreur : "bucket does not exist"
→ Vérifiez que le bucket `images` est bien créé

### Erreur : "relation does not exist"
→ Vérifiez que vous avez bien exécuté le script SQL `database/schema.sql` (pour créer la table `profiles`)

## 📝 Note

Si vous utilisez un autre nom de bucket que `images`, remplacez `'images'` par votre nom de bucket dans le script SQL.
