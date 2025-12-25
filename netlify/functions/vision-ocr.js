// Fonction Netlify serverless pour Google Vision API
const vision = require('@google-cloud/vision');

exports.handler = async (event, context) => {
  console.log('🚀 [Netlify Function] vision-ocr appelée');
  console.log('📝 [Netlify Function] Méthode HTTP:', event.httpMethod);

  // Autoriser uniquement POST
  if (event.httpMethod !== 'POST') {
    console.error('❌ [Netlify Function] Méthode non autorisée:', event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('📦 [Netlify Function] Parsing du body...');
    const { image } = JSON.parse(event.body);

    if (!image) {
      console.error('❌ [Netlify Function] Aucune image fournie');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image data is required' })
      };
    }

    console.log('✅ [Netlify Function] Image reçue, taille:', image.length, 'caractères');

    // Vérifier si les credentials Google Cloud sont configurés
    const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    console.log('🔑 [Netlify Function] Credentials présents?', hasCredentials);

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.error('❌ [Netlify Function] GOOGLE_APPLICATION_CREDENTIALS_JSON manquant');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Google Vision API not configured',
          message: 'Please add GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable in Netlify',
          envVarsPresent: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('VISION'))
        })
      };
    }

    console.log('🔧 [Netlify Function] Parsing des credentials...');
    // Créer le client Google Vision avec les credentials depuis les variables d'environnement
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('✅ [Netlify Function] Credentials parsés, project_id:', credentials.project_id);

    console.log('🌐 [Netlify Function] Création du client Vision API...');
    const client = new vision.ImageAnnotatorClient({
      credentials: credentials
    });
    console.log('✅ [Netlify Function] Client créé avec succès');

    // Extraire le base64 de l'image (enlever le préfixe data:image/...)
    console.log('🖼️ [Netlify Function] Extraction du base64...');
    const base64Image = image.split(',')[1] || image;
    console.log('✅ [Netlify Function] Base64 extrait, taille:', base64Image.length, 'caractères');

    // Appeler l'API Google Vision pour la détection de texte
    console.log('🔍 [Netlify Function] Appel à Google Vision API...');
    const [result] = await client.textDetection({
      image: {
        content: base64Image
      }
    });

    console.log('✅ [Netlify Function] Réponse reçue de Google Vision');
    const detections = result.textAnnotations;
    console.log('📊 [Netlify Function] Nombre de détections:', detections ? detections.length : 0);

    if (!detections || detections.length === 0) {
      console.log('⚠️ [Netlify Function] Aucun texte détecté');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: '',
          detections: [],
          message: 'No text detected in image'
        })
      };
    }

    // Le premier élément contient tout le texte détecté
    const fullText = detections[0].description;
    console.log('📝 [Netlify Function] Texte détecté (longueur):', fullText.length);
    console.log('📝 [Netlify Function] Aperçu:', fullText.substring(0, 100));

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
    console.error('❌ [Netlify Function] Vision API Error:', error);
    console.error('❌ [Netlify Function] Error name:', error.name);
    console.error('❌ [Netlify Function] Error message:', error.message);
    console.error('❌ [Netlify Function] Error stack:', error.stack);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to process image',
        message: error.message,
        name: error.name,
        details: error.toString()
      })
    };
  }
};
