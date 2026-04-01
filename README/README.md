# 📱 Application BDE - Bureau des Étudiants

Application mobile cross-platform développée avec React Native et Expo pour le Bureau des Étudiants.

## 🎯 Fonctionnalités

- **📅 Événements** : Liste des événements, détails, inscription/désinscription
- **🗳️ Sondages** : Liste des sondages, vote, affichage des résultats en temps réel
- **📢 Actualités** : Fil d'actualités du BDE avec notifications (préparé)
- **📂 Clubs & Associations** : Liste des clubs avec descriptions et contacts
- **🖼️ Galerie Photos** : Albums photos des événements passés

## 🛠️ Stack Technique

### Frontend
- **React Native** : Framework cross-platform pour iOS et Android
- **Expo** : Outils et services pour simplifier le développement
- **React Navigation** : Navigation entre les écrans
- **Expo Vector Icons** : Icônes pour l'interface

### Backend (actuellement mocké)
- Données mockées dans `src/data/mockData.js`
- Prêt pour migration vers Supabase ou Firebase

### Pourquoi ces choix ?
- **React Native + Expo** : Permet de développer une seule fois pour iOS et Android, avec un excellent support et une grande communauté
- **Expo** : Simplifie énormément le développement (pas besoin de configurer Xcode/Android Studio au début) et facilite le déploiement
- **Supabase recommandé** : Backend PostgreSQL avec authentification, stockage et temps réel, gratuit pour commencer

## 📁 Structure du Projet

```
Application BDE/
├── App.js                 # Point d'entrée de l'application
├── app.json              # Configuration Expo
├── package.json          # Dépendances du projet
├── src/
│   ├── components/       # Composants réutilisables
│   │   ├── EventCard.js
│   │   ├── PollCard.js
│   │   ├── NewsCard.js
│   │   └── ClubCard.js
│   ├── screens/         # Écrans de l'application
│   │   ├── EventsScreen.js
│   │   ├── PollsScreen.js
│   │   ├── NewsScreen.js
│   │   ├── ClubsScreen.js
│   │   └── GalleryScreen.js
│   ├── data/            # Données mockées
│   │   └── mockData.js
│   └── utils/           # Utilitaires
│       └── dateUtils.js
└── README.md
```

## 🚀 Installation et Lancement

### Prérequis

