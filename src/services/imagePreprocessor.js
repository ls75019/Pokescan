/**
 * Service de prétraitement d'images pour améliorer l'OCR sur les cartes Pokémon
 */

/**
 * Convertir une image en canvas pour manipulation
 */
export const imageToCanvas = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas;
};

/**
 * Charger une image depuis base64
 */
export const loadImage = (base64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
};

/**
 * Extraire la zone du nom de la carte Pokémon
 * Sur une carte standard, le nom est dans les 12% supérieurs, centré horizontalement
 */
export const extractNameRegion = (canvas) => {
  const nameCanvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Zone du nom : 12% de hauteur en haut, 80% de largeur (centré)
  const fullWidth = canvas.width;
  const startX = Math.floor(fullWidth * 0.1);  // Commencer à 10% du bord gauche
  const width = Math.floor(fullWidth * 0.8);    // Prendre 80% de la largeur
  const startY = Math.floor(canvas.height * 0.03); // Commencer à 3% du haut
  const height = Math.floor(canvas.height * 0.12);  // Prendre 12% de hauteur

  nameCanvas.width = width;
  nameCanvas.height = height;

  const nameCtx = nameCanvas.getContext('2d');
  nameCtx.drawImage(canvas, startX, startY, width, height, 0, 0, width, height);

  return nameCanvas;
};

/**
 * Extraire la zone du numéro de carte (bas centre de la carte)
 * Format typique : "186/195" ou "SV123"
 */
export const extractNumberRegion = (canvas) => {
  const numberCanvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Zone du numéro : 8% de hauteur en bas, 60% de largeur au centre
  const fullWidth = canvas.width;
  const startX = Math.floor(fullWidth * 0.2);  // Commencer à 20% du bord gauche
  const width = Math.floor(fullWidth * 0.6);    // Prendre 60% de la largeur (centré)
  const height = Math.floor(canvas.height * 0.08); // Prendre 8% de hauteur
  const startY = canvas.height - Math.floor(canvas.height * 0.09); // 9% du bas

  numberCanvas.width = width;
  numberCanvas.height = height;

  const numberCtx = numberCanvas.getContext('2d');
  numberCtx.drawImage(canvas, startX, startY, width, height, 0, 0, width, height);

  return numberCanvas;
};

/**
 * Augmenter le contraste de l'image
 */
export const increaseContrast = (canvas, contrast = 50) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128;       // Rouge
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // Vert
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // Bleu
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Convertir en niveaux de gris
 */
export const toGrayscale = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;       // Rouge
    data[i + 1] = gray;   // Vert
    data[i + 2] = gray;   // Bleu
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Appliquer un seuil (binarisation) pour convertir en noir et blanc
 */
export const applyThreshold = (canvas, threshold = 128) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]; // Déjà en niveaux de gris
    const value = gray > threshold ? 255 : 0;
    data[i] = value;       // Rouge
    data[i + 1] = value;   // Vert
    data[i + 2] = value;   // Bleu
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Calculer le seuil optimal avec la méthode d'Otsu
 */
export const calculateOtsuThreshold = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculer l'histogramme
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  const total = canvas.width * canvas.height;

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += i * histogram[i];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
};

/**
 * Inverser les couleurs (noir devient blanc et vice versa)
 */
export const invert = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // Rouge
    data[i + 1] = 255 - data[i + 1]; // Vert
    data[i + 2] = 255 - data[i + 2]; // Bleu
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Augmenter la netteté de l'image
 */
export const sharpen = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Kernel de netteté
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const output = ctx.createImageData(width, height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB seulement
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[idx] * kernel[kernelIdx];
          }
        }
        const outputIdx = (y * width + x) * 4 + c;
        output.data[outputIdx] = Math.max(0, Math.min(255, sum));
      }
      const alphaIdx = (y * width + x) * 4 + 3;
      output.data[alphaIdx] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
};

/**
 * Redimensionner l'image pour améliorer l'OCR (taille optimale : 2000px de largeur)
 */
export const resize = (canvas, targetWidth = 2000) => {
  const scale = targetWidth / canvas.width;
  const newWidth = targetWidth;
  const newHeight = Math.floor(canvas.height * scale);

  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

  return resizedCanvas;
};

/**
 * Pipeline complet de prétraitement pour zone de nom
 */
