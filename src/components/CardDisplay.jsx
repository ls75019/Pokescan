function CardDisplay({ cards, loading }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Recherche en cours...</p>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="cards-container">
      <h2>Résultats ({cards.length} carte{cards.length > 1 ? 's' : ''})</h2>
      <div className="cards-grid">
        {cards.map((card) => (
          <div key={card.id} className="card-item">
            <div className="card-image-wrapper">
              {card.images?.large ? (
                <img
                  src={card.images.large}
                  alt={card.name}
                  className="card-image"
                />
              ) : (
                <div className="no-image">Pas d'image</div>
              )}
            </div>
            <div className="card-info">
              <h3>{card.name}</h3>
              {card.supertype && (
                <p className="card-type">
                  <strong>Type:</strong> {card.supertype}
                  {card.subtypes && ` - ${card.subtypes.join(', ')}`}
                </p>
              )}
              {card.set && (
                <p className="card-set">
                  <strong>Set:</strong> {card.set.name} ({card.set.series})
                </p>
              )}
              {card.number && (
                <p className="card-number">
                  <strong>Numéro:</strong> {card.number}/{card.set?.printedTotal || '?'}
                </p>
              )}
              {card.rarity && (
                <p className="card-rarity">
                  <strong>Rareté:</strong> {card.rarity}
                </p>
              )}
              {card.artist && (
                <p className="card-artist">
                  <strong>Artiste:</strong> {card.artist}
                </p>
              )}
              {card.hp && (
                <p className="card-hp">
                  <strong>HP:</strong> {card.hp}
                </p>
              )}
              {card.types && card.types.length > 0 && (
                <p className="card-types">
                  <strong>Types:</strong> {card.types.join(', ')}
                </p>
              )}
              {card.tcgplayer?.prices && (
                <div className="card-prices">
                  <strong>Prix (TCGPlayer):</strong>
                  {Object.entries(card.tcgplayer.prices).map(([type, price]) => (
                    <span key={type} className="price-item">
                      {type}: ${price.market || price.mid || 'N/A'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardDisplay;
