/**
 * Service eBay pour rechercher les ventes récentes de cartes Pokémon
 * API: eBay Finding API
 * Doc: https://developer.ebay.com/DevZone/finding/Concepts/FindingAPIGuide.html
 */

const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1';

// App ID eBay
const EBAY_APP_ID = 'Validlkk-Pokescan-SBX-fe0563e1b-b8663828';

// User Token eBay (OAuth)
const EBAY_USER_TOKEN = 'v^1.1#i^1#f^0#r^0#p^1#I^3#t^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';


/**
 * Rechercher les ventes terminées sur eBay
 */
export const searchSoldListings = async (cardName, cardNumber = null) => {
  console.log('🛒 [eBay] Recherche ventes pour:', { cardName, cardNumber });

  try {
    // Construire la requête de recherche
    let keywords = `Pokemon ${cardName}`;
    if (cardNumber) {
      keywords += ` ${cardNumber}`;
    }

    // Paramètres de l'API eBay Finding
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': EBAY_APP_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': keywords,
      'paginationInput.entriesPerPage': '100', // Max 100 résultats
      'sortOrder': 'EndTimeSoonest',
      // Filtres
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'EndTimeFrom',
      'itemFilter(1).value': get90DaysAgoISO(),
      'itemFilter(2).name': 'EndTimeTo',
      'itemFilter(2).value': new Date().toISOString(),
      // Catégorie Cartes à collectionner
      'categoryId': '2536', // Pokemon Trading Card Game
    });

    console.log('📡 [eBay] Requête:', `${EBAY_FINDING_API}?${params.toString().substring(0, 100)}...`);

    const response = await fetch(`${EBAY_FINDING_API}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('📦 [eBay] Réponse brute complète:', JSON.stringify(data, null, 2));

    // Vérifier s'il y a des erreurs
    const ack = data.findCompletedItemsResponse?.[0]?.ack?.[0];
    if (ack === 'Failure' || ack === 'PartialFailure') {
      const errorMessage = data.findCompletedItemsResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0];
      console.error('❌ [eBay] Erreur API:', errorMessage);
      throw new Error(`eBay API error: ${errorMessage}`);
    }

    // Parser la réponse eBay
    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];

    console.log('📊 [eBay] SearchResult:', searchResult);
    console.log('📊 [eBay] Count:', searchResult?.['@count']);

    if (!searchResult || searchResult['@count'] === '0') {
      console.log('⚠️ [eBay] Aucune vente trouvée');
      return {
        success: true,
        count: 0,
        items: [],
        statistics: null
      };
    }

    const items = searchResult.item || [];
    console.log(`✅ [eBay] ${items.length} ventes trouvées`);

    // Extraire les données pertinentes
    const soldItems = items.map(item => ({
      title: item.title?.[0],
      price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0),
      currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'],
      soldDate: item.listingInfo?.[0]?.endTime?.[0],
      condition: item.condition?.[0]?.conditionDisplayName?.[0],
      url: item.viewItemURL?.[0],
      image: item.galleryURL?.[0],
      shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0)
    }));

    // Calculer les statistiques
    const prices = soldItems.map(item => item.price).filter(p => p > 0);
    const statistics = calculateStatistics(prices);

    return {
      success: true,
      count: soldItems.length,
      items: soldItems,
      statistics
    };

  } catch (error) {
    console.error('❌ [eBay] Erreur:', error);
    return {
      success: false,
      error: error.message,
      count: 0,
      items: [],
      statistics: null
    };
  }
};

/**
 * Calculer les statistiques de prix
 */
const calculateStatistics = (prices) => {
  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);

  return {
    count: prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    median: sorted[Math.floor(sorted.length / 2)],
    total: prices.reduce((a, b) => a + b, 0)
  };
};

/**
 * Obtenir la date il y a 90 jours au format ISO
 */
const get90DaysAgoISO = () => {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString();
};

/**
 * Formater le prix pour l'affichage
 */
export const formatPrice = (price, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(price);
};

/**
 * Formater la date pour l'affichage
 */
export const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};
