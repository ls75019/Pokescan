/**
 * Service de correspondance floue pour matcher les noms OCR avec les vrais noms de Pokémon
 */

/**
 * Calculer la distance de Levenshtein entre deux chaînes
 */
export const levenshteinDistance = (str1, str2) => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const matrix = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j] + 1      // Suppression
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
};

/**
 * Calculer la similarité entre deux chaînes (0 à 1)
 */
export const similarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

/**
 * Nettoyer un texte OCR pour le matching
 */
export const cleanOCRText = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, ' ')           // Normaliser les espaces
    .trim();
};

/**
 * Trouver le meilleur match dans une liste de candidats
 */
export const findBestMatch = (ocrText, candidates, minSimilarity = 0.6) => {
  const cleaned = cleanOCRText(ocrText);

  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  let bestMatch = null;
  let bestScore = minSimilarity;

  for (const candidate of candidates) {
    const candidateCleaned = cleanOCRText(candidate);
    const score = similarity(cleaned, candidateCleaned);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        text: candidate,
        score: score,
        confidence: Math.round(score * 100)
      };
    }
  }

  return bestMatch;
};

/**
 * Trouver les N meilleurs matches
 */
export const findTopMatches = (ocrText, candidates, topN = 5, minSimilarity = 0.5) => {
  const cleaned = cleanOCRText(ocrText);

  if (!cleaned || cleaned.length < 2) {
    return [];
  }

  const matches = candidates
    .map(candidate => {
      const candidateCleaned = cleanOCRText(candidate);
      const score = similarity(cleaned, candidateCleaned);
      return {
        text: candidate,
        score: score,
        confidence: Math.round(score * 100)
      };
    })
    .filter(match => match.score >= minSimilarity)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return matches;
};

/**
 * Extraire un numéro de carte depuis un texte OCR
 * Format typique : "123/456" ou "123" ou "SV123"
 */
export const extractCardNumber = (text) => {
  if (!text) return null;

  // Nettoyer le texte (enlever espaces multiples, newlines, etc.)
  const cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  console.log('🔍 [Fuzzy Matcher] Recherche de numéro dans:', cleaned);

  // Chercher des patterns de numéros de carte (ordre de priorité)
  const patterns = [
    // Format standard avec slash : "186/195", "123 / 456"
    {
      regex: /(\d{1,4})\s*\/\s*(\d{1,4})/,
      priority: 1,
      format: (m) => `${m[1]}/${m[2]}`
    },
    // Format avec préfixe lettre : "SV123/195", "SWSH123"
    {
      regex: /([A-Z]{1,4})\s*(\d{1,4})\s*\/\s*(\d{1,4})/,
      priority: 2,
      format: (m) => `${m[1]}${m[2]}/${m[3]}`
    },
    // Format simple avec préfixe : "SV123", "SWSH123"
    {
      regex: /([A-Z]{2,4})(\d{1,4})/,
      priority: 3,
      format: (m) => `${m[1]}${m[2]}`
    },
    // Juste un numéro (3-4 chiffres)
    {
      regex: /(\d{3,4})/,
      priority: 4,
      format: (m) => m[1]
    }
  ];

  // Trier par priorité et essayer chaque pattern
  const results = [];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      const number = pattern.format(match);
      results.push({
        number,
        priority: pattern.priority,
        match: match[0]
      });
    }
  }

  // Retourner le meilleur match (plus haute priorité)
  if (results.length > 0) {
    results.sort((a, b) => a.priority - b.priority);
    const best = results[0];
    console.log('✅ [Fuzzy Matcher] Numéro trouvé:', best.number, '(pattern:', best.match, ')');
    return best.number;
  }

  console.log('❌ [Fuzzy Matcher] Aucun numéro trouvé');
  return null;
};

/**
 * Extraire des mots potentiels de noms de Pokémon
 */
export const extractPotentialNames = (text) => {
  // Extraire les mots de 3+ lettres
  const words = text
    .split(/[\s\n]+/)
    .map(w => w.replace(/[^a-zA-Z\-]/g, ''))
    .filter(w => w.length >= 3)
    .filter(w => {
      // Exclure les mots communs qui ne sont pas des noms de Pokémon
      const exclude = ['the', 'and', 'for', 'you', 'are', 'this', 'that', 'with'];
      return !exclude.includes(w.toLowerCase());
    });

  return [...new Set(words)]; // Dédupliquer
};

/**
 * Scorer un mot basé sur sa position et sa longueur
 * (les mots plus longs et en haut sont souvent le nom du Pokémon)
 */
export const scoreWord = (word, position, totalWords) => {
  let score = 0;

  // Longueur : mots plus longs = meilleur score
  score += word.length * 2;

  // Position : mots en début = meilleur score
  const positionScore = (1 - position / totalWords) * 10;
  score += positionScore;

  return score;
};
