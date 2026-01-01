import React, { useState, useEffect, useCallback } from 'react';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import useWebSocket from './hooks/useWebSocket';
import './App.css';

function App() {
  const [screen, setScreen] = useState('join'); // join, lobby, game
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [serverAddress, setServerAddress] = useState('');
  const [lanAddress, setLanAddress] = useState('');
  const [pendingSecondNoise, setPendingSecondNoise] = useState(null);
  const [pendingEscapeChoice, setPendingEscapeChoice] = useState(null);

  const [drawnCard, setDrawnCard] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    connected,
    send,
    lastMessage,
    connect,
    error: wsError
  } = useWebSocket();

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      if (wsError === 'Connection failed') {
        alert('Could not connect to server. Check IP address and Firewalls.');
      } else {
        console.error('WebSocket Error:', wsError);
      }
      setIsConnecting(false);
    }
  }, [wsError]);

  // Handle successful connection
  useEffect(() => {
    if (connected && isConnecting) {
      // We are connected now, sending join request is handled in handleJoin queueing
      // But we can stop the spinner if we want, or wait for 'JOINED' message
      // Note: We wait for JOINED message to switch screens, but we can stop specific button loading if needed
    }
  }, [connected, isConnecting]);

  // Handle incoming messages
  useEffect(() => {
    // If we receive a message, we are definitely connected and communicating
    if (isConnecting && lastMessage) {
      // Reset connecting state if we get valid response that changes screen
      if (lastMessage.type === 'JOINED' || lastMessage.type === 'ERROR') {
        setIsConnecting(false);
      }
    }

    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'JOINED':
        setClientId(lastMessage.clientId);
        if (lastMessage.lanAddress) {
          setLanAddress(lastMessage.lanAddress);
        }
        setScreen('lobby');
        break;

      case 'GAME_STARTED':
      case 'STATE_UPDATE':
        setGameState(lastMessage.state);
        if (lastMessage.type === 'GAME_STARTED') {
          setScreen('game');
        }
        break;

      case 'CARD_DRAWN':
        setDrawnCard({
          card: lastMessage.card,
          itemCard: lastMessage.itemCard
        });
        break;

      case 'SECOND_NOISE_REQUIRED':
      case 'CAT_SECOND_NOISE_REQUIRED':
        setPendingSecondNoise({
          firstSector: lastMessage.firstSector,
          type: lastMessage.type === 'CAT_SECOND_NOISE_REQUIRED' ? 'cat' : 'pilot'
        });
        break;

      case 'ESCAPE_CHOICE_REQUIRED':
        setPendingEscapeChoice({
          cards: lastMessage.escapeCards,
          sector: lastMessage.sector
        });
        break;

      case 'ERROR':
        alert(lastMessage.message);
        break;

      default:
        console.log('Unhandled message:', lastMessage);
    }
  }, [lastMessage]);

  const handleJoin = useCallback((name, host) => {
    setPlayerName(name);
    setIsHost(host);
    setIsConnecting(true);

    // Queue the join message first (will be sent when connected)
    send({
      type: 'JOIN_LOBBY',
      name: name,
      isHost: host
    });

    // Connect to WebSocket
    // If address doesn't include protocol, add it. Support both dev (ws) and prod (wss)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If raw IP/Localhost, use standard port logic. If Prod URL, use derived protocol.
    const cleanAddress = address.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    const wsUrl = `${protocol}//${cleanAddress}`;

    connect(wsUrl);

    // Safety timeout in case connection hangs
    setTimeout(() => {
      setIsConnecting(curr => {
        if (curr) {
          alert('Connection timed out. Check IP address and make sure devices are on the same WiFi.');
          return false; // Stop loading
        }
        return curr;
      });
    }, 5000); // 5 second timeout
  }, [connect, send]);

  const handleStartGame = useCallback((mapData) => {
    send({
      type: 'CREATE_GAME',
      mapData: mapData
    });

    setTimeout(() => {
      send({ type: 'START_GAME' });
    }, 100);
  }, [send]);

  const handleMove = useCallback((sector) => {
    send({
      type: 'MOVE',
      sector: sector
    });
  }, [send]);

  const handleAttack = useCallback((sector, usePower = false) => {
    send({
      type: 'ATTACK',
      sector: sector,
      usePower: usePower
    });
  }, [send]);

  const handleAttackInPlace = useCallback(() => {
    send({ type: 'ATTACK_IN_PLACE' });
  }, [send]);

  const handleMoveAndAttack = useCallback((sector, usePower = false) => {
    send({
      type: 'MOVE_AND_ATTACK',
      sector: sector,
      usePower: usePower
    });
  }, [send]);

  const handleDeclareNoise = useCallback((sector, isSilence, useDoublePower = false) => {
    send({
      type: 'DECLARE_NOISE',
      sector: sector,
      isSilence: isSilence,
      useDoublePower: useDoublePower
    });
  }, [send]);

  const handleDeclareSecondNoise = useCallback((sector) => {
    send({
      type: 'DECLARE_SECOND_NOISE',
      sector: sector
    });
    setPendingSecondNoise(null);
  }, [send]);

  const handleUseItem = useCallback((itemId, itemType, target) => {
    send({
      type: 'USE_ITEM',
      itemId: itemId,
      itemType: itemType,
      target: target
    });
  }, [send]);

  const handleUsePower = useCallback((power, targetPlayerId = null) => {
    send({
      type: 'USE_POWER',
      power: power,
      targetPlayerId: targetPlayerId
    });
  }, [send]);

  const handleChooseEscapeCard = useCallback((cardIndex) => {
    send({
      type: 'CHOOSE_ESCAPE_CARD',
      cardIndex: cardIndex
    });
    setPendingEscapeChoice(null);
  }, [send]);

  const handleCardDismiss = useCallback(() => {
    setDrawnCard(null);
  }, []);

  // Render based on current screen
  if (screen === 'join') {
    return <JoinScreen onJoin={handleJoin} isConnecting={isConnecting} />;
  }

  if (screen === 'lobby') {
    return (
      <Lobby
        connected={connected}
        isHost={isHost}
        playerName={playerName}
        serverAddress={serverAddress}
        lanAddress={lanAddress}
        lastMessage={lastMessage}
        onStartGame={handleStartGame}
      />
    );
  }

  if (screen === 'game' && gameState) {
    return (
      <GameBoard
        gameState={gameState}
        clientId={clientId}
        isHost={isHost}
        onMove={handleMove}
        onAttack={handleAttack}
        onAttackInPlace={handleAttackInPlace}
        onMoveAndAttack={handleMoveAndAttack}
        onDeclareNoise={handleDeclareNoise}
        onDeclareSecondNoise={handleDeclareSecondNoise}
        onUseItem={handleUseItem}
        onUsePower={handleUsePower}
        onChooseEscapeCard={handleChooseEscapeCard}
        onCardDismiss={handleCardDismiss}
        pendingSecondNoise={pendingSecondNoise}
        pendingEscapeChoice={pendingEscapeChoice}
        drawnCard={drawnCard}
      />
    );
  }

  return <div className="loading">Loading...</div>;
}