1. **Node.js** (version 14 ou supérieure)
   - Téléchargez depuis [nodejs.org](https://nodejs.org/)
   - Vérifiez l'installation : `node --version`

2. **npm** (inclus avec Node.js)
   - Vérifiez : `npm --version`

3. **Expo CLI** (installé globalement)
   ```bash
   npm install -g expo-cli
   ```

### Installation du Projet

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Lancer l'application**
   ```bash
   npm start
   # ou
   expo start
   ```

   Cela ouvrira Expo DevTools dans votre navigateur avec un QR code.

## 📱 Tester l'Application

### Option 1 : Sur votre téléphone (Recommandé pour débuter)

#### Pour Android :
1. Installez l'application **Expo Go** depuis le Play Store
2. Lancez `npm start` dans votre terminal
3. Scannez le QR code affiché avec l'application Expo Go
4. L'application se chargera sur votre téléphone

#### Pour iPhone :
1. Installez l'application **Expo Go** depuis l'App Store
2. Lancez `npm start` dans votre terminal
3. Scannez le QR code avec l'appareil photo de l'iPhone
4. Ouvrez le lien dans Expo Go
5. L'application se chargera sur votre iPhone

**Important** : Votre téléphone et votre ordinateur doivent être sur le même réseau Wi-Fi.

**💡 Si vous avez une erreur lors du scan du QR code**, utilisez le mode tunnel qui fonctionne même sans être sur le même réseau :
```bash
npx expo start --tunnel
```

Consultez `TROUBLESHOOTING.md` pour plus de solutions.

### Option 2 : Sur un Émulateur Android (PC)

#### Installation d'Android Studio

1. **Téléchargez Android Studio**
   - Allez sur [developer.android.com/studio](https://developer.android.com/studio)
   - Téléchargez et installez Android Studio

2. **Configurez Android Studio**
   - Ouvrez Android Studio
   - Allez dans **Tools > SDK Manager**
   - Dans l'onglet **SDK Platforms**, cochez **Android 11.0 (API 30)** ou supérieur
   - Dans l'onglet **SDK Tools**, cochez :
     - Android SDK Build-Tools
     - Android Emulator
     - Android SDK Platform-Tools
   - Cliquez sur **Apply** et attendez l'installation

3. **Créez un Émulateur**
   - Allez dans **Tools > Device Manager**
   - Cliquez sur **Create Device**
   - Choisissez un appareil (ex: Pixel 5)
   - Choisissez une version d'Android (ex: API 30)
   - Cliquez sur **Finish**

4. **Lancez l'émulateur**
   - Dans Device Manager, cliquez sur le bouton ▶️ de votre émulateur
   - Attendez que l'émulateur démarre complètement

5. **Lancez l'application**
   ```bash
   npm start
   ```
   - Dans le terminal, appuyez sur `a` pour ouvrir sur Android
   - L'application se chargera dans l'émulateur

### Option 3 : Sur un Simulateur iOS (Mac uniquement)

**Note** : Nécessite un Mac avec Xcode installé.

1. **Installez Xcode**
   - Depuis l'App Store Mac
   - Installez aussi les outils de ligne de commande :
     ```bash
     xcode-select --install
     ```

2. **Installez CocoaPods** (gestionnaire de dépendances iOS)
   ```bash
   sudo gem install cocoapods
   ```

3. **Lancez l'application**
   ```bash
   npm start
   ```
   - Dans le terminal, appuyez sur `i` pour ouvrir sur iOS
   - Le simulateur iOS s'ouvrira automatiquement

## 🎨 Personnalisation

### Modifier les données mockées

Les données sont dans `src/data/mockData.js`. Vous pouvez :
- Modifier les événements, sondages, actualités, clubs
- Ajouter de nouvelles entrées
- Modifier les images (utilisez des URLs d'images en ligne)

### Modifier les couleurs

Les couleurs principales sont définies dans chaque composant :
- Couleur principale : `#4A90E2` (bleu)
- Couleur de succès : `#4CAF50` (vert)
- Couleur d'alerte : `#FF9800` (orange)

## 🔄 Prochaines Étapes

### Migration vers un Backend Réel

1. **Créer un compte Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Créez un nouveau projet

2. **Installer Supabase dans le projet**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Créer un fichier de configuration**
   ```javascript
   // src/config/supabase.js
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = 'VOTRE_URL_SUPABASE';
   const supabaseKey = 'VOTRE_CLE_SUPABASE';
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

4. **Remplacer les données mockées**
   - Créer des tables dans Supabase
   - Remplacer les appels dans les écrans par des appels API

### Ajouter l'Authentification

1. Utiliser Expo AuthSession pour l'authentification
2. Intégrer avec Supabase Auth
3. Protéger les routes nécessaires

### Activer les Notifications Push

1. Configurer les notifications dans `app.json`
2. Utiliser `expo-notifications` (déjà installé)
3. Demander les permissions à l'utilisateur
4. Envoyer des notifications depuis le backend

## 🐛 Dépannage

### L'application ne se charge pas sur le téléphone
- Vérifiez que le téléphone et l'ordinateur sont sur le même Wi-Fi
- Vérifiez que le pare-feu n'bloque pas Expo
- Essayez de redémarrer `npm start`

### Erreur "Unable to resolve module"
- Supprimez `node_modules` et `package-lock.json`
- Réinstallez : `npm install`

### L'émulateur Android ne démarre pas
- Vérifiez que la virtualisation est activée dans le BIOS
- Vérifiez que HAXM ou Hyper-V est installé
- Essayez de créer un nouvel émulateur

### Erreurs de build iOS
- Vérifiez que Xcode est à jour
- Exécutez `pod install` dans le dossier `ios/` (si généré)
- Nettoyez le build : `expo start -c`

## 📚 Ressources

- [Documentation React Native](https://reactnative.dev/docs/getting-started)
- [Documentation Expo](https://docs.expo.dev/)
- [Documentation React Navigation](https://reactnavigation.org/)
- [Documentation Supabase](https://supabase.com/docs)

## 📝 Notes pour les Débutants

- **Hot Reload** : Quand vous modifiez le code, l'application se met à jour automatiquement
- **Console** : Les `console.log()` apparaissent dans le terminal où vous avez lancé `npm start`
- **Erreurs** : Les erreurs s'affichent dans l'application et dans le terminal
- **Structure** : Chaque écran est dans `src/screens/`, chaque composant réutilisable dans `src/components/`

## 🎓 Apprendre React Native

Si vous débutez, voici les concepts à comprendre :
1. **Composants** : Fonctions qui retournent du JSX (interface)
2. **Props** : Données passées d'un composant parent à un enfant
3. **State** : Données qui changent dans un composant (utilisez `useState`)
4. **Navigation** : Passage entre les écrans
5. **StyleSheet** : Styles CSS pour React Native

## 📄 Licence

Ce projet est développé pour le BDE de votre école.

---

**Bon développement ! 🚀**
