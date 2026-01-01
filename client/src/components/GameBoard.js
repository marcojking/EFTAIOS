import React, { useState, useMemo, useCallback } from 'react';
import HexGrid from './HexGrid';
import PlayerTokenBank from './PlayerTokenBank';
import GameLog from './GameLog';
import PlayerHUD from './PlayerHUD';
import CardModal from './CardModal';
import PlayerTracker from './PlayerTracker';
import './GameBoard.css';

function GameBoard({
  gameState,
  clientId,
  isHost,
  onMove,
  onAttack,
  onAttackInPlace,
  onMoveAndAttack,
  onDeclareNoise,
  onDeclareSecondNoise,
  onUseItem,
  onUsePower,
  onChooseEscapeCard,
  onCardDismiss,
  pendingSecondNoise,
  pendingEscapeChoice,
  drawnCard
}) {
  const [ghostTokens, setGhostTokens] = useState({});
  const [selectedGhostPlayer, setSelectedGhostPlayer] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [noiseDeclarationSector, setNoiseDeclarationSector] = useState(null);
  const [showTracker, setShowTracker] = useState(true);  // Default OPEN
  const [showLog, setShowLog] = useState(false);  // Game log hidden by default
  const [targetSelectionMode, setTargetSelectionMode] = useState(null); // { type: 'sensor'|'medic', itemId? }
  const [attackPrimed, setAttackPrimed] = useState(false); // Prime attack before moving

  const myPlayer = gameState?.myPlayer;
  const isMyTurn = gameState?.currentPlayerId === clientId;
  const currentTurnPlayer = gameState?.players?.find(p => p.id === gameState.currentPlayerId);

  // Calculate reachable sectors for movement
  const reachableSectors = useMemo(() => {
    if (!myPlayer || !isMyTurn || !gameState?.map) return [];

    // Simple adjacency calculation for now
    // This would be more sophisticated with proper pathfinding
    return [];
  }, [myPlayer, isMyTurn, gameState]);

  // Handle hex click
  const handleHexClick = useCallback((sector) => {
    // If selecting sector for ghost token placement
    if (selectedGhostPlayer) {
      setGhostTokens(prev => {
        const newTokens = { ...prev };

        // Remove this player's ghost from any other sector
        Object.keys(newTokens).forEach(key => {
          newTokens[key] = newTokens[key].filter(id => id !== selectedGhostPlayer);
          if (newTokens[key].length === 0) {
            delete newTokens[key];
          }
        });

        // Add to new sector
        if (!newTokens[sector]) {
          newTokens[sector] = [];
        }
        newTokens[sector].push(selectedGhostPlayer);

        return newTokens;
      });
      setSelectedGhostPlayer(null);
      return;
    }

    // If selecting target for item (like Spotlight)
    if (selectedItem) {
      onUseItem(selectedItem.id, selectedItem.type, sector);
      setSelectedItem(null);
      return;
    }

    // If declaring noise after drawing a card
    if (noiseDeclarationSector !== null) {
      onDeclareNoise(sector, false);
      setNoiseDeclarationSector(null);
      return;
    }

    // If selecting second noise (Pilot power or Cat item)
    if (pendingSecondNoise) {
      onDeclareSecondNoise(sector);
      return;
    }

    // If attack is primed, use combined move and attack (no card draw)
    if (attackPrimed && isMyTurn && myPlayer?.alive && !myPlayer?.escaped) {
      onMoveAndAttack(sector);
      setAttackPrimed(false);
      return;
    }

    // Regular movement
    if (isMyTurn && myPlayer?.alive && !myPlayer?.escaped) {
      onMove(sector);
    }
  }, [selectedGhostPlayer, selectedItem, noiseDeclarationSector, pendingSecondNoise, attackPrimed, isMyTurn, myPlayer, onMove, onMoveAndAttack, onDeclareNoise, onDeclareSecondNoise, onUseItem]);

  // Handle ghost token selection from bank
  const handleGhostSelect = useCallback((playerId) => {
    if (selectedGhostPlayer === playerId) {
      // Deselect
      setSelectedGhostPlayer(null);
    } else {
      setSelectedGhostPlayer(playerId);
    }
  }, [selectedGhostPlayer]);

  // Remove ghost token (return to bank)
  const handleGhostRemove = useCallback((playerId) => {
    setGhostTokens(prev => {
      const newTokens = { ...prev };
      Object.keys(newTokens).forEach(key => {
        newTokens[key] = newTokens[key].filter(id => id !== playerId);
        if (newTokens[key].length === 0) {
          delete newTokens[key];
        }
      });
      return newTokens;
    });
  }, []);

  // Get players whose ghosts are on the board
  const placedGhostPlayerIds = useMemo(() => {
    const ids = new Set();
    Object.values(ghostTokens).forEach(playerIds => {
      playerIds.forEach(id => ids.add(id));
    });
    return ids;
  }, [ghostTokens]);

  // Declare silence
  const handleDeclareSilence = useCallback(() => {
    onDeclareNoise(null, true);
    setNoiseDeclarationSector(null);
    onCardDismiss && onCardDismiss();
  }, [onDeclareNoise, onCardDismiss]);

  // Declare noise in current sector (for NOISE_YOUR_SECTOR)
  const handleDeclareNoiseHere = useCallback((useCat = false) => {
    // Use the explicit targetSector passed from server when the card was drawn
    // This ensures we always declare noise in the sector we moved INTO, not FROM
    const targetSector = drawnCard?.targetSector || gameState?.pendingAction?.sector || myPlayer?.position;

    if (targetSector) {
      onDeclareNoise(targetSector, false, false, useCat);
      setNoiseDeclarationSector(null);
      onCardDismiss && onCardDismiss();
    }
  }, [drawnCard, gameState, myPlayer, onDeclareNoise, onCardDismiss]);

  // Handle "Choose Sector on Map" - dismiss card and enable map selection
  const handleDeclareNoiseAnywhere = useCallback(() => {
    setNoiseDeclarationSector('any');
    onCardDismiss && onCardDismiss();  // Hide the card so map is visible
  }, [onCardDismiss]);

  // Handle item use with target selection
  const handleItemUse = useCallback((item) => {
    if (item.type === 'SENSOR') {
      setTargetSelectionMode({ type: 'sensor', itemId: item.id });
    } else if (item.type === 'SPOTLIGHT' || item.type === 'CAT') {
      setSelectedItem(item);
    } else {
      onUseItem(item.id, item.type, null);
    }
  }, [onUseItem]);

  // Handle power use with target selection
  const handlePowerUse = useCallback((power) => {
    if (power === 'reveal_identity') {
      setTargetSelectionMode({ type: 'medic' });
    } else {
      onUsePower(power);
    }
  }, [onUsePower]);

  // Handle target selection for Sensor/Medic
  const handleTargetSelect = useCallback((targetPlayerId) => {
    if (targetSelectionMode?.type === 'sensor') {
      onUseItem(targetSelectionMode.itemId, 'SENSOR', targetPlayerId);
    } else if (targetSelectionMode?.type === 'medic') {
      onUsePower('reveal_identity', targetPlayerId);
    }
    setTargetSelectionMode(null);
  }, [targetSelectionMode, onUseItem, onUsePower]);

  // Check if Lurking Alien can attack in place
  const canAttackInPlace = myPlayer?.character?.power?.canAttackWithoutMoving && isMyTurn && myPlayer?.alive;

  // Check if player can prime attack (aliens always can, humans need Attack item or Soldier power)
  const canPrimeAttack = useMemo(() => {
    if (!myPlayer || !isMyTurn || !myPlayer.alive || myPlayer.escaped) return false;
    if (myPlayer.role === 'alien') return true;
    // Human with Attack item
    if (myPlayer.items?.some(item => item.type === 'ATTACK')) return true;
    // Soldier with free attack power
    if (myPlayer.character?.power?.id === 'free_attack' && myPlayer.powerUsage?.usesRemaining > 0) return true;
    return false;
  }, [myPlayer, isMyTurn]);

  // Determine highlight mode
  const getHighlightMode = () => {
    if (noiseDeclarationSector === 'any') return 'noise-select';
    if (pendingSecondNoise) return 'noise-select';
    if (selectedItem) return 'item-target';
    if (attackPrimed) return 'attack-primed';
    return null;
  };

  if (!gameState) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className={`game-board ${showTracker ? 'with-tracker' : ''}`}>
      {/* Top: Player Token Bank */}
      <PlayerTokenBank
        players={gameState.players}
        currentPlayerId={gameState.currentPlayerId}
        selectedGhostPlayer={selectedGhostPlayer}
        placedGhostPlayerIds={placedGhostPlayerIds}
        onGhostSelect={handleGhostSelect}
        onGhostRemove={handleGhostRemove}
        isHost={isHost}
      />

      {/* Main Content Area */}
      <div className="game-content-wrapper">
        {/* Game Area */}
        <div className="game-main">
          {/* Left: Player HUD */}
          <div className="game-sidebar left">
            <PlayerHUD
              player={myPlayer}
              isHost={isHost}
              gameState={gameState}
              onUseItem={handleItemUse}
              onUsePower={handlePowerUse}
              selectedItem={selectedItem}
              isMyTurn={isMyTurn}
            />
          </div>

          {/* Center: Hex Grid Map */}
          <div className="game-center">
            {/* PROMINENT Turn Indicator */}
            <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
              <span className="turn-number">Turn {gameState.currentTurn} / {gameState.maxTurns}</span>
              <span className={`current-player ${isMyTurn ? 'highlight' : ''}`}>
                {isMyTurn ? "🎯 YOUR TURN" : `⏳ ${currentTurnPlayer?.name}'s Turn`}
              </span>
              <div className="toggle-buttons">
                <button
                  className={`toggle-btn ${showLog ? 'active' : ''}`}
                  onClick={() => setShowLog(!showLog)}
                  title="Toggle Game Log"
                >
                  📜 Log
                </button>
                <button
                  className={`toggle-btn ${showTracker ? 'active' : ''}`}
                  onClick={() => setShowTracker(!showTracker)}
                  title="Toggle Player Tracker"
                >
                  📊 Tracker
                </button>
              </div>
            </div>

            <HexGrid
              map={gameState.map}
              myPosition={myPlayer?.position}
              ghostTokens={ghostTokens}
              players={gameState.players}
              isHost={isHost}
              escapeHatchStatus={gameState.escapeHatchStatus}
              selectedGhostPlayer={selectedGhostPlayer}
              onHexClick={handleHexClick}
              highlightMode={getHighlightMode()}
            />

            {/* Action Buttons */}
            {isMyTurn && myPlayer?.alive && (
              <div className="action-buttons">
                {/* Prime Attack Toggle */}
                {canPrimeAttack && (
                  <button
                    className={`action-btn prime-attack-btn ${attackPrimed ? 'primed' : ''}`}
                    onClick={() => setAttackPrimed(!attackPrimed)}
                  >
                    {attackPrimed ? '⚔️ ATTACK PRIMED - Click sector to move & attack' : '⚔️ Prime Attack'}
                  </button>
                )}
                {/* Lurking Alien attack in place */}
                {canAttackInPlace && (
                  <button
                    className="action-btn attack-btn lurking"
                    onClick={onAttackInPlace}
                  >
                    Lurk Attack (No Move)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Game Log (toggleable) */}
          {showLog && (
            <div className="game-sidebar right">
              <GameLog announcements={gameState.announcements} />
            </div>
          )}
        </div>

        {/* Player Tracker Panel (Split Screen) */}
        {showTracker && (
          <div className="tracker-panel">
            <PlayerTracker
              announcements={gameState.announcements}
              players={gameState.players}
              currentTurn={gameState.currentTurn}
              maxTurns={gameState.maxTurns}
              firstPlayerId={gameState.firstPlayerId}
              onClose={() => setShowTracker(false)}
            />
          </div>
        )}
      </div>

      {/* Card Modal for drawn cards */}
      {drawnCard && (
        <CardModal
          card={drawnCard.card}
          itemCard={drawnCard.itemCard}
          onDeclareNoiseHere={handleDeclareNoiseHere}
          onDeclareNoiseAnywhere={handleDeclareNoiseAnywhere}
          onDeclareSilence={handleDeclareSilence}
          onClose={onCardDismiss}
          player={myPlayer}
        />
      )}

      {/* Noise Selection Overlay */}
      {(noiseDeclarationSector === 'any' || pendingSecondNoise) && (
        <div className="noise-select-overlay">
          <div className="noise-select-message">
            {pendingSecondNoise
              ? `Select SECOND sector for noise (first: ${pendingSecondNoise.firstSector})`
              : 'Click any sector to declare noise there'
            }
          </div>
        </div>
      )}

      {/* Target Selection Modal for Sensor/Medic */}
      {targetSelectionMode && (
        <div className="target-select-overlay">
          <div className="target-select-modal">
            <h3>
              {targetSelectionMode.type === 'sensor'
                ? 'Select player to reveal location'
                : 'Select player to reveal identity'
              }
            </h3>
            <div className="target-list">
              {gameState.players
                .filter(p => p.id !== clientId && p.alive && !p.escaped)
                .map(p => (
                  <button
                    key={p.id}
                    className="target-btn"
                    onClick={() => handleTargetSelect(p.id)}
                  >
                    {p.name}
                  </button>
                ))
              }
            </div>
            <button
              className="cancel-btn"
              onClick={() => setTargetSelectionMode(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Escape Card Choice Modal for Engineer */}
      {pendingEscapeChoice && (
        <div className="escape-choice-overlay">
          <div className="escape-choice-modal">
            <h3>Choose Escape Card (Engineer Power)</h3>
            <p>You drew two cards. Choose which one to use:</p>
            <div className="escape-cards">
              {pendingEscapeChoice.cards.map((card, index) => (
                <button
                  key={index}
                  className={`escape-card-btn ${card.type === 'GREEN' ? 'working' : 'damaged'}`}
                  onClick={() => onChooseEscapeCard(index)}
                >
                  <span className="card-icon">{card.type === 'GREEN' ? '✓' : '✗'}</span>
                  <span className="card-label">
                    {card.type === 'GREEN' ? 'Working' : 'Damaged'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
