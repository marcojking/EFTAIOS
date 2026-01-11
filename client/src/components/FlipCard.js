import React from 'react';
import './FlipCard.css';

/**
 * FlipCard - A reusable component for 3D card flip animations
 *
 * @param {string} frontImage - Path to the front image
 * @param {string} backImage - Path to the back image
 * @param {boolean} isFlipped - Controls whether the card is flipped (showing front)
 * @param {number} width - Card width in pixels (default: 300)
 * @param {number} height - Card height in pixels (default: 420)
 * @param {function} onClick - Optional click handler
 * @param {React.ReactNode} children - Content to overlay on the front of the card
 * @param {React.ReactNode} frontContent - Custom content for front instead of image
 * @param {string} className - Additional CSS classes
 */
function FlipCard({
  frontImage,
  backImage,
  isFlipped = false,
  width = 300,
  height = 420,
  onClick,
  children,
  frontContent,
  className = ''
}) {
  const cardStyle = {
    '--card-width': `${width}px`,
    '--card-height': `${height}px`,
  };

  return (
    <div
      className={`flip-card ${isFlipped ? 'flipped' : ''} ${className}`}
      style={cardStyle}
      onClick={onClick}
    >
      <div className="flip-card-inner">
        {/* Back of card (visible when not flipped) */}
        <div className="flip-card-back">
          {backImage ? (
            <img src={backImage} alt="Card back" />
          ) : (
            <div className="card-back-placeholder" />
          )}
        </div>

        {/* Front of card (visible when flipped) */}
        <div className="flip-card-front">
          {frontContent ? (
            frontContent
          ) : frontImage ? (
            <img src={frontImage} alt="Card front" />
          ) : (
            <div className="card-front-placeholder" />
          )}

          {/* Overlay content (buttons, badges, etc.) */}
          {children && (
            <div className="flip-card-overlay">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlipCard;
