import { useState } from 'react';
import pokemon from 'pokemontcgsdk';
import ImageUpload from './components/ImageUpload';
import CardSearch from './components/CardSearch';
import CardDisplay from './components/CardDisplay';
import { recognizeText, extractPokemonNames, extractAllWords } from './services/ocrService';
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

  const searchCardsByName = async (searchTerm) => {
    setLoading(true);
    setCards([]);

    try {
      // Recherche par nom avec l'API Pokemon TCG
      const result = await pokemon.card.where({
        q: `name:"${searchTerm}*"`,
        pageSize: 20,
        orderBy: '-set.releaseDate'
      });

      setCards(result.data);

      if (result.data.length === 0) {
        alert(`Aucune carte trouvée pour "${searchTerm}"`);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      alert('Erreur lors de la recherche. Veuillez réessayer.');
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

      debugData.steps.push('🚀 Début de la reconnaissance OCR');

      // Utiliser le service OCR (Tesseract.js par défaut, Google Vision si configuré)
      const result = await recognizeText(imageFile, {
        preferGoogleVision: true, // Utiliser Google Vision si configuré, sinon fallback vers Tesseract
        onProgress: (progress) => {
          setOcrProgress(progress);
        }
      });

      const text = result.text.trim();
      setDetectedText(text);

      debugData.ocrSource = result.source || 'unknown';
      debugData.rawText = text;
      debugData.textLength = text.length;
      debugData.steps.push(`📊 Source OCR: ${result.source || 'unknown'}`);
      debugData.steps.push(`📝 Longueur du texte: ${text.length} caractères`);

      console.log('🔍 Texte détecté (brut):', text);
      console.log('📊 Source OCR:', result.source || 'unknown');

      if (!text) {
        debugData.steps.push('❌ Aucun texte détecté');
        setDebugInfo(debugData);
        setErrorInfo({
          type: 'NO_TEXT',
          message: 'Aucun texte détecté sur l\'image',
          suggestion: 'Essayez avec une image plus claire ou utilisez le mode recherche'
        });
        setOcrProgress(null);
        setLoading(false);
        return;
      }

      // Extraire TOUS les mots pour affichage et sélection
      const allWords = extractAllWords(text);
      setDetectedWords(allWords);

      debugData.allWordsCount = allWords.length;
      debugData.allWords = allWords;
      debugData.steps.push(`📋 ${allWords.length} mots extraits au total`);

      console.log('📝 Tous les mots extraits:', allWords);

      // Extraire les noms de Pokémon possibles (mots filtrés)
      const pokemonNames = extractPokemonNames(text);

      debugData.pokemonNamesCount = pokemonNames.length;
      debugData.pokemonNames = pokemonNames;
      debugData.steps.push(`🎯 ${pokemonNames.length} noms Pokémon suggérés: ${pokemonNames.slice(0, 5).join(', ')}`);

      console.log('🎯 Noms Pokémon suggérés:', pokemonNames);

      if (pokemonNames.length === 0) {
        debugData.steps.push('⚠️ Aucun nom de Pokémon identifié automatiquement');
        setDebugInfo(debugData);
        setOcrProgress(null);
        setLoading(false);
        return;
      }

      // Chercher le premier nom de Pokémon trouvé
      const searchName = pokemonNames[0];
      debugData.steps.push(`🔎 Recherche automatique de: "${searchName}"`);
      setDebugInfo(debugData);

      await searchByWord(searchName);

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
                        {debugInfo.ocrSource === 'google-vision' ? '🌐 Google Vision' : '🔤 Tesseract.js'}
                      </span>
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
                  {debugInfo.pokemonNames && debugInfo.pokemonNames.length > 0 && (
                    <details className="debug-details">
                      <summary>🎯 Noms Pokémon suggérés</summary>
                      <pre>{debugInfo.pokemonNames.join(', ')}</pre>
                    </details>
                  )}
                  {debugInfo.cards && debugInfo.cards.length > 0 && (
                    <details className="debug-details">
                      <summary>📇 Premières cartes trouvées</summary>
                      <pre>{JSON.stringify(debugInfo.cards, null, 2)}</pre>
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
