# 🔧 Guide de Dépannage

## Problème : Erreur "Failed to download remote update"

Cette erreur signifie qu'Expo Go n'arrive pas à télécharger le bundle JavaScript.

**Solutions rapides :**
1. **Mode tunnel** (solution la plus fiable) :
   ```bash
   npx expo start --tunnel
   ```
2. **Vérifier le Wi-Fi** : Téléphone et PC doivent être sur le même réseau
3. **Nettoyer le cache** : `npx expo start -c`
4. **Vérifier le pare-feu Windows** : Autoriser Node.js

👉 **Consultez `FIX_DOWNLOAD_ERROR.md` pour le guide complet**

---

## Problème : Erreur lors du scan du QR code avec Expo Go

### Solutions à essayer dans l'ordre :

#### 1. Vérifier la connexion réseau
- **Votre téléphone et votre ordinateur doivent être sur le même réseau Wi-Fi**
- Désactivez temporairement les données mobiles sur votre téléphone
- Vérifiez que vous êtes bien connecté au même Wi-Fi

#### 2. Vérifier l'adresse IP
Si vous voyez `exp://127.0.0.1:8081` dans le terminal, cela ne fonctionnera pas sur votre téléphone.

**Solution :**
1. Trouvez l'adresse IP locale de votre ordinateur :
   - **Windows** : Ouvrez PowerShell et tapez `ipconfig`
   - Cherchez "Adresse IPv4" (ex: 192.168.1.100)
2. Dans le terminal Expo, appuyez sur `s` pour changer en "development build"
3. Ou utilisez l'option tunnel :
   ```bash
   npx expo start --tunnel
   ```

#### 3. Utiliser le mode Tunnel (Recommandé)
Le mode tunnel fonctionne même si vous n'êtes pas sur le même réseau :

```bash
npx expo start --tunnel
```

**Note** : Le mode tunnel peut être plus lent, mais fonctionne dans tous les cas.

#### 4. Vérifier le pare-feu Windows
Le pare-feu Windows peut bloquer Expo :

1. Ouvrez **Paramètres Windows** > **Sécurité** > **Pare-feu Windows**
2. Cliquez sur **Autoriser une application via le pare-feu**
3. Vérifiez que **Node.js** est autorisé pour les réseaux privés
4. Si Node.js n'est pas dans la liste, cliquez sur **Modifier les paramètres** > **Autoriser une autre application** > Ajoutez Node.js

#### 5. Redémarrer Expo
Parfois, un simple redémarrage résout le problème :

1. Appuyez sur `Ctrl+C` dans le terminal pour arrêter Expo
2. Redémarrez avec :
   ```bash
   npm start
   ```
3. Scannez à nouveau le QR code

#### 6. Vérifier la version d'Expo Go
Assurez-vous d'avoir la dernière version d'Expo Go :
- **Android** : Play Store > Recherchez "Expo Go" > Mettre à jour
- **iOS** : App Store > Recherchez "Expo Go" > Mettre à jour

#### 7. Nettoyer le cache
Si rien ne fonctionne, nettoyez le cache :

```bash
npx expo start -c
```

Le flag `-c` nettoie le cache Metro.

#### 8. Vérifier les erreurs dans Expo Go
Si l'application se charge mais affiche une erreur :
- Regardez l'écran rouge d'erreur dans Expo Go
- Les erreurs sont aussi visibles dans le terminal où vous avez lancé `npm start`

## Problème : "Some dependencies are incompatible"

Si vous voyez ce message, exécutez :

```bash
npx expo install --fix
```

Cela mettra à jour automatiquement toutes les dépendances vers les versions compatibles.

## Problème : Vulnérabilités npm

Les avertissements de vulnérabilités sont généralement non critiques pour le développement. Si vous voulez les corriger :

```bash
npm audit fix
```

**Attention** : `npm audit fix --force` peut casser des choses, évitez-le sauf si vous savez ce que vous faites.

## Problème : L'application ne se charge pas

### Vérifier les erreurs dans le terminal
- Regardez les messages d'erreur dans le terminal
- Les erreurs JavaScript s'affichent en rouge

### Vérifier les imports
Assurez-vous que tous les fichiers existent :
- `App.js` existe
- Tous les fichiers dans `src/screens/` existent
- Tous les fichiers dans `src/components/` existent

### Réinstaller les dépendances
Si rien ne fonctionne :

```bash
# Supprimer node_modules et package-lock.json
rm -r node_modules
rm package-lock.json

# Sur Windows PowerShell :
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Réinstaller
npm install
```

## Problème : Erreur "Unable to resolve module"

Cela signifie qu'un module n'est pas trouvé. Solutions :

1. **Vérifier que le module est installé** :
   ```bash
   npm list nom-du-module
   ```

2. **Réinstaller le module** :
   ```bash
   npm install nom-du-module
   ```

3. **Nettoyer le cache** :
   ```bash
   npx expo start -c
   ```

## Problème : L'application se charge mais est blanche

1. Vérifiez les erreurs dans le terminal
2. Ouvrez le menu de débogage dans Expo Go (secouez le téléphone)
3. Vérifiez la console pour les erreurs JavaScript

## Commandes Utiles

```bash
# Démarrer avec cache nettoyé
npx expo start -c

# Démarrer en mode tunnel (fonctionne partout)
npx expo start --tunnel

# Démarrer sur Android directement
npx expo start --android

# Voir toutes les options
npx expo start --help
```

## Obtenir de l'aide

Si rien ne fonctionne :
1. Copiez le message d'erreur complet du terminal
2. Copiez le message d'erreur d'Expo Go (si visible)
3. Vérifiez que vous avez suivi toutes les étapes ci-dessus

## Solutions Rapides (Checklist)

- [ ] Téléphone et PC sur le même Wi-Fi
- [ ] Expo Go à jour
- [ ] Dépendances à jour (`npx expo install --fix`)
- [ ] Cache nettoyé (`npx expo start -c`)
- [ ] Pare-feu Windows autorise Node.js
- [ ] Essayé le mode tunnel (`npx expo start --tunnel`)
