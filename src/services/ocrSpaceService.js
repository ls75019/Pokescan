/**
 * Service OCR utilisant OCR.space API (gratuit, 25k requêtes/mois)
 * Bien meilleur que Tesseract pour les polices stylisées
 */

const OCR_SPACE_API_KEY = 'K87899142388957'; // Clé API gratuite publique

/**
 * Reconnaissance OCR avec OCR.space API
 */
export const recognizeWithOCRSpace = async (imageBase64, options = {}) => {
  const {
    language = 'eng',
    isOverlayRequired = false,
    detectOrientation = false,
    scale = true,
    isTable = false,
    OCREngine = 2, // Engine 2 est meilleur pour les polices complexes
  } = options;

  console.log('🌐 [OCR.space] Début de la reconnaissance...');

  try {
    // Préparer les données du formulaire
    const formData = new FormData();

    // Convertir base64 en blob
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    formData.append('base64Image', imageBase64);
    formData.append('language', language);
    formData.append('isOverlayRequired', isOverlayRequired);
    formData.append('detectOrientation', detectOrientation);
    formData.append('scale', scale);
    formData.append('isTable', isTable);
    formData.append('OCREngine', OCREngine);
    formData.append('apikey', OCR_SPACE_API_KEY);

    console.log('📡 [OCR.space] Envoi de la requête à l\'API...');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('📦 [OCR.space] Réponse reçue:', data);

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'OCR.space processing error');
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new Error('No text detected by OCR.space');
    }

    const result = data.ParsedResults[0];
    const text = result.ParsedText || '';
    const confidence = result.FileParseExitCode === 1 ? 90 : 50; // 1 = success

    console.log('✅ [OCR.space] Texte détecté:', text);
    console.log('📊 [OCR.space] Confiance:', confidence);

    return {
      text: text.trim(),
      confidence,
      source: 'ocr-space',
      raw: result
    };

  } catch (error) {
    console.error('❌ [OCR.space] Erreur:', error);
    throw new Error(`OCR.space failed: ${error.message}`);
  }
};

/**
 * Reconnaissance avec OCR.space en utilisant une image prétraitée
 */
export const recognizePreprocessedImage = async (preprocessedImageBase64) => {
  console.log('🎯 [OCR.space] Reconnaissance d\'une image prétraitée...');

  return await recognizeWithOCRSpace(preprocessedImageBase64, {
    OCREngine: 2, // Engine 2 meilleur pour polices stylisées
    scale: true,
    detectOrientation: true
  });
};

/**
 * Alternative : OCR.space avec Engine 1 (plus rapide mais moins précis)
 */
export const recognizeWithOCRSpaceFast = async (imageBase64) => {
  console.log('⚡ [OCR.space] Reconnaissance rapide (Engine 1)...');

  return await recognizeWithOCRSpace(imageBase64, {
    OCREngine: 1,
    scale: false
  });
};
