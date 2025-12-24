import { useState } from 'react';
import pokemon from 'pokemontcgsdk';
import ImageUpload from './components/ImageUpload';
import CardSearch from './components/CardSearch';
import CardDisplay from './components/CardDisplay';
import './App.css';

// Configuration de l'API (vous pouvez ajouter votre clé API ici si vous en avez une)
// pokemon.configure({ apiKey: 'your-api-key-here' });

function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [mode, setMode] = useState('search'); // 'search' ou 'image'

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

    if (imageFile) {
      // Pour une vraie reconnaissance d'image, il faudrait :
      // 1. Utiliser OCR (Tesseract.js) pour extraire le texte de l'image
      // 2. Ou utiliser une API de reconnaissance d'image
      // 3. Ou utiliser un modèle ML pour reconnaître la carte

      // Pour cette démo, on va simplement afficher un message
      setCards([]);
      alert(
        "📸 Image capturée!\n\n" +
        "Pour une vraie reconnaissance d'image, vous pouvez:\n" +
        "1. Utiliser le mode recherche pour chercher manuellement\n" +
        "2. Intégrer une API de reconnaissance d'image\n" +
        "3. Utiliser Tesseract.js pour l'OCR\n\n" +
        "Utilisez le mode recherche pour trouver votre carte!"
      );
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
            <div className="image-info">
              <h3>📋 Comment utiliser la reconnaissance d'image</h3>
              <ol>
                <li>Prenez une photo de votre carte Pokémon</li>
                <li>Assurez-vous que la carte est bien visible et centrée</li>
                <li>Utilisez ensuite la recherche par nom pour retrouver votre carte</li>
              </ol>
              <p className="info-note">
                💡 <strong>Note:</strong> La reconnaissance automatique nécessiterait une intégration
                avec une API de reconnaissance d'image ou OCR. En attendant, utilisez le mode recherche!
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
