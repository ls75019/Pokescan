import { useState, useRef } from 'react';
import { recognizeCard } from './services/enhancedOcrService';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Caméra arrière sur mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('Impossible d\'accéder à la caméra: ' + err.message);
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Prendre une photo
  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setImage(imageData);
      stopCamera();
      handleImageAnalysis(imageData);
    }
  };

  // Upload fichier
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        setImage(imageData);
        handleImageAnalysis(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyser l'image
  const handleImageAnalysis = async (imageData) => {
    setLoading(true);
    setError(null);
    setOcrResult(null);
    setCard(null);

    try {
      // 1. OCR
      console.log('🔍 Début analyse OCR...');
      const result = await recognizeCard(imageData);

      const pokemonName = result.name.bestMatch?.text || null;
      const cardNumber = result.number.cardNumber || null;

      console.log('✅ OCR terminé:', { pokemonName, cardNumber });

      setOcrResult({
        name: pokemonName,
        number: cardNumber,
        confidence: result.name.bestMatch?.confidence || 0
      });

      // 2. Recherche de la carte
      if (pokemonName) {
        console.log('🔎 Recherche carte...');
        await searchCard(pokemonName, cardNumber);
      } else {
        setError('Aucun nom de Pokémon détecté');
      }

    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rechercher une carte
  const searchCard = async (name, number = null) => {
    try {
      // Construire la query
      let query = `name:"${name}"`;
      if (number) {
        query += ` number:"${number}"`;
      }

      console.log('📡 Query API:', query);

      // Appel direct à l'API Pokemon TCG (pas de proxy)
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&orderBy=-set.releaseDate`;

      console.log('📡 URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ Réponse API:', data);

      if (data.data && data.data.length > 0) {
        setCard(data.data[0]);
      } else {
        setError(`Aucune carte trouvée pour "${name}"${number ? ` (${number})` : ''}`);
      }

    } catch (err) {
      console.error('❌ Erreur API:', err);
      setError('Erreur lors de la recherche: ' + err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎴 Pokéscan</h1>
        <p>Scanner de cartes Pokémon</p>
      </header>

      <main className="main">
        {/* Upload / Caméra */}
        {!image && !cameraActive && (
          <div className="upload-section">
            <button className="btn btn-primary" onClick={startCamera}>
              📷 Ouvrir la caméra
            </button>
            <label className="btn btn-secondary">
              📁 Choisir une image
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        {/* Caméra active */}
        {cameraActive && (
          <div className="camera-section">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="camera-video"
            />
            <div className="camera-controls">
              <button className="btn btn-primary" onClick={takePhoto}>
                📸 Prendre la photo
              </button>
              <button className="btn btn-secondary" onClick={stopCamera}>
                ❌ Annuler
              </button>
            </div>
          </div>
        )}

        {/* Image capturée */}
        {image && (
          <div className="image-preview">
            <img src={image} alt="Carte scannée" />
            <button
              className="btn btn-secondary"
              onClick={() => {
                setImage(null);
                setOcrResult(null);
                setCard(null);
                setError(null);
              }}
            >
              🔄 Nouvelle photo
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Analyse en cours...</p>
          </div>
        )}

        {/* Résultat OCR */}
        {ocrResult && !loading && (
          <div className="ocr-result">
            <h3>Détection OCR</h3>
            <p><strong>Nom:</strong> {ocrResult.name || '❌ Non détecté'}</p>
            <p><strong>Numéro:</strong> {ocrResult.number || '❌ Non détecté'}</p>
            <p><strong>Confiance:</strong> {ocrResult.confidence}%</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="error">
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Carte trouvée */}
        {card && (
          <div className="card-result">
            <h2>{card.name}</h2>
            <img src={card.images.large} alt={card.name} className="card-image" />
            <div className="card-info">
              <p><strong>Série:</strong> {card.set.name}</p>
              <p><strong>Numéro:</strong> {card.number}/{card.set.printedTotal}</p>
              <p><strong>Rareté:</strong> {card.rarity || 'N/A'}</p>
              <p><strong>Type:</strong> {card.types?.join(', ') || 'N/A'}</p>
              {card.hp && <p><strong>HP:</strong> {card.hp}</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
