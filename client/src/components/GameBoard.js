import React, { useState, useMemo, useCallback } from 'react';
import HexGrid from './HexGrid';
import GameLog from './GameLog';
import PlayerHUD from './PlayerHUD';
import CardModal from './CardModal';
import PlayerTracker from './PlayerTracker';
import LogToast from './LogToast';
import TimelineControls from './TimelineControls';
import { getReachableSectors } from '../utils/mapUtils';
import './GameBoard.css';

function GameBoard({
  gameState,
  clientId,
  isHost,
  roomCode,
  onMove,
  onAttack,
  onAttackInPlace,
  onMoveAndAttack,
  onDeclareNoise,
  onDeclareSecondNoise,
  onUseItem,
  onUsePower,
  onChooseEscapeCard,
  onCardDismiss,
  pendingSecondNoise,
  pendingEscapeChoice,
  drawnCard
}) {
  const [ghostTokens, setGhostTokens] = useState({});
  const [selectedGhostPlayer, setSelectedGhostPlayer] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [noiseDeclarationSector, setNoiseDeclarationSector] = useState(null);
  const [showTracker, setShowTracker] = useState(true);  // Default OPEN
  const [showLog, setShowLog] = useState(false);  // Game log hidden by default
  const [targetSelectionMode, setTargetSelectionMode] = useState(null); // { type: 'sensor'|'medic', itemId? }
  const [attackPrimed, setAttackPrimed] = useState(false); // Prime attack before moving
  const [attackPrimedWithPower, setAttackPrimedWithPower] = useState(false); // Track if primed using Soldier's free_attack
  const [playerGuesses, setPlayerGuesses] = useState({}); // Track player team guesses: { [playerId]: 'none' | 'human' | 'alien' }
  const [trackerWidth, setTrackerWidth] = useState(350); // Default width in px
  const [isResizing, setIsResizing] = useState(false);
  const [pulsingSectors, setPulsingSectors] = useState(new Map()); // Map<sector, { type: 'noise'|'attack', kill: boolean, ttl: number }>
  const lastProcessedAnnouncementCount = React.useRef(0);

  // Timeline state for spectator mode
  const [viewingTurn, setViewingTurn] = useState(null); // null = live view, number = historical turn

  // Watch for new announcements to trigger visual effects (pulse)
  React.useEffect(() => {
    if (!gameState?.announcements) return;

    const totalAnnouncements = gameState.announcements.length;
    // Process only new announcements we haven't seen yet
    const newAnnouncements = gameState.announcements.slice(lastProcessedAnnouncementCount.current);

    if (newAnnouncements.length === 0) return;

    // We allow a small grace period for "freshness" (e.g. 10s) to show visuals on refresh if they JUST happened
    const cutoff = Date.now() - 10000;

    newAnnouncements.forEach(ann => {
      // Update our count so we don't process this again
      lastProcessedAnnouncementCount.current += 1;

      // Skip if too old (e.g. on page load, we don't want to replay all history)
      if (ann.timestamp < cutoff) return;

      if (ann.type === 'NOISE' || ann.type === 'NOISE_ECHO' || ann.type === 'CAT') {
        let sectorsToPulse = [];
        if (ann.sector) sectorsToPulse.push(ann.sector);
        if (ann.sectors) sectorsToPulse.push(...ann.sectors);

        if (sectorsToPulse.length > 0) {
          setPulsingSectors(prev => {
            const next = new Map(prev);
            // Ensure compatibility
            if (prev instanceof Set) prev.forEach(s => next.set(s, { type: 'noise', kill: false, ttl: 2 }));

            sectorsToPulse.forEach(s => next.set(s, { type: 'noise', kill: false, ttl: 2 }));
            return next;
          });
        }
      } else if (ann.type === 'ATTACK') {
        if (ann.sector) {
          const kill = ann.victims && ann.victims.length > 0;
          setPulsingSectors(prev => {
            const next = new Map(prev);
            if (prev instanceof Set) prev.forEach(s => next.set(s, { type: 'noise', kill: false, ttl: 2 }));

            next.set(ann.sector, { type: 'attack', kill: kill, ttl: 2 });
            return next;
          });
        }
      }
    });

    // Safety sync
    lastProcessedAnnouncementCount.current = totalAnnouncements;
  }, [gameState?.announcements]);

  // Decrement TTL (Time To Live) for pulsing sectors when turn changes
  React.useEffect(() => {
    setPulsingSectors(prev => {
      const next = new Map();
      // Handle Set compatibility case (clearing it out effectively)
      if (prev instanceof Set) return next;

      prev.forEach((value, key) => {
        // Decrement TTL
        const newTTL = value.ttl - 1;
        if (newTTL > 0) {
          next.set(key, { ...value, ttl: newTTL });
        }
      });
      return next;
    });
  }, [gameState?.currentPlayerId]);

  // Host is never "playing" - they're spectating
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      // Calculate new width based on window width minus mouse position
      const newWidth = window.innerWidth - e.clientX;
      // Clamp width (min 250px, max 50% of screen)
      if (newWidth > 250 && newWidth < window.innerWidth * 0.5) {
        setTrackerWidth(newWidth);
      }
    }
  }, [isResizing]);

  // Add global event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const myPlayer = gameState?.myPlayer;
  // Host is never "playing" - they're spectating
  const isMyTurn = !isHost && gameState?.currentPlayerId === clientId;
  const currentTurnPlayer = gameState?.players?.find(p => p.id === gameState.currentPlayerId);

  // Derive pending states from gameState.pendingAction (from server)
  const serverPendingSecondNoise = useMemo(() => {
    const action = gameState?.pendingAction;
    if (action?.type === 'SECOND_NOISE' || action?.type === 'CAT_NOISE') {
      return { firstSector: action.firstSector };
    }
    return pendingSecondNoise || null;
  }, [gameState?.pendingAction, pendingSecondNoise]);

  const serverPendingEscapeChoice = useMemo(() => {
    const action = gameState?.pendingAction;
    if (action?.type === 'ESCAPE_CHOICE' && action?.cards) {
      return { cards: action.cards };
    }
    return pendingEscapeChoice || null;
  }, [gameState?.pendingAction, pendingEscapeChoice]);

  // Calculate reachable sectors for movement
  const reachableSectors = useMemo(() => {
    if (!myPlayer || !isMyTurn || !gameState?.map || !myPlayer.alive || myPlayer.escaped) return [];

    // Determine max movement distance based on role
    // Aliens can move 1-2 sectors, humans move 1
    const maxDistance = myPlayer.role === 'alien' ? 2 : 1;

    return getReachableSectors(gameState.map, myPlayer.position, maxDistance, myPlayer.role);
  }, [myPlayer, isMyTurn, gameState]);

  // Handle hex click
  const handleHexClick = useCallback((sector) => {
    // If selecting sector for ghost token placement
    if (selectedGhostPlayer) {
      // Check if clicking on a valid hex (any hex is valid for placement)
      const hexExists = gameState.map?.grid?.some(h => h.label === sector);

      if (!hexExists) {
        // Clicked outside valid hexes - deselect and remove token from map
        setGhostTokens(prev => {
          const newTokens = { ...prev };
          Object.keys(newTokens).forEach(key => {
            newTokens[key] = newTokens[key].filter(id => id !== selectedGhostPlayer);
            if (newTokens[key].length === 0) delete newTokens[key];
          });
          return newTokens;
        });
        setSelectedGhostPlayer(null);
        return;
      }

      // Place token on the clicked hex
      setGhostTokens(prev => {
        const newTokens = { ...prev };

        // Remove this player's ghost from any other sector
        Object.keys(newTokens).forEach(key => {
          newTokens[key] = newTokens[key].filter(id => id !== selectedGhostPlayer);
          if (newTokens[key].length === 0) {
            delete newTokens[key];
          }
        });

        // Add to new sector
        if (!newTokens[sector]) {
          newTokens[sector] = [];
        }
        newTokens[sector].push(selectedGhostPlayer);

        return newTokens;
      });
      setSelectedGhostPlayer(null);
      return;
    }

    // If selecting target for item (like Spotlight)
    if (selectedItem) {
      onUseItem(selectedItem.id, selectedItem.type, sector);
      setSelectedItem(null);
      return;
    }

    // If declaring noise after drawing a card
    if (noiseDeclarationSector !== null) {
      onDeclareNoise(sector, false);
      setNoiseDeclarationSector(null);
      return;
    }

    // If selecting second noise (Pilot power or Cat item)
    if (serverPendingSecondNoise) {
      onDeclareSecondNoise(sector);
      return;
    }

    // If attack is primed, use combined move and attack (no card draw)
    if (attackPrimed && isMyTurn && myPlayer?.alive && !myPlayer?.escaped) {
      onMoveAndAttack(sector, attackPrimedWithPower);
      setAttackPrimed(false);
      setAttackPrimedWithPower(false);
      return;
    }

    // Regular movement
    if (isMyTurn && myPlayer?.alive && !myPlayer?.escaped) {
      onMove(sector);
    }
  }, [selectedGhostPlayer, selectedItem, noiseDeclarationSector, serverPendingSecondNoise, attackPrimed, isMyTurn, myPlayer, onMove, onMoveAndAttack, onDeclareNoise, onDeclareSecondNoise, onUseItem]);

  // Handle ghost token selection from bank
  const handleGhostSelect = useCallback((playerId) => {
    if (selectedGhostPlayer === playerId) {
      // Deselect
      setSelectedGhostPlayer(null);
    } else {
      setSelectedGhostPlayer(playerId);
    }
  }, [selectedGhostPlayer]);

  // Remove ghost token (return to bank)
  const handleGhostRemove = useCallback((playerId) => {
    setGhostTokens(prev => {
      const newTokens = { ...prev };
      Object.keys(newTokens).forEach(key => {
        newTokens[key] = newTokens[key].filter(id => id !== playerId);
        if (newTokens[key].length === 0) {
          delete newTokens[key];
        }
      });
      return newTokens;
    });
  }, []);

  // Toggle player guess (cycle through: none -> human -> alien -> none)
  const handleToggleGuess = useCallback((playerId) => {
    setPlayerGuesses(prev => {
      const current = prev[playerId] || 'none';
      let next;
      if (current === 'none') next = 'human';
      else if (current === 'human') next = 'alien';
      else next = 'none';

      return { ...prev, [playerId]: next };
    });
  }, []);

  // Get players whose ghosts are on the board
  const placedGhostPlayerIds = useMemo(() => {
    const ids = new Set();
    Object.values(ghostTokens).forEach(playerIds => {
      playerIds.forEach(id => ids.add(id));
    });
    return ids;
  }, [ghostTokens]);

  // Declare silence
  const handleDeclareSilence = useCallback(() => {
    onDeclareNoise(null, true);
    setNoiseDeclarationSector(null);
    onCardDismiss && onCardDismiss();
  }, [onDeclareNoise, onCardDismiss]);

  // Declare noise in current sector (for NOISE_YOUR_SECTOR)
  const handleDeclareNoiseHere = useCallback((useCat = false, useDoublePower = false) => {
    // Use the explicit targetSector passed from server when the card was drawn
    // This ensures we always declare noise in the sector we moved INTO, not FROM
    const targetSector = drawnCard?.targetSector || gameState?.pendingAction?.sector || myPlayer?.position;

    console.log('Declare noise here:', { targetSector, drawnCard, pendingAction: gameState?.pendingAction, myPosition: myPlayer?.position });

    // Sanitize to ensure boolean
    const secureUseCat = typeof useCat === 'boolean' ? useCat : false;
    const secureUseDoublePower = typeof useDoublePower === 'boolean' ? useDoublePower : false;

    if (targetSector) {
      onDeclareNoise(targetSector, false, secureUseDoublePower, secureUseCat);
      setNoiseDeclarationSector(null);
      onCardDismiss && onCardDismiss();
    } else {
      // Fallback: use myPlayer.position if available
      console.error('No targetSector found for noise declaration');
      if (myPlayer?.position) {
        onDeclareNoise(myPlayer.position, false, secureUseDoublePower, secureUseCat);
        setNoiseDeclarationSector(null);
        onCardDismiss && onCardDismiss();
      }
    }
  }, [drawnCard, gameState, myPlayer, onDeclareNoise, onCardDismiss]);

  // Handle "Choose Sector on Map" - dismiss card and enable map selection
  const handleDeclareNoiseAnywhere = useCallback(() => {
    setNoiseDeclarationSector('any');
    onCardDismiss && onCardDismiss();  // Hide the card so map is visible
  }, [onCardDismiss]);

  // Handle item use with target selection
  const handleItemUse = useCallback((item) => {
    if (item.type === 'SENSOR') {
      setTargetSelectionMode({ type: 'sensor', itemId: item.id });
    } else if (item.type === 'SPOTLIGHT' || item.type === 'CAT') {
      setSelectedItem(item);
    } else {
      onUseItem(item.id, item.type, null);
    }
  }, [onUseItem]);

  // Handle power use with target selection
  const handlePowerUse = useCallback((power) => {
    if (power === 'reveal_identity') {
      setTargetSelectionMode({ type: 'medic' });
    } else if (power === 'free_attack') {
      // Soldier's Free Attack: prime the attack (same as clicking Prime Attack button)
      setAttackPrimed(true);
      setAttackPrimedWithPower(true);
    } else {
      onUsePower(power);
    }
  }, [onUsePower]);

  // Handle target selection for Sensor/Medic
  const handleTargetSelect = useCallback((targetPlayerId) => {
    if (targetSelectionMode?.type === 'sensor') {
      onUseItem(targetSelectionMode.itemId, 'SENSOR', targetPlayerId);
    } else if (targetSelectionMode?.type === 'medic') {
      onUsePower('reveal_identity', targetPlayerId);
    }
    setTargetSelectionMode(null);
  }, [targetSelectionMode, onUseItem, onUsePower]);

  // Check if Lurking Alien can attack in place
  const canAttackInPlace = myPlayer?.character?.power?.canAttackWithoutMoving && isMyTurn && myPlayer?.alive;

  // Check if player can prime attack (aliens always can, humans need Attack item or Soldier power)
  const canPrimeAttack = useMemo(() => {
    if (!myPlayer || !isMyTurn || !myPlayer.alive || myPlayer.escaped) return false;
    if (myPlayer.role === 'alien') return true;
    // Human with Attack item
    if (myPlayer.items?.some(item => item.type === 'ATTACK')) return true;
    // Soldier with free attack power
    if (myPlayer.character?.power?.id === 'free_attack' && myPlayer.powerUsage?.usesRemaining > 0) return true;
    return false;
  }, [myPlayer, isMyTurn]);

  // Spectator mode detection
  const isSpectator = isHost || gameState?.isSpectatorView || gameState?.phase === 'ended';
  const isGameEnded = gameState?.phase === 'ended';

  // Compute historical state when viewing past turns
  const historicalState = useMemo(() => {
    if (!viewingTurn || !gameState?.turnHistory) return null;

    const snapshot = gameState.turnHistory.find(s => s.turn === viewingTurn);
    if (!snapshot) return null;

    return {
      players: snapshot.players,
      escapeHatchStatus: snapshot.escapeHatchStatus,
      announcements: snapshot.turnAnnouncements || [],
      turn: snapshot.turn
    };
  }, [viewingTurn, gameState?.turnHistory]);

  // Timeline navigation handlers
  const handlePrevTurn = useCallback(() => {
    const currentViewTurn = viewingTurn ?? gameState?.currentTurn;
    if (currentViewTurn > 1) {
      setViewingTurn(currentViewTurn - 1);
    }
  }, [viewingTurn, gameState?.currentTurn]);

  const handleNextTurn = useCallback(() => {
    const currentViewTurn = viewingTurn ?? gameState?.currentTurn;
    if (currentViewTurn < gameState?.currentTurn) {
      setViewingTurn(currentViewTurn + 1);
    } else {
      setViewingTurn(null); // Go live
    }
  }, [viewingTurn, gameState?.currentTurn]);

  const handleGoToTurn = useCallback((turn) => {
    if (turn >= gameState?.currentTurn) {
      setViewingTurn(null); // Go live
    } else {
      setViewingTurn(turn);
    }
  }, [gameState?.currentTurn]);

  const handleGoLive = useCallback(() => {
    setViewingTurn(null);
  }, []);

  // Generate turn summary for timeline controls
  const turnSummary = useMemo(() => {
    const targetTurn = viewingTurn ?? gameState?.currentTurn;
    const announcements = viewingTurn && historicalState?.announcements
      ? historicalState.announcements
      : gameState?.announcements?.filter(a => a.turn === targetTurn) || [];

    const noises = announcements.filter(a => a.type === 'NOISE' || a.type === 'NOISE_ECHO' || a.type === 'CAT').length;
    const attacks = announcements.filter(a => a.type === 'ATTACK').length;
    const escapes = announcements.filter(a => a.type === 'ESCAPE').length;
    const mutations = announcements.filter(a => a.type === 'MUTATION').length;

    const parts = [];
    if (noises > 0) parts.push(`${noises} noise${noises > 1 ? 's' : ''}`);
    if (attacks > 0) parts.push(`${attacks} attack${attacks > 1 ? 's' : ''}`);
    if (escapes > 0) parts.push(`${escapes} escape${escapes > 1 ? 's' : ''}`);
    if (mutations > 0) parts.push(`${mutations} mutation${mutations > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'No events';
  }, [viewingTurn, historicalState, gameState?.announcements, gameState?.currentTurn]);

  // Determine which players to show based on view mode
  const displayPlayers = useMemo(() => {
    if (viewingTurn && historicalState) {
      return historicalState.players;
    }
    return gameState?.players;
  }, [viewingTurn, historicalState, gameState?.players]);

  // Determine which escape hatch status to show
  const displayEscapeHatchStatus = useMemo(() => {
    if (viewingTurn && historicalState) {
      return historicalState.escapeHatchStatus;
    }
    return gameState?.escapeHatchStatus;
  }, [viewingTurn, historicalState, gameState?.escapeHatchStatus]);

  // Get historical announcements for the viewed turn (for highlighting noise/attacks)
  const displayTurnAnnouncements = useMemo(() => {
    if (viewingTurn && historicalState) {
      return historicalState.announcements;
    }
    return [];
  }, [viewingTurn, historicalState]);

  // Determine highlight mode
  const getHighlightMode = () => {
    if (selectedGhostPlayer) return 'ghost-select';
    if (noiseDeclarationSector === 'any') return 'noise-select';
    if (serverPendingSecondNoise) return 'noise-select';
    if (selectedItem) return 'item-target';
    if (attackPrimed) return 'attack-primed';
    // Show movement highlighting when it's player's turn and they can move
    if (isMyTurn && myPlayer?.alive && !myPlayer?.escaped && reachableSectors.length > 0) return 'movement';
    return null;
  };

  // Build path history for visualization
  // Returns Map: sector -> { types: Set(['noise', 'attack']), turns: [number] }
  const getPathHistory = useCallback((playerId) => {
    const history = new Map();
    if (!playerId || !gameState?.announcements) return history;

    // Filter relevant announcements for this player
    const relevant = gameState.announcements.filter(a =>
      a.playerId === playerId &&
      (a.type === 'NOISE' || a.type === 'ATTACK')
    );

    relevant.forEach(ann => {
      const sectors = [];
      if (ann.sector) sectors.push(ann.sector);
      if (ann.sectors) sectors.push(...ann.sectors);

      sectors.forEach(sector => {
        if (!history.has(sector)) {
          history.set(sector, { types: new Set(), turns: [] });
        }
        const entry = history.get(sector);
        entry.types.add(ann.type === 'ATTACK' ? 'attack' : 'noise');
        if (!entry.turns.includes(ann.turn)) {
          entry.turns.push(ann.turn);
        }
      });
    });

    return history;
  }, [gameState?.announcements]);

  const pathHistory = useMemo(() => {
    if (selectedGhostPlayer) {
      return getPathHistory(selectedGhostPlayer);
    }
    return null;
  }, [selectedGhostPlayer, getPathHistory]);


  if (!gameState) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className={`game-board ${showTracker ? 'with-tracker' : ''} ${isMyTurn ? 'my-turn' : ''}`}>

      {/* Main Content Area */}
      <div className="game-content-wrapper">
        {/* Game Area */}
        <div className="game-main">
          {/* Left: Player HUD */}
          <div className="game-sidebar left">
            {/* Timeline Controls (Rendered here for Desktop, hidden on Mobile via CSS) */}
            <div className="desktop-timeline">
              {isSpectator && gameState?.turnHistory?.length > 0 && (
                <TimelineControls
                  currentTurn={gameState.currentTurn}
                  maxTurn={gameState.maxTurns}
                  viewingTurn={viewingTurn}
                  isGameEnded={isGameEnded}
                  onPrevTurn={handlePrevTurn}
                  onNextTurn={handleNextTurn}
                  onGoToTurn={handleGoToTurn}
                  onGoLive={handleGoLive}
                  turnSummary={turnSummary}
                />
              )}
            </div>
            <PlayerHUD
              player={myPlayer}
              isHost={isHost}
              gameState={gameState}
              onUseItem={handleItemUse}
              onUsePower={handlePowerUse}
              selectedItem={selectedItem}
              isMyTurn={isMyTurn}
            />
          </div>

          {/* Center: Hex Grid Map */}
          <div className="game-center">
            {/* PROMINENT Turn Indicator */}
            <div className={`turn-indicator ${isMyTurn ? 'my-turn' : ''} ${isHost ? 'host-view' : ''}`}>
              <span className="turn-number">Turn {gameState.currentTurn} / {gameState.maxTurns}</span>
              <span className={`current-player ${isMyTurn ? 'highlight' : ''}`}>
                {isHost
                  ? `👁️ HOST VIEW - ${currentTurnPlayer?.name}'s Turn`
                  : (!myPlayer?.alive || myPlayer?.escaped)
                    ? `👻 SPECTATOR MODE - ${currentTurnPlayer?.name}'s Turn`
                    : (isMyTurn ? "🎯 YOUR TURN" : `⏳ ${currentTurnPlayer?.name}'s Turn`)
                }
              </span>
              <span className="room-code-display" style={{ marginLeft: '15px', color: '#888', fontSize: '0.9em' }}>
                Room: <strong>{roomCode}</strong>
              </span>
              <div className="toggle-buttons">
                <button
                  className={`toggle-btn ${showLog ? 'active' : ''}`}
                  onClick={() => setShowLog(!showLog)}
                  title="Toggle Game Log"
                >
                  📜 Log
                </button>
                <button
                  className={`toggle-btn ${showTracker ? 'active' : ''}`}
                  onClick={() => setShowTracker(!showTracker)}
                  title="Toggle Player Tracker"
                >
                  📊 Tracker
                </button>
              </div>
            </div>

            {/* Timeline Controls (Rendered here for Mobile, hidden on Desktop via CSS) */}
            <div className="mobile-timeline">
              {isSpectator && gameState?.turnHistory?.length > 0 && (
                <TimelineControls
                  currentTurn={gameState.currentTurn}
                  maxTurn={gameState.maxTurns}
                  viewingTurn={viewingTurn}
                  isGameEnded={isGameEnded}
                  onPrevTurn={handlePrevTurn}
                  onNextTurn={handleNextTurn}
                  onGoToTurn={handleGoToTurn}
                  onGoLive={handleGoLive}
                  turnSummary={turnSummary}
                />
              )}
            </div>

            <HexGrid
              map={gameState.map}
              myPosition={myPlayer?.position}
              ghostTokens={ghostTokens}
              players={displayPlayers}
              isHost={isHost}
              playerGuesses={playerGuesses}
              showAllPlayers={isSpectator}
              escapeHatchStatus={displayEscapeHatchStatus}
              selectedGhostPlayer={selectedGhostPlayer}
              onHexClick={viewingTurn ? null : handleHexClick}
              highlightMode={viewingTurn ? null : getHighlightMode()}
              pulsingSectors={viewingTurn ? new Map() : pulsingSectors}
              pathHistory={pathHistory}
              reachableSectors={viewingTurn ? [] : reachableSectors}
              onGhostTokenClick={handleGhostSelect}
              isHistoricalView={!!viewingTurn}
              historicalAnnouncements={displayTurnAnnouncements}
            />

            {/* Action Buttons */}
            {isMyTurn && myPlayer?.alive && (
              <div className="action-buttons">
                {/* Prime Attack Toggle */}
                {canPrimeAttack && (
                  <button
                    className={`action-btn prime-attack-btn ${attackPrimed ? 'primed' : ''}`}
                    onClick={() => {
                      if (attackPrimed) {
                        setAttackPrimed(false);
                        setAttackPrimedWithPower(false);
                      } else {
                        setAttackPrimed(true);
                        // Don't set attackPrimedWithPower here - that's only for using the soldier power button
                      }
                    }}
                  >
                    {attackPrimed ? '⚔️ ATTACK PRIMED - Click sector to move & attack' : '⚔️ Prime Attack'}
                  </button>
                )}
                {/* Lurking Alien attack in place */}
                {canAttackInPlace && (
                  <button
                    className="action-btn attack-btn lurking"
                    onClick={onAttackInPlace}
                  >
                    Lurk Attack (No Move)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Game Log (toggleable) */}
          {showLog && (
            <div className="game-sidebar right">
              <GameLog announcements={gameState.announcements} />
            </div>
          )}
        </div>

        {/* Player Tracker Panel (Split Screen) */}
        {showTracker && (
          <>
            <div
              className={`resize-handle ${isResizing ? 'active' : ''}`}
              onMouseDown={startResizing}
            />
            <div className="tracker-panel" style={{ width: `${trackerWidth}px`, flex: 'none' }}>
              <PlayerTracker
                announcements={gameState.announcements}
                players={gameState.players}
                currentTurn={gameState.currentTurn}
                maxTurns={gameState.maxTurns}
                firstPlayerId={gameState.firstPlayerId}
                onClose={() => setShowTracker(false)}
                // Token bank props merged in
                currentPlayerId={gameState.currentPlayerId}
                selectedGhostPlayer={selectedGhostPlayer}
                placedGhostPlayerIds={placedGhostPlayerIds}
                onGhostSelect={handleGhostSelect}
                onToggleGuess={handleToggleGuess}
                isHost={isHost}
                playerGuesses={playerGuesses}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating Log Toasts */}
      <LogToast announcements={gameState.announcements} />

      {/* Card Modal for drawn cards */}
      {drawnCard && (
        <CardModal
          card={drawnCard.card}
          itemCard={drawnCard.itemCard}
          onDeclareNoiseHere={handleDeclareNoiseHere}
          onDeclareNoiseAnywhere={handleDeclareNoiseAnywhere}
          onDeclareSilence={handleDeclareSilence}
          onClose={onCardDismiss}
          player={myPlayer}
        />
      )}

      {/* Noise Selection Overlay */}
      {(noiseDeclarationSector === 'any' || serverPendingSecondNoise) && (
        <div className="noise-select-overlay">
          <div className="noise-select-message">
            {serverPendingSecondNoise
              ? `Select SECOND sector for noise (first: ${serverPendingSecondNoise.firstSector})`
              : 'Click any sector to declare noise there'
            }
          </div>
        </div>
      )}

      {/* Ghost Token Placement Overlay */}
      {selectedGhostPlayer && !(noiseDeclarationSector === 'any' || serverPendingSecondNoise) && (
        <div className="ghost-select-overlay">
          <div
            className="ghost-select-message"
            onClick={() => setSelectedGhostPlayer(null)}
          >
            Click a sector to place token, or click here to cancel
          </div>
        </div>
      )}

      {/* Target Selection Modal for Sensor/Medic */}
      {targetSelectionMode && (
        <div className="target-select-overlay">
          <div className="target-select-modal">
            <h3>
              {targetSelectionMode.type === 'sensor'
                ? 'Select player to reveal location'
                : 'Select player to reveal identity'
              }
            </h3>
            <div className="target-list">
              {gameState.players
                .filter(p => p.id !== clientId && p.alive && !p.escaped)
                .map(p => (
                  <button
                    key={p.id}
                    className="target-btn"
                    onClick={() => handleTargetSelect(p.id)}
                  >
                    {p.name}
                  </button>
                ))
              }
            </div>
            <button
              className="cancel-btn"
              onClick={() => setTargetSelectionMode(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Escape Card Choice Modal for Engineer */}
      {serverPendingEscapeChoice && (
        <div className="escape-choice-overlay">
          <div className="escape-choice-modal">
            <h3>Choose Escape Card (Engineer Power)</h3>
            <p>You drew two cards. Choose which one to use:</p>
            <div className="escape-cards">
              {serverPendingEscapeChoice.cards.map((card, index) => (
                <button
                  key={index}
                  className={`escape-card-btn ${card.type === 'GREEN' ? 'working' : 'damaged'}`}
                  onClick={() => onChooseEscapeCard(index)}
                >
                  <span className="card-icon">{card.type === 'GREEN' ? '✓' : '✗'}</span>
                  <span className="card-label">
                    {card.type === 'GREEN' ? 'Working' : 'Damaged'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
