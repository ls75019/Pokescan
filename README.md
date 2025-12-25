# 🎴 PokéScan

Application React de reconnaissance et de recherche de cartes Pokémon **en français** avec scan en temps réel et détection automatique.

## ✨ Fonctionnalités

- **📷 Scan en temps réel**: Détection automatique toutes les 2 secondes
- **🎯 Guide visuel de cadrage**: Coins blancs pour bien positionner votre carte
- **🔍 Reconnaissance OCR**: Détection du nom et numéro de carte via OCR.space
- **🇫🇷 Support français**: Noms de cartes en français (Dracaufeu, Pikachu, Mélofée, etc.)
- **⚡ Auto-fermeture caméra**: La caméra s'éteint automatiquement quand une carte est trouvée
- **📱 Compatible mobile**: Fonctionne sur iPhone/Android avec support caméra arrière
- **🎨 Interface moderne**: Design clair et épuré, responsive

## 🚀 Technologies utilisées

- **Frontend**: React 19 + Vite
- **OCR**: OCR.space API (gratuit, 25k requêtes/mois)
- **API Cartes**: TCGdex (API française multilingue)
- **Détection**: Edge detection pour isoler les cartes
- **Matching**: Fuzzy matching avec distance de Levenshtein
- **Déploiement**: Cloudflare Pages

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## 🎮 Utilisation

### Mode Camera (Recommandé)

1. **Cliquez sur "📷 Ouvrir la caméra"**
2. **Sur iOS/Safari**: Cliquez sur "▶️ Démarrer la vidéo"
3. **Cadrez votre carte** dans le guide visuel (4 coins blancs)
4. **Attendez 1-2 secondes** → Le scan automatique détecte la carte
5. **La carte est trouvée** → La caméra s'éteint et affiche les infos
6. **"🔄 Scanner une autre carte"** pour recommencer

### Mode Upload

1. Cliquez sur "📁 Choisir une image"
2. Sélectionnez une photo de carte
3. L'analyse se fait automatiquement
4. Les informations de la carte s'affichent

## 📁 Structure du projet

```
pokescan/
├── src/
│   ├── services/
│   │   ├── ocrSpaceService.js      # OCR.space API
│   │   ├── tcgdexService.js        # TCGdex API (français)
│   │   ├── cardDetector.js         # Détection automatique carte
│   │   ├── imagePreprocessor.js    # Prétraitement image
│   │   ├── fuzzyMatcher.js         # Matching flou de noms
│   │   └── enhancedOcrService.js   # Orchestration OCR
│   ├── App.jsx                     # Composant principal
│   ├── App.css                     # Styles
│   └── main.jsx
├── public/
│   └── _headers                     # Headers Cloudflare Pages
├── CLOUDFLARE_DEPLOY.md            # Instructions déploiement
└── README.md
```

## ⚙️ Configuration (Optionnel)

### Variables d'environnement

Créez un fichier `.env` à la racine :

```bash
# Pokemon TCG API (optionnel, pour plus de limites)
VITE_POKEMON_TCG_API_KEY=votre_clé
```

**Note**: TCGdex ne nécessite pas de clé API et est 100% gratuit.

## 🚀 Déploiement sur Cloudflare Pages

Voir le fichier [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) pour les instructions détaillées.

### Configuration rapide

**Framework preset**: Vite
**Build command**: `npm run build`
**Build output**: `dist`

Le déploiement est automatique à chaque push sur votre branche principale.

## 🔧 Comment ça marche

### 1. Détection de la carte
- Algorithme de détection de bords (Sobel-like)
- Projections horizontales/verticales
- Validation ratio (0.4-1.0) et couverture (>5%)
- Crop automatique de la carte

### 2. OCR (Reconnaissance de texte)
- **OCR.space Engine 2** : Optimisé pour polices stylisées
- Prétraitement : contrast, grayscale, binarization
- Extraction zones ciblées :
  - Nom : 12% en haut (où se trouve le nom)
  - Numéro : 8% en bas (format: 186/195)

### 3. Recherche de la carte
- **TCGdex API française** : Base de données multilingue
- Nettoyage des accents (Mélofée → melofee)
- Fuzzy matching avec distance de Levenshtein
- Matching bi-directionnel flexible

## 💡 Conseils pour une meilleure détection

- ✅ **Éclairage**: Lumière uniforme, évitez les reflets
- ✅ **Cadrage**: Utilisez le guide visuel (4 coins)
- ✅ **Distance**: Proche ou loin, les deux fonctionnent
- ✅ **Stabilité**: Gardez la carte stable 1-2 secondes
- ✅ **Netteté**: Assurez-vous que le nom est lisible

## 🎯 Cartes supportées

- ✅ Toutes les cartes Pokémon françaises
- ✅ EX, V, VMAX, VSTAR, GX
- ✅ Cartes promotionnelles
- ✅ Cartes anciennes et récentes
- ✅ Full art, Rainbow rare, etc.

## 🆕 Nouveautés

- **v2.0** : Scan temps réel + guide visuel
- **v2.0** : API TCGdex française
- **v2.0** : Auto-détection carte éloignée
- **v2.0** : Support iOS avec bouton démarrage vidéo

## 🐛 Dépannage

### La caméra ne s'affiche pas (iOS)
→ Cliquez sur le bouton "▶️ Démarrer la vidéo" après autorisation

### OCR ne détecte pas le nom
→ Vérifiez l'éclairage, rapprochez-vous, utilisez le guide visuel

### Mauvaise carte trouvée
→ Assurez-vous que le nom est bien lisible, essayez plusieurs fois

### Image manquante
→ Ouvrez la console (F12) et vérifiez les logs `[TCGdex]`

## 📝 Licence

MIT

---

**Made with ❤️ for Pokémon TCG collectors**
