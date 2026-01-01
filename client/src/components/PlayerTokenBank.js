import React from 'react';
import './PlayerTokenBank.css';

function PlayerTokenBank({
  players,
  currentPlayerId,
  selectedGhostPlayer,
  placedGhostPlayerIds,
  onGhostSelect,
  onGhostRemove,
  isHost
}) {
  // Get player display info
  const getPlayerInfo = (player) => {
    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Determine color
    let color = '#888';
    let bgColor = 'rgba(136, 136, 136, 0.2)';

    if (player.revealed || isHost) {
      if (player.role === 'human') {
        color = '#00d9ff';
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else {
        color = '#e94560';
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
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
                onClick={() => onGhostSelect(player.id)}
                title={`${player.name}${isCurrent ? ' (Current Turn)' : ''}`}
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
