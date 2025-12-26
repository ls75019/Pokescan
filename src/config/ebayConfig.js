/**
 * Configuration pour la récupération des données eBay
 */

// Méthode à utiliser: 'api' ou 'scraper'
export const EBAY_METHOD = 'scraper'; // Changez en 'api' pour utiliser l'API officielle

// Configuration selon la méthode choisie
export const getEbayService = () => {
  if (EBAY_METHOD === 'scraper') {
    console.log('📊 Utilisation du scraper eBay (ventes terminées)');
    return import('../services/ebayScraperService');
  } else {
    console.log('📊 Utilisation de l\'API eBay Buy Browse (annonces actuelles)');
    return import('../services/ebayBuyService');
  }
};

/**
 * Avantages/Inconvénients:
 *
 * SCRAPER (ventes terminées réelles):
 * ✅ Ventes terminées réelles des 90 derniers jours
 * ✅ Prix de vente réels
 * ✅ Gratuit (100k requêtes/jour Cloudflare)
 * ❌ Nécessite déploiement Cloudflare Worker
 * ❌ Fragile (HTML peut changer)
 * ❌ Peut être bloqué par eBay
 *
 * API (annonces actuelles):
 * ✅ Stable et officiel
 * ✅ Pas besoin de backend
 * ✅ Token OAuth déjà configuré
 * ❌ Annonces en cours uniquement (pas les ventes)
 * ❌ Prix demandés (pas prix de vente réels)
 */
