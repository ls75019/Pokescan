import { useState, useRef } from 'react';
import { recognizeCard } from './services/enhancedOcrService';
import { detectAndCropCard } from './services/cardDetector';
import { extractPotentialNames } from './services/fuzzyMatcher';
import { searchCardByName, formatCard } from './services/tcgdexService';
import './App.css';

function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scanIntervalRef = useRef(null); // Pour le scan en temps réel
  const [isScanning, setIsScanning] = useState(false); // État du scan auto
  const [videoReady, setVideoReady] = useState(false); // Vidéo démarrée ?

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      console.log('📷 Demande accès caméra...');

      // Reset états
      setCard(null);
      setOcrResult(null);
      setError(null);
      setImage(null);
      setVideoReady(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('✅ Caméra autorisée, stream obtenu');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        console.log('📹 Stream assigné à la vidéo');

        // Sur iOS, il faut un geste utilisateur pour play()
        // On affichera un bouton "Démarrer la vidéo"
      }
    } catch (err) {
      console.error('❌ Erreur caméra:', err);
      setError('Impossible d\'accéder à la caméra: ' + err.message);
    }
  };

  // Démarrer la vidéo (appelé par bouton sur iOS)
  const startVideo = async () => {
    if (!videoRef.current) return;

    try {
      console.log('▶️ Tentative de démarrage vidéo...');
      await videoRef.current.play();
      console.log('✅ Vidéo démarrée !');
      setVideoReady(true);

      // Attendre 1 seconde puis démarrer le scan auto
      setTimeout(() => {
        console.log('🔄 Lancement du scan automatique');
        startAutoScan();
      }, 1000);
    } catch (err) {
      console.error('❌ Erreur play():', err);
      setError('Erreur démarrage vidéo: ' + err.message);
    }
  };

  // Démarrer le scan automatique
  const startAutoScan = () => {
    console.log('🔄 Démarrage du scan automatique...');
    setIsScanning(true);

    // Scanner toutes les 2 secondes
    scanIntervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 2000);
  };

  // Arrêter le scan automatique
  const stopAutoScan = () => {
    console.log('⏹️ Arrêt du scan automatique');
    setIsScanning(false);

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    stopAutoScan(); // Arrêter le scan d'abord

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setVideoReady(false);
  };

  // Capturer et analyser (pour scan automatique)
  const captureAndAnalyze = async () => {
    if (!videoRef.current || loading || !isScanning) {
      return; // Ne rien faire si déjà en train de scanner
    }

    console.log('📸 Capture frame pour analyse...');

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8); // Qualité 80% pour être plus rapide

    // Analyser sans bloquer le scan
    await handleImageAnalysis(imageData, true); // true = mode auto
  };

  // Prendre une photo manuellement (bouton)
  const takePhoto = () => {
    if (videoRef.current) {
      stopAutoScan(); // Arrêter le scan auto

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setImage(imageData);
      handleImageAnalysis(imageData, false); // false = mode manuel
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
  const handleImageAnalysis = async (imageData, isAutoMode = false) => {
    // En mode auto, ne pas bloquer si déjà en chargement
    if (isAutoMode && loading) {
      console.log('⏭️ Scan en cours, skip cette frame');
      return;
    }

    setLoading(true);
    if (!isAutoMode) {
      setError(null);
      setOcrResult(null);
      setCard(null);
    }

    try {
      // 1. Détecter et isoler la carte
      console.log('🎴 Détection de la carte...');
      const croppedImage = await detectAndCropCard(imageData);
      console.log('✅ Carte détectée et isolée');

      // Mettre à jour l'image affichée avec la carte isolée
      setImage(croppedImage);

      // 2. OCR
      console.log('🔍 Début analyse OCR...');
      const result = await recognizeCard(croppedImage);

      const pokemonName = result.name.bestMatch?.text || null;
      const cardNumber = result.number.cardNumber || null;

      console.log('✅ OCR terminé:', { pokemonName, cardNumber });

      setOcrResult({
        name: pokemonName,
        number: cardNumber,
        confidence: result.name.bestMatch?.confidence || 0,
        rawName: result.name.rawText, // Texte brut pour debug
        rawNumber: result.number.rawText // Texte brut pour debug
      });

      // 3. Recherche de la carte
      // Essayer d'abord avec le nom détecté, sinon avec le texte brut OCR
      const searchName = pokemonName || extractPotentialNames(result.name.rawText)[0];

      if (searchName) {
        console.log('🔎 Recherche carte avec:', searchName);
        const foundCard = await searchCard(searchName, cardNumber);

        // Si une carte est trouvée en mode auto, arrêter la caméra
        if (foundCard && isAutoMode) {
          console.log('🎉 Carte trouvée en mode auto, arrêt de la caméra!');
          stopCamera();
        }
      } else {
        if (!isAutoMode) {
          setError('Aucun nom de Pokémon détecté');
        }
      }

    } catch (err) {
      console.error('❌ Erreur:', err);
      // En mode auto, ne pas afficher les erreurs (sinon ça spam)
      if (!isAutoMode) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Rechercher une carte avec TCGdex (API française)
  const searchCard = async (name, number = null) => {
    try {
      console.log('🔎 Recherche TCGdex:', { name, number });

      // Rechercher avec TCGdex (support français)
      const card = await searchCardByName(name, number);

      if (card) {
        console.log('✅ Carte trouvée:', card.name);
        // Formater la carte pour l'affichage
        const formattedCard = formatCard(card);
        setCard(formattedCard);
        return formattedCard; // Retourner la carte trouvée
      } else {
        console.log('❌ Aucune carte trouvée');
        setError(`Aucune carte trouvée pour "${name}"${number ? ` (${number})` : ''}`);
        return null;
      }

    } catch (err) {
      console.error('❌ Erreur API TCGdex:', err);
      console.error('❌ Message:', err.message);

      // Message d'erreur convivial
      let errorMsg = 'Erreur lors de la recherche: ';
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        errorMsg += 'Vérifiez votre connexion internet.';
      } else {
        errorMsg += err.message;
      }

      setError(errorMsg);
      return null;
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
            <div className="camera-container">
              <video
                ref={videoRef}
                playsInline
                playsinline
                muted
                className="camera-video"
              />

              {/* Bouton démarrer vidéo (iOS) */}
              {!videoReady && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.7)',
                  zIndex: 10
                }}>
                  <button
                    className="btn btn-primary"
                    onClick={startVideo}
                    style={{ fontSize: '1.2rem', padding: '20px 40px' }}
                  >
                    ▶️ Démarrer la vidéo
                  </button>
                </div>
              )}

              {/* Overlay guide de cadrage (seulement si vidéo démarrée) */}
              {videoReady && (
                <div className="card-guide-overlay">
                  <div className="card-guide">
                    <div className="guide-corner guide-top-left"></div>
                    <div className="guide-corner guide-top-right"></div>
                    <div className="guide-corner guide-bottom-left"></div>
                    <div className="guide-corner guide-bottom-right"></div>
                    <div className="guide-text">
                      {isScanning ? '🔍 Scan en cours...' : 'Cadrez votre carte'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="camera-controls">
              {videoReady && (
                <button className="btn btn-primary" onClick={takePhoto} disabled={loading}>
                  📸 Capturer maintenant
                </button>
              )}
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
            {ocrResult.rawName && (
              <details style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                <summary>Debug OCR</summary>
                <p><strong>Texte brut nom:</strong> {ocrResult.rawName}</p>
                <p><strong>Texte brut numéro:</strong> {ocrResult.rawNumber}</p>
              </details>
            )}
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
            <button className="btn btn-primary" onClick={startCamera} style={{ marginTop: '20px' }}>
              🔄 Scanner une autre carte
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
