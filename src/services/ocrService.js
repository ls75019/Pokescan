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
      text: data.text,
      confidence: data.confidence,
      words: data.words.map(w => ({
        text: w.text,
        confidence: w.confidence
      }))
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
  try {
    const response = await axios.post('/.netlify/functions/vision-ocr', {
      image: imageBase64
    });

    return {
      text: response.data.text,
      detections: response.data.detections,
      source: 'google-vision'
    };
  } catch (error) {
    if (error.response?.data?.error === 'Google Vision API not configured') {
      throw new Error('Google Vision API is not configured. Using Tesseract.js instead.');
    }
    throw error;
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

  // Essayer Google Vision en premier si demandé
  if (preferGoogleVision) {
    try {
      if (onProgress) onProgress({ status: 'Using Google Vision API...', progress: 0 });
      const result = await recognizeTextWithGoogleVision(imageBase64);
      if (onProgress) onProgress({ status: 'Complete', progress: 100 });
      return result;
    } catch (error) {
      console.warn('Google Vision failed, falling back to Tesseract.js:', error.message);
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
    return { ...result, source: 'tesseract' };
  } catch (error) {
    throw new Error(`OCR failed: ${error.message}`);
  }
};

/**
 * Extraire les noms de Pokémon du texte détecté
 */
export const extractPokemonNames = (text) => {
  if (!text) return [];

  // Liste des mots communs à ignorer
  const commonWords = new Set([
    'the', 'hp', 'lv', 'basic', 'stage', 'evolution', 'ex', 'gx', 'vmax', 'v',
    'rare', 'holo', 'reverse', 'common', 'uncommon', 'trainer', 'energy',
    'put', 'damage', 'attack', 'ability', 'retreat', 'weakness', 'resistance'
  ]);

  // Nettoyer et extraire les mots
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/gi, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !commonWords.has(word) &&
      /^[a-z]/i.test(word)
    );

  // Capitaliser la première lettre
  const capitalizedWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  );

  // Retourner les mots uniques
  return [...new Set(capitalizedWords)];
};
