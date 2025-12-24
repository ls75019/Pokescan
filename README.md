# 🎴 PokéScan

Application React de reconnaissance et de recherche de cartes Pokémon utilisant l'API Pokemon TCG avec reconnaissance OCR automatique.

## ✨ Fonctionnalités

- **Recherche par nom**: Recherchez des cartes Pokémon par leur nom
- **Reconnaissance OCR**: Upload d'image avec détection automatique du texte via Tesseract.js
- **Google Vision API**: Support optionnel de Google Vision pour une meilleure précision OCR
- **Capture photo**: Utilisez votre webcam pour prendre une photo d'une carte
- **Recherche automatique**: Après reconnaissance, recherche automatique dans la base de données
- **Affichage détaillé**: Visualisez toutes les informations de la carte (rareté, set, artiste, prix, etc.)
- **Design moderne**: Interface responsive avec un design moderne et animations
- **Déploiement facile**: Configuration Netlify incluse pour déploiement en un clic

## 🚀 Technologies utilisées

- **Frontend**: React 19 + Vite
- **OCR**: Tesseract.js (côté client, gratuit)
- **OCR Premium**: Google Cloud Vision API (optionnel)
- **API**: Pokemon TCG SDK
- **Déploiement**: Netlify avec fonctions serverless
- **Styling**: CSS3 avec animations et glassmorphisme

## Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## Utilisation

### Mode Recherche
1. Cliquez sur "🔍 Recherche par nom"
2. Entrez le nom d'un Pokémon ou d'une carte (ex: Pikachu, Charizard)
3. Cliquez sur "Rechercher"
4. Explorez les résultats avec toutes les informations détaillées

### Mode Image (OCR)
1. Cliquez sur "📷 Reconnaissance par image"
2. Choisissez entre:
   - **📁 Choisir une image**: Upload depuis votre ordinateur
   - **📷 Utiliser la caméra**: Prenez une photo en direct
3. L'OCR détecte automatiquement le texte sur la carte
4. Les résultats sont affichés automatiquement

> **Note**: Par défaut, l'application utilise Tesseract.js (gratuit, côté client). Pour une meilleure précision, vous pouvez configurer Google Vision API (voir section Configuration).

## 📁 Structure du projet

```
pokescan/
├── src/
│   ├── components/
│   │   ├── ImageUpload.jsx    # Composant pour upload/capture d'image
│   │   ├── CardSearch.jsx     # Composant de recherche
│   │   └── CardDisplay.jsx    # Affichage des résultats
│   ├── services/
│   │   └── ocrService.js      # Service OCR (Tesseract + Google Vision)
│   ├── App.jsx                # Composant principal
│   ├── App.css                # Styles principaux
│   └── main.jsx               # Point d'entrée
├── netlify/
│   └── functions/
│       └── vision-ocr.js      # Fonction serverless Google Vision
├── netlify.toml               # Configuration Netlify
├── .env.example               # Variables d'environnement exemple
├── package.json
└── README.md
```

## ⚙️ Configuration

### API Pokemon TCG (Optionnel)

Ce projet utilise l'API gratuite [Pokemon TCG](https://pokemontcg.io/). Pour augmenter les limites de requêtes, obtenez une clé API et ajoutez-la :

1. Créez un fichier `.env` à la racine
2. Ajoutez : `VITE_POKEMON_TCG_API_KEY=votre_clé_ici`

### Google Vision API (Optionnel - meilleure précision OCR)

Pour utiliser Google Vision API au lieu de Tesseract.js :

1. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com)
2. Activez l'API Cloud Vision
3. Créez une clé de service et téléchargez le fichier JSON
4. Dans Netlify, ajoutez la variable d'environnement :
   - Nom : `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Valeur : Contenu du fichier JSON (sur une seule ligne)
5. Dans `src/App.jsx`, ligne 61, changez `preferGoogleVision: false` en `true`

## 🚀 Déploiement sur Netlify

### Méthode 1 : Déploiement via l'interface Netlify

1. Connectez-vous sur [Netlify](https://www.netlify.com)
2. Cliquez sur "Add new site" > "Import an existing project"
3. Connectez votre repository GitHub/GitLab
4. La configuration est automatique grâce au fichier `netlify.toml`
5. Cliquez sur "Deploy site"

### Méthode 2 : Déploiement via Netlify CLI

```bash
# Installer Netlify CLI globalement
npm install -g netlify-cli

# Se connecter à Netlify
netlify login

# Initialiser le projet
netlify init

# Déployer
netlify deploy --prod
```

### Configuration des variables d'environnement sur Netlify

1. Dans votre dashboard Netlify, allez dans "Site settings" > "Environment variables"
2. Ajoutez les variables nécessaires :
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` (si vous utilisez Google Vision)
   - `VITE_POKEMON_TCG_API_KEY` (optionnel)

## 🎯 Fonctionnement de l'OCR

L'application utilise deux méthodes d'OCR :

### 1. Tesseract.js (Par défaut)
- ✅ Gratuit et open-source
- ✅ Fonctionne côté client (pas besoin de serveur)
- ✅ Pas de configuration nécessaire
- ⚠️ Précision variable selon la qualité de l'image

### 2. Google Vision API (Optionnel)
- ✅ Très haute précision
- ✅ Meilleure reconnaissance de texte
- ⚠️ Nécessite un compte Google Cloud
- ⚠️ Coûts possibles selon l'utilisation (gratuit jusqu'à 1000 requêtes/mois)

## 💡 Conseils pour une meilleure reconnaissance

- Utilisez des photos bien éclairées
- Assurez-vous que le nom de la carte est clairement visible
- Évitez les reflets sur la carte
- Cadrez la carte de manière centrée
- Utilisez une résolution suffisante (pas trop petite)

## 🔮 Améliorations futures possibles

- [x] Intégration OCR (Tesseract.js) ✅
- [x] Support Google Vision API ✅
- [x] Déploiement Netlify ✅
- [ ] Collection personnelle de cartes
- [ ] Système de favoris
- [ ] Comparaison de prix sur différentes plateformes
- [ ] Filtres avancés (type, rareté, set, etc.)
- [ ] Mode sombre/clair
- [ ] Historique des recherches
- [ ] Export des collections en PDF

## 📝 Licence

MIT
