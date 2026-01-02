import React, { useRef } from 'react';
import './PlayerTokenBank.css';

function PlayerToken({ player, isCurrent, isPlaced, isSelectedToken, isHost, onGhostSelect, onToggleGuess, getPlayerInfo }) {
  const { initials, color, bgColor, status } = getPlayerInfo(player);
  const holdTimer = useRef(null);
  const didHold = useRef(false);

  // Click to select for placement
  const handleClick = () => {
    if (didHold.current) {
      didHold.current = false;
      return; // Ignore click if we just did a long-press
    }
    onGhostSelect(player.id);
  };

  // Right-click or long-press to toggle guess
  const handleContextMenu = (e) => {
    e.preventDefault();
    onToggleGuess(player.id);
  };

  const handleMouseDown = () => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      onToggleGuess(player.id);
    }, 500); // 500ms hold for guess toggle
  };

  const handleMouseUp = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const handleTouchStart = () => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      onToggleGuess(player.id);
      // Vibrate on mobile if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <div className={`player-token-wrapper ${isCurrent ? 'current-turn' : ''} ${status}`}>
      {/* Main token */}
      <div
        className={`player-token ${isSelectedToken ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
        style={{
          borderColor: color,
          backgroundColor: bgColor,
          color: color,
          cursor: 'pointer'
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        title={`${player.name}${isCurrent ? ' (Current Turn)' : ''} | Click to place, Hold/Right-click to change guess`}
      >
        <span className="token-initials">{initials}</span>
        {isCurrent && <span className="turn-indicator-dot" />}
      </div>

      {/* Player name */}
      <span className="player-name" style={{ color }}>
        {player.name}
      </span>

      {/* Status badges */}
      <div className="status-badges">
        {status === 'dead' && <span className="badge dead">DEAD</span>}
        {status === 'escaped' && <span className="badge escaped">ESCAPED</span>}
        {isPlaced && status === 'active' && (
          <span className="badge placed">ON MAP</span>
        )}
      </div>
    </div>
  );
}

function PlayerTokenBank({
  players,
  currentPlayerId,
  selectedGhostPlayer,
  placedGhostPlayerIds,
  onGhostSelect,
  isHost,
  playerGuesses = {},
  onToggleGuess
}) {

  // Get player display info - UPDATED COLOR LOGIC
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
        color = '#00d9ff'; // Blue
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else {
        color = '#e94560'; // Red
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
    } else {
      // Non-host players use their own guesses
      const guess = playerGuesses[player.id] || 'none';
      if (guess === 'human') {
        color = '#00d9ff';  // BLUE for human (was green)
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else if (guess === 'alien') {
        color = '#e94560';  // RED for alien
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

  return (
    <div className="player-token-bank">
      <div className="token-bank-label">
        <span>Players</span>
        <span className="placing-hint" style={{ fontSize: '0.65rem', color: '#888', marginTop: '2px' }}>Click to Place</span>
      </div>

      <div className="token-list">
        {players?.map(player => (
          <PlayerToken
            key={player.id}
            player={player}
            isCurrent={isCurrentTurn(player.id)}
            isPlaced={isPlacedOnBoard(player.id)}
            isSelectedToken={isSelected(player.id)}
            isHost={isHost}
            onGhostSelect={onGhostSelect}
            onToggleGuess={onToggleGuess}
            getPlayerInfo={getPlayerInfo}
          />
        ))}
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

