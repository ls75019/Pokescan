/**
 * Cloudflare Worker pour scraper les ventes eBay
 *
 * Déploiement:
 * 1. Créer un Worker sur dash.cloudflare.com
 * 2. Copier ce code
 * 3. Déployer
 *
 * Usage:
 * POST https://votre-worker.workers.dev/scrape-ebay
 * Body: { "cardName": "Dracaufeu", "cardNumber": "4/102" }
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const { cardName, cardNumber } = await request.json();

      if (!cardName) {
        return new Response(JSON.stringify({ error: 'cardName required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Construire la requête de recherche
      let searchQuery = cardName;
      if (cardNumber) {
        searchQuery += ` ${cardNumber}`;
      }

      // URL eBay avec filtres ventes terminées
      const ebayUrl = new URL('https://www.ebay.fr/sch/i.html');
      ebayUrl.searchParams.set('_nkw', searchQuery);
      ebayUrl.searchParams.set('_sacat', '0'); // Toutes catégories
      ebayUrl.searchParams.set('LH_Sold', '1'); // Ventes terminées
      ebayUrl.searchParams.set('LH_Complete', '1'); // Ventes complétées
      ebayUrl.searchParams.set('LH_PrefLoc', '1'); // Localisation préférée
      ebayUrl.searchParams.set('rt', 'nc'); // Format liste

      console.log('Fetching:', ebayUrl.toString());

      // Fetch la page eBay avec headers réalistes
      const response = await fetch(ebayUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        }
      });

      if (!response.ok) {
        console.error('eBay response not OK:', response.status);
        return new Response(JSON.stringify({
          success: false,
          error: `eBay returned ${response.status}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const html = await response.text();

      // Parser le HTML pour extraire les prix
      const items = parseEbayHTML(html);

      // Calculer les statistiques
      const prices = items.map(item => item.price).filter(p => p > 0);
      const statistics = calculateStatistics(prices);

      const result = {
        success: true,
        count: items.length,
        items: items,
        statistics: statistics,
        searchQuery: searchQuery
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Parser le HTML eBay pour extraire les ventes
 */
function parseEbayHTML(html) {
  const items = [];

  // Regex pour trouver les items vendus
  // eBay utilise des structures comme:
  // <div class="s-item__info">
  //   <span class="s-item__price">XX,XX EUR</span>
  //   <h3 class="s-item__title">Titre</h3>
  //   <span class="POSITIVE">Vendu le XX/XX/XXXX</span>
  // </div>

  // Regex pour extraire prix: "XX,XX EUR" ou "XX EUR"
  const priceRegex = /<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([^<]+)<\/span>/gi;
  const titleRegex = /<div[^>]*class="[^"]*s-item__title[^"]*"[^>]*><span[^>]*>([^<]+)<\/span><\/div>/gi;
  const soldDateRegex = /Vendu\s+([^<]+)</gi;
  const imageRegex = /<img[^>]*class="[^"]*s-item__image-img[^"]*"[^>]*src="([^"]+)"/gi;
  const urlRegex = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/gi;

  // Approche plus robuste: découper par items
  const itemBlocks = html.split(/class="s-item s-item/);

  for (let i = 1; i < itemBlocks.length; i++) {
    const block = itemBlocks[i];

    // Extraire le prix
    const priceMatch = block.match(/<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([^<]+)<\/span>/i);
    let price = 0;
    if (priceMatch) {
      const priceText = priceMatch[1].trim();
      // Convertir "45,99 EUR" ou "45 EUR" en nombre
      const numMatch = priceText.match(/([0-9]+[,.]?[0-9]*)/);
      if (numMatch) {
        price = parseFloat(numMatch[1].replace(',', '.'));
      }
    }

    // Extraire le titre
    const titleMatch = block.match(/<div[^>]*class="[^"]*s-item__title[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Sans titre';

    // Extraire la date de vente
    const soldMatch = block.match(/Vendu\s+([^<]+)/i);
    const soldDate = soldMatch ? soldMatch[1].trim() : null;

    // Extraire l'image
    const imageMatch = block.match(/<img[^>]*class="[^"]*s-item__image-img[^"]*"[^>]*src="([^"]+)"/i);
    const image = imageMatch ? imageMatch[1] : null;

    // Extraire l'URL
    const urlMatch = block.match(/<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/i);
    const url = urlMatch ? urlMatch[1] : null;

    // Extraire la condition (Neuf/Occasion)
    const conditionMatch = block.match(/<span[^>]*class="[^"]*SECONDARY_INFO[^"]*"[^>]*>([^<]+)<\/span>/i);
    const condition = conditionMatch ? conditionMatch[1].trim() : 'Non spécifié';

    if (price > 0) {
      items.push({
        title,
        price,
        soldDate,
        condition,
        image,
        url
      });
    }
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
