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

    if (!imageFile) {
      setOcrProgress(null);
      return;
    }

    try {
      setLoading(true);
      setOcrProgress({ status: 'Initialisation de la reconnaissance...', progress: 0 });

      // Utiliser le service OCR (Tesseract.js par défaut, Google Vision si configuré)
      const result = await recognizeText(imageFile, {
        preferGoogleVision: true, // Utiliser Google Vision si configuré, sinon fallback vers Tesseract
        onProgress: (progress) => {
          setOcrProgress(progress);
        }
      });

      const text = result.text.trim();
      setDetectedText(text);

      console.log('🔍 Texte détecté (brut):', text);
      console.log('📊 Source OCR:', result.source || 'unknown');

      if (!text) {
        alert('Aucun texte détecté sur l\'image. Essayez avec une image plus claire ou utilisez le mode recherche.');
        setOcrProgress(null);
        setLoading(false);
        return;
      }

      // Extraire TOUS les mots pour affichage et sélection
      const allWords = extractAllWords(text);
      setDetectedWords(allWords);

      console.log('📝 Tous les mots extraits:', allWords);

      // Extraire les noms de Pokémon possibles (mots filtrés)
      const pokemonNames = extractPokemonNames(text);

      console.log('🎯 Noms Pokémon suggérés:', pokemonNames);

      if (pokemonNames.length === 0) {
        // Pas de suggestions, mais afficher tous les mots pour sélection manuelle
        setOcrProgress(null);
        setLoading(false);
        alert(`Texte détecté mais aucun nom de Pokémon identifié automatiquement.\n\n📝 Cliquez sur un mot ci-dessous pour chercher cette carte.`);
        return;
      }

      // Chercher le premier nom de Pokémon trouvé
      const searchName = pokemonNames[0];
      await searchByWord(searchName);

    } catch (error) {
      console.error('Erreur OCR:', error);
      alert(`Erreur lors de la reconnaissance: ${error.message}\n\nUtilisez le mode recherche pour chercher manuellement.`);
      setOcrProgress(null);
      setLoading(false);
    }
  };

  // Fonction pour chercher une carte par un mot spécifique
  const searchByWord = async (searchTerm) => {
    try {
      setLoading(true);
      setOcrProgress({ status: `Recherche de "${searchTerm}"...`, progress: 100 });

      console.log(`🔎 Recherche de: "${searchTerm}"`);

      // Rechercher la carte
      const searchResult = await pokemon.card.where({
        q: `name:"${searchTerm}*"`,
        pageSize: 20,
        orderBy: '-set.releaseDate'
      });

      console.log(`✅ Résultats trouvés:`, searchResult.data.length);

      setCards(searchResult.data);
      setOcrProgress(null);
      setLoading(false);

      if (searchResult.data.length === 0) {
        alert(`Aucune carte trouvée pour "${searchTerm}".\n\n💡 Essayez de cliquer sur un autre mot ou utilisez le mode recherche.`);
      }

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      alert(`Erreur lors de la recherche de "${searchTerm}".`);
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
