import React, { useState, useEffect } from 'react';
import { GALILEI_MAP, GALATEA_MAP, FERMI_MAP } from '../data/maps';
import './Lobby.css';

function Lobby({ connected, isHost, playerName, serverAddress, lanAddress, lastMessage, onStartGame }) {
  const [players, setPlayers] = useState([]);
  const [selectedMap, setSelectedMap] = useState('fermi'); // Default to Fermi (New)
  const [ipIndex, setIpIndex] = useState(0); // For cycling through IPs

  // Handle lobby updates
  useEffect(() => {
    if (lastMessage?.type === 'LOBBY_UPDATE') {
      setPlayers(lastMessage.players);
    }
  }, [lastMessage]);

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

  // Get the best address for players to join
  // Prefer lanAddress (from server) over what the user entered
  // Get the best address for players to join
  // Prefer lanAddress (from server) over what the user entered
  const getJoinAddress = () => {
    // If the server provided list of all IPs, allow cycling
    if (lastMessage?.allOrignals && lastMessage.allOrignals.length > 0) {
      return lastMessage.allOrignals[ipIndex % lastMessage.allOrignals.length];
    }

    if (lanAddress) {
      return lanAddress;
    }
    return serverAddress;
  };

  const minPlayers = 2;
  const playerCount = players.filter(p => !p.isHost).length;
  const canStart = isHost && playerCount >= minPlayers;
  const mapInfo = getSelectedMapInfo();
  const joinAddress = getJoinAddress();

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
          <span className="label">Server:</span>
          <span className="value">{serverAddress}</span>
          <span className="label">You:</span>
          <span className="value">{playerName} {isHost && '(Host)'}</span>
        </div>

        <div className="lobby-content">
          <div className="players-section">
            <h2>Players ({playerCount})</h2>
            <div className="players-list">
              {players.filter(p => !p.isHost).map((player, index) => (
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

            {/* Enhanced Join Instructions - More prominent for host */}
            {isHost && (
              <div className="join-instructions host-instructions">
                <h3>📱 How Players Join</h3>
                <div className="join-steps">
                  <div className="join-step">
                    <span className="step-number">1</span>
                    <span className="step-text">Players open a browser on their phone/computer</span>
                  </div>
                  <div className="join-step">
                    <span className="step-number">2</span>
                    <span className="step-text">Type this URL in the browser:</span>
                  </div>
                </div>
                <div className="join-url-box">
                  <code className="join-url">{`http://${joinAddress.split(':')[0]}:3000`}</code>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(`http://${joinAddress.split(':')[0]}:3000`)}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <div className="join-steps" style={{ marginTop: '1rem' }}>
                  <div className="join-step">
                    <span className="step-number">3</span>
                    <span className="step-text">Select "Player" and enter this server address:</span>
                  </div>
                </div>
                <div className="join-url-box">
                  <code className="join-url">{joinAddress}</code>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(joinAddress)}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <p className="join-note">
                  💡 Make sure all players are on the <strong>same WiFi network</strong>
                </p>
                {lastMessage?.allOrignals && lastMessage.allOrignals.length > 1 && (
                  <div className="ip-cycle-controls" style={{ marginTop: '15px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>Having trouble connecting?</p>
                    <button
                      className="cycle-ip-btn"
                      onClick={() => setIpIndex(prev => prev + 1)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Try Alternate IP ({ipIndex % lastMessage.allOrignals.length + 1}/{lastMessage.allOrignals.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isHost && (
              <div className="join-instructions">
                <h3>How to Join</h3>
                <p>Other players can connect to:</p>
                <code>{serverAddress}</code>
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
