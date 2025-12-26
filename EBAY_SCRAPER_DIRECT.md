# 🕷️ Scraper eBay Direct - Comment ça marche

## ✅ C'EST FAIT !

Le scraping eBay est maintenant **intégré directement dans l'app React** sans besoin de backend.

## 🚀 Comment ça fonctionne

### 1. Proxies CORS publics
Pour contourner les restrictions CORS du navigateur, on utilise 3 proxies gratuits:
```javascript
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];
```

Si un proxy échoue, le code essaie automatiquement le suivant.

### 2. Parsing HTML avec DOMParser
```javascript
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const itemElements = doc.querySelectorAll('.s-item');
```

On parse le HTML d'eBay directement dans le navigateur pour extraire:
- Titre de la carte
- Prix de vente
- Date de vente
- Condition (Neuf/Occasion)
- Image
- URL eBay

### 3. Filtres eBay utilisés
```javascript
const params = {
  '_nkw': 'Dracaufeu 4/102',    // Recherche
  'LH_Sold': '1',                // Ventes terminées
  'LH_Complete': '1',            // Complétées
  'LH_PrefLoc': '1',             // France
  '_ipg': '50',                  // 50 résultats max
};
```

## 📊 Exemple de données retournées

```json
{
  "success": true,
  "count": 15,
  "items": [
    {
      "title": "Carte Pokemon Dracaufeu 4/102 Edition 1 Wizards",
      "price": 89.99,
      "soldDate": "12 janv. 2024",
      "condition": "Occasion",
      "image": "https://i.ebayimg.com/...",
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

## ✅ Avantages

- **Aucun backend** → Pas besoin de Cloudflare Worker
- **Ventes réelles** → Prix de vente terminés (pas prix demandés)
- **Gratuit** → Pas de limite API
- **Immédiat** → Ça fonctionne maintenant
- **Fallback** → 3 proxies pour la fiabilité

## ⚠️ Limitations

- **Fragile** → Si eBay change son HTML, ça peut casser
- **Lent** → Dépend des proxies CORS (peut prendre 5-15 secondes)
- **Bloquable** → Les proxies peuvent être bannis par eBay
- **Pas garanti** → Proxies publics peuvent tomber

## 🧪 Test

1. Lancer l'app:
```bash
npm run dev
```

2. Scanner une carte Pokémon

3. Regarder la console pour voir les logs:
```
🕷️ [Direct] URL eBay: https://www.ebay.fr/sch/i.html?...
🔄 [Direct] Tentative 1/3 avec proxy: https://api.allorigins.win/raw?url=
✅ [Direct] HTML reçu, taille: 245678 caractères
🔍 [Parser] Items trouvés dans le DOM: 52
✅ [Parser] Items valides extraits: 15
✅ [Direct] Items extraits: 15
```

4. Les ventes terminées s'affichent avec statistiques

## 🔧 Débogage

### Si ça ne marche pas:

1. **Ouvrir la console** (F12)
2. Regarder les erreurs
3. Vérifier que les proxies répondent

### Si aucun résultat:

- Les proxies peuvent être temporairement bloqués
- Essayer à nouveau (le code changera de proxy automatiquement)
- Vérifier que la carte existe sur eBay France

### Si c'est trop lent:

- C'est normal, les proxies publics sont lents
- Patience (jusqu'à 15 secondes)

## 🆚 Comparaison avec alternatives

| Méthode | Ventes terminées | Setup | Fiabilité | Vitesse |
|---------|------------------|-------|-----------|---------|
| **Scraper direct** | ✅ Oui | ✅ 0 min | ⚠️ Moyenne | 🐌 5-15s |
| Cloudflare Worker | ✅ Oui | ⚠️ 15 min | ⭐ Bonne | ⚡ 2-5s |
| API Buy Browse | ❌ Non (annonces) | ✅ 0 min | ⭐⭐ Excellente | ⚡⚡ <1s |
| API Finding (Prod) | ✅ Oui | ⚠️ 30 min | ⭐⭐⭐ Parfaite | ⚡⚡ <1s |

## 💡 Recommandation

**POC / Test rapide:**
→ Utiliser le **scraper direct** (déjà fait) ✅

**Production:**
→ Obtenir un **App ID Production eBay** pour Finding API

**Si problèmes:**
→ Déployer le **Cloudflare Worker** (voir `cloudflare-worker/`)

## 📁 Fichiers

- `src/services/ebayDirectScraper.js` → Service de scraping
- `src/App.jsx` → Utilise le scraper
- Aucune config nécessaire, ça marche direct !

---

**État actuel:** ✅ PRÊT À TESTER

Lancez `npm run dev` et scannez une carte pour voir les vraies ventes eBay !
