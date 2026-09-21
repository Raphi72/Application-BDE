# 📱 Application BDE - Bureau des Étudiants

Application mobile cross-platform développée avec React Native et Expo pour le Bureau des Étudiants.

## 🎯 Fonctionnalités

- **📅 Événements** : Liste des événements, détails, inscription/désinscription
- **🗳️ Sondages** : Liste des sondages, vote, affichage des résultats en temps réel
- **📢 Actualités** : Fil d'actualités du BDE
- **📂 Clubs & Associations** : Liste des clubs, propositions de club
- **🖼️ Galerie Photos** : Albums photos des événements passés
- **🔐 Authentification** : Inscription, connexion, réinitialisation de mot de passe (Supabase Auth)
- **🛠️ Panneau Admin** : Gestion des événements, sondages, actualités et clubs
- **🌍 Multilingue** : Français / Anglais

## 🛠️ Stack Technique

- **React Native** + **Expo** (SDK 54) — cross-platform iOS / Android
- **React Navigation** — navigation entre écrans
- **Supabase** — authentification, base de données PostgreSQL, stockage
- **EAS Build** — génération des builds Android/iOS

## 📁 Structure du Projet

```
Application BDE/
├── App.js                 # Point d'entrée de l'application
├── app.json                # Configuration Expo
├── package.json            # Dépendances du projet
├── database/                # Schéma SQL Supabase (tables, RLS, policies)
├── src/
│   ├── components/          # Composants réutilisables
│   ├── screens/              # Écrans (+ screens/admin/ pour le panneau admin)
│   ├── context/               # AuthContext, LanguageContext
│   ├── services/               # Upload d'images, notifications
│   ├── config/                  # Configuration Supabase / auth email
│   ├── translations/            # Fichiers de traduction fr/en
│   └── utils/                    # Utilitaires
└── README/                  # Documentation détaillée (setup, guides, dépannage)
```

## 🚀 Installation et Lancement

### Prérequis

- **Node.js** ≥ 18
- Un projet **Supabase** (gratuit) : [supabase.com](https://supabase.com)

### Installation

```bash
npm install
```

### Configuration

Copiez `.env.example` en `.env` et renseignez vos clés Supabase (Settings > API dans le dashboard) :

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_AUTH_REDIRECT_URL=
```

Appliquez le schéma de base de données dans l'éditeur SQL Supabase : voir [`database/schema.sql`](database/schema.sql).

### Lancement

```bash
npm start
```

## 📚 Documentation

Des guides détaillés (setup Supabase, stockage, dépannage, création d'un compte admin, publication Play Store...) sont disponibles dans le dossier [`README/`](README/README.md).

## 📄 Licence

Ce projet est développé pour le BDE.
