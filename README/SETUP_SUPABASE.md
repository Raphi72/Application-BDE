# 🗄️ Configuration Supabase - Guide Complet

Ce guide vous explique comment configurer Supabase pour l'application BDE.

## 📋 Étapes de Configuration

### 1. Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"Sign up"**
3. Créez un compte (avec GitHub, Google, ou email)
4. Créez un nouveau projet :
   - **Name** : `bde-app` (ou le nom de votre choix)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE**)
   - **Region** : Choisissez la région la plus proche
   - Cliquez sur **"Create new project"**

### 2. Obtenir les clés API

1. Dans votre projet Supabase, allez dans **Settings** > **API**
2. Vous verrez :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : Une longue clé commençant par `eyJ...`
3. **Copiez ces deux valeurs**

### 3. Configurer l'application

1. Ouvrez le fichier `src/config/supabase.js`
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

### 4. Créer la base de données

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `database/schema.sql` de ce projet
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (ou appuyez sur Ctrl+Enter)
7. Vous devriez voir "Success. No rows returned"

### 5. Créer un compte admin

#### Option A : Via l'interface Supabase

1. Créez d'abord un compte via l'application (inscription normale)
2. Dans Supabase, allez dans **Authentication** > **Users**
3. Trouvez votre utilisateur (celui que vous venez de créer)
4. Notez son **UUID** (ID)
5. Allez dans **Table Editor** > **profiles**
6. Trouvez la ligne avec votre UUID
7. Cliquez sur **"Edit"**
8. Changez `role` de `user` à `admin`
9. Cliquez sur **"Save"**

#### Option B : Via SQL

1. Créez d'abord un compte via l'application
2. Dans Supabase, allez dans **SQL Editor**
3. Exécutez cette requête (remplacez `VOTRE_EMAIL` par votre email) :
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'VOTRE_EMAIL'
   );
   ```

### 6. Tester la connexion

1. Redémarrez votre application Expo :
   ```bash
   npx expo start -c
   ```
2. Essayez de vous inscrire avec un nouveau compte
3. Essayez de vous connecter
4. Si vous êtes admin, vous devriez voir l'onglet "Admin" dans la navigation

## 🔐 Sécurité

- ⚠️ **Ne partagez JAMAIS** vos clés Supabase publiquement
- ⚠️ La clé `anon` est publique mais sécurisée par RLS (Row Level Security)
- ⚠️ Ne commitez JAMAIS `src/config/supabase.js` avec vos vraies clés dans Git
- ✅ Utilisez des variables d'environnement pour la production

## 📊 Structure de la Base de Données

### Tables principales :

- **profiles** : Profils utilisateurs (nom, rôle)
- **events** : Événements du BDE
- **event_registrations** : Inscriptions aux événements
- **polls** : Sondages
- **votes** : Votes des utilisateurs
- **news** : Actualités
- **clubs** : Clubs et associations
- **gallery_albums** : Albums photos
- **gallery_images** : Images des albums

### Rôles :

- **user** : Utilisateur normal (peut voir, s'inscrire, voter)
- **admin** : Administrateur (peut créer, modifier, supprimer)

## 🛠️ Commandes Utiles

### Voir les données dans Supabase :

1. **Table Editor** : Interface graphique pour voir/modifier les données
2. **SQL Editor** : Pour exécuter des requêtes SQL
3. **Authentication** : Gérer les utilisateurs

### Exemples de requêtes SQL :

```sql
-- Voir tous les événements
SELECT * FROM events ORDER BY date DESC;

-- Voir tous les admins
SELECT * FROM profiles WHERE role = 'admin';

-- Compter les votes par sondage
SELECT poll_id, COUNT(*) as vote_count 
FROM votes 
GROUP BY poll_id;
```

## 🐛 Dépannage

### Erreur : "Invalid API key"
- Vérifiez que vous avez bien copié les clés dans `src/config/supabase.js`
- Vérifiez qu'il n'y a pas d'espaces avant/après les clés

### Erreur : "relation does not exist"
- Vous n'avez pas exécuté le script SQL `database/schema.sql`
- Allez dans SQL Editor et exécutez le script

### Erreur : "permission denied"
- Vérifiez que RLS est activé sur les tables
- Vérifiez que les politiques RLS sont créées (dans le script SQL)

### L'utilisateur n'apparaît pas dans profiles
- Le trigger devrait créer automatiquement le profil
- Si ce n'est pas le cas, créez-le manuellement dans Table Editor

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide RLS (Row Level Security)](https://supabase.com/docs/guides/auth/row-level-security)
- [API Supabase JavaScript](https://supabase.com/docs/reference/javascript/introduction)

## ✅ Checklist de Configuration

- [ ] Compte Supabase créé
- [ ] Projet Supabase créé
- [ ] Clés API copiées dans `src/config/supabase.js`
- [ ] Script SQL `database/schema.sql` exécuté
- [ ] Compte admin créé
- [ ] Test d'inscription réussi
- [ ] Test de connexion réussi
- [ ] Test admin réussi (création d'événement)

Une fois toutes ces étapes complétées, votre application est prête à utiliser Supabase ! 🎉
