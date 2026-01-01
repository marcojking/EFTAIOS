import React from 'react';
import './CardModal.css';

function CardModal({
  card,
  onDeclareNoiseHere,
  onDeclareNoiseAnywhere,
  onDeclareSilence,
  onUseCat,
  onClose,
  player
}) {
  if (!card) return null;

  const getCardColor = () => {
    switch (card.type) {
      case 'NOISE_YOUR_SECTOR':
        return 'red';
      case 'NOISE_ANY_SECTOR':
        return 'green';
      case 'SILENCE':
        return 'white';
      default:
        return 'gray';
    }
  };

  const cardColor = getCardColor();

  // Check for Pilot's Double Noise power
  const hasDoubleNoisePower = player?.character?.power?.id === 'double_noise'
    && player?.powerUsage?.usesRemaining > 0;

  // Check if player has Cat item
  const hasCatItem = player?.items?.some(item => item.type === 'CAT');

  // Handle "Choose Sector on Map" - closes modal automatically
  const handleChooseSectorClick = () => {
    onDeclareNoiseAnywhere();
  };

  // Handle Double Noise power usage
  const handleUseDoubleNoise = () => {
    // If it's a "Noise in Your Sector" card, we pass useDoublePower=true to onDeclareNoiseHere
    if (card.type === 'NOISE_YOUR_SECTOR') {
      onDeclareNoiseHere(false, true); // useCat=false, useDoublePower=true
    } else {
      // For "Noise Any Sector", we trigger the double noise flow via onDeclareNoiseAnywhere(true)
      onDeclareNoiseAnywhere(true);
    }
  };

  // Handle Cat item usage - allows declaring noise anywhere instead of here
  const handleUseCat = () => {
    // Call onDeclareNoiseHere with useCat=true to trigger the Cat logic
    onDeclareNoiseHere(true);
  };

  return (
    <div className="card-modal-overlay">
      <div className={`card-modal ${cardColor}`}>
        <div className="card-header">
          <h2>Card Drawn</h2>
          {/* Close button removed - must use action buttons */}
        </div>

        <div className="card-content">
          <div className={`card-display ${cardColor}`}>
            <div className="card-type-badge">{getCardTypeName(card.type)}</div>
            <div className="card-title">{card.name}</div>
            {card.hasItem && card.itemData && (
              <div className="card-item">
                <span className="item-badge">+ ITEM</span>
                <span className="item-name">{card.itemData.name}</span>
              </div>
            )}
          </div>

          <div className="card-instructions">
            {card.type === 'NOISE_YOUR_SECTOR' && (
              <>
                <p>You must declare noise in your <strong>current sector</strong>.</p>
                <div className="action-buttons">
                  <button className="action-btn primary" onClick={() => onDeclareNoiseHere(false, false)}>
                    Declare Noise Here
                  </button>
                  {hasCatItem && (
                    <button className="action-btn cat-btn" onClick={handleUseCat}>
                      🐱 Use Cat (Declare Anywhere)
                    </button>
                  )}
                  {hasDoubleNoisePower && (
                    <button className="action-btn power-btn" onClick={handleUseDoubleNoise}>
                      ⚡ Use Double Noise Power (2 sectors)
                    </button>
                  )}
                </div>
              </>
            )}

            {card.type === 'NOISE_ANY_SECTOR' && (
              <>
                <p>You may declare noise in <strong>any sector</strong> you choose.</p>
                <div className="action-buttons">
                  <button className="action-btn primary" onClick={handleChooseSectorClick}>
                    Choose Sector on Map
                  </button>
                  <button className="action-btn secondary" onClick={onDeclareNoiseHere}>
                    Declare Here (Truth)
                  </button>
                  {hasDoubleNoisePower && (
                    <button className="action-btn power-btn" onClick={handleUseDoubleNoise}>
                      ⚡ Use Double Noise Power (2 sectors)
                    </button>
                  )}
                </div>
              </>
            )}

            {card.type === 'SILENCE' && (
              <>
                <p>Announce <strong>"Silence in all sectors"</strong>.</p>
                {card.hasItem && card.itemData && (
                  <p className="item-note">
                    You received: <strong>{card.itemData.name}</strong>
                  </p>
                )}
                <button className="action-btn primary" onClick={onDeclareSilence}>
                  Declare Silence
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getCardTypeName(type) {
  switch (type) {
    case 'NOISE_YOUR_SECTOR':
      return 'NOISE - YOUR SECTOR';
    case 'NOISE_ANY_SECTOR':
      return 'NOISE - ANY SECTOR';
    case 'SILENCE':
      return 'SILENCE';
    default:
      return 'UNKNOWN';
  }
}

export default CardModal;
