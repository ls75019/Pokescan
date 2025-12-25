/**
 * Détection automatique de carte Pokémon dans une image
 * Trouve et isole la carte même si elle est photographiée de loin
 */

/**
 * Charger une image depuis base64
 */
const loadImage = (base64) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
};

/**
 * Convertir une image en canvas
 */
const imageToCanvas = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return canvas;
};

/**
 * Détecter les bords (edge detection) avec Sobel simplifié
 */
const detectEdges = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Convertir en niveaux de gris et appliquer un seuil
  const gray = new Uint8ClampedArray(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    gray[i / 4] = avg;
  }

  // Trouver les zones sombres/claires (bords de carte)
  const edges = new Uint8ClampedArray(width * height);
  const threshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const gx = Math.abs(
        gray[idx - 1] - gray[idx + 1]
      );
      const gy = Math.abs(
        gray[idx - width] - gray[idx + width]
      );

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude > threshold ? 255 : 0;
    }
  }

  // Créer canvas avec les bords détectés
  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = width;
  edgeCanvas.height = height;
  const edgeCtx = edgeCanvas.getContext('2d');
  const edgeImageData = edgeCtx.createImageData(width, height);

  for (let i = 0; i < edges.length; i++) {
    const val = edges[i];
    edgeImageData.data[i * 4] = val;
    edgeImageData.data[i * 4 + 1] = val;
    edgeImageData.data[i * 4 + 2] = val;
    edgeImageData.data[i * 4 + 3] = 255;
  }

  edgeCtx.putImageData(edgeImageData, 0, 0);
  return { edgeCanvas, edges, width, height };
};

/**
 * Trouver le rectangle de la carte
 */
const findCardBounds = (edges, width, height) => {
  // Projections horizontales et verticales pour trouver les bords
  const horz = new Array(height).fill(0);
  const vert = new Array(width).fill(0);

  // Compter les pixels de bords par ligne et colonne
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = edges[y * width + x];
      if (val > 0) {
        horz[y]++;
        vert[x]++;
      }
    }
  }

  // Trouver les limites en cherchant où il y a beaucoup de bords
  const threshold = Math.max(...vert) * 0.1; // 10% du max

  let minX = 0, maxX = width - 1;
  let minY = 0, maxY = height - 1;

  // Trouver X min et max
  for (let x = 0; x < width; x++) {
    if (vert[x] > threshold) {
      minX = x;
      break;
    }
  }
  for (let x = width - 1; x >= 0; x--) {
    if (vert[x] > threshold) {
      maxX = x;
      break;
    }
  }

  // Trouver Y min et max
  for (let y = 0; y < height; y++) {
    if (horz[y] > threshold) {
      minY = y;
      break;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (horz[y] > threshold) {
      maxY = y;
      break;
    }
  }

  // Ajouter une petite marge de sécurité (5%)
  const marginX = Math.floor((maxX - minX) * 0.05);
  const marginY = Math.floor((maxY - minY) * 0.05);

  minX = Math.max(0, minX - marginX);
  maxX = Math.min(width - 1, maxX + marginX);
  minY = Math.max(0, minY - marginY);
  maxY = Math.min(height - 1, maxY + marginY);

  return { minX, maxX, minY, maxY };
};

/**
 * Détecter et extraire la carte de l'image
 */
export const detectAndCropCard = async (imageBase64) => {
  console.log('🎴 [Card Detector] Début détection de carte...');

  try {
    // Charger l'image
    const img = await loadImage(imageBase64);
    const canvas = imageToCanvas(img);

    console.log('📐 [Card Detector] Image originale:', canvas.width, 'x', canvas.height);

    // Si l'image est déjà petite, pas besoin de détecter
    if (canvas.width < 800 && canvas.height < 800) {
      console.log('✅ [Card Detector] Image déjà petite, pas de détection nécessaire');
      return imageBase64;
    }

    // Détecter les bords
    const { edges, width, height } = detectEdges(canvas);
    console.log('🔍 [Card Detector] Bords détectés');

    // Trouver les limites de la carte
    const bounds = findCardBounds(edges, width, height);
    console.log('📍 [Card Detector] Limites trouvées:', bounds);

    // Calculer les dimensions
    const cardWidth = bounds.maxX - bounds.minX;
    const cardHeight = bounds.maxY - bounds.minY;

    console.log('📏 [Card Detector] Dimensions carte:', cardWidth, 'x', cardHeight);

    // Vérifier si on a trouvé quelque chose de raisonnable
    const aspectRatio = cardWidth / cardHeight;

    // Les cartes Pokémon ont un ratio environ 0.7 (63mm x 88mm)
    if (aspectRatio < 0.5 || aspectRatio > 0.9) {
      console.warn('⚠️ [Card Detector] Ratio suspect:', aspectRatio, '- utilisation image complète');
      return imageBase64;
    }

    // La carte doit occuper au moins 20% de l'image
    const cardArea = cardWidth * cardHeight;
    const totalArea = width * height;
    const coverage = cardArea / totalArea;

    if (coverage < 0.2) {
      console.warn('⚠️ [Card Detector] Carte trop petite:', (coverage * 100).toFixed(1), '% - utilisation image complète');
      return imageBase64;
    }

    // Découper la carte
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cardWidth;
    croppedCanvas.height = cardHeight;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(
      canvas,
      bounds.minX, bounds.minY, cardWidth, cardHeight,
      0, 0, cardWidth, cardHeight
    );

    const result = croppedCanvas.toDataURL('image/jpeg', 0.95);
    console.log('✅ [Card Detector] Carte extraite:', cardWidth, 'x', cardHeight);
    console.log('📊 [Card Detector] Couverture:', (coverage * 100).toFixed(1), '%');

    return result;

  } catch (error) {
    console.error('❌ [Card Detector] Erreur:', error);
    // En cas d'erreur, retourner l'image originale
    return imageBase64;
  }
};
