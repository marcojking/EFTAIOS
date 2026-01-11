import React, { useState, useEffect } from 'react';
import FlipCard from './FlipCard';
import { DANGEROUS_SECTOR_CARDS, getItemImagePath } from '../config/characterArt';
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (card) {
      // Reset states
      setIsFlipped(false);
      setShowActions(false);

      // Auto-flip after a short delay
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
      }, 500);

      // Show action buttons after flip completes
      const actionsTimer = setTimeout(() => {
        setShowActions(true);
      }, 1100);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(actionsTimer);
      };
    }
  }, [card]);

  if (!card) return null;

  // Get card image paths based on type
  const getCardImages = () => {
    switch (card.type) {
      case 'NOISE_YOUR_SECTOR':
        return {
          front: DANGEROUS_SECTOR_CARDS.NOISE_YOUR_SECTOR,
          back: DANGEROUS_SECTOR_CARDS.BACK
        };
      case 'NOISE_ANY_SECTOR':
        return {
          front: DANGEROUS_SECTOR_CARDS.NOISE_ANY_SECTOR,
          back: DANGEROUS_SECTOR_CARDS.BACK
        };
      case 'SILENCE':
        return {
          front: DANGEROUS_SECTOR_CARDS.SILENCE,
          back: DANGEROUS_SECTOR_CARDS.BACK
        };
      default:
        return {
          front: null,
          back: DANGEROUS_SECTOR_CARDS.BACK
        };
    }
  };

  const cardImages = getCardImages();

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
    if (card.type === 'NOISE_YOUR_SECTOR') {
      onDeclareNoiseHere(false, true);
    } else {
      onDeclareNoiseAnywhere(true);
    }
  };

  // Handle Cat item usage
  const handleUseCat = () => {
    onDeclareNoiseHere(true);
  };

  // Get item image if the card has one
  const itemImage = card.hasItem && card.itemData
    ? getItemImagePath(card.itemData.type)
    : null;

  return (
    <div className="card-modal-overlay">
      <div className={`card-modal ${cardColor}`}>
        <div className="card-header">
          <h2>Card Drawn</h2>
        </div>

        <div className="card-content">
          <div className="card-flip-container">
            <FlipCard
              frontImage={cardImages.front}
              backImage={cardImages.back}
              isFlipped={isFlipped}
              width={240}
              height={336}
              className="dangerous-sector-card animate-entrance"
            >
              {/* Overlay content on the card front */}
              <div className="card-overlay-content">
                <div className={`card-type-badge ${cardColor}`}>
                  {getCardTypeName(card.type)}
                </div>

                {card.hasItem && card.itemData && (
                  <div className="card-item-badge">
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt={card.itemData.name}
                        className="item-icon"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <span className="item-text">+ {card.itemData.name}</span>
                  </div>
                )}
              </div>
            </FlipCard>
          </div>

          <div className={`card-instructions ${showActions ? 'visible' : ''}`}>
            {card.type === 'NOISE_YOUR_SECTOR' && (
              <>
                <p>You must declare noise in your <strong>current sector</strong>.</p>
                <div className="action-buttons">
                  <button className="action-btn primary" onClick={() => onDeclareNoiseHere(false, false)}>
                    Declare Noise Here
                  </button>
                  {hasCatItem && (
                    <button className="action-btn cat-btn" onClick={handleUseCat}>
                      Use Cat (Declare Anywhere)
                    </button>
                  )}
                  {hasDoubleNoisePower && (
                    <button className="action-btn power-btn" onClick={handleUseDoubleNoise}>
                      Use Double Noise Power (2 sectors)
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
                      Use Double Noise Power (2 sectors)
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
