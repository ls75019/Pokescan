# eBay Scraper - Cloudflare Worker

Worker pour scraper les ventes terminées eBay et contourner les restrictions CORS.

## 🚀 Déploiement

### Option 1: Interface web Cloudflare (plus simple)

1. **Créer un compte Cloudflare** (gratuit)
   - Aller sur https://dash.cloudflare.com/
   - S'inscrire gratuitement

2. **Créer un Worker**
   - Dans le dashboard, aller dans "Workers & Pages"
   - Cliquer "Create Worker"
   - Donner un nom: `ebay-scraper`

3. **Copier le code**
   - Cliquer "Quick Edit"
   - Copier tout le contenu de `ebay-scraper.js`
   - Coller dans l'éditeur
   - Cliquer "Save and Deploy"

4. **Récupérer l'URL**
   - Vous verrez l'URL: `https://ebay-scraper.VOTRE-SUBDOMAIN.workers.dev`
   - Copier cette URL

5. **Configurer l'app React**
   - Ouvrir `src/services/ebayScraperService.js`
   - Remplacer `WORKER_URL` par votre URL + `/scrape-ebay`
   ```javascript
   const WORKER_URL = 'https://ebay-scraper.VOTRE-SUBDOMAIN.workers.dev/scrape-ebay';
   ```

### Option 2: CLI Wrangler (développeurs)

```bash
# Installer Wrangler
npm install -g wrangler

# Se connecter à Cloudflare
wrangler login

# Déployer
cd cloudflare-worker
wrangler deploy

# Tester localement
wrangler dev
```

## 🧪 Test

Une fois déployé, testez avec curl:

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
      "title": "Carte Pokemon Dracaufeu 4/102...",
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

## 📊 Utilisation dans l'app

Une fois configuré, l'app utilisera automatiquement le scraper:

```javascript
import { scrapeSoldListings } from './services/ebayScraperService';

const sales = await scrapeSoldListings('Dracaufeu', '4/102');
console.log(sales.statistics); // Prix min, max, moyen, médian
console.log(sales.items); // Liste des ventes
```

## ⚠️ Limitations

- **100,000 requêtes/jour** sur le plan gratuit Cloudflare
- eBay peut changer sa structure HTML → nécessitera des mises à jour
- Pas de garantie de disponibilité (scraping = fragile)

## 💡 Alternative recommandée

Pour une solution plus stable, utilisez **l'API officielle eBay Finding API** avec un App ID Production (gratuit).

## 🔧 Débogage

Les logs sont visibles dans le dashboard Cloudflare:
- Aller dans "Workers & Pages"
- Cliquer sur votre worker
- Onglet "Logs"
