# Déploiement sur Cloudflare Pages

## Configuration Cloudflare Pages

### 1. Créer un nouveau projet
1. Aller sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pages → Create a project
3. Connecter votre repository GitHub

### 2. Paramètres de build

**Framework preset:** Vite

**Build command:**
```bash
npm run build
```

**Build output directory:**
```
dist
```

**Root directory:**
```
/
```

### 3. Variables d'environnement (optionnel)

Si vous avez une clé API Pokemon TCG :
- Nom: `VITE_POKEMON_TCG_API_KEY`
- Valeur: `votre_clé_api`

### 4. Déploiement

Le déploiement se fait automatiquement à chaque push sur la branche principale.

## Configuration Node.js

Cloudflare Pages utilise automatiquement la dernière version LTS de Node.js.

Si besoin de spécifier une version, ajouter dans `package.json` :
```json
"engines": {
  "node": ">=18.0.0"
}
```

## Permissions

L'app nécessite l'accès à la caméra. Les headers de sécurité sont configurés dans `public/_headers`.

## API utilisées

- **OCR.space** : API gratuite pour OCR (pas de config nécessaire)
- **TCGdex** : API française gratuite pour cartes Pokémon (pas de config nécessaire)
- Caméra du navigateur via `getUserMedia`

## Build local

Pour tester le build avant déploiement :
```bash
npm run build
npm run preview
```

## Dépannage

### Build échoue
- Vérifier que toutes les dépendances sont installées
- Vérifier qu'il n'y a pas d'erreurs TypeScript/ESLint

### App ne charge pas
- Vérifier la console navigateur pour erreurs
- Vérifier que les chemins des assets sont corrects

### Caméra ne marche pas
- HTTPS est requis pour getUserMedia (Cloudflare Pages fournit HTTPS automatiquement)
- Vérifier les permissions caméra dans les paramètres du navigateur
