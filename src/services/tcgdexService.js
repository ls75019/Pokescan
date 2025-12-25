/**
 * Service TCGdex pour rechercher des cartes Pokémon en français
 * API: https://tcgdex.dev/
 * Doc: https://tcgdex.dev/rest/cards
 */

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/fr'; // API en français

/**
 * Rechercher une carte Pokémon par nom
 */
export const searchCardByName = async (name, number = null) => {
  console.log('🔎 [TCGdex] Recherche de carte:', { name, number });

  try {
    // Rechercher toutes les cartes correspondant au nom
    const response = await fetch(`${TCGDEX_API_BASE}/cards/${encodeURIComponent(name)}`);

    console.log('📡 [TCGdex] Réponse HTTP:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('⚠️ [TCGdex] Carte non trouvée, essai avec recherche globale...');
        return await searchCardGlobal(name, number);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cards = await response.json();
    console.log('✅ [TCGdex] Cartes trouvées:', cards.length || 1);

    // Si c'est un tableau
    if (Array.isArray(cards)) {
      // Si on a un numéro, essayer de trouver la carte exacte
      if (number && cards.length > 0) {
        const exactMatch = cards.find(card =>
          card.localId === number ||
          card.id?.includes(number)
        );
        if (exactMatch) {
          return exactMatch;
        }
      }

      // Sinon retourner la première carte
      return cards[0] || null;
    }

    // Si c'est un objet unique
    return cards;

  } catch (error) {
    console.error('❌ [TCGdex] Erreur recherche par nom:', error);

    // Fallback: recherche globale
    return await searchCardGlobal(name, number);
  }
};

/**
 * Recherche globale dans toutes les cartes
 */
export const searchCardGlobal = async (name, number = null) => {
  console.log('🌐 [TCGdex] Recherche globale:', { name, number });

  try {
    // Récupérer toutes les cartes (avec pagination)
    const response = await fetch(`${TCGDEX_API_BASE}/cards`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const allCards = await response.json();
    console.log('📦 [TCGdex] Total cartes disponibles:', allCards.length);

    // Filtrer par nom (recherche partielle, insensible à la casse)
    const nameMatches = allCards.filter(card => {
      const cardName = card.name?.toLowerCase() || '';
      const searchName = name.toLowerCase();

      return cardName.includes(searchName) || searchName.includes(cardName);
    });

    console.log('🔍 [TCGdex] Correspondances par nom:', nameMatches.length);

    if (nameMatches.length === 0) {
      return null;
    }

    // Si on a un numéro, essayer de trouver la carte exacte
    if (number) {
      const exactMatch = nameMatches.find(card =>
        card.localId === number ||
        card.id?.includes(number)
      );
      if (exactMatch) {
        // Récupérer les détails complets de la carte
        return await getCardDetails(exactMatch.id);
      }
    }

    // Récupérer les détails de la première carte
    return await getCardDetails(nameMatches[0].id);

  } catch (error) {
    console.error('❌ [TCGdex] Erreur recherche globale:', error);
    throw error;
  }
};

/**
 * Récupérer les détails complets d'une carte par son ID
 */
export const getCardDetails = async (cardId) => {
  console.log('📄 [TCGdex] Récupération détails carte:', cardId);

  try {
    const response = await fetch(`${TCGDEX_API_BASE}/cards/${cardId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const card = await response.json();
    console.log('✅ [TCGdex] Détails récupérés:', card.name);

    return card;

  } catch (error) {
    console.error('❌ [TCGdex] Erreur récupération détails:', error);
    throw error;
  }
};

/**
 * Formater une carte TCGdex pour l'affichage
 */
export const formatCard = (card) => {
  if (!card) return null;

  // Construction URL image TCGdex
  // Format: https://assets.tcgdex.net/fr/swsh/swsh3/186/high.webp
  const setId = card.set?.id || 'base1';
  const localId = card.localId || '1';
  const imageUrl = `https://assets.tcgdex.net/fr/${setId}/${localId}/high.webp`;

  console.log('🖼️ [TCGdex] URL image:', imageUrl);

  return {
    id: card.id,
    name: card.name,
    number: localId,
    set: {
      name: card.set?.name || 'N/A',
      printedTotal: card.set?.cardCount?.total || '?'
    },
    rarity: card.rarity || 'N/A',
    types: card.types || [],
    hp: card.hp || null,
    images: {
      small: imageUrl,
      large: imageUrl
    }
  };
};
