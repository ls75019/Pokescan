/**
 * Scraper eBay DIRECT depuis le navigateur
 * Utilise un proxy CORS public pour contourner les restrictions
 */

// Proxies CORS publics (gratuits)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

let currentProxyIndex = 0;

/**
 * Construire l'URL de recherche eBay avec filtres ventes terminées
 */
const buildEbaySearchUrl = (cardName, cardNumber) => {
  let searchQuery = cardName;
  if (cardNumber) {
    searchQuery += ` ${cardNumber}`;
  }

  const params = new URLSearchParams({
    '_nkw': searchQuery,
    '_sacat': '0',
    'LH_Sold': '1',        // Ventes terminées
    'LH_Complete': '1',     // Complétées
    'LH_PrefLoc': '1',      // France
    'rt': 'nc',             // Format liste
    '_ipg': '50',           // 50 résultats
  });

  return `https://www.ebay.fr/sch/i.html?${params.toString()}`;
};

/**
 * Scraper eBay directement avec proxy CORS
 */
export const scrapeEbayDirect = async (cardName, cardNumber = null) => {
  const ebayUrl = buildEbaySearchUrl(cardName, cardNumber);

  console.log('🕷️ [Direct] URL eBay:', ebayUrl);

  // Essayer avec différents proxies si nécessaire
  for (let attempt = 0; attempt < CORS_PROXIES.length; attempt++) {
    const proxy = CORS_PROXIES[currentProxyIndex];
    const proxyUrl = proxy + encodeURIComponent(ebayUrl);

    console.log(`🔄 [Direct] Tentative ${attempt + 1}/${CORS_PROXIES.length} avec proxy:`, proxy);

    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(15000), // Timeout 15s
      });

      if (!response.ok) {
        console.warn(`⚠️ [Direct] Proxy ${proxy} erreur ${response.status}`);
        currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
        continue;
      }

      const html = await response.text();
      console.log('✅ [Direct] HTML reçu, taille:', html.length, 'caractères');

      // Parser le HTML
      const items = parseEbayHTML(html);
      console.log('✅ [Direct] Items extraits:', items.length);

      if (items.length === 0) {
        console.warn('⚠️ [Direct] Aucun item trouvé, tentative proxy suivant...');
        currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
        continue;
      }

      // Calculer statistiques
      const prices = items.map(item => item.price).filter(p => p > 0);
      const statistics = calculateStatistics(prices);

      return {
        success: true,
        count: items.length,
        items: items,
        statistics: statistics,
        searchQuery: `${cardName}${cardNumber ? ' ' + cardNumber : ''}`
      };

    } catch (error) {
      console.error(`❌ [Direct] Erreur avec proxy ${proxy}:`, error.message);
      currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
      continue;
    }
  }

  // Tous les proxies ont échoué
  return {
    success: false,
    error: 'Impossible de récupérer les données eBay (tous les proxies ont échoué)',
    count: 0,
    items: [],
    statistics: { count: 0, min: 0, max: 0, average: 0, median: 0 }
  };
};

/**
 * Parser le HTML eBay pour extraire les ventes
 */
function parseEbayHTML(html) {
  const items = [];

  try {
    // Créer un DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // eBay utilise des classes comme "s-item" pour chaque résultat
    const itemElements = doc.querySelectorAll('.s-item');

    console.log('🔍 [Parser] Items trouvés dans le DOM:', itemElements.length);

    itemElements.forEach((element, index) => {
      try {
        // Titre
        const titleElement = element.querySelector('.s-item__title');
        const title = titleElement?.textContent?.trim() || '';

        // Ignorer les "Shop on eBay" et autres non-items
        if (title.includes('Shop on eBay') || title.includes('Publicité') || !title) {
          return;
        }

        // Prix
        const priceElement = element.querySelector('.s-item__price');
        let price = 0;
        if (priceElement) {
          const priceText = priceElement.textContent.trim();
          // Extraire le nombre: "45,99 EUR" -> 45.99
          const priceMatch = priceText.match(/([0-9]+[,.]?[0-9]*)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
          }
        }

        // URL
        const linkElement = element.querySelector('.s-item__link');
        const url = linkElement?.href || '';

        // Image
        const imageElement = element.querySelector('.s-item__image-img');
        const image = imageElement?.src || imageElement?.getAttribute('data-src') || null;

        // Condition (Neuf/Occasion)
        const conditionElement = element.querySelector('.SECONDARY_INFO');
        const condition = conditionElement?.textContent?.trim() || 'Non spécifié';

        // Date de vente
        const soldElement = element.querySelector('.s-item__title--tag');
        let soldDate = null;
        if (soldElement) {
          const soldText = soldElement.textContent;
          const dateMatch = soldText.match(/Vendu\s+(.+)/);
          if (dateMatch) {
            soldDate = dateMatch[1].trim();
          }
        }

        if (price > 0 && title) {
          items.push({
            title,
            price,
            soldDate,
            condition,
            image,
            url
          });
        }
      } catch (err) {
        console.warn('⚠️ [Parser] Erreur parsing item:', err);
      }
    });

    console.log('✅ [Parser] Items valides extraits:', items.length);

  } catch (error) {
    console.error('❌ [Parser] Erreur parsing HTML:', error);
  }

  return items;
}

/**
 * Calculer les statistiques de prix
 */
function calculateStatistics(prices) {
  if (prices.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      average: 0,
      median: 0
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    count: prices.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: sum / prices.length,
    median: sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  };
}

/**
 * Formater le prix
 */
export const formatPrice = (price) => {
  if (!price || price === 0) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

/**
 * Formater la date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Date inconnue';
  return dateString;
};