export const preprocessForNameOCR = async (base64Image, options = {}) => {
  const { returnDebugImages = false } = options;
  const debugImages = {};

  console.log('🖼️ [Preprocessor] Début du prétraitement pour le nom...');

  // 1. Charger l'image
  const img = await loadImage(base64Image);
  let canvas = imageToCanvas(img);
  console.log('📐 [Preprocessor] Image originale:', canvas.width, 'x', canvas.height);

  if (returnDebugImages) {
    debugImages.original = canvas.toDataURL('image/png');
  }

  // 2. Redimensionner si trop petite
  if (canvas.width < 1500) {
    canvas = resize(canvas, 2500);
    console.log('🔍 [Preprocessor] Redimensionné à:', canvas.width, 'x', canvas.height);
  }

  // 3. Extraire la zone du nom
  canvas = extractNameRegion(canvas);
  console.log('✂️ [Preprocessor] Zone nom extraite:', canvas.width, 'x', canvas.height);

  if (returnDebugImages) {
    debugImages.cropped = canvas.toDataURL('image/png');
  }

  // 4. Augmenter le contraste fortement
  canvas = increaseContrast(canvas, 80);
  console.log('🌈 [Preprocessor] Contraste augmenté');

  if (returnDebugImages) {
    debugImages.contrast = canvas.toDataURL('image/png');
  }

  // 5. Convertir en niveaux de gris
  canvas = toGrayscale(canvas);
  console.log('⚫ [Preprocessor] Converti en niveaux de gris');

  if (returnDebugImages) {
    debugImages.grayscale = canvas.toDataURL('image/png');
  }

  // 6. Calculer le seuil optimal avec Otsu
  const otsuThreshold = calculateOtsuThreshold(canvas);
  console.log('🎯 [Preprocessor] Seuil Otsu calculé:', otsuThreshold);

  // 7. Appliquer le seuil
  canvas = applyThreshold(canvas, otsuThreshold);
  console.log('🎯 [Preprocessor] Seuil appliqué');

  if (returnDebugImages) {
    debugImages.threshold = canvas.toDataURL('image/png');
  }

  // 8. Inverser les couleurs (Tesseract préfère texte NOIR sur fond BLANC)
  canvas = invert(canvas);
  console.log('🔄 [Preprocessor] Couleurs inversées (texte noir sur blanc)');

  if (returnDebugImages) {
    debugImages.inverted = canvas.toDataURL('image/png');
  }

  // 9. Retourner en base64
  const result = canvas.toDataURL('image/png');
  console.log('✅ [Preprocessor] Prétraitement terminé');

  if (returnDebugImages) {
    return { image: result, debugImages };
  }

  return result;
};

/**
 * Pipeline complet de prétraitement pour zone de numéro
 */
export const preprocessForNumberOCR = async (base64Image) => {
  console.log('🖼️ [Preprocessor] Début du prétraitement pour le numéro...');

  // 1. Charger l'image
  const img = await loadImage(base64Image);
  let canvas = imageToCanvas(img);

  // 2. Redimensionner si trop petite
  if (canvas.width < 1500) {
    canvas = resize(canvas, 2000);
  }

  // 3. Extraire la zone du numéro
  canvas = extractNumberRegion(canvas);
  console.log('✂️ [Preprocessor] Zone numéro extraite:', canvas.width, 'x', canvas.height);

  // 4. Augmenter le contraste
  canvas = increaseContrast(canvas, 70);

  // 5. Convertir en niveaux de gris
  canvas = toGrayscale(canvas);

  // 6. Appliquer un seuil
  canvas = applyThreshold(canvas, 130);

  // 7. Retourner en base64
  const result = canvas.toDataURL('image/png');
  console.log('✅ [Preprocessor] Prétraitement numéro terminé');

  return result;
};

/**
 * Prétraitement complet de l'image
 */
export const preprocessFullImage = async (base64Image) => {
  console.log('🖼️ [Preprocessor] Prétraitement image complète...');

  const img = await loadImage(base64Image);
  let canvas = imageToCanvas(img);

  // Redimensionner
  if (canvas.width < 1500) {
    canvas = resize(canvas, 2000);
  }

  // Améliorer la qualité
  canvas = increaseContrast(canvas, 50);
  canvas = toGrayscale(canvas);
  canvas = applyThreshold(canvas, 130);

  return canvas.toDataURL('image/png');
};
