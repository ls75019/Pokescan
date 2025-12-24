// Fonction Netlify serverless pour Google Vision API
const vision = require('@google-cloud/vision');

exports.handler = async (event, context) => {
  // Autoriser uniquement POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { image } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image data is required' })
      };
    }

    // Vérifier si les credentials Google Cloud sont configurés
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Google Vision API not configured',
          message: 'Please add GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable in Netlify'
        })
      };
    }

    // Créer le client Google Vision avec les credentials depuis les variables d'environnement
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const client = new vision.ImageAnnotatorClient({
      credentials: credentials
    });

    // Extraire le base64 de l'image (enlever le préfixe data:image/...)
    const base64Image = image.split(',')[1] || image;

    // Appeler l'API Google Vision pour la détection de texte
    const [result] = await client.textDetection({
      image: {
        content: base64Image
      }
    });

    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          text: '',
          message: 'No text detected in image'
        })
      };
    }

    // Le premier élément contient tout le texte détecté
    const fullText = detections[0].description;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: fullText,
        detections: detections.slice(1).map(d => ({
          text: d.description,
          confidence: d.confidence
        }))
      })
    };

  } catch (error) {
    console.error('Vision API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process image',
        message: error.message
      })
    };
  }
};
