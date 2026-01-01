import React, { useState, useRef } from 'react';
import './PlayerTokenBank.css';

function PlayerTokenBank({
  players,
  currentPlayerId,
  selectedGhostPlayer,
  placedGhostPlayerIds,
  onGhostSelect,
  onGhostRemove,
  isHost,
  playerGuesses = {},
  onToggleGuess
}) {
  // Long-press detection for mobile
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressDuration = 500; // 500ms hold to trigger
  // Get player display info
  const getPlayerInfo = (player) => {
    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Determine color based on host status or player guesses
    let color = '#888';
    let bgColor = 'rgba(136, 136, 136, 0.2)';

    if (isHost) {
      // Host can see actual roles
      if (player.role === 'human') {
        color = '#00d9ff';
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else {
        color = '#e94560';
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
    } else {
      // Non-host players use their own guesses
      const guess = playerGuesses[player.id] || 'none';
      if (guess === 'human') {
        color = '#00ff88';  // Green for suspected human
        bgColor = 'rgba(0, 255, 136, 0.2)';
      } else if (guess === 'alien') {
        color = '#e94560';  // Red for suspected alien
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
      // else stays gray (no guess)
    }

    // Status
    let status = 'active';
    if (!player.alive) status = 'dead';
    else if (player.escaped) status = 'escaped';

    return { initials, color, bgColor, status };
  };

  const isCurrentTurn = (playerId) => playerId === currentPlayerId;
  const isPlacedOnBoard = (playerId) => placedGhostPlayerIds.has(playerId);
  const isSelected = (playerId) => selectedGhostPlayer === playerId;

  // Mobile long-press handlers
  const handleTouchStart = (playerId) => {
    if (isHost || !onToggleGuess) return;

    setLongPressTriggered(false);
    longPressTimerRef.current = setTimeout(() => {
      setLongPressTriggered(true);
      onToggleGuess(playerId);
      // Optional: add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, longPressDuration);
  };

  const handleTouchEnd = (playerId, e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // If long-press was triggered, prevent the click event
    if (longPressTriggered) {
      e.preventDefault();
      setLongPressTriggered(false);
    } else {
      // Normal tap - select ghost token
      onGhostSelect(playerId);
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setLongPressTriggered(false);
  };

  return (
    <div className="player-token-bank">
      <div className="token-bank-label">
        <span>Players</span>
        {selectedGhostPlayer && (
          <span className="placing-hint">Click map to place token</span>
        )}
      </div>

      <div className="token-list">
        {players?.map(player => {
          const { initials, color, bgColor, status } = getPlayerInfo(player);
          const isCurrent = isCurrentTurn(player.id);
          const isPlaced = isPlacedOnBoard(player.id);
          const isSelectedToken = isSelected(player.id);

          return (
            <div
              key={player.id}
              className={`player-token-wrapper ${isCurrent ? 'current-turn' : ''} ${status}`}
            >
              {/* Main token */}
              <button
                className={`player-token ${isSelectedToken ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
                style={{
                  borderColor: color,
                  backgroundColor: bgColor,
                  color: color
                }}
                onClick={() => {
                  // Only trigger if not a long-press
                  if (!longPressTriggered) {
                    onGhostSelect(player.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isHost && onToggleGuess) {
                    onToggleGuess(player.id);
                  }
                }}
                onTouchStart={() => handleTouchStart(player.id)}
                onTouchEnd={(e) => handleTouchEnd(player.id, e)}
                onTouchCancel={handleTouchCancel}
                title={`${player.name}${isCurrent ? ' (Current Turn)' : ''}${!isHost ? ' | Right-click or long-press to mark guess' : ''}`}
              >
                <span className="token-initials">{initials}</span>
                {isCurrent && <span className="turn-indicator-dot" />}
              </button>

              {/* Player name */}
              <span className="player-name" style={{ color }}>
                {player.name}
              </span>

              {/* Status badges */}
              <div className="status-badges">
                {status === 'dead' && <span className="badge dead">DEAD</span>}
                {status === 'escaped' && <span className="badge escaped">ESCAPED</span>}
                {isPlaced && status === 'active' && (
                  <button
                    className="badge placed"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGhostRemove(player.id);
                    }}
                    title="Remove from map"
                  >
                    ON MAP ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && (
        <div className="host-indicator">
          <span className="host-badge">SPECTATOR VIEW</span>
          <span className="host-hint">All positions visible</span>
        </div>
      )}
    </div>
  );
}

export default PlayerTokenBank;
