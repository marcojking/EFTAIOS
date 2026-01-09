import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket from './hooks/useWebSocket';
import LandingScreen from './components/LandingScreen';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import GlobalPopup from './components/GlobalPopup';
import './App.css';



function App() {
  const {
    isConnected,
    isConnecting,
    lastMessage,
    gameState,
    connect,
    send,
    disconnect,
    error: wsError
  } = useWebSocket();

  // Local state for room management
  const [playerState, setPlayerState] = useState({
    id: null,
    name: '',
    roomCode: null,
    isHost: false
  });

  const [landingError, setLandingError] = useState(null);
  const [drawnCard, setDrawnCard] = useState(null);
  const [popup, setPopup] = useState(null);
  const [pendingSecondNoise, setPendingSecondNoise] = useState(null);
  const [pendingEscapeChoice, setPendingEscapeChoice] = useState(null);

  // Initialize persistent player ID
  useEffect(() => {
    let storedId = localStorage.getItem('eftaios_player_id');
    if (!storedId) {
      // Generate a simple UUID-like string if one doesn't exist
      storedId = 'player_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eftaios_player_id', storedId);
    }

    setPlayerState(prev => ({
      ...prev,
      id: storedId
    }));

    console.log('Persistent Player ID:', storedId);
  }, []);

  // Connect to server on mount
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Standardize port usage: dev=3000->3001, prod=same
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `${protocol}//${window.location.host}`
      : `${protocol}//${host}:3001`;

    connect(wsUrl);
  }, [connect]);

  // Handle server messages for Room events
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'ROOM_CREATED') {
      setPlayerState(prev => ({
        ...prev,
        roomCode: lastMessage.roomCode,
        // Don't overwrite our persistent ID with server's session ID if they differ
        // But for now, let's assume we want to enforce our ID.
        // The server might echo back an ID. 
        // We probably want to keep our local ID if possible, or adopt server's if we sent it?
        // Actually, if we send ID, server should use it. 
        // For now, let's trust the server response but ensure we don't lose our ID if key.
        isHost: true
      }));
      setLandingError(null);
    }
    else if (lastMessage.type === 'ROOM_JOINED') {
      setPlayerState(prev => ({
        ...prev,
        roomCode: lastMessage.roomCode,
        id: lastMessage.playerId,
        isHost: false
      }));
      setLandingError(null);
    }
    else if (lastMessage.type === 'TEACHING_GAME_CREATED') {
      // Teaching game created - update state to enter the game
      setPlayerState(prev => ({
        ...prev,
        roomCode: lastMessage.roomCode,
        id: lastMessage.playerId,
        isHost: true, // Player controls the teaching game
        name: 'You'
      }));
      setLandingError(null);
    }
    else if (lastMessage.type === 'ERROR') {
      setLandingError(lastMessage.message);
    }
    else if (lastMessage.type === 'CARD_DRAWN') {
      // Player drew a dangerous sector card - show the modal
      setDrawnCard({
        card: lastMessage.card,
        itemCard: lastMessage.itemCard,
        targetSector: lastMessage.targetSector
      });
    }
    else if (lastMessage.type === 'KICKED') {
      // Player was kicked from lobby - return to landing
      setPlayerState({
        id: null,
        name: '',
        roomCode: null,
        isHost: false
      });
      setLandingError('You were removed from the lobby by the host.');
    }
    else if (lastMessage.type === 'GLOBAL_POPUP') {
      setPopup({
        type: lastMessage.popupType,
        header: lastMessage.header,
        message: lastMessage.message,
        subMessage: lastMessage.subMessage
      });
    }
  }, [lastMessage]);

  // ACTIONS

  const handleCreateRoom = useCallback(() => {
    if (!isConnected) return;
    setPlayerState(prev => ({ ...prev, name: 'Host' })); // Host name defaults, can be changed later? Or just "Host"
    // Send persistent ID so server can link us
    send({ type: 'CREATE_ROOM', playerId: playerState.id });
  }, [isConnected, send, playerState.id]);

  const handleJoinRoom = useCallback((name, code) => {
    if (!isConnected) return;
    setPlayerState(prev => ({ ...prev, name }));
    send({ type: 'JOIN_ROOM', name, roomCode: code, playerId: playerState.id });
  }, [isConnected, send, playerState.id]);

  const handleStartGame = useCallback((mapData) => {
    console.log('App: handleStartGame sending START_GAME with mapData:', mapData?.title);
    send({ type: 'START_GAME', mapData });
  }, [send]);

  const handleKickPlayer = useCallback((playerId) => {
    send({ type: 'KICK_PLAYER', playerId });
  }, [send]);

  const handleSetTutorialMode = useCallback((enabled) => {
    send({ type: 'SET_TUTORIAL_MODE', enabled });
  }, [send]);

  const handleStartTeachingGame = useCallback((difficulty) => {
    // Use default map (FERMI) for teaching mode
    send({
      type: 'CREATE_TEACHING_GAME',
      difficulty,
      playerId: playerState.id,
      playerName: 'You'
    });
  }, [send, playerState.id]);

  const handleMovePlayer = useCallback((destination) => {
    send({ type: 'MOVE_PLAYER', destination });
  }, [send]);

  const handleDeclareNoise = useCallback((sector, silence = false, useDoublePower = false, useCat = false) => {
    send({
      type: 'DECLARE_NOISE',
      sector,
      silence,
      useDoublePower,
      useCat
    });
  }, [send]);

  const handleUseItem = useCallback((itemIndex, targetSector = null) => {
    send({ type: 'USE_ITEM', itemIndex, targetSector });
  }, [send]);

  const handleAttack = useCallback((sector) => {
    send({ type: 'ATTACK', sector });
  }, [send]);

  const handleMoveAndAttack = useCallback((sector, usePower = false) => {
    send({ type: 'MOVE_AND_ATTACK', sector, usePower });
  }, [send]);

  const handleAttackInPlace = useCallback(() => {
    send({ type: 'ATTACK_IN_PLACE' });
  }, [send]);

  const handleUseEscapeHatch = useCallback((cardIndex) => {
    send({ type: 'USE_ESCAPE_HATCH', cardIndex });
  }, [send]);

  const handleEndTurn = useCallback(() => {
    send({ type: 'END_TURN' });
  }, [send]);

  const handlePrimeAttack = useCallback((primed) => {
    send({ type: 'PRIME_ATTACK', primed });
  }, [send]);

  const handleUsePower = useCallback((powerId, targetPlayerId = null) => {
    send({ type: 'USE_POWER', powerId, targetPlayerId });
  }, [send]);

  const handleDeclareSecondNoise = useCallback((sector) => {
    send({ type: 'DECLARE_SECOND_NOISE', sector });
  }, [send]);

  const handleChooseEscapeCard = useCallback((cardIndex) => {
    send({ type: 'USE_ESCAPE_HATCH', cardIndex });
  }, [send]);

  const handleCardDismiss = useCallback(() => {
    setDrawnCard(null);
  }, []);

  const handlePopupClose = useCallback(() => {
    setPopup(null);
  }, []);

  // VIEW LOGIC

  // 1. Not connected or Error -> Show Connect Message (handled in LandingScreen mostly by disabling buttons)
  // 2. Connected, No Room -> Landing Screen
  // 3. Connected, Room, Lobby Phase -> Lobby
  // 4. Connected, Room, Game Phase -> GameBoard
  // 5. Host is always spectating in GameBoard, but we might want to ensure they see popups too (they will via websocket)

  const showLanding = isConnected && !playerState.roomCode;
  const showLobby = playerState.roomCode && (!gameState || gameState.phase === 'LOBBY');
  const showGame = playerState.roomCode && gameState && gameState.phase !== 'LOBBY';

  // Check if it's this player's turn (for green glow effect)
  const isMyTurn = !playerState.isHost && gameState?.currentPlayerId === playerState.id;

  return (
    <div className="App">
      {/* Global Popup Overlay */}
      {popup && (
        <GlobalPopup
          type={popup.type}
          header={popup.header}
          message={popup.message}
          subMessage={popup.subMessage}
          onClose={handlePopupClose}
        />
      )}

      {/* Pre-connection / Landing */}
      {(!isConnected || showLanding) && (
        <LandingScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartTeachingGame={handleStartTeachingGame}
          isConnecting={isConnecting}
          isConnected={isConnected}
          error={wsError || landingError}
        />
      )}

      {/* Lobby */}
      {showLobby && (
        <Lobby
          gameState={gameState}
          isHost={playerState.isHost}
          onStartGame={handleStartGame}
          onKickPlayer={handleKickPlayer}
          onSetTutorialMode={handleSetTutorialMode}
          myPlayerId={playerState.id}
          roomCode={playerState.roomCode}
          connected={isConnected}
        />
      )}

      {/* Game */}
      {showGame && (
        <div className={`game-container ${isMyTurn ? 'my-turn' : ''}`}>
          <GameBoard
            gameState={gameState}
            clientId={playerState.id}
            isHost={playerState.isHost}
            roomCode={playerState.roomCode}
            onMove={handleMovePlayer}
            onMoveAndAttack={handleMoveAndAttack}
            onAttackInPlace={handleAttackInPlace}
            onDeclareNoise={handleDeclareNoise}
            onDeclareSecondNoise={handleDeclareSecondNoise}
            onUseItem={handleUseItem}
            onUsePower={handleUsePower}
            onAttack={handleAttack}
            onChooseEscapeCard={handleChooseEscapeCard}
            onEndTurn={handleEndTurn}
            onPrimeAttack={handlePrimeAttack}
            drawnCard={drawnCard}
            onCardDismiss={handleCardDismiss}
            pendingSecondNoise={pendingSecondNoise}
            pendingEscapeChoice={pendingEscapeChoice}
          />
        </div>
      )}


    </div>
  );
}

export default App;
