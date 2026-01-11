import React, { useState } from 'react';
import {
  hasOfficialArt,
  getCharacterImagePath,
  getItemImagePath
} from '../config/characterArt';
import './PlayerHUD.css';

function PlayerHUD({ player, isSpectator, gameState, onUseItem, onUsePower, selectedItem, isMyTurn }) {
  const [portraitError, setPortraitError] = useState(false);
  if (isSpectator) {
    return (
      <div className="player-hud host-hud">
        <div className="hud-section">
          <h3>Spectator Mode</h3>
          <p className="hud-info">You can see all player positions on the map.</p>
        </div>

        <div className="hud-section">
          <h4>Game Stats</h4>
          <div className="stat-row">
            <span className="stat-label">Turn</span>
            <span className="stat-value">{gameState?.currentTurn} / {gameState?.maxTurns}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Cards Left</span>
            <span className="stat-value">{gameState?.dangerousDeckRemaining || '?'}</span>
          </div>
        </div>

        <div className="hud-section">
          <h4>Players Status</h4>
          <div className="player-status-list">
            {gameState?.players?.map(p => (
              <div
                key={p.id}
                className={`player-status-item ${!p.alive ? 'dead' : ''} ${p.escaped ? 'escaped' : ''}`}
              >
                <span
                  className="status-indicator"
                  style={{ background: p.role === 'human' ? '#00d9ff' : '#e94560' }}
                />
                <span className="status-name">{p.name}</span>
                <span className="status-role">
                  {p.role === 'human' ? 'Human' : 'Alien'}
                </span>
                {!p.alive && <span className="status-badge dead">Dead</span>}
                {p.escaped && <span className="status-badge escaped">Escaped</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="player-hud">
        <div className="hud-loading">Loading player data...</div>
      </div>
    );
  }

  const isHuman = player.role === 'human';
  const power = player.character?.power;
  const powerUsage = player.powerUsage || {};

  // Check if power is available to use
  const canUsePower = () => {
    if (!power || power.passive) return false;
    if (powerUsage.usesRemaining !== undefined && powerUsage.usesRemaining <= 0) return false;
    if (power.id === 'first_safe' && !powerUsage.firstSafeAvailable) return false;
    return true;
  };

  // Check if alien can use a specific item
  const canAlienUseItem = (itemType) => {
    if (isHuman) return true;
    const allowedItems = power?.canUseItems || [];
    return allowedItems.includes(itemType);
  };

  return (
    <div className={`player-hud ${isHuman ? 'human' : 'alien'}`}>
      {/* Role & Character Info */}
      <div className="hud-section identity">
        <div className="role-badge" style={{ background: isHuman ? '#00d9ff' : '#e94560' }}>
          {isHuman ? 'HUMAN' : 'ALIEN'}
        </div>
        <div className="character-identity">
          {player.character?.id && hasOfficialArt(player.character.id) && !portraitError && (
            <img
              src={getCharacterImagePath(player.character.id)}
              alt={player.character?.name}
              className="character-portrait"
              onError={() => setPortraitError(true)}
            />
          )}
          <div className="character-text">
            <h3 className="character-name">{player.character?.name}</h3>
            <p className="character-full-name">{player.character?.fullName}</p>
          </div>
        </div>
      </div>

      {/* Character Power */}
      {power && (
        <div className="hud-section power-section">
          <h4>Special Power</h4>
          <div className={`power-card ${canUsePower() ? 'available' : 'used'}`}>
            <div className="power-name">{power.name}</div>
            <div className="power-desc">{power.description}</div>
            {!power.passive && powerUsage.usesRemaining !== undefined && (
              <div className="power-uses">
                Uses: {powerUsage.usesRemaining}/{power.usesRemaining || 1}
              </div>
            )}
            {power.passive && (
              <div className="power-passive-badge">Passive</div>
            )}
            {canUsePower() && isMyTurn && onUsePower && (
              <button
                className="power-use-btn"
                onClick={() => onUsePower(power.id)}
              >
                Use Power
              </button>
            )}
          </div>
        </div>
      )}



      {/* Movement Info */}
      <div className="hud-section">
        <h4>Movement</h4>
        <div className="movement-info">
          <span className="move-speed">
            {isHuman ? '1 sector' : player.hasFed ? '1-3 sectors' : '1-2 sectors'}
          </span>
          {!isHuman && player.hasFed && (
            <span className="fed-indicator">FED</span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="hud-section">
        <h4>Items ({player.items?.length || 0}/3)</h4>
        <div className="items-list">
          {(!player.items || player.items.length === 0) ? (
            <div className="no-items">No items</div>
          ) : (
            player.items.map(item => {
              const canUse = canAlienUseItem(item.type);
              const itemImagePath = getItemImagePath(item.type);
              return (
                <div
                  key={item.id}
                  className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''} ${!canUse ? 'disabled' : ''} ${!isMyTurn ? 'not-my-turn' : ''}`}
                  onClick={() => isMyTurn && canUse && item.type !== 'CLONE' && onUseItem && onUseItem(item)}
                >
                  <ItemIcon type={item.type} imagePath={itemImagePath} />
                  <div className="item-info">
                    <span className="item-name">
                      {item.name}
                      {item.type === 'CLONE' && <span className="item-passive-badge"> (Passive)</span>}
                    </span>
                    <span className="item-desc">{item.description}</span>
                  </div>
                  {canUse && item.type !== 'CLONE' && (
                    <button className="use-btn">Use</button>
                  )}
                </div>
              );
            })
          )}
        </div>
        {!isHuman && player.items?.length > 0 && !power?.canUseItems && (
          <p className="alien-item-note">Aliens cannot use items</p>
        )}
        {!isHuman && power?.canUseItems && (
          <p className="alien-item-note">
            Can use: {power.canUseItems.join(', ')}
          </p>
        )}
      </div>


    </div>
  );
}

function getItemIcon(type) {
  switch (type) {
    case 'ATTACK': return '⚔';
    case 'TELEPORT': return '🌀';
    case 'CLONE': return '👥';
    case 'SEDATIVES': return '💊';
    case 'SPOTLIGHT': return '🔦';
    case 'DEFENSE': return '🛡';
    case 'ADRENALINE': return '⚡';
    case 'SENSOR': return '📡';
    case 'CAT': return '🐱';
    case 'MUTATION': return '🧬';
    default: return '📦';
  }
}

function ItemIcon({ type, imagePath }) {
  const [imageError, setImageError] = React.useState(false);

  if (imagePath && !imageError) {
    return (
      <div className="item-icon item-icon-image">
        <img
          src={imagePath}
          alt={type}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return <span className="item-icon">{getItemIcon(type)}</span>;
}

export default PlayerHUD;
