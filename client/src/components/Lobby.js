import React, { useState, useEffect } from 'react';
import { GALILEI_MAP, GALATEA_MAP, FERMI_MAP } from '../data/maps';
import './Lobby.css';

function Lobby({ connected, isHost, onStartGame, roomCode, gameState }) {
  const [players, setPlayers] = useState([]);
  const [selectedMap, setSelectedMap] = useState('fermi'); // Default to Fermi (New)

  // Handle lobby updates from gameState
  useEffect(() => {
    if (gameState?.players) {
      setPlayers(gameState.players);
    }
  }, [gameState]);

  const getSelectedMapData = () => {
    switch (selectedMap) {
      case 'galatea':
        return GALATEA_MAP;
      case 'galilei':
        return GALILEI_MAP;
      case 'fermi':
        return FERMI_MAP;
      default:
        return GALATEA_MAP;
    }
  };

  const getSelectedMapInfo = () => {
    const map = getSelectedMapData();
    return {
      title: map.title,
      description: map.description,
      recommended: map.recommendedPlayers
    };
  };

  const handleStartGame = () => {
    onStartGame(getSelectedMapData());
  };

  const minPlayers = 2;
  const playerCount = players.length;
  const canStart = isHost && playerCount >= minPlayers;
  const mapInfo = getSelectedMapInfo();

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        <div className="lobby-header">
          <h1>Game Lobby</h1>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        <div className="server-info">
          <span className="label">Room Code:</span>
          <span className="value room-code">{roomCode || 'Loading...'}</span>
          <span className="label">Role:</span>
          <span className="value">{isHost ? 'Host / Spectator' : 'Player'}</span>
        </div>

        <div className="lobby-content">
          <div className="players-section">
            <h2>Players ({playerCount})</h2>
            <div className="players-list">
              {players.map((player, index) => (
                <div key={player.id} className="player-item">
                  <span className="player-number">{index + 1}</span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-status ready">Ready</span>
                </div>
              ))}
              {playerCount === 0 && (
                <div className="no-players">
                  Waiting for players to join...
                </div>
              )}
            </div>

            {/* Room Code Instructions */}
            {isHost && (
              <div className="join-instructions host-instructions">
                <h3>📱 Invite Players</h3>
                <p>Share this code with your friends:</p>
                <div className="room-code-display">
                  <code>{roomCode || '...'}</code>
                </div>
                <p className="join-note">
                  Players should click <strong>"Join Room"</strong> and enter this code.
                </p>
              </div>
            )}

            {!isHost && (
              <div className="join-instructions">
                <p>Waiting for host to start...</p>
              </div>
            )}
          </div>

          {isHost && (
            <div className="settings-section">
              <h2>Game Settings</h2>

              <div className="setting-group">
                <label>Map</label>
                <select
                  value={selectedMap}
                  onChange={(e) => setSelectedMap(e.target.value)}
                >
                  <option value="fermi">Fermi (From Image)</option>
                  <option value="galatea">Galatea</option>
                  <option value="galilei">Galilei (Classic)</option>
                </select>
              </div>

              <div className="map-preview">
                <div className="map-info">
                  <h4>{mapInfo.title}</h4>
                  <p>{mapInfo.description}</p>
                  <p className="player-rec">Recommended: {mapInfo.recommended} players</p>
                </div>
              </div>

              <button
                className="start-btn"
                onClick={handleStartGame}
                disabled={!canStart}
              >
                {playerCount < minPlayers
                  ? `Need ${minPlayers - playerCount} more player(s)`
                  : 'Start Game'
                }
              </button>
            </div>
          )}

          {!isHost && (
            <div className="waiting-section">
              <div className="waiting-icon">⏳</div>
              <p>Waiting for host to start the game...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
