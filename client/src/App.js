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
        id: lastMessage.playerId,
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
    send({ type: 'CREATE_ROOM' });
  }, [isConnected, send]);

  const handleJoinRoom = useCallback((name, code) => {
    if (!isConnected) return;
    setPlayerState(prev => ({ ...prev, name }));
    send({ type: 'JOIN_ROOM', name, roomCode: code });
  }, [isConnected, send]);

  const handleStartGame = useCallback((mapData) => {
    send({ type: 'START_GAME', mapData });
  }, [send]);

  const handleKickPlayer = useCallback((playerId) => {
    send({ type: 'KICK_PLAYER', playerId });
  }, [send]);

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

  const handleMoveAndAttack = useCallback((sector) => {
    send({ type: 'MOVE_AND_ATTACK', sector });
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
          currentPlayerId={playerState.id}
          roomCode={playerState.roomCode}
          connected={isConnected}
        />
      )}

      {/* Game */}
      {showGame && (
        <div className="game-container">
          <GameBoard
            gameState={gameState}
            clientId={playerState.id}
            isHost={playerState.isHost}
            onMove={handleMovePlayer}
            onMoveAndAttack={handleMoveAndAttack}
            onDeclareNoise={handleDeclareNoise}
            onUseItem={handleUseItem}
            onAttack={handleAttack}
            onUseEscapeHatch={handleUseEscapeHatch}
            onEndTurn={handleEndTurn}
            onPrimeAttack={handlePrimeAttack}
            drawnCard={drawnCard}
            onCardDismiss={handleCardDismiss}
          />
        </div>
      )}


    </div>
  );
}

export default App;
