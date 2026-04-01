# 📸 Configuration Supabase Storage pour les Images

Pour pouvoir uploader des images depuis le mobile, vous devez configurer Supabase Storage.

## 📋 Étapes de Configuration

### 1. Créer un Bucket dans Supabase

1. **Allez dans Supabase Dashboard**
2. Cliquez sur **Storage** (dans la barre latérale)
3. Cliquez sur **"New bucket"** ou **"Create bucket"**
4. Remplissez :
   - **Name** : `images`
   - **Public bucket** : ✅ **Cochez cette case** (important pour que les images soient accessibles)
5. Cliquez sur **"Create bucket"**

### 2. Configurer les Politiques RLS

1. Dans **Storage**, cliquez sur votre bucket `images`
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New Policy"**

#### Politique 1 : Lecture publique (pour que tout le monde puisse voir les images)

1. Sélectionnez **"For full customization"**
2. Nom : `Public read access`
3. Allowed operation : **SELECT**
4. Target roles : `anon`, `authenticated`
5. Policy definition :
   ```sql
   bucket_id = 'images'
   ```
   **OU** si vous utilisez l'éditeur SQL directement :
   ```sql
   true
   ```
6. Cliquez sur **"Review"** puis **"Save policy"**

#### Politique 2 : Upload pour les admins

1. Cliquez sur **"New Policy"**
2. Sélectionnez **"For full customization"**
3. Nom : `Admin upload access`
4. Allowed operation : **INSERT**
5. Target roles : `authenticated`
6. Policy definition :
   ```sql
   bucket_id = 'images' AND
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
   )
   ```
7. Cliquez sur **"Review"** puis **"Save policy"**

#### Politique 3 : Suppression pour les admins

1. Cliquez sur **"New Policy"**
2. Sélectionnez **"For full customization"**
3. Nom : `Admin delete access`
4. Allowed operation : **DELETE**
5. Target roles : `authenticated`
6. Policy definition :
   ```sql
   bucket_id = 'images' AND
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
   )
   ```
7. Cliquez sur **"Review"** puis **"Save policy"**

---

## ⚠️ Alternative : Via SQL Editor (Plus Simple)

Si vous avez des erreurs avec l'interface, utilisez le **SQL Editor** :

1. Allez dans **SQL Editor**
2. Exécutez ce script complet :

```sql
-- Politique 1 : Lecture publique
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Politique 2 : Upload pour admins
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

-- Politique 3 : Suppression pour admins
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

### 3. Vérification

Une fois configuré, vous devriez avoir :
- ✅ Un bucket `images` créé
- ✅ 3 politiques RLS configurées
- ✅ Le bucket est public

## 🎯 Utilisation

Une fois configuré, l'application pourra :
- ✅ Uploader des images depuis la galerie
- ✅ Prendre des photos avec l'appareil photo
- ✅ Afficher les images uploadées
- ✅ Supprimer les images (admin uniquement)

## 🐛 Dépannage

### Erreur : "Bucket not found"
→ Vérifiez que le bucket `images` existe dans Supabase Storage

### Erreur : "new row violates row-level security policy"
→ Vérifiez que les politiques RLS sont bien créées

### Erreur : "Permission denied"
→ Vérifiez que vous êtes connecté en tant qu'admin

### Les images ne s'affichent pas
→ Vérifiez que le bucket est **public** (Public bucket = true)

## 📝 Note

Le nom du bucket est défini dans `src/services/imageUpload.js` :
```javascript
.from('images') // Changez ceci si vous utilisez un autre nom
```

Si vous utilisez un autre nom, modifiez-le dans le fichier.
