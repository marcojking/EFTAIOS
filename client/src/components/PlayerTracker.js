import React, { useState, useMemo, useCallback } from 'react';
import { useTokenDrag } from '../hooks/useTokenDrag';
import './PlayerTracker.css';

// Abbreviation key for announcements
const ABBREVIATIONS = {
  'N': 'Noise in sector',
  '—': 'Silence in all sectors',
  'S': 'Silent move (safe sector)',
  'A': 'Attack in sector',
  'E': 'Escaped via',
  'EF': 'Escape failed',
  'D': 'Died',
  'SP': 'Spotlight on',
  'SN': 'Sensor revealed',
  'DEF': 'Defense used',
  'CLN': 'Clone used',
  'MUT': 'Mutated to Alien',
  'CAT': 'Cat (2 noises)'
};

// Individual player token in table header
function PlayerHeaderToken({
  player,
  isCurrent,
  isPlaced,
  isHost,
  onGhostSelect,
  onToggleGuess,
  playerGuesses,
  selectedGhostPlayer
}) {
  // Get player display info
  const getPlayerInfo = () => {
    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    let color = '#888';
    let bgColor = 'rgba(136, 136, 136, 0.2)';

    if (isHost) {
      if (player.role === 'human') {
        color = '#00d9ff';
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else {
        color = '#e94560';
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
    } else {
      const guess = playerGuesses[player.id] || 'none';
      if (guess === 'human') {
        color = '#00d9ff';
        bgColor = 'rgba(0, 217, 255, 0.2)';
      } else if (guess === 'alien') {
        color = '#e94560';
        bgColor = 'rgba(233, 69, 96, 0.2)';
      }
    }

    let status = 'active';
    if (!player.alive) status = 'dead';
    else if (player.escaped) status = 'escaped';

    return { initials, color, bgColor, status };
  };

  const { initials, color, bgColor, status } = getPlayerInfo();

  // New hook API: tap = select for placement, right-click/hold = toggle guess
  const { handlers } = useTokenDrag({
    playerId: player.id,
    holdDuration: 500,
    onSelect: (pid) => {
      // Click selects the token for placement on the map
      onGhostSelect(pid);
    },
    onToggleGuess: (pid) => {
      // Right-click or long-press toggles the guess color
      if (!isHost) {
        onToggleGuess(pid);
      }
    }
  });

  const isSelected = selectedGhostPlayer === player.id;

  return (
    <div className={`header-token-wrapper ${isCurrent ? 'current-turn' : ''} ${status} ${isSelected ? 'selected' : ''}`}>
      <div
        className={`header-token ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`}
        style={{
          borderColor: isSelected ? '#ffa502' : color,
          backgroundColor: isSelected ? 'rgba(255, 165, 2, 0.3)' : bgColor,
          color: isSelected ? '#ffa502' : color,
          cursor: 'pointer'
        }}
        {...handlers}
        title={`${player.name}${isCurrent ? ' (Current Turn)' : ''} | Click to select, Right-click to change guess`}
      >
        <span className="token-initials">{initials}</span>
        {isCurrent && <span className="turn-indicator-dot" />}
      </div>
      <span className="player-name-small" style={{ color: isSelected ? '#ffa502' : color }}>{player.name}</span>
      <div className="status-icons">
        {!player.alive && <span className="status-icon dead" title="Killed">☠️</span>}
        {player.escaped && <span className="status-icon escaped" title="Escaped">🚀</span>}
        {isPlaced && status === 'active' && <span className="status-icon placed" title="On Map">📍</span>}
      </div>
    </div>
  );
}

function PlayerTracker({
  announcements,
  players,
  currentTurn,
  maxTurns,
  firstPlayerId,
  // Token bank props
  currentPlayerId,
  selectedGhostPlayer,
  placedGhostPlayerIds = new Set(),
  onGhostSelect,
  onToggleGuess,
  isHost,
  playerGuesses = {}
}) {
  const [showKey, setShowKey] = useState(false);

  // Reorder players putting first player on left
  const orderedPlayers = useMemo(() => {
    if (!players || !firstPlayerId) return players;
    const firstPlayerIndex = players.findIndex(p => p.id === firstPlayerId);
    if (firstPlayerIndex === -1) return players;
    return [
      ...players.slice(firstPlayerIndex),
      ...players.slice(0, firstPlayerIndex)
    ];
  }, [players, firstPlayerId]);

  // Build the tracker data: rows = turns, columns = players
  const trackerData = useMemo(() => {
    const data = [];

    // Create rows for each turn (1 to currentTurn)
    for (let turn = 1; turn <= Math.max(currentTurn, 1); turn++) {
      // 1. STANDARD TURN ROW
      const turnRow = {
        key: `turn-${turn}`,
        label: turn,
        players: {},
        isTurnRow: true
      };

      // Initialize all players with empty
      orderedPlayers?.forEach(player => {
        turnRow.players[player.id] = { text: '—', full: 'No action yet' };
      });

      // Find announcements for this turn
      const turnAnnouncements = announcements?.filter(a => a.turn === turn) || [];

      // Process announcements for the standard row
      turnAnnouncements.forEach(announcement => {
        const playerId = announcement.playerId;
        // Skip if special event that gets its own row
        if (['MUTATION', 'ELIMINATED', 'REVEAL_IDENTITY', 'GAME_END'].includes(announcement.type)) return;

        if (!playerId || !turnRow.players[playerId]) return;

        const entry = formatAnnouncement(announcement);
        if (entry) {
          turnRow.players[playerId] = entry;
        }
      });

      data.push(turnRow);

      // 2. SPECIAL EVENT ROWS
      // Filter for special events in this turn
      const specialEvents = turnAnnouncements.filter(a =>
        ['MUTATION', 'ELIMINATED', 'REVEAL_IDENTITY'].includes(a.type)
      );

      // Group/Sort if necessary, but for now just one row per event to be safe and clear
      specialEvents.forEach((event, index) => {
        let label = '';
        let rowClass = 'special-row';
        let cellText = '';
        let cellFull = '';

        if (event.type === 'MUTATION') {
          label = '🧬';
          cellText = 'MUTATED';
          cellFull = event.message || 'Player mutated into an Alien';
          rowClass += ' mutation-row';
        } else if (event.type === 'ELIMINATED') {
          label = '☠️';
          cellText = 'DIED';
          cellFull = event.message || 'Player was eliminated';
          rowClass += ' death-row';
        } else if (event.type === 'REVEAL_IDENTITY') {
          label = '👁️';
          cellText = 'REVEALED';
          cellFull = event.message || 'Identity revealed';
          rowClass += ' reveal-row';
        }

        const specialRow = {
          key: `special-${turn}-${index}`,
          label: label,
          players: {},
          isSpecial: true,
          className: rowClass
        };

        // Initialize empty cells
        orderedPlayers?.forEach(player => {
          specialRow.players[player.id] = { text: '', full: '' };
        });

        // Fill in the affected player(s)
        if (event.playerId && specialRow.players[event.playerId]) {
          specialRow.players[event.playerId] = {
            text: cellText,
            full: cellFull,
            type: 'special-event'
          };
        }

        // Use targetId for REVEAL_IDENTITY if applicable
        if (event.targetId && specialRow.players[event.targetId]) {
          // If the event is about a target, maybe show it on the target's column?
          // The prompt says "row should be added... for that action".
          // For Reveal, the Medic did it actions the Target.
          // Let's put it on the Target's column as they are the one revealing? 
          // Or the Medic's?
          // The event log says "Player X revealed Player Y".
          // Let's put it on the *Target* column because that's the interesting part for the tracker (knowing who they are).
          // But wait, the Medic used the power.
          // Let's put it on BOTH if possible? Or just the Target.
          // The code above puts it on `event.playerId` (Medical).
          // Let's OVERRIDE for Reveal to put on Target.
        }

        if (event.type === 'REVEAL_IDENTITY' && event.targetId) {
          specialRow.players[event.targetId] = {
            text: `IS ${event.targetRole?.substr(0, 1) || '?'}`,
            full: `${event.targetName} revealed as ${event.targetRole}`,
            type: 'special-info'
          };
        }

        data.push(specialRow);
      });
    }

    return data;
  }, [announcements, orderedPlayers, currentTurn]);

  // Format announcement to abbreviated form
  function formatAnnouncement(announcement) {
    switch (announcement.type) {
      case 'NOISE':
        return {
          text: `N: ${announcement.sector}`,
          full: `Noise in ${announcement.sector}`,
          type: 'noise'
        };

      case 'SILENCE':
        return {
          text: '—',
          full: 'Silence in all sectors',
          type: 'silence-all'
        };

      case 'ATTACK':
        const victims = announcement.victims?.length || 0;
        return {
          text: `A: ${announcement.sector}${victims > 0 ? ` (${victims})` : ''}`,
          full: `Attack in ${announcement.sector}${victims > 0 ? ` - ${victims} killed` : ' - missed'}`,
          type: victims > 0 ? 'attack-hit' : 'attack-miss'
        };

      case 'ESCAPE':
        return {
          text: `E: ${announcement.sector}`,
          full: `Escaped via ${announcement.sector}`,
          type: 'escape'
        };

      case 'ESCAPE_FAILED':
        return {
          text: `EF: ${announcement.sector}`,
          full: `Escape failed at ${announcement.sector} (damaged)`,
          type: 'escape-failed'
        };

      case 'ELIMINATED':
        return {
          text: 'D',
          full: 'Eliminated',
          type: 'death'
        };

      case 'SPOTLIGHT':
        const revealed = announcement.revealed?.length || 0;
        return {
          text: `SP: ${announcement.sector} (${revealed})`,
          full: `Spotlight on ${announcement.sector} - ${revealed} found`,
          type: 'spotlight'
        };

      case 'SENSOR':
        return {
          text: `SN: ${announcement.targetSector}`,
          full: `Sensor revealed player at ${announcement.targetSector}`,
          type: 'sensor'
        };

      case 'DEFENSE_USED':
        return {
          text: 'DEF',
          full: 'Defense card used - survived attack',
          type: 'defense'
        };

      case 'CLONE_USED':
        return {
          text: 'CLN',
          full: 'Clone card used - respawned at Human Sector',
          type: 'clone'
        };

      case 'MUTATION':
        return {
          text: 'MUT',
          full: 'Mutated into an Alien!',
          type: 'mutation'
        };

      case 'CAT':
        return {
          text: `CAT: ${announcement.sectors?.join(', ')}`,
          full: `Cat - Noise in ${announcement.sectors?.join(' and ')}`,
          type: 'cat'
        };

      case 'SILENT_MOVE':
        return {
          text: 'S',
          full: 'Moved to a safe sector (no card drawn)',
          type: 'silence'
        };

      case 'SILENT_SECTOR':
        return {
          text: 'S',
          full: 'Silent Sector (Sedatives used)',
          type: 'silence'
        };

      default:
        return null;
    }
  }

  // Get player initials
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  };

  return (
    <div className="player-tracker">
      <div className="tracker-header">
        <h3>Player Tracker</h3>
        <div className="tracker-controls">
          <button
            className={`key-toggle ${showKey ? 'active' : ''}`}
            onClick={() => setShowKey(!showKey)}
          >
            Key
          </button>
        </div>
      </div>

      {showKey && (
        <div className="abbreviation-key">
          <h4>Abbreviation Key</h4>
          <div className="key-grid">
            {Object.entries(ABBREVIATIONS).map(([abbr, meaning]) => (
              <div key={abbr} className="key-item">
                <span className="key-abbr">{abbr}</span>
                <span className="key-meaning">{meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tracker-table-container">
        <table className="tracker-table">
          <thead>
            <tr>
              <th className="turn-col">Turn</th>
              {orderedPlayers?.map(player => (
                <th key={player.id} className="player-col">
                  <PlayerHeaderToken
                    player={player}
                    isCurrent={player.id === currentPlayerId}
                    isPlaced={placedGhostPlayerIds.has(player.id)}
                    isHost={isHost}
                    onGhostSelect={onGhostSelect || (() => { })}
                    onToggleGuess={onToggleGuess || (() => { })}
                    playerGuesses={playerGuesses}
                    selectedGhostPlayer={selectedGhostPlayer}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trackerData.map(row => (
              <tr key={row.key} className={row.label === currentTurn && row.isTurnRow ? 'current-turn' : (row.className || '')}>
                <td className={`turn-cell ${row.isSpecial ? 'special-turn-cell' : ''}`}>{row.label}</td>
                {orderedPlayers?.map(player => {
                  const cell = row.players[player.id];
                  return (
                    <td
                      key={player.id}
                      className={`action-cell ${cell?.type || ''}`}
                      title={cell?.full || ''}
                    >
                      {cell?.text || (row.isSpecial ? '' : '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Empty rows for future turns */}
            {Array.from({ length: Math.min(5, maxTurns - currentTurn) }, (_, i) => (
              <tr key={`future-${i}`} className="future-turn">
                <td className="turn-cell">{currentTurn + i + 1}</td>
                {orderedPlayers?.map(player => (
                  <td key={player.id} className="action-cell empty">—</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tracker-footer">
        <span>Turn {currentTurn} / {maxTurns}</span>
        <span className="tracker-hint">Hover cells for details</span>
      </div>
    </div>
  );
}

export default PlayerTracker;
