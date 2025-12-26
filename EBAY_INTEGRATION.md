# Intégration eBay - Guide Complet

## 🎯 Objectif

Afficher les **prix de vente réels** des cartes Pokémon sur eBay France pour estimer leur valeur.

## 📊 Deux approches disponibles

### Option 1: **Scraper eBay** (Recommandé pour les ventes terminées)

**Avantages:**
- ✅ **Ventes réelles terminées** des 90 derniers jours
- ✅ **Prix de vente réels** (pas les prix demandés)
- ✅ Gratuit (100,000 requêtes/jour sur Cloudflare Workers)
- ✅ Pas besoin d'App ID eBay

**Inconvénients:**
- ❌ Nécessite de déployer un Cloudflare Worker (15 min)
- ❌ Fragile (si eBay change son HTML)
- ❌ Peut être bloqué par eBay

**Quand l'utiliser:**
- Vous voulez les **vraies ventes** pour estimer le prix
- Vous êtes prêt à déployer un Worker
- Vous voulez savoir "À combien se vend vraiment cette carte?"

---

### Option 2: **API eBay Buy Browse** (Actuellement configurée)

**Avantages:**
- ✅ Stable et officiel
- ✅ Pas besoin de backend
- ✅ Token OAuth déjà configuré
- ✅ Pas de risque de blocage

**Inconvénients:**
- ❌ **Annonces actuelles** uniquement (pas les ventes terminées)
- ❌ Prix **demandés** (pas forcément le prix de vente réel)
- ❌ Moins pertinent pour estimer la valeur

**Quand l'utiliser:**
- Vous voulez juste voir "Combien les gens demandent pour cette carte?"
- Vous ne voulez pas déployer de backend
- Vous préférez une solution simple et stable

---

## 🚀 Comment déployer le scraper (Option 1)

### Étape 1: Créer le Cloudflare Worker

1. **Créer un compte Cloudflare** (gratuit)
   ```
   https://dash.cloudflare.com/
   ```

2. **Créer un Worker**
   - Dans le dashboard → "Workers & Pages"
   - Cliquer "Create Worker"
   - Nom: `ebay-scraper`

3. **Copier le code**
   - Cliquer "Quick Edit"
   - Copier le contenu de `/cloudflare-worker/ebay-scraper.js`
   - Coller dans l'éditeur
   - Cliquer "Save and Deploy"

4. **Récupérer l'URL**
   ```
   https://ebay-scraper.VOTRE-SUBDOMAIN.workers.dev
   ```

### Étape 2: Configurer l'app

1. **Créer un fichier `.env`** (copier `.env.example`)
   ```bash
   cp .env.example .env
   ```

2. **Ajouter l'URL du Worker**
   ```env
   VITE_EBAY_SCRAPER_URL=https://ebay-scraper.VOTRE-SUBDOMAIN.workers.dev/scrape-ebay
   ```

3. **Modifier `App.jsx`** pour utiliser le scraper
   ```javascript
   // Remplacer l'import
   import { scrapeSoldListings, formatPrice, formatSoldDate } from './services/ebayScraperService';

   // Remplacer l'appel
   const sales = await scrapeSoldListings(cardName, cardNumber);
   ```

### Étape 3: Tester

```bash
# Redémarrer le serveur dev
npm run dev

# Scanner une carte
# Vous devriez voir les ventes terminées réelles
```

---

## 🧪 Test manuel du Worker

```bash
curl -X POST https://ebay-scraper.VOTRE-SUBDOMAIN.workers.dev/scrape-ebay \
  -H "Content-Type: application/json" \
  -d '{"cardName": "Dracaufeu", "cardNumber": "4/102"}'
```

Réponse attendue:
```json
{
  "success": true,
  "count": 15,
  "items": [
    {
      "title": "Carte Pokemon Dracaufeu 4/102",
      "price": 89.99,
      "soldDate": "12 janv. 2024",
      "condition": "Occasion",
      "image": "https://...",
      "url": "https://www.ebay.fr/itm/..."
    }
  ],
  "statistics": {
    "count": 15,
    "min": 45.00,
    "max": 120.00,
    "average": 78.50,
    "median": 75.00
  }
}
```

---

## 📂 Structure des fichiers

```
Pokescan/
├── cloudflare-worker/
│   ├── ebay-scraper.js       # Code du Worker
│   ├── wrangler.toml          # Config déploiement
│   └── README.md              # Instructions déploiement
├── src/
│   ├── services/
│   │   ├── ebayBuyService.js      # Option 2: API officielle
│   │   └── ebayScraperService.js  # Option 1: Scraper
│   └── config/
│       └── ebayConfig.js      # Config pour choisir la méthode
└── .env                       # Configuration (URLs, tokens)
```

---

## 🔄 Basculer entre les deux méthodes

### Utiliser le scraper (ventes terminées)

```javascript
// src/App.jsx
import { scrapeSoldListings, formatPrice, formatSoldDate } from './services/ebayScraperService';

const sales = await scrapeSoldListings(cardName, cardNumber);
```

### Utiliser l'API (annonces actuelles)

```javascript
// src/App.jsx
import { searchSoldListingsBuyAPI, formatPrice, formatDate } from './services/ebayBuyService';

const sales = await searchSoldListingsBuyAPI(cardName, cardNumber);
```

---

## ⚙️ Alternative: API eBay Production (ventes terminées officielles)

Si vous voulez les ventes terminées **sans scraper**, vous pouvez:

1. Créer un **App ID Production** sur https://developer.ebay.com
2. Utiliser la **Finding API** avec `findCompletedItems`
3. Modifier `ebayService.js` pour utiliser cet App ID

**Problème actuel:** Votre App ID est en mode **Sandbox** (`Validlkk-Pokescan-SBX-...`) qui ne retourne pas de vraies données.

---

## 💡 Recommandation

**Pour un POC rapide:**
→ Utilisez le **scraper** (15 min de setup, vraies ventes)

**Pour la production:**
→ Obtenez un **App ID Production eBay** (officiel, stable)

**Pour tester vite:**
→ Gardez l'**API Buy Browse** actuelle (annonces, pas ventes)

---

## 🐛 Débogage

### Le scraper ne retourne rien

1. Vérifier l'URL du Worker dans `.env`
2. Tester le Worker directement avec curl
3. Regarder les logs Cloudflare (dashboard → Worker → Logs)

### CORS errors

- Le Worker doit être déployé (pas en local)
- Vérifier les headers CORS dans `ebay-scraper.js`

### 403 Forbidden

- eBay peut bloquer certaines IPs
- Essayer d'ajouter plus de headers réalistes
- Utiliser l'API officielle à la place

---

## 📈 Limites gratuites

| Service | Limite gratuite |
|---------|-----------------|
| Cloudflare Workers | 100,000 requêtes/jour |
| eBay Finding API (Production) | 5,000 appels/jour |
| eBay Buy API | Selon votre tier |

---

## 🎯 Résumé

**État actuel:**
- ✅ API Buy Browse configurée (annonces actuelles)
- ⚠️ Scraper créé mais pas encore déployé

**Pour activer le scraper:**
1. Déployer le Worker sur Cloudflare (15 min)
2. Configurer `.env` avec l'URL du Worker
3. Modifier `App.jsx` pour importer `ebayScraperService`

**Pour garder l'API:**
- Rien à faire, déjà configuré
- Retourne les annonces actuelles (pas les ventes)
