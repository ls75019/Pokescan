# 🎴 PokéScan

Application React de reconnaissance et de recherche de cartes Pokémon utilisant l'API Pokemon TCG.

## Fonctionnalités

- **Recherche par nom**: Recherchez des cartes Pokémon par leur nom
- **Upload d'image**: Uploadez une photo de votre carte
- **Capture photo**: Utilisez votre webcam pour prendre une photo d'une carte
- **Affichage détaillé**: Visualisez toutes les informations de la carte (rareté, set, artiste, prix, etc.)
- **Design moderne**: Interface responsive avec un design moderne

## Technologies utilisées

- React 19
- Vite
- Pokemon TCG SDK
- CSS3 avec animations

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

### Mode Image
1. Cliquez sur "📷 Reconnaissance par image"
2. Choisissez entre:
   - **📁 Choisir une image**: Upload depuis votre ordinateur
   - **📷 Utiliser la caméra**: Prenez une photo en direct
3. Capturez l'image de votre carte

> **Note**: La reconnaissance automatique d'image nécessiterait une intégration avec une API OCR ou de reconnaissance d'image. Pour l'instant, utilisez le mode recherche pour trouver vos cartes manuellement.

## Structure du projet

```
pokescan/
├── src/
│   ├── components/
│   │   ├── ImageUpload.jsx    # Composant pour upload/capture d'image
│   │   ├── CardSearch.jsx     # Composant de recherche
│   │   └── CardDisplay.jsx    # Affichage des résultats
│   ├── App.jsx                # Composant principal
│   ├── App.css                # Styles principaux
│   └── main.jsx               # Point d'entrée
├── package.json
└── README.md
```

## API Pokemon TCG

Ce projet utilise l'API gratuite [Pokemon TCG](https://pokemontcg.io/). Vous pouvez optionnellement ajouter une clé API dans `src/App.jsx` pour augmenter les limites de requêtes :

```javascript
pokemon.configure({ apiKey: 'your-api-key-here' });
```

## Améliorations futures possibles

- [ ] Intégration OCR (Tesseract.js) pour reconnaissance automatique
- [ ] Ajout d'une API de reconnaissance d'image
- [ ] Collection personnelle de cartes
- [ ] Système de favoris
- [ ] Comparaison de prix sur différentes plateformes
- [ ] Filtres avancés (type, rareté, set, etc.)
- [ ] Mode sombre/clair

## Licence

MIT