// Join Screen Component
function JoinScreen({ onJoin, isConnecting }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState(null); // null, 'player', 'host'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim(), mode === 'host');
    }
  };

  return (
    <div className="join-screen">
      <div className="join-container">
        <h1 className="game-title">
          <span className="title-escape">ESCAPE</span>
          <span className="title-from">FROM THE</span>
          <span className="title-aliens">ALIENS</span>
          <span className="title-space">IN OUTER SPACE</span>
        </h1>

        {!mode ? (
          <div className="mode-selection">
            <button
              className="mode-btn host-btn"
              onClick={() => setMode('host')}
            >
              <span className="mode-icon">📺</span>
              <span className="mode-label">Host / Spectator</span>
              <span className="mode-desc">Show all positions on main screen</span>
            </button>
            <button
              className="mode-btn player-btn"
              onClick={() => setMode('player')}
            >
              <span className="mode-icon">🎮</span>
              <span className="mode-label">Player</span>
              <span className="mode-desc">Join from phone or computer</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="join-form">

            <div className="form-group">
              <label>{mode === 'host' ? 'Host Name' : 'Your Name'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                disabled={isConnecting}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="back-btn" onClick={() => setMode(null)}>
                Back
              </button>
              <button type="submit" className="join-btn" disabled={!name.trim() || isConnecting}>
                {isConnecting ? (
                  <>
                    <span className="spinner"></span> Connecting...
                  </>
                ) : (
                  mode === 'host' ? 'Create Lobby' : 'Join Game'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
