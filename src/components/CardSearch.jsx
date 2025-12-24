import { useState } from 'react';

function CardSearch({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  return (
    <div className="card-search">
      <form onSubmit={handleSubmit}>
        <div className="search-input-group">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom de carte (ex: Pikachu, Charizard...)"
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">
            🔍 Rechercher
          </button>
        </div>
      </form>
      <p className="search-hint">
        💡 Astuce: Vous pouvez rechercher par nom de Pokémon ou par nom complet de la carte
      </p>
    </div>
  );
}

export default CardSearch;
