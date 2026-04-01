# 🚀 Guide de Publication Google Play Store (Android)

Oui, c'est tout à fait possible ! Comme vous utilisez Expo, la méthode recommandée et la plus simple est d'utiliser **EAS Build**.

Voici la marche à suivre étape par étape.

## 📋 Prérequis Obligatoires

1.  **Compte Google Play Console** : 
    *   Coût : 25$ (paiement unique à vie).
    *   Lien : [https://play.google.com/console](https://play.google.com/console)
    *   **Action** : Créez votre compte dès maintenant, la validation peut prendre 1 à 2 jours.

2.  **Compte Expo** :
    *   Gratuit.
    *   Lien : [https://expo.dev/signup](https://expo.dev/signup)
    *   Vous en aurez besoin pour lancer la construction de l'application.

---

## 🛠️ Étape 1 : Préparer l'application (Configuration)

Votre fichier `app.json` doit être unique et complet.

### 1. Changer l'identifiant unique (Package Name)
L'identifiant `com.bde.app` est trop générique et sûrement déjà pris. Choisissez-en un unique, par exemple : `com.votre_nom.bde_app` ou `fr.ecole.bde`.

**Modifiez `app.json` :**
```json
"android": {
  "package": "com.raphi.bde",  // ⚠️ CHANGEZ CECI par un nom unique
  "versionCode": 1,            // À incrémenter à chaque mise à jour (1, 2, 3...)
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#4A90E2"
  }
}
```

### 2. Vérifier les Icônes
Assurez-vous que vous avez bien vos images dans le dossier `assets/` :
*   `icon.png` (1024x1024)
*   `adaptive-icon.png` (1024x1024)
*   `splash.png`

---

## ☁️ Étape 2 : Installer et Configurer EAS

Ouvrez votre terminal et lancez ces commandes :

1.  **Installer l'outil EAS :**
    ```bash
    npm install -g eas-cli
    ```

2.  **Se connecter à Expo :**
    ```bash
    eas login
    ```

3.  **Configurer le projet :**
    ```bash
    eas build:configure
    ```
    *   Répondez `Android` (ou All)
    *   Cela va créer un fichier `eas.json` à la racine.

---

## 📦 Étape 3 : Créer le fichier de production (AAB)

Pour le Play Store, il faut un fichier `.aab` (Android App Bundle), pas un `.apk`.

Lancez la construction :
```bash
eas build --platform android --profile production
```

*   EAS va vous demander de générer un **Keystore** (certificat de signature).
*   Répondez **YES** à tout pour laisser Expo gérer ça automatiquement (c'est beaucoup plus simple).
*   La construction va se lancer dans le cloud. Cela prendra 10 à 20 minutes.
*   À la fin, vous aurez un lien de téléchargement vers le fichier `.aab`.

---

## 🚀 Étape 4 : Déployer sur le Play Store

1.  Connectez-vous à la [Google Play Console](https://play.google.com/console).
2.  Cliquez sur **"Créer une application"**.
3.  Remplissez les informations (Nom, Langue, Gratuit/Payant).
4.  Dans le menu de gauche, allez dans **"Production"**.
5.  Cliquez sur **"Créer une nouvelle release"**.
6.  **Importez le fichier `.aab`** que vous avez téléchargé depuis Expo.
7.  Remplissez les détails de la version (Notes de version).
8.  Vous devrez ensuite remplir toute la **fiche du magasin** :
    *   Description courte/longue.
    *   Screenshots (Captures d'écran) de l'app.
    *   Icône (512x512).
    *   Bannière (1024x500).
    *   Questionnaire de classification (PEGI).
    *   Politique de confidentialité (obligatoire).

9.  Une fois tout rempli (les coches deviennent vertes ✅), cliquez sur **"Vérifier et publier"**.

---

## 🔄 Mises à jour futures

Pour mettre à jour l'application plus tard :
1.  Modifiez votre code.
2.  Dans `app.json`, augmentez le `"versionCode"` (passez de 1 à 2).
3.  Relancez `eas build --platform android --profile production`.
4.  Uploadez le nouveau `.aab` sur la Play Console.
