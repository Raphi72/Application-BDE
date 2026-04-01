# 🚀 Guide de Démarrage Rapide

## ⚠️ IMPORTANT : Configuration Supabase d'abord !

**Avant de lancer**, vous devez configurer Supabase. Sinon l'authentification ne fonctionnera pas.

👉 **Consultez `SETUP_SUPABASE.md` pour la configuration**

---

## Installation en 4 étapes

### 1. Configurer Supabase (OBLIGATOIRE)
Suivez `SETUP_SUPABASE.md` :
- Créer un projet Supabase
- Exécuter le script SQL
- Configurer les clés dans `src/config/supabase.js`

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer l'application
```bash
npm start
```

### 4. Tester sur votre téléphone
- **Android** : Installez **Expo Go** depuis le Play Store, scannez le QR code
- **iPhone** : Installez **Expo Go** depuis l'App Store, scannez le QR code avec l'appareil photo

**C'est tout !** 🎉

## Premier Lancement

1. Vous verrez l'écran de **connexion**
2. Cliquez sur **"S'inscrire"** pour créer un compte
3. Remplissez le formulaire et créez votre compte
4. Vous êtes maintenant connecté !

## Commandes Utiles

- `npm start` - Lance le serveur de développement
- `npx expo start -c` - Lance avec cache nettoyé (si problèmes)
- `npx expo start --tunnel` - Mode tunnel (fonctionne partout)
- `npm run android` - Lance sur Android (nécessite un émulateur)
- `npm run ios` - Lance sur iOS (Mac uniquement)

## Structure du Code

- **App.js** : Point d'entrée avec authentification
- **src/navigation/** : Navigation de l'application
- **src/screens/** : Tous les écrans (login, événements, admin, etc.)
- **src/components/** : Composants réutilisables
- **src/context/** : Contexte d'authentification
- **src/config/** : Configuration Supabase
- **database/** : Schéma SQL de la base de données

## Guides Complets

- **`LANCEMENT.md`** : Guide détaillé de lancement
- **`SETUP_SUPABASE.md`** : Configuration Supabase
- **`README_AUTH.md`** : Guide d'authentification
- **`TROUBLESHOOTING.md`** : Solutions aux problèmes
