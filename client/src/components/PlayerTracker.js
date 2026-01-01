import React, { useState, useMemo } from 'react';
import './PlayerTracker.css';

// Abbreviation key for announcements
const ABBREVIATIONS = {
  'N': 'Noise in sector',
  'SS': 'Silence in all sectors',
  'SM': 'Silent move (safe sector)',
  'A': 'Attack in sector',
  'E': 'Escaped via',
  'EF': 'Escape failed',
  'D': 'Died',
  'SP': 'Spotlight on',
  'SN': 'Sensor revealed',
  'DEF': 'Defense used',
  'CLN': 'Clone used',
  'MUT': 'Mutated to Alien',
  'CAT': 'Cat (2 noises)',
  '—': 'No action'
};

function PlayerTracker({ announcements, players, currentTurn, maxTurns, firstPlayerId }) {
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
      const row = { turn, players: {} };

      // Initialize all players with empty
      orderedPlayers?.forEach(player => {
        row.players[player.id] = { text: '—', full: 'No action yet' };
      });

      // Find announcements for this turn
      const turnAnnouncements = announcements?.filter(a => a.turn === turn) || [];

      turnAnnouncements.forEach(announcement => {
        const playerId = announcement.playerId;
        if (!playerId || !row.players[playerId]) return;

        const entry = formatAnnouncement(announcement);
        if (entry) {
          row.players[playerId] = entry;
        }
      });

      data.push(row);
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
          text: 'SS',
          full: 'Silence in all sectors',
          type: 'silence'
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
          text: 'SM',
          full: 'Moved to a safe sector (no card drawn)',
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
                  <div className="player-header">
                    <span className="player-initials">{getInitials(player.name)}</span>
                    <span className="player-name-small">{player.name}</span>
                    {!player.alive && <span className="status-badge dead">X</span>}
                    {player.escaped && <span className="status-badge escaped">✓</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trackerData.map(row => (
              <tr key={row.turn} className={row.turn === currentTurn ? 'current-turn' : ''}>
                <td className="turn-cell">{row.turn}</td>
                {orderedPlayers?.map(player => {
                  const cell = row.players[player.id];
                  return (
                    <td
                      key={player.id}
                      className={`action-cell ${cell?.type || ''}`}
                      title={cell?.full || ''}
                    >
                      {cell?.text || '—'}
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
