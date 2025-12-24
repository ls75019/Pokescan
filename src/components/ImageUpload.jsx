import { useState, useRef } from 'react';

function ImageUpload({ onImageCapture }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      alert('Impossible d\'accéder à la caméra');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onImageCapture(blob, url);
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageCapture(file, url);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    onImageCapture(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload">
      {!previewUrl && !useCamera && (
        <div className="upload-controls">
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Choisir une image
          </button>
          <button
            className="btn btn-secondary"
            onClick={startCamera}
          >
            📷 Utiliser la caméra
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {useCamera && (
        <div className="camera-view">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="video-preview"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="camera-controls">
            <button className="btn btn-primary" onClick={capturePhoto}>
              📸 Capturer
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              ❌ Annuler
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="preview-section">
          <img src={previewUrl} alt="Preview" className="image-preview" />
          <button className="btn btn-secondary" onClick={handleReset}>
            🔄 Nouvelle image
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
