/**
 * Fonction Netlify serverless pour proxy l'API Pokemon TCG
 * Évite les problèmes CORS en faisant les requêtes côté serveur
 */

import axios from 'axios';

const POKEMON_API_BASE = 'https://api.pokemontcg.io/v2';

export const handler = async (event) => {
  // Headers CORS pour permettre les requêtes depuis le front
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Répondre aux requêtes OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Seules les requêtes GET sont autorisées
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('[Pokemon API Proxy] Requête reçue');
    console.log('[Pokemon API Proxy] Query params:', event.queryStringParameters);

    // Construire l'URL de l'API Pokemon TCG
    const endpoint = event.queryStringParameters?.endpoint || 'cards';
    const queryParams = { ...event.queryStringParameters };
    delete queryParams.endpoint; // Enlever le paramètre endpoint

    // Construire l'URL complète
    const url = `${POKEMON_API_BASE}/${endpoint}`;

    console.log('[Pokemon API Proxy] URL cible:', url);
    console.log('[Pokemon API Proxy] Params:', queryParams);

    // Faire la requête à l'API Pokemon TCG
    const response = await axios.get(url, {
      params: queryParams,
      timeout: 10000 // 10 secondes timeout
    });

    console.log('[Pokemon API Proxy] Réponse reçue:', response.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('[Pokemon API Proxy] Erreur:', error.message);

    if (error.response) {
      // L'API Pokemon TCG a renvoyé une erreur
      console.error('[Pokemon API Proxy] Réponse erreur:', error.response.status);
      return {
        statusCode: error.response.status,
        headers,
        body: JSON.stringify({
          error: 'Pokemon TCG API error',
          message: error.response.data?.error || error.message,
          status: error.response.status
        })
      };
    }

    // Erreur réseau ou autre
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Proxy error',
        message: error.message
      })
    };
  }
};
