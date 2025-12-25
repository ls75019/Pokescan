/**
 * Service OCR amélioré spécifiquement pour les cartes Pokémon
 * Utilise le prétraitement d'image et la correspondance floue
 */

import Tesseract from 'tesseract.js';
import { preprocessForNameOCR, preprocessForNumberOCR } from './imagePreprocessor';
import { findBestMatch, findTopMatches, extractCardNumber, extractPotentialNames } from './fuzzyMatcher';

// Cache pour la liste des noms de Pokémon
let pokemonNamesCache = null;

/**
 * Récupérer la liste de tous les noms de Pokémon depuis l'API
 */
export const fetchPokemonNames = async () => {
  if (pokemonNamesCache) {
    return pokemonNamesCache;
  }

  console.log('📦 [Enhanced OCR] Récupération de la liste des noms de Pokémon...');

  try {
    const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=250&select=name');
    const data = await response.json();

    // Extraire tous les noms uniques
    const names = [...new Set(data.data.map(card => card.name))];
    pokemonNamesCache = names;

    console.log(`✅ [Enhanced OCR] ${names.length} noms de Pokémon chargés`);
    return names;
  } catch (error) {
    console.warn('⚠️ [Enhanced OCR] Impossible de charger les noms, utilisation de la liste de base');

    // Liste de secours avec les Pokémon les plus populaires
    pokemonNamesCache = [
      'Pikachu', 'Charizard', 'Mewtwo', 'Lugia', 'Rayquaza', 'Greninja', 'Lucario',
      'Garchomp', 'Dragonite', 'Gengar', 'Umbreon', 'Espeon', 'Sylveon', 'Eevee',
      'Snorlax', 'Mew', 'Celebi', 'Jirachi', 'Darkrai', 'Giratina', 'Dialga', 'Palkia',
      'Kyogre', 'Groudon', 'Zacian', 'Zamazenta', 'Eternatus', 'Incineroar', 'Decidueye',
      'Blastoise', 'Venusaur', 'Alakazam', 'Machamp', 'Tyranitar', 'Metagross',
      'Salamence', 'Blaziken', 'Infernape', 'Torterra', 'Empoleon', 'Serperior',
      'Emboar', 'Samurott', 'Chesnaught', 'Delphox', 'Primarina', 'Rillaboom', 'Cinderace',
      'Bulbasaur', 'Charmander', 'Squirtle', 'Articuno', 'Zapdos', 'Moltres', 'Raikou',
      'Entei', 'Suicune', 'Latios', 'Latias', 'Reshiram', 'Zekrom', 'Kyurem'
    ];

    return pokemonNamesCache;
  }
};

/**
 * Reconnaissance OCR améliorée pour le nom du Pokémon
 */
