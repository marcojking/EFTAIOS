import React from 'react';
import { useTokenDrag } from '../hooks/useTokenDrag';
import './PlayerTokenBank.css';

function PlayerToken({ player, isCurrent, isPlaced, isSelectedToken, isHost, onGhostSelect, onToggleGuess, getPlayerInfo, dragState, onDragStart }) {
  const { initials, color, bgColor, status } = getPlayerInfo(player);

  // Custom Hook for Drag & Tap
  const { handlers } = useTokenDrag({
    playerId: player.id,
    holdDuration: 300,
    onDragStart: (pid, startPos) => {
      // Trigger global drag start
      onDragStart({
        playerId: pid,
        color: color,
        initials: initials,
        originSector: null, // From Bank
        startPos: startPos
      });
    },
    onTap: (pid) => {
      // Tap -> Toggle Guess (or Select if host/no guess logic)
      if (isHost) {
        onGhostSelect(pid);
      } else {
        onToggleGuess(pid);
      }
    }
  });

  // If this token is currently being dragged, hide it (opacity 0 OR dim it)
  const isDraggingMe = dragState?.playerId === player.id;

  return (
    <div className={`player-token-wrapper ${isCurrent ? 'current-turn' : ''} ${status}`}>
      {/* Main token */}
      <div
        className={`player-token ${isSelectedToken ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
        style={{
          borderColor: color,
          backgroundColor: bgColor,
          color: color,
          opacity: isDraggingMe ? 0.2 : 1, // Dim when dragging
          cursor: isPlaced ? 'default' : 'grab'
        }}
        {...handlers} // Attach Mouse/Touch handlers
        title={`${player.name}${isCurrent ? ' (Current Turn)' : ''}${!isHost ? ' | Tap to change guess, Hold to drag' : ''}`}
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
  onToggleGuess,
  dragState,
  onDragStart
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
        <span className="placing-hint" style={{ fontSize: '0.65rem', color: '#888', marginTop: '2px' }}>Hold to Drag</span>
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
            dragState={dragState}
            onDragStart={onDragStart}
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

