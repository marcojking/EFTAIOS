import React, { useState, useEffect } from 'react';
import FlipCard from './FlipCard';
import {
  hasOfficialArt,
  getCharacterImagePath,
  getCharacterBackPath
} from '../config/characterArt';
import './CharacterCardPopup.css';

/**
 * CharacterCardPopup - Full-screen popup showing character card at game start
 *
 * @param {object} character - Character data from the game state
 * @param {string} role - 'human' or 'alien'
 * @param {function} onAcknowledge - Callback when player dismisses the popup
 * @param {boolean} isVisible - Controls visibility
 */
function CharacterCardPopup({ character, role, onAcknowledge, isVisible }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Reset state when popup becomes visible
      setIsFlipped(false);
      setShowInfo(false);

      // Auto-flip after a dramatic pause
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
      }, 1000);

      // Show info after flip completes
      const infoTimer = setTimeout(() => {
        setShowInfo(true);
      }, 1600);

      return () => {
        clearTimeout(flipTimer);
        clearTimeout(infoTimer);
      };
    }
  }, [isVisible]);

  if (!isVisible || !character) return null;

  const hasArt = hasOfficialArt(character.id);
  const frontImage = hasArt ? getCharacterImagePath(character.id) : null;
  const backImage = getCharacterBackPath();

  // Create placeholder content for characters without official art
  const placeholderContent = !hasArt ? (
    <div
      className="character-placeholder"
      style={{
        '--character-color': character.color || '#4A90D9',
        '--role-color': role === 'human' ? '#4A90D9' : '#E74C3C'
      }}
    >
      <div className="placeholder-icon">
        {role === 'human' ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        )}
      </div>
      <div className="placeholder-rank">Rank {character.rank}</div>
      <div className="placeholder-name">{character.name}</div>
    </div>
  ) : null;

  return (
    <div className={`character-popup-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="character-popup-content">
        <div className="character-popup-header">
          <span className={`role-badge ${role}`}>
            {role === 'human' ? 'HUMAN' : 'ALIEN'}
          </span>
        </div>

        <div className="character-card-container">
          <FlipCard
            frontImage={frontImage}
            backImage={backImage}
            isFlipped={isFlipped}
            width={280}
            height={392}
            frontContent={placeholderContent}
            className="character-flip-card animate-entrance"
          />
        </div>

        <div className={`character-info ${showInfo ? 'visible' : ''}`}>
          <h2 className="character-name">{character.name}</h2>
          <p className="character-full-name">{character.fullName}</p>

          <div className="power-card">
            <div className="power-header">
              <span className="power-icon">
                {character.power?.passive ? '🔵' : '⚡'}
              </span>
              <span className="power-name">{character.power?.name}</span>
              {!character.power?.passive && (
                <span className="power-uses">
                  {character.power?.usesRemaining || 1}x
                </span>
              )}
            </div>
            <p className="power-description">{character.power?.description}</p>
          </div>
        </div>

        <button
          className={`acknowledge-btn ${showInfo ? 'visible' : ''}`}
          onClick={onAcknowledge}
        >
          READY TO PLAY
        </button>
      </div>
    </div>
  );
}

export default CharacterCardPopup;
