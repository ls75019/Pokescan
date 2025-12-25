/**
 * Service TCGdex pour rechercher des cartes Pokémon en français
 * API: https://tcgdex.dev/
 * Doc: https://tcgdex.dev/rest/cards
 */

const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/fr'; // API en français

/**
 * Nettoyer un nom de Pokémon pour la recherche
 */
const cleanPokemonName = (name) => {
  return name
    .toLowerCase()
    // Enlever accents (Mélofée → melofee)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Enlever "EX", "V", "VMAX", "GX", etc.
    .replace(/\s+(ex|v|vmax|vstar|gx|mega|prime)\s*$/i, '')
    // Enlever caractères spéciaux
    .replace(/[^a-z0-9\s\-]/g, '')
    .trim();
};

/**
 * Rechercher une carte Pokémon par nom (utilise toujours la recherche globale)
 */
export const searchCardByName = async (name, number = null) => {
  console.log('🔎 [TCGdex] Recherche de carte:', { name, number });

  // Nettoyer le nom
  const cleanName = cleanPokemonName(name);
  console.log('🧹 [TCGdex] Nom nettoyé:', cleanName);

  // Utiliser directement la recherche globale qui est plus flexible
  return await searchCardGlobal(cleanName, number, name);
};

/**
 * Recherche globale dans toutes les cartes
 */
export const searchCardGlobal = async (cleanedName, number = null, originalName = null) => {
  console.log('🌐 [TCGdex] Recherche globale:', { cleanedName, number, originalName });

  try {
    // Récupérer toutes les cartes (liste de base)
    const response = await fetch(`${TCGDEX_API_BASE}/cards`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const allCards = await response.json();
    console.log('📦 [TCGdex] Total cartes disponibles:', allCards.length);

    // Nettoyer le nom de recherche (sans accents)
    const searchNameClean = cleanedName.toLowerCase();

    // Filtrer par nom avec matching flexible
    const nameMatches = allCards.filter(card => {
      if (!card.name) return false;

      // Nettoyer le nom de la carte aussi
      const cardNameClean = cleanPokemonName(card.name);

      // Matching bi-directionnel
      return (
        cardNameClean.includes(searchNameClean) ||
        searchNameClean.includes(cardNameClean) ||
        // Essayer aussi avec nom original
        (originalName && card.name.toLowerCase().includes(originalName.toLowerCase()))
      );
    });

    console.log('🔍 [TCGdex] Correspondances par nom:', nameMatches.length);

    if (nameMatches.length === 0) {
      console.log('❌ [TCGdex] Aucune correspondance trouvée');
      return null;
    }

    // Si on a un numéro, essayer de trouver la carte exacte
    if (number) {
      const numberStr = number.toString();
      const exactMatch = nameMatches.find(card => {
        const cardNum = card.localId?.toString() || '';
        return cardNum === numberStr || cardNum.includes(numberStr);
      });

      if (exactMatch) {
        console.log('✅ [TCGdex] Match exact trouvé:', exactMatch.id);
        return await getCardDetails(exactMatch.id);
      }
    }

    // Récupérer les détails de la première carte
    console.log('✅ [TCGdex] Utilisation première correspondance:', nameMatches[0].id);
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

  console.log('🎴 [TCGdex] Formatage carte:', card.id);
  console.log('📊 [TCGdex] Données carte:', JSON.stringify(card, null, 2));

  // L'API retourne l'image dans card.image avec le chemin complet
  // Format TCGdex API: "fr/swsh/swsh3/186" ou objet avec .high et .low
  let imageUrl = '';

  if (card.image) {
    if (typeof card.image === 'string') {
      // Si c'est une string, construire l'URL complète
      imageUrl = `https://assets.tcgdex.net/${card.image}/high.webp`;
    } else if (card.image.high) {
      // Si c'est un objet avec .high
      imageUrl = card.image.high;
    }
  } else {
    // Fallback: construire manuellement
    const setId = card.set?.id || 'base1';
    const localId = card.localId || '1';
    imageUrl = `https://assets.tcgdex.net/fr/${setId}/${localId}/high.webp`;
  }

  console.log('🖼️ [TCGdex] URL image finale:', imageUrl);

  return {
    id: card.id,
    name: card.name,
    number: card.localId || card.number || '?',
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
