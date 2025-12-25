import { useState } from 'react';
import pokemon from 'pokemontcgsdk';
import ImageUpload from './components/ImageUpload';
import CardSearch from './components/CardSearch';
import CardDisplay from './components/CardDisplay';
import { recognizeCard } from './services/enhancedOcrService';
import './App.css';

// Configuration de l'API (vous pouvez ajouter votre clé API ici si vous en avez une)
// pokemon.configure({ apiKey: 'your-api-key-here' });

function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [mode, setMode] = useState('search'); // 'search' ou 'image'
  const [ocrProgress, setOcrProgress] = useState(null);
  const [detectedText, setDetectedText] = useState('');
  const [detectedWords, setDetectedWords] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  const searchCardsByName = async (searchTerm, cardNumber = null) => {
    setLoading(true);
    setCards([]);

    try {
      // Construire la requête de recherche
      let query = `name:"${searchTerm}*"`;

      // Ajouter le numéro de carte si disponible
      if (cardNumber) {
        query += ` number:${cardNumber}`;
        console.log('🔍 [App] Recherche avec numéro:', cardNumber);
      }

      console.log('🔍 [App] Requête:', query);

      // Utiliser la fonction Netlify proxy au lieu de l'API directe
      const response = await fetch(`/.netlify/functions/pokemon-api?endpoint=cards&q=${encodeURIComponent(query)}&pageSize=20&orderBy=-set.releaseDate`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setCards(result.data || []);

      if (!result.data || result.data.length === 0) {
        console.warn('⚠️ [App] Aucune carte trouvée');
        setErrorInfo({
          type: 'NO_RESULTS',
          message: `Aucune carte trouvée pour "${searchTerm}"${cardNumber ? ` (numéro: ${cardNumber})` : ''}`,
          suggestion: 'Essayez avec un autre nom ou vérifiez l\'orthographe'
        });
      }
    } catch (error) {
      console.error('❌ [App] Erreur lors de la recherche:', error);
      setErrorInfo({
        type: 'SEARCH_ERROR',
        message: error.message,
        suggestion: 'Vérifiez votre connexion internet et réessayez'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageCapture = async (imageFile, imageUrl) => {
    setCurrentImage(imageUrl);
    setDetectedText('');
    setDetectedWords([]);
    setCards([]);
    setDebugInfo(null);
    setErrorInfo(null);

    if (!imageFile) {
      setOcrProgress(null);
      return;
    }

    try {
      setLoading(true);
      setOcrProgress({ status: 'Initialisation de la reconnaissance...', progress: 0 });

      const debugData = {
        timestamp: new Date().toISOString(),
        steps: []
      };

      debugData.steps.push('🚀 Début de la reconnaissance OCR améliorée');

      // Convertir le fichier en base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });

      // Utiliser le service OCR amélioré
      const result = await recognizeCard(base64, (progress) => {
        setOcrProgress(progress);
      });

      console.log('📊 [App] Résultat OCR complet:', result);

      // Résultat du nom
      const nameResult = result.name;
      setDetectedText(nameResult.rawText);

      // Source OCR
      const ocrSource = nameResult.ocrSource || 'unknown';
      debugData.ocrSource = ocrSource;

      const ocrSourceLabels = {
        'ocr-space': '🌐 OCR.space (API gratuite)',
        'tesseract-fallback': '🔤 Tesseract.js (fallback)',
        'tesseract': '🔤 Tesseract.js',
        'unknown': '❓ Inconnu'
      };

      debugData.steps.push(`📊 Source OCR: ${ocrSourceLabels[ocrSource] || ocrSource}`);
      if (nameResult.ocrConfidence) {
        debugData.steps.push(`📈 Confiance OCR brute: ${nameResult.ocrConfidence}%`);
      }

      debugData.rawText = nameResult.rawText;
      debugData.textLength = nameResult.rawText.length;
      debugData.potentialNames = nameResult.potentialNames;
      debugData.steps.push(`📝 Texte zone nom: "${nameResult.rawText}"`);
      debugData.steps.push(`🔍 Mots extraits: ${nameResult.potentialNames.join(', ')}`);

      // Résultat du numéro
      const numberResult = result.number;
      if (numberResult.cardNumber) {
        debugData.cardNumber = numberResult.cardNumber;
        debugData.steps.push(`🔢 Numéro détecté: ${numberResult.cardNumber}`);
      }

      // Meilleurs matches
      const bestMatches = nameResult.bestMatches || [];
      setDetectedWords(bestMatches.map(m => m.text));

      debugData.bestMatchesCount = bestMatches.length;
      debugData.bestMatches = bestMatches;

      if (bestMatches.length > 0) {
        const topMatches = bestMatches.slice(0, 5).map(m => `${m.text} (${m.confidence}%)`).join(', ');
        debugData.steps.push(`🎯 Top 5 correspondances: ${topMatches}`);
      }

      // Ajouter les images de debug
      if (nameResult.debugImages) {
        debugData.debugImages = nameResult.debugImages;
        debugData.preprocessedImage = nameResult.preprocessedImage;
        debugData.steps.push(`🖼️ Images de prétraitement disponibles (voir ci-dessous)`);
      }

      console.log('🎯 Meilleurs matches:', bestMatches);

      if (!nameResult.bestMatch) {
        debugData.steps.push('❌ Aucun nom de Pokémon correspondant trouvé');
        setDebugInfo(debugData);
        setErrorInfo({
          type: 'NO_MATCH',
          message: 'Aucun nom de Pokémon reconnu avec suffisamment de confiance',
          suggestion: 'Essayez avec une image plus claire ou utilisez le mode recherche manuelle'
        });
        setOcrProgress(null);
        setLoading(false);
        return;
      }

      // Chercher la carte avec le meilleur match
      const searchName = nameResult.bestMatch.text;
      const confidence = nameResult.bestMatch.confidence;
      const cardNumber = numberResult.cardNumber;

      if (cardNumber) {
        debugData.steps.push(`🔎 Recherche automatique de: "${searchName}" + numéro: ${cardNumber} (confiance: ${confidence}%)`);
      } else {
        debugData.steps.push(`🔎 Recherche automatique de: "${searchName}" (confiance: ${confidence}%)`);
      }

      setDebugInfo(debugData);

      await searchCardsByName(searchName, cardNumber);

    } catch (error) {
      console.error('Erreur OCR:', error);

      setErrorInfo({
        type: 'OCR_ERROR',
        message: error.message,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2)
      });

      setOcrProgress(null);
      setLoading(false);
    }
  };

  // Fonction pour chercher une carte par un mot spécifique
  const searchByWord = async (searchTerm) => {
    try {
      setLoading(true);
      setErrorInfo(null);
      setOcrProgress({ status: `Recherche de "${searchTerm}"...`, progress: 100 });

      console.log(`🔎 Recherche de: "${searchTerm}"`);

      const searchDebug = {
        timestamp: new Date().toISOString(),
        searchTerm: searchTerm,
        query: `name:"${searchTerm}*"`,
        steps: []
      };

      searchDebug.steps.push(`🔎 Lancement de la recherche pour: "${searchTerm}"`);
      searchDebug.steps.push(`📝 Requête API: name:"${searchTerm}*"`);

      // Rechercher la carte
      const searchResult = await pokemon.card.where({
        q: `name:"${searchTerm}*"`,
        pageSize: 20,
        orderBy: '-set.releaseDate'
      });

      searchDebug.resultCount = searchResult.data.length;
      searchDebug.steps.push(`✅ ${searchResult.data.length} résultat(s) trouvé(s)`);

      if (searchResult.data.length > 0) {
        searchDebug.cards = searchResult.data.slice(0, 3).map(c => ({
          name: c.name,
          set: c.set?.name,
          number: c.number
        }));
      }

      console.log(`✅ Résultats trouvés:`, searchResult.data.length);

      // Mettre à jour ou créer debugInfo
      setDebugInfo(prev => ({
        ...prev,
        ...searchDebug,
        steps: [...(prev?.steps || []), ...searchDebug.steps]
      }));

      setCards(searchResult.data);
      setOcrProgress(null);
      setLoading(false);

      if (searchResult.data.length === 0) {
        setErrorInfo({
          type: 'NO_RESULTS',
          message: `Aucune carte trouvée pour "${searchTerm}"`,
          suggestion: 'Essayez de cliquer sur un autre mot ou utilisez le mode recherche'
        });
      }

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);

      setErrorInfo({
        type: 'SEARCH_ERROR',
        message: error.message || 'Erreur inconnue',
        searchTerm: searchTerm,
        stack: error.stack,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        fullError: JSON.stringify(error, null, 2)
      });

      setOcrProgress(null);
      setLoading(false);
    }
  };

  const handleSearchRandom = async () => {
    setLoading(true);
    setCards([]);

    try {
      const result = await pokemon.card.where({
        pageSize: 12,
        orderBy: '-set.releaseDate'
      });

      setCards(result.data);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      alert('Erreur lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎴 PokéScan</h1>
        <p className="subtitle">Reconnaissance et recherche de cartes Pokémon</p>
      </header>

      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'search' ? 'active' : ''}`}
          onClick={() => setMode('search')}
        >
          🔍 Recherche par nom
        </button>
        <button
          className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
          onClick={() => setMode('image')}
        >
          📷 Reconnaissance par image
        </button>
      </div>

      <main className="app-main">
        {mode === 'search' ? (
          <div className="search-section">
            <CardSearch onSearch={searchCardsByName} />
            <div className="quick-actions">
              <button
                className="btn btn-secondary"
                onClick={handleSearchRandom}
              >
                🎲 Afficher des cartes récentes
              </button>
            </div>
          </div>
        ) : (
          <div className="image-section">
            <ImageUpload onImageCapture={handleImageCapture} />

            {ocrProgress && (
              <div className="ocr-progress">
                <div className="ocr-status">{ocrProgress.status}</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${ocrProgress.progress}%` }}
                  ></div>
                </div>
                <div className="progress-text">{ocrProgress.progress}%</div>
              </div>
            )}

            {errorInfo && (
              <div className="error-panel">
                <h3>❌ Erreur détectée</h3>
                <div className="error-content">
                  <div className="error-field">
                    <strong>Type:</strong> {errorInfo.type}
                  </div>
                  <div className="error-field">
                    <strong>Message:</strong> {errorInfo.message}
                  </div>
                  {errorInfo.suggestion && (
                    <div className="error-field">
                      <strong>Suggestion:</strong> {errorInfo.suggestion}
                    </div>
                  )}
                  {errorInfo.searchTerm && (
                    <div className="error-field">
                      <strong>Terme recherché:</strong> {errorInfo.searchTerm}
                    </div>
                  )}
                  {errorInfo.responseStatus && (
                    <div className="error-field">
                      <strong>Status HTTP:</strong> {errorInfo.responseStatus}
                    </div>
                  )}
                  {errorInfo.responseData && (
                    <div className="error-field">
                      <strong>Réponse API:</strong>
                      <pre>{JSON.stringify(errorInfo.responseData, null, 2)}</pre>
                    </div>
                  )}
                  {errorInfo.stack && (
                    <details className="error-details">
                      <summary>📋 Détails techniques (pour debug)</summary>
                      <pre>{errorInfo.stack}</pre>
                    </details>
                  )}
                  {errorInfo.fullError && (
                    <details className="error-details">
                      <summary>🔍 Erreur complète (pour screenshot)</summary>
                      <pre>{errorInfo.fullError}</pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {debugInfo && (
              <div className="debug-panel">
                <h3>🐛 Informations de debug</h3>
                <div className="debug-content">
                  <div className="debug-field">
                    <strong>Timestamp:</strong> {new Date(debugInfo.timestamp).toLocaleString('fr-FR')}
                  </div>
                  {debugInfo.ocrSource && (
                    <div className="debug-field">
                      <strong>Source OCR:</strong>
                      <span className={`source-badge ${debugInfo.ocrSource}`}>
                        {debugInfo.ocrSource === 'ocr-space' ? '🌐 OCR.space' :
                         debugInfo.ocrSource === 'tesseract-fallback' ? '🔤 Tesseract (fallback)' :
                         debugInfo.ocrSource === 'google-vision' ? '🌐 Google Vision' :
                         debugInfo.ocrSource === 'enhanced-ocr' ? '🎯 OCR Amélioré' :
                         '🔤 Tesseract.js'}
                      </span>
                    </div>
                  )}
                  {debugInfo.googleVisionError && (
                    <div className="debug-field warning">
                      <strong>⚠️ Erreur Google Vision:</strong>
                      <div className="error-message">{debugInfo.googleVisionError.message}</div>
                      <div className="error-hint">→ L'application a basculé vers Tesseract.js</div>
                    </div>
                  )}
                  {debugInfo.textLength !== undefined && (
                    <div className="debug-field">
                      <strong>Longueur du texte:</strong> {debugInfo.textLength} caractères
                    </div>
                  )}
                  {debugInfo.allWordsCount !== undefined && (
                    <div className="debug-field">
                      <strong>Mots extraits:</strong> {debugInfo.allWordsCount}
                    </div>
                  )}
                  {debugInfo.pokemonNamesCount !== undefined && (
                    <div className="debug-field">
                      <strong>Noms Pokémon suggérés:</strong> {debugInfo.pokemonNamesCount}
                    </div>
                  )}
                  {debugInfo.searchTerm && (
                    <div className="debug-field">
                      <strong>Terme recherché:</strong> {debugInfo.searchTerm}
                    </div>
                  )}
                  {debugInfo.resultCount !== undefined && (
                    <div className="debug-field">
                      <strong>Résultats trouvés:</strong> {debugInfo.resultCount}
                    </div>
                  )}
                  {debugInfo.steps && debugInfo.steps.length > 0 && (
                    <div className="debug-steps">
                      <strong>Étapes:</strong>
                      <ul>
                        {debugInfo.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {debugInfo.bestMatches && debugInfo.bestMatches.length > 0 && (
                    <details className="debug-details" open>
                      <summary>🎯 Top correspondances ({debugInfo.bestMatches.length})</summary>
                      <div className="matches-list">
                        {debugInfo.bestMatches.slice(0, 10).map((match, idx) => (
                          <div key={idx} className="match-item">
                            <span className="match-name">{match.text}</span>
                            <span className="match-confidence">{match.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {debugInfo.potentialNames && debugInfo.potentialNames.length > 0 && (
                    <details className="debug-details">
                      <summary>📝 Mots bruts extraits</summary>
                      <pre>{debugInfo.potentialNames.join(', ')}</pre>
                    </details>
                  )}
                  {debugInfo.pokemonNames && debugInfo.pokemonNames.length > 0 && (
                    <details className="debug-details">
                      <summary>🎯 Noms Pokémon suggérés (ancien)</summary>
                      <pre>{debugInfo.pokemonNames.join(', ')}</pre>
                    </details>
                  )}
                  {debugInfo.cards && debugInfo.cards.length > 0 && (
                    <details className="debug-details">
                      <summary>📇 Premières cartes trouvées</summary>
                      <pre>{JSON.stringify(debugInfo.cards, null, 2)}</pre>
                    </details>
                  )}
                  {debugInfo.debugImages && (
                    <details className="debug-details" open>
                      <summary>🖼️ Images de prétraitement ({Object.keys(debugInfo.debugImages).length} étapes)</summary>
                      <div className="debug-images">
                        {debugInfo.debugImages.original && (
                          <div className="debug-image-item">
                            <h4>1️⃣ Image originale</h4>
                            <img src={debugInfo.debugImages.original} alt="Original" />
                          </div>
                        )}
                        {debugInfo.debugImages.cropped && (
                          <div className="debug-image-item">
                            <h4>2️⃣ Zone du nom extraite</h4>
                            <img src={debugInfo.debugImages.cropped} alt="Cropped" />
                          </div>
                        )}
                        {debugInfo.debugImages.contrast && (
                          <div className="debug-image-item">
                            <h4>3️⃣ Contraste augmenté</h4>
                            <img src={debugInfo.debugImages.contrast} alt="Contrast" />
                          </div>
                        )}
                        {debugInfo.debugImages.grayscale && (
                          <div className="debug-image-item">
                            <h4>4️⃣ Niveaux de gris</h4>
                            <img src={debugInfo.debugImages.grayscale} alt="Grayscale" />
                          </div>
                        )}
                        {debugInfo.debugImages.threshold && (
                          <div className="debug-image-item">
                            <h4>5️⃣ Binarisation</h4>
                            <img src={debugInfo.debugImages.threshold} alt="Threshold" />
                          </div>
                        )}
                        {debugInfo.debugImages.inverted && (
                          <div className="debug-image-item">
                            <h4>6️⃣ Inversion (final)</h4>
                            <img src={debugInfo.debugImages.inverted} alt="Inverted" />
                            <p className="image-hint">✅ Cette image est envoyée à Tesseract (texte NOIR sur fond BLANC)</p>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {detectedText && !loading && (
              <>
                <div className="detected-text">
                  <h3>📝 Texte détecté</h3>
                  <p>{detectedText}</p>
                </div>

                {detectedWords.length > 0 && (
                  <div className="detected-words">
                    <h3>🎯 Mots détectés - Cliquez pour chercher</h3>
                    <div className="words-grid">
                      {detectedWords.map((word, index) => (
                        <button
                          key={`${word}-${index}`}
                          className="word-btn"
                          onClick={() => searchByWord(word)}
                          disabled={loading}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                    <p className="words-hint">
                      💡 Astuce: Cliquez sur le nom du Pokémon pour lancer la recherche
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="image-info">
              <h3>📋 Comment utiliser la reconnaissance d'image</h3>
              <ol>
                <li>Prenez une photo claire de votre carte Pokémon</li>
                <li>Assurez-vous que le nom est bien visible et lisible</li>
                <li>L'OCR détectera automatiquement le texte et cherchera la carte</li>
              </ol>
              <p className="info-note">
                💡 <strong>Note:</strong> Utilise Tesseract.js pour la reconnaissance de texte (gratuit, côté client).
                Pour une meilleure précision, vous pouvez configurer Google Vision API.
              </p>
            </div>
          </div>
        )}

        <CardDisplay cards={cards} loading={loading} />
      </main>

      <footer className="app-footer">
        <p>Données fournies par l'API Pokemon TCG</p>
      </footer>
    </div>
  );
}

export default App;