export const recognizePokemonName = async (imageBase64, onProgress = null, options = {}) => {
  const { returnDebugImages = false } = options;

  console.log('🎯 [Enhanced OCR] Début de la reconnaissance du nom...');

  if (onProgress) onProgress({ status: 'Prétraitement de l\'image...', progress: 10 });

  // 1. Prétraiter l'image pour extraire et améliorer la zone du nom
  const preprocessResult = await preprocessForNameOCR(imageBase64, { returnDebugImages });
  const preprocessedImage = returnDebugImages ? preprocessResult.image : preprocessResult;
  const debugImages = returnDebugImages ? preprocessResult.debugImages : null;

  if (onProgress) onProgress({ status: 'Analyse OCR de la zone du nom...', progress: 30 });

  // 2. Utiliser Tesseract avec des paramètres optimisés
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const progress = 30 + Math.floor(m.progress * 40);
        onProgress({ status: 'Reconnaissance du texte...', progress });
      }
    }
  });

  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz- ',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });

  const { data } = await worker.recognize(preprocessedImage);
  await worker.terminate();

  console.log('📝 [Enhanced OCR] Texte brut détecté:', data.text);

  if (onProgress) onProgress({ status: 'Recherche du meilleur match...', progress: 70 });

  // 3. Extraire les mots potentiels
  const potentialNames = extractPotentialNames(data.text);
  console.log('🔍 [Enhanced OCR] Mots potentiels:', potentialNames);

  // 4. Charger la liste des noms de Pokémon
  const pokemonNames = await fetchPokemonNames();

  if (onProgress) onProgress({ status: 'Correspondance avec la base de données...', progress: 85 });

  // 5. Trouver les meilleurs matches pour chaque mot
  const allMatches = [];
  for (const word of potentialNames) {
    const matches = findTopMatches(word, pokemonNames, 3, 0.5);
    allMatches.push(...matches);
  }

  // Trier par score et dédupliquer
  const uniqueMatches = [];
  const seen = new Set();
  for (const match of allMatches.sort((a, b) => b.score - a.score)) {
    if (!seen.has(match.text)) {
      seen.add(match.text);
      uniqueMatches.push(match);
    }
  }

  console.log('✅ [Enhanced OCR] Top matches:', uniqueMatches.slice(0, 5));

  if (onProgress) onProgress({ status: 'Terminé!', progress: 100 });

  const result = {
    rawText: data.text,
    potentialNames,
    bestMatches: uniqueMatches.slice(0, 10),
    bestMatch: uniqueMatches[0] || null,
    confidence: uniqueMatches[0]?.confidence || 0
  };

  if (returnDebugImages && debugImages) {
    result.debugImages = debugImages;
    result.preprocessedImage = preprocessedImage;
  }

  return result;
};

/**
 * Reconnaissance OCR pour le numéro de carte
 */
export const recognizeCardNumber = async (imageBase64, onProgress = null) => {
  console.log('🔢 [Enhanced OCR] Début de la reconnaissance du numéro...');

  if (onProgress) onProgress({ status: 'Prétraitement pour le numéro...', progress: 10 });

  // 1. Prétraiter l'image pour extraire la zone du numéro
  const preprocessedImage = await preprocessForNumberOCR(imageBase64);

  if (onProgress) onProgress({ status: 'Analyse OCR du numéro...', progress: 30 });

  // 2. Utiliser Tesseract avec paramètres pour numéros
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const progress = 30 + Math.floor(m.progress * 60);
        onProgress({ status: 'Reconnaissance du numéro...', progress });
      }
    }
  });

  await worker.setParameters({
    tessedit_char_whitelist: '0123456789/',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
  });

  const { data } = await worker.recognize(preprocessedImage);
  await worker.terminate();

  console.log('📝 [Enhanced OCR] Texte numéro brut:', data.text);

  // 3. Extraire le numéro
  const cardNumber = extractCardNumber(data.text);
  console.log('🔢 [Enhanced OCR] Numéro extrait:', cardNumber);

  if (onProgress) onProgress({ status: 'Terminé!', progress: 100 });

  return {
    rawText: data.text,
    cardNumber,
    confidence: data.confidence
  };
};

/**
 * Reconnaissance complète : nom + numéro
 */
export const recognizeCard = async (imageBase64, onProgress = null, options = {}) => {
  const { returnDebugImages = true } = options; // Debug activé par défaut

  console.log('🎴 [Enhanced OCR] Début de la reconnaissance complète...');

  const updateProgress = (status, progress) => {
    if (onProgress) onProgress({ status, progress });
  };

  try {
    // Phase 1 : Reconnaissance du nom (0-60%)
    updateProgress('Reconnaissance du nom du Pokémon...', 0);
    const nameResult = await recognizePokemonName(imageBase64, (p) => {
      updateProgress(p.status, Math.floor(p.progress * 0.6));
    }, { returnDebugImages });

    // Phase 2 : Reconnaissance du numéro (60-100%)
    updateProgress('Reconnaissance du numéro de carte...', 60);
    const numberResult = await recognizeCardNumber(imageBase64, (p) => {
      updateProgress(p.status, 60 + Math.floor(p.progress * 0.4));
    });

    updateProgress('Analyse terminée!', 100);

    return {
      name: nameResult,
      number: numberResult,
      source: 'enhanced-ocr'
    };
  } catch (error) {
    console.error('❌ [Enhanced OCR] Erreur:', error);
    throw error;
  }
};
