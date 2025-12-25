import { createWorker } from 'tesseract.js';
import axios from 'axios';

/**
 * Service OCR qui utilise Tesseract.js (côté client)
 * avec option de fallback vers Google Vision API (via Netlify Function)
 */

// Convertir une image en base64
export const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * OCR avec Tesseract.js (côté client - gratuit, pas de clé API nécessaire)
 */
export const recognizeTextWithTesseract = async (imageSource, onProgress = null) => {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  try {
    const { data } = await worker.recognize(imageSource);
    await worker.terminate();

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      words: (data.words || []).map(w => ({
        text: w.text || '',
        confidence: w.confidence || 0
      })),
      source: 'tesseract'
    };
  } catch (error) {
    await worker.terminate();
    throw error;
  }
};

/**
 * OCR avec Google Vision API (via Netlify Function)
 * Nécessite la configuration de GOOGLE_APPLICATION_CREDENTIALS_JSON dans Netlify
 */
export const recognizeTextWithGoogleVision = async (imageBase64) => {
  console.log('🌐 [Google Vision] Tentative de connexion à la fonction Netlify...');

  try {
    console.log('🌐 [Google Vision] Envoi de la requête à /.netlify/functions/vision-ocr');
    console.log('🌐 [Google Vision] Taille de l\'image:', imageBase64.length, 'caractères');

    const response = await axios.post('/.netlify/functions/vision-ocr', {
      image: imageBase64
    }, {
      timeout: 30000, // 30 secondes timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ [Google Vision] Réponse reçue:', response.status);
    console.log('✅ [Google Vision] Données:', response.data);

    return {
      text: response.data.text || '',
      detections: response.data.detections || [],
      source: 'google-vision'
    };
  } catch (error) {
    console.error('❌ [Google Vision] Erreur:', error);
    console.error('❌ [Google Vision] Status:', error.response?.status);
    console.error('❌ [Google Vision] Data:', error.response?.data);
    console.error('❌ [Google Vision] Message:', error.message);

    if (error.response?.data?.error === 'Google Vision API not configured') {
      throw new Error('Google Vision API not configured: ' + (error.response.data.message || 'No details'));
    }

    if (error.response?.status === 404) {
      throw new Error('Fonction Netlify non trouvée (404). Vérifiez que la fonction est déployée.');
    }

    if (error.response?.status === 500) {
      throw new Error('Erreur serveur (500): ' + (error.response.data?.message || error.message));
    }

    throw new Error('Google Vision error: ' + error.message);
  }
};

/**
 * Fonction principale d'OCR qui essaie Google Vision puis fallback vers Tesseract
 */
export const recognizeText = async (imageSource, options = {}) => {
  const {
    preferGoogleVision = false,
    onProgress = null
  } = options;

  let imageBase64;

  // Convertir en base64 si c'est un File
  if (imageSource instanceof File || imageSource instanceof Blob) {
    imageBase64 = await imageToBase64(imageSource);
  } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    imageBase64 = imageSource;
  } else {
    imageBase64 = imageSource;
  }

  let googleVisionError = null;

  // Essayer Google Vision en premier si demandé
  if (preferGoogleVision) {
    console.log('🎯 [OCR Service] Google Vision demandé, tentative...');
    try {
      if (onProgress) onProgress({ status: 'Utilisation de Google Vision API...', progress: 0 });
      const result = await recognizeTextWithGoogleVision(imageBase64);
      console.log('✅ [OCR Service] Google Vision réussi!');
      if (onProgress) onProgress({ status: 'Complété avec Google Vision', progress: 100 });
      return result;
    } catch (error) {
      console.warn('⚠️ [OCR Service] Google Vision échoué, basculement vers Tesseract.js');
      console.warn('⚠️ [OCR Service] Raison:', error.message);
      googleVisionError = {
        message: error.message,
        type: error.name || 'Error',
        stack: error.stack
      };
      // Continuer avec Tesseract
    }
  }

  // Utiliser Tesseract.js (par défaut ou en fallback)
  if (onProgress) onProgress({ status: 'Initializing OCR...', progress: 0 });

  try {
    const result = await recognizeTextWithTesseract(imageBase64, (progress) => {
      if (onProgress) {
        onProgress({ status: 'Recognizing text...', progress });
      }
    });

    if (onProgress) onProgress({ status: 'Complete', progress: 100 });
    return {
      ...result,
      source: 'tesseract',
      googleVisionError // Inclure l'erreur Google Vision s'il y en a une
    };
  } catch (error) {
    throw new Error(`OCR failed: ${error.message}`);
  }
};

/**
 * Extraire les noms de Pokémon du texte détecté
 */
export const extractPokemonNames = (text) => {
  if (!text) return [];

  // Liste des mots communs à ignorer (plus restrictive)
  const commonWords = new Set([
    'the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that',
    'hp', 'lv', 'level', 'basic', 'stage', 'evolution',
    'rare', 'holo', 'reverse', 'common', 'uncommon', 'trainer', 'energy',
    'put', 'damage', 'attack', 'ability', 'retreat', 'weakness', 'resistance',
    'card', 'pokemon', 'poké', 'cards', 'tcg', 'game', 'play', 'player',
    'turn', 'your', 'opponent', 'deck', 'hand', 'discard', 'prize',
    'bench', 'active', 'knock', 'out', 'knockout', 'draw', 'shuffle',
    'search', 'look', 'reveal', 'show', 'choose', 'select', 'switch',
    'heal', 'recover', 'prevent', 'remove', 'place', 'attach', 'detach'
  ]);

  // Nettoyer et extraire les mots
  const words = text
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z]/g, '')) // Enlever la ponctuation
    .filter(word =>
      word.length > 2 && // Au moins 3 caractères
      !commonWords.has(word.toLowerCase()) &&
      /^[A-Z]/i.test(word) // Commence par une lettre
    );

  // Capitaliser correctement (première lettre en majuscule)
  const capitalizedWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  // Retourner les mots uniques en gardant l'ordre d'apparition
  const uniqueWords = [];
  const seen = new Set();

  for (const word of capitalizedWords) {
    const lower = word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueWords.push(word);
    }
  }

  return uniqueWords;
};

/**
 * Extraire TOUS les mots détectés (pour debug et sélection manuelle)
 */
export const extractAllWords = (text) => {
  if (!text) return [];

  const words = text
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(word => word.length > 1)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  // Retourner les mots uniques
  const uniqueWords = [];
  const seen = new Set();

  for (const word of words) {
    const lower = word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueWords.push(word);
    }
  }

  return uniqueWords;
};
