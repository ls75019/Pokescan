/**
 * Service pour récupérer les ventes eBay via scraping
 * Utilise un Cloudflare Worker comme proxy
 */

// URL du Cloudflare Worker
// Configuré via .env: VITE_EBAY_SCRAPER_URL
// Pour tester localement: http://localhost:8787/scrape-ebay
const WORKER_URL = import.meta.env.VITE_EBAY_SCRAPER_URL || 'https://ebay-scraper.YOUR-SUBDOMAIN.workers.dev/scrape-ebay';

/**
 * Rechercher les ventes terminées sur eBay via scraping
 * @param {string} cardName - Nom de la carte
 * @param {string|null} cardNumber - Numéro de la carte
 * @returns {Promise<Object>} Résultats avec statistiques
 */
export const scrapeSoldListings = async (cardName, cardNumber = null) => {
  try {
    console.log('🕷️ [Scraper] Recherche ventes eBay:', { cardName, cardNumber });

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardName,
        cardNumber
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Scraper] Erreur worker:', response.status, errorText);
      throw new Error(`Worker error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [Scraper] Données reçues:', data);

    if (!data.success) {
      console.error('❌ [Scraper] Échec:', data.error);
      return {
        success: false,
        error: data.error,
        count: 0,
        items: [],
        statistics: { count: 0, min: 0, max: 0, average: 0, median: 0 }
      };
    }

    return {
      success: true,
      count: data.count,
      items: data.items,
      statistics: data.statistics,
      searchQuery: data.searchQuery
    };

  } catch (error) {
    console.error('❌ [Scraper] Erreur réseau:', error);
    return {
      success: false,
      error: error.message,
      count: 0,
      items: [],
      statistics: { count: 0, min: 0, max: 0, average: 0, median: 0 }
    };
  }
};

/**
 * Formater le prix pour affichage
 */
export const formatPrice = (price) => {
  if (!price || price === 0) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

/**
 * Formater la date de vente
 */
export const formatSoldDate = (dateString) => {
  if (!dateString) return 'Date inconnue';
  return dateString;
};
