/**
 * Service eBay pour rechercher les ventes récentes de cartes Pokémon
 * API: eBay Finding API
 * Doc: https://developer.ebay.com/DevZone/finding/Concepts/FindingAPIGuide.html
 */

const EBAY_FINDING_API = 'https://svcs.ebay.com/services/search/FindingService/v1';

// App ID eBay (à configurer dans les variables d'environnement)
const EBAY_APP_ID = import.meta.env.VITE_EBAY_APP_ID || 'Validlkk-Pokescan-SBX-fe0563e1b-b8663828';

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

    console.log('📦 [eBay] Réponse brute:', data);

    // Parser la réponse eBay
    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];

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
