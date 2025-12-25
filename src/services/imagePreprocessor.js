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
 * Extraire la zone du nom de la carte Pokémon (généralement 30% supérieur)
 */
export const extractNameRegion = (canvas) => {
  const nameCanvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Zone du nom : 30% de hauteur en haut, largeur complète
  const width = canvas.width;
  const height = Math.floor(canvas.height * 0.3);

  nameCanvas.width = width;
  nameCanvas.height = height;

  const nameCtx = nameCanvas.getContext('2d');
  nameCtx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);

  return nameCanvas;
};

/**
 * Extraire la zone du numéro de carte (généralement bas à gauche)
 */
export const extractNumberRegion = (canvas) => {
  const numberCanvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Zone du numéro : 20% de hauteur en bas, 50% de largeur à gauche
  const width = Math.floor(canvas.width * 0.5);
  const height = Math.floor(canvas.height * 0.2);
  const startY = canvas.height - height;

  numberCanvas.width = width;
  numberCanvas.height = height;

  const numberCtx = numberCanvas.getContext('2d');
  numberCtx.drawImage(canvas, 0, startY, width, height, 0, 0, width, height);

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
export const preprocessForNameOCR = async (base64Image) => {
  console.log('🖼️ [Preprocessor] Début du prétraitement pour le nom...');

  // 1. Charger l'image
  const img = await loadImage(base64Image);
  let canvas = imageToCanvas(img);
  console.log('📐 [Preprocessor] Image originale:', canvas.width, 'x', canvas.height);

  // 2. Redimensionner si trop petite
  if (canvas.width < 1500) {
    canvas = resize(canvas, 2000);
    console.log('🔍 [Preprocessor] Redimensionné à:', canvas.width, 'x', canvas.height);
  }

  // 3. Extraire la zone du nom
  canvas = extractNameRegion(canvas);
  console.log('✂️ [Preprocessor] Zone nom extraite:', canvas.width, 'x', canvas.height);

  // 4. Augmenter le contraste
  canvas = increaseContrast(canvas, 60);
  console.log('🌈 [Preprocessor] Contraste augmenté');

  // 5. Convertir en niveaux de gris
  canvas = toGrayscale(canvas);
  console.log('⚫ [Preprocessor] Converti en niveaux de gris');

  // 6. Appliquer un seuil adaptatif
  canvas = applyThreshold(canvas, 140);
  console.log('🎯 [Preprocessor] Seuil appliqué');

  // 7. Retourner en base64
  const result = canvas.toDataURL('image/png');
  console.log('✅ [Preprocessor] Prétraitement terminé');

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
