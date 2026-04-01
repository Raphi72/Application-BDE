# 🚀 Comment Lancer l'Application BDE

## ⚠️ IMPORTANT : Configuration Supabase d'abord

Avant de lancer l'application, vous **DEVEZ** configurer Supabase, sinon l'authentification ne fonctionnera pas.

### Étape 0 : Configurer Supabase (OBLIGATOIRE)

1. Suivez le guide `SETUP_SUPABASE.md`
2. Créez un projet Supabase
3. Exécutez le script SQL (`database/schema.sql`)
4. Configurez les clés dans `src/config/supabase.js`

**Sans cette étape, l'application ne fonctionnera pas !**

---

## 📱 Lancer l'Application

### 1. Installer les dépendances (si pas déjà fait)

```bash
npm install
```

### 2. Lancer Expo

```bash
npm start
```

ou

```bash
npx expo start
```

### 3. Tester sur votre téléphone

#### Option A : Avec Expo Go (Recommandé)

1. **Installez Expo Go** sur votre téléphone :
   - Android : [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS : [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Scannez le QR code** affiché dans le terminal avec :
   - **Android** : L'application Expo Go
   - **iOS** : L'appareil photo (puis ouvrez dans Expo Go)

3. **Important** : Votre téléphone et votre ordinateur doivent être sur le **même réseau Wi-Fi**

#### Option B : Mode Tunnel (si pas sur le même Wi-Fi)

```bash
npx expo start --tunnel
```

Puis scannez le QR code avec Expo Go.

#### Option C : Sur un Émulateur Android

```bash
npx expo start --android
```

(Nécessite Android Studio et un émulateur configuré)

---

## 🎯 Premier Lancement

### 1. Écran de Connexion

Au premier lancement, vous verrez l'écran de **connexion**.

### 2. Créer un Compte

1. Cliquez sur **"S'inscrire"**
2. Remplissez le formulaire :
   - Nom complet
   - Email
   - Mot de passe (min. 6 caractères)
   - Confirmer le mot de passe
3. Cliquez sur **"S'inscrire"**

### 3. Vous êtes Connecté !

Une fois inscrit, vous êtes automatiquement connecté et voyez les onglets :
- Événements
- Sondages
- Actualités
- Clubs
- Galerie

### 4. Devenir Admin (Optionnel)

Pour voir l'onglet "Admin" :

1. Allez dans **Supabase Dashboard**
2. **Table Editor** > **profiles**
3. Trouvez votre utilisateur
4. Changez `role` de `user` à `admin`
5. Déconnectez-vous et reconnectez-vous dans l'app

---

## 🔧 Commandes Utiles

```bash
# Lancer avec cache nettoyé (si problèmes)
npx expo start -c

# Lancer en mode tunnel
npx expo start --tunnel

# Lancer sur Android
npx expo start --android

# Lancer sur iOS (Mac uniquement)
npx expo start --ios

# Voir les logs
# Les logs apparaissent automatiquement dans le terminal
```

---

## 🐛 Problèmes Courants

### L'application ne se charge pas

1. **Vérifiez Supabase** : Avez-vous configuré `src/config/supabase.js` ?
2. **Vérifiez le terminal** : Y a-t-il des erreurs ?
3. **Nettoyez le cache** : `npx expo start -c`

### Erreur "Cannot find module"

```bash
# Supprimez node_modules et réinstallez
Remove-Item -Recurse -Force node_modules
npm install
npx expo start -c
```

### Erreur de connexion Supabase

- Vérifiez que les clés dans `src/config/supabase.js` sont correctes
- Vérifiez que vous avez exécuté le script SQL dans Supabase

### L'écran reste blanc

1. Secouez votre téléphone pour voir les erreurs
2. Regardez le terminal pour les erreurs JavaScript
3. Vérifiez que tous les fichiers existent

---

## ✅ Checklist de Lancement

- [ ] Supabase configuré (`SETUP_SUPABASE.md`)
- [ ] Clés Supabase dans `src/config/supabase.js`
- [ ] Script SQL exécuté dans Supabase
- [ ] `npm install` exécuté
- [ ] `npm start` lancé
- [ ] Expo Go installé sur le téléphone
- [ ] QR code scanné
- [ ] Application se charge
- [ ] Écran de connexion visible
- [ ] Test d'inscription réussi

---

## 📚 Guides Complémentaires

- **`SETUP_SUPABASE.md`** : Configuration complète de Supabase
- **`README_AUTH.md`** : Guide d'utilisation de l'authentification
- **`TROUBLESHOOTING.md`** : Solutions aux problèmes courants
- **`README.md`** : Documentation générale du projet

---

## 🎉 C'est Parti !

Une fois tout configuré, lancez simplement :

```bash
npm start
```

Et scannez le QR code avec Expo Go ! 🚀
