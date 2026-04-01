# 🔐 Guide d'Authentification - Application BDE

Ce guide explique le système d'authentification et de gestion des rôles de l'application.

## 📋 Fonctionnalités

### Pour tous les utilisateurs :
- ✅ Inscription (création de compte)
- ✅ Connexion
- ✅ Déconnexion
- ✅ Consultation des événements, sondages, actualités, clubs, galerie
- ✅ Inscription aux événements
- ✅ Vote aux sondages

### Pour les administrateurs (admin) :
- ✅ Toutes les fonctionnalités utilisateur
- ✅ **Création, modification, suppression d'événements**
- ✅ **Création, modification, suppression de sondages**
- ✅ **Création, modification, suppression d'actualités**
- ✅ **Gestion des clubs**
- ✅ **Gestion de la galerie**

## 🚀 Utilisation

### 1. Première utilisation

1. **Lancez l'application**
2. Vous verrez l'écran de **connexion**
3. Cliquez sur **"S'inscrire"** pour créer un compte
4. Remplissez le formulaire :
   - Nom complet
   - Email
   - Mot de passe (minimum 6 caractères)
   - Confirmation du mot de passe
5. Cliquez sur **"S'inscrire"**
6. Vous êtes maintenant connecté !

### 2. Se connecter

1. Sur l'écran de connexion
2. Entrez votre **email** et **mot de passe**
3. Cliquez sur **"Se connecter"**

### 3. Devenir administrateur

Par défaut, tous les nouveaux comptes sont des **utilisateurs normaux**.

Pour devenir admin, suivez les instructions dans `SETUP_SUPABASE.md` :
- Créez d'abord un compte via l'application
- Puis modifiez le rôle dans Supabase Dashboard

## 🔒 Sécurité

### RLS (Row Level Security)

Supabase utilise RLS pour sécuriser les données :

- **Lecture** : Tous les utilisateurs peuvent voir les événements, sondages, etc.
- **Écriture** : Seuls les admins peuvent créer/modifier/supprimer
- **Votes/Inscriptions** : Les utilisateurs peuvent voter/s'inscrire, mais seulement une fois

### Rôles

- **user** : Utilisateur normal
- **admin** : Administrateur avec tous les droits

## 📱 Navigation

### Utilisateur normal :
- Événements
- Sondages
- Actualités
- Clubs
- Galerie

### Administrateur :
- Tous les onglets utilisateur
- **+ Admin** (nouvel onglet)

## 🛠️ Structure Technique

### Fichiers principaux :

- `src/context/AuthContext.js` : Gestion de l'authentification
- `src/config/supabase.js` : Configuration Supabase
- `src/screens/LoginScreen.js` : Écran de connexion
- `src/screens/RegisterScreen.js` : Écran d'inscription
- `src/navigation/AppNavigator.js` : Navigation avec protection des routes
- `src/screens/admin/` : Écrans d'administration

### Flux d'authentification :

1. **App.js** → Wrappe avec `AuthProvider`
2. **AppNavigator** → Vérifie si l'utilisateur est connecté
3. Si **non connecté** → Affiche `LoginScreen` ou `RegisterScreen`
4. Si **connecté** → Affiche les onglets principaux
5. Si **admin** → Affiche aussi l'onglet "Admin"

## 🐛 Dépannage

### Je ne peux pas me connecter

1. Vérifiez que Supabase est bien configuré (`src/config/supabase.js`)
2. Vérifiez votre email et mot de passe
3. Vérifiez les erreurs dans le terminal

### Je ne vois pas l'onglet Admin

1. Vérifiez que votre compte a le rôle `admin` dans Supabase
2. Déconnectez-vous et reconnectez-vous
3. Vérifiez dans Supabase Dashboard > Table Editor > profiles

### Erreur "Invalid login credentials"

- Vérifiez que vous avez bien créé le compte
- Vérifiez que l'email est correct
- Essayez de vous réinscrire

## 📚 Prochaines Étapes

Une fois l'authentification configurée, vous pouvez :

1. **Créer des événements** (en tant qu'admin)
2. **Créer des sondages** (en tant qu'admin)
3. **Gérer le contenu** de l'application

Consultez `SETUP_SUPABASE.md` pour configurer Supabase.
