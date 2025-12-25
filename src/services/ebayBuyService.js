/**
 * Service eBay Buy API pour rechercher les ventes récentes
 * API: eBay Buy Browse API
 * Doc: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */

const EBAY_BUY_API = 'https://api.ebay.com/buy/browse/v1';

// OAuth Token (User Access Token)
const EBAY_OAUTH_TOKEN = 'v^1.1#i^1#f^0#r^0#p^1#I^3#t^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';

/**
 * Rechercher des articles vendus (completed listings)
 */
export const searchSoldListingsBuyAPI = async (cardName, cardNumber = null) => {
  console.log('🛒 [eBay Buy API] Recherche pour:', { cardName, cardNumber });

  try {
    // Construire la query
    let query = `Pokemon ${cardName}`;
    if (cardNumber) {
      query += ` ${cardNumber}`;
    }

    // Paramètres de recherche
    const params = new URLSearchParams({
      q: query,
      limit: '50',
      filter: 'buyingOptions:{FIXED_PRICE},itemLocationCountry:FR', // France
      category_ids: '2536', // Pokemon TCG
      sort: '-endDate' // Plus récents d'abord
    });

    const url = `${EBAY_BUY_API}/item_summary/search?${params.toString()}`;

    console.log('📡 [eBay Buy API] URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${EBAY_OAUTH_TOKEN}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR',
        'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=FR',
        'Accept': 'application/json'
      }
    });

    console.log('📦 [eBay Buy API] Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [eBay Buy API] Erreur:', errorText);
      throw new Error(`eBay Buy API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 [eBay Buy API] Données:', JSON.stringify(data, null, 2));

    const items = data.itemSummaries || [];

    if (items.length === 0) {
      console.log('⚠️ [eBay Buy API] Aucun résultat');
      return {
        success: true,
        count: 0,
        items: [],
        statistics: null
      };
    }

    console.log(`✅ [eBay Buy API] ${items.length} résultats trouvés`);

    // Formater les résultats
    const formattedItems = items.map(item => ({
      title: item.title,
      price: parseFloat(item.price?.value || 0),
      currency: item.price?.currency || 'EUR',
      condition: item.condition,
      url: item.itemWebUrl,
      image: item.image?.imageUrl,
      seller: item.seller?.username,
      shippingCost: parseFloat(item.shippingOptions?.[0]?.shippingCost?.value || 0)
    }));

    // Calculer statistiques
    const prices = formattedItems.map(item => item.price).filter(p => p > 0);
    const statistics = calculateStatistics(prices);

    return {
      success: true,
      count: formattedItems.length,
      items: formattedItems,
      statistics
    };

  } catch (error) {
    console.error('❌ [eBay Buy API] Erreur:', error);
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
 * Formater le prix
 */
export const formatPrice = (price, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(price);
};

/**
 * Formater la date
 */
export const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};
