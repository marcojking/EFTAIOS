import React, { useMemo, useRef, useEffect, useState } from 'react';
import './HexGrid.css';

// Hex dimensions - FLAT-TOP orientation
const HEX_SIZE = 30;
const HEX_WIDTH = 2 * HEX_SIZE;  // Flat-top: width = 2 * size
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;  // Flat-top: height = sqrt(3) * size
const HEX_HORIZ_SPACING = HEX_WIDTH * 0.75;  // Horizontal spacing between hex centers

// Convert odd-q offset coordinates to pixel position (flat-top)
function hexToPixel(col, row) {
  const x = col * HEX_HORIZ_SPACING;
  const y = row * HEX_HEIGHT + (col % 2 === 1 ? HEX_HEIGHT / 2 : 0);
  return { x, y };
}

// Generate hex polygon points - FLAT-TOP orientation
function getHexPoints(cx, cy, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    // Flat-top: start at 0 degrees (right side)
    const angle = (Math.PI / 3) * i;
    points.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle)
    });
  }
  return points.map(p => `${p.x},${p.y}`).join(' ');
}

// Get sector color based on state
function getSectorColor(state, escapeHatchStatus, label) {
  switch (state) {
    case 'dangerous':
      return { fill: '#2a2a4a', stroke: '#4a4a7a' };
    case 'secure':
      return { fill: '#1a3a2a', stroke: '#2a5a4a' };
    case 'human-start':
      return { fill: '#1a4a6a', stroke: '#00d9ff' };
    case 'alien-start':
      return { fill: '#4a1a2a', stroke: '#e94560' };
    case 'airlock':
      const status = escapeHatchStatus?.[label];
      if (status === 'damaged') {
        return { fill: '#4a1a1a', stroke: '#ff3333' };
      } else if (status === 'used') {
        return { fill: '#2a2a2a', stroke: '#666' };
      }
      return { fill: '#3a3a1a', stroke: '#ffcc00' };
    default:
      return { fill: '#1a1a1a', stroke: '#333' };
  }
}

// Sub-component for Ghost Token on Map (click to select)
function HexGhostToken({
  playerId,
  initials,
  color,
  x,
  y,
  onClick
}) {
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent hex click from firing
    onClick(playerId);
  };

  return (
    <g
      className="ghost-token"
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
    >
      <circle
        cx={x}
        cy={y}
        r={10}
        fill={color}
        fillOpacity="0.6"
        stroke={color}
        strokeWidth="2"
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize="8"
        fill="white"
        fontWeight="bold"
        pointerEvents="none"
      >
        {initials}
      </text>
    </g>
  );
}

function HexGrid({
  map,
  myPosition,
  ghostTokens,
  players,
  isHost,
  showAllPlayers,
  escapeHatchStatus,
  selectedGhostPlayer,
  onHexClick,
  highlightMode,
  pulsingSectors,
  playerGuesses,
  pathHistory,
  reachableSectors = [],
  onGhostTokenClick,
  isHistoricalView = false,
  historicalAnnouncements = []
}) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Track drag distance to distinguish clicks from pans
  const dragDistance = useRef(0);

  // Touch state for pinch-to-zoom
  const lastTouchDistance = useRef(null);
  const lastTouchCenter = useRef(null);

  // Calculate grid bounds
  const bounds = useMemo(() => {
    if (!map?.grid?.length) return { minX: 0, maxX: 800, minY: 0, maxY: 600 };

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    map.grid.forEach(hex => {
      const { x, y } = hexToPixel(hex.x, hex.y);
      minX = Math.min(minX, x - HEX_WIDTH);
      maxX = Math.max(maxX, x + HEX_WIDTH);
      minY = Math.min(minY, y - HEX_HEIGHT);
      maxY = Math.max(maxY, y + HEX_HEIGHT);
    });

    return {
      minX: minX - 20,
      maxX: maxX + 20,
      minY: minY - 20,
      maxY: maxY + 20
    };
  }, [map]);

  // Update viewBox based on bounds
  useEffect(() => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    setViewBox(`${bounds.minX} ${bounds.minY} ${width} ${height}`);
  }, [bounds]);

  // Get player initials and color (Centralized Logic basically)
  const getPlayerDisplay = (playerId) => {
    const player = players?.find(p => p.id === playerId);
    if (!player) return { initials: '?', color: '#888' };

    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    let color = '#888';

    // Host or Spectator sees TRUE colors
    if (isHost || showAllPlayers) {
      color = player.role === 'human' ? '#00d9ff' : '#e94560';
    } else {
      // Regular players see their GUESSES
      if (playerGuesses && playerGuesses[playerId]) {
        const guess = playerGuesses[playerId];
        if (guess === 'human') color = '#00d9ff'; // Blue
        else if (guess === 'alien') color = '#e94560'; // Red
      }
    }

    return { initials, color, name: player.name };
  };

  // Compute historical events for each hex (used in timeline view)
  const historicalHexEvents = useMemo(() => {
    if (!isHistoricalView || !historicalAnnouncements?.length) return new Map();

    const events = new Map();
    historicalAnnouncements.forEach(ann => {
      if (ann.type === 'NOISE' || ann.type === 'NOISE_ECHO' || ann.type === 'CAT') {
        const sector = ann.sector;
        if (sector) {
          const { initials } = getPlayerDisplay(ann.playerId);
          if (!events.has(sector)) events.set(sector, []);
          events.get(sector).push({ type: 'noise', playerId: ann.playerId, initials });
        }
        // Handle multiple sectors (e.g., double noise)
        if (ann.sectors) {
          ann.sectors.forEach(s => {
            const { initials } = getPlayerDisplay(ann.playerId);
            if (!events.has(s)) events.set(s, []);
            events.get(s).push({ type: 'noise', playerId: ann.playerId, initials });
          });
        }
      } else if (ann.type === 'ATTACK') {
        const sector = ann.sector;
        if (sector) {
          const { initials } = getPlayerDisplay(ann.playerId);
          const hasKill = ann.victims && ann.victims.length > 0;
          if (!events.has(sector)) events.set(sector, []);
          events.get(sector).push({ type: 'attack', playerId: ann.playerId, initials, hasKill });
        }
      }
    });
    return events;
  }, [isHistoricalView, historicalAnnouncements, players]);

  // Render a single hex
  const renderHex = (hex) => {
    const { x, y } = hexToPixel(hex.x, hex.y);
    const colors = getSectorColor(hex.state, escapeHatchStatus, hex.label);
    const isMyPosition = hex.label === myPosition;
    const ghostsHere = ghostTokens[hex.label] || [];

    // For host view OR spectator view, show all real player positions
    const playersHere = showAllPlayers || isHost
      ? players?.filter(p => p.position === hex.label && p.alive && !p.escaped) || []
      : [];

    const isHighlighted = highlightMode === 'noise-select' || highlightMode === 'ghost-select';
    const isSelecting = selectedGhostPlayer !== null;

    // Movement/Attack highlighting
    const isReachable = reachableSectors.includes(hex.label);
    const isMovementHighlight = highlightMode === 'movement' && isReachable;
    const isAttackHighlight = highlightMode === 'attack-primed' && isReachable;

    // Handle both new Map format and old Set format for backward compatibility
    let isPulsing = false;
    let pulseType = 'noise'; // 'noise' (yellow) or 'attack' (red)
    let showSkull = false;

    if (pulsingSectors instanceof Map) {
      if (pulsingSectors.has(hex.label)) {
        isPulsing = true;
        const effect = pulsingSectors.get(hex.label);
        pulseType = effect.type;
        showSkull = effect.kill;
      }
    } else if (pulsingSectors instanceof Set) {
      isPulsing = pulsingSectors.has(hex.label);
    }

    const pulseClass = pulseType === 'attack' ? 'pulse-red' : 'pulse-yellow';
    const pulseColor = pulseType === 'attack' ? '#ff3333' : '#ffcc00';

    // History Visualization (for Ghost Token selection)
    const historyEntry = pathHistory?.get(hex.label);
    const hasHistory = !!historyEntry;

    // Determine history color style
    let historyClass = '';

    if (hasHistory) {
      if (historyEntry.types.has('attack')) {
        historyClass = 'history-pulse-red';
      } else {
        historyClass = 'history-pulse-yellow';
      }
    }

    // Logic: If pathHistory is active (Ghost Selection Mode), hide standard game pulsing
    // This allows user to focus on history without distractions
    const isSelectionMode = !!pathHistory;
    const showStandardPulse = isPulsing && !isSelectionMode;

    return (
      <g
        key={hex.label}
        className={`hex-group ${isMyPosition ? 'my-position' : ''} ${isSelecting ? 'selecting' : ''}`}
        data-sector={hex.label} // Crucial for Drop Detection
        onClick={() => {
          if (dragDistance.current < 5) {
            onHexClick(hex.label);
          }
        }}
      >
        {/* Hex shape */}
        <polygon
          points={getHexPoints(x, y, HEX_SIZE - 1)}
          fill={hasHistory ? undefined : colors.fill}
          stroke={
            isMovementHighlight ? '#00aaff' :
              isAttackHighlight ? '#ff4444' :
                isHighlighted ? '#00d9ff' :
                  (showStandardPulse ? pulseColor : colors.stroke)
          }
          strokeWidth={isMovementHighlight || isAttackHighlight || isHighlighted || showStandardPulse ? 3 : 1}
          className={`hex ${hex.state} ${isMyPosition ? 'current' : ''} ${showStandardPulse ? pulseClass : ''} ${historyClass} ${isMovementHighlight ? 'movement-highlight' : ''} ${isAttackHighlight ? 'attack-highlight' : ''}`}
        />

        {/* Sector label */}
        <text
          x={x}
          y={y - 5}
          textAnchor="middle"
          className="hex-label"
          fill={colors.stroke}
          fontSize="12"
          fontWeight="bold"
          pointerEvents="none"
        >
          {hex.label}
        </text>

        {/* Sector type indicator */}
        {hex.state === 'airlock' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffcc00" pointerEvents="none">
            {getEscapeHatchNumber(hex.label)}
          </text>
        )}
        {hex.state === 'human-start' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#00d9ff" pointerEvents="none">H</text>
        )}
        {hex.state === 'alien-start' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#e94560" pointerEvents="none">A</text>
        )}

        {/* My position marker */}
        {isMyPosition && (
          <circle
            cx={x}
            cy={y}
            r={HEX_SIZE * 0.6}
            fill="none"
            stroke="#00d9ff"
            strokeWidth="2"
            className="position-marker"
            pointerEvents="none"
          />
        )}

        {/* Ghost tokens - click to select */}
        {ghostsHere.map((playerId, idx) => {
          const { initials, color } = getPlayerDisplay(playerId);
          const offsetAngle = (idx / Math.max(ghostsHere.length, 1)) * Math.PI * 2;
          const tokenX = x + Math.cos(offsetAngle) * (HEX_SIZE * 0.3) * (ghostsHere.length > 1 ? 1 : 0);
          const tokenY = y + Math.sin(offsetAngle) * (HEX_SIZE * 0.3) * (ghostsHere.length > 1 ? 1 : 0);

          return (
            <HexGhostToken
              key={playerId}
              playerId={playerId}
              initials={initials}
              color={color}
              x={tokenX}
              y={tokenY}
              onClick={onGhostTokenClick}
            />
          );
        })}

        {/* Real player positions (host or spectator view) */}
        {(showAllPlayers || isHost) && playersHere.map((player, idx) => {
          // Use common display logic so map tokens match top bar guesses
          const { initials, color } = getPlayerDisplay(player.id);
          const offsetAngle = (idx / Math.max(playersHere.length, 1)) * Math.PI * 2 + Math.PI / 4;
          const tokenX = x + Math.cos(offsetAngle) * (HEX_SIZE * 0.4) * (playersHere.length > 1 ? 1 : 0);
          const tokenY = y + Math.sin(offsetAngle) * (HEX_SIZE * 0.4) * (playersHere.length > 1 ? 1 : 0);

          return (
            <g key={`real-${player.id}`} className="real-player-token" style={{ pointerEvents: 'none' }}>
              <circle
                cx={tokenX}
                cy={tokenY}
                r={12}
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
              <text
                x={tokenX}
                y={tokenY + 4}
                textAnchor="middle"
                fontSize="9"
                fill="white"
                fontWeight="bold"
              >
                {initials}
              </text>
            </g>
          );
        })}

        {/* Skull Overlay for kills */}
        {showSkull && (
          <text
            x={x}
            y={y + 5}
            textAnchor="middle"
            className="skull-overlay"
            pointerEvents="none"
          >
            💀
          </text>
        )}

        {/* History Turn Numbers */}
        {hasHistory && (
          <text
            x={x}
            y={y + 16}
            textAnchor="middle"
            className="history-turn"
          >
            {historyEntry.turns.join(',')}
          </text>
        )}

        {/* Historical Event Indicators (Timeline View) */}
        {isHistoricalView && historicalHexEvents.has(hex.label) && (
          <g className="historical-events">
            {historicalHexEvents.get(hex.label).map((event, idx) => {
              const eventY = y - 15 - (idx * 18);
              const bgColor = event.type === 'attack' ? '#ff3333' : '#ffcc00';
              const textColor = event.type === 'attack' ? '#fff' : '#000';

              return (
                <g key={`event-${idx}`}>
                  {/* Event background pill */}
                  <rect
                    x={x - 14}
                    y={eventY - 8}
                    width={28}
                    height={16}
                    rx={8}
                    fill={bgColor}
                    className={`historical-event-bg ${event.type}`}
                  />
                  {/* Player initials */}
                  <text
                    x={x}
                    y={eventY + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill={textColor}
                    pointerEvents="none"
                  >
                    {event.initials}
                  </text>
                  {/* Kill indicator */}
                  {event.hasKill && (
                    <text
                      x={x + 18}
                      y={eventY + 4}
                      fontSize="12"
                      pointerEvents="none"
                    >
                      💀
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  };

  // Get escape hatch number based on position
  const getEscapeHatchNumber = (label) => {
    const hatches = map?.grid?.filter(h => h.state === 'airlock') || [];
    const index = hatches.findIndex(h => h.label === label);
    return index >= 0 ? index + 1 : '?';
  };

  // Handle zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  // Handle pan
  const handleMouseDown = (e) => {
    // Check if we hit a ghost token first (prevent pan if dragging token)
    if (e.target.closest('.ghost-token')) return;

    // Allow left (0), middle (1), or right (2) click to pan
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      dragDistance.current = 0;
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;

      // Accumulate drag distance
      dragDistance.current += Math.abs(dx) + Math.abs(dy);

      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch handlers for mobile pinch-to-zoom and pan
  const handleTouchStart = (e) => {
    // Check if we hit a ghost token first (prevent pan if dragging token)
    if (e.target.closest('.ghost-token')) return;

    if (e.touches.length === 1) {
      // Single touch - prepare for potential panning, but don't prevent default yet
      // This allows tap/click events to fire for hex selection
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      dragDistance.current = 0;
    } else if (e.touches.length === 2) {
      // Two touches - start pinch-to-zoom, prevent default immediately
      e.preventDefault();
      setIsPanning(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    }
  };

  const handleTouchMove = (e) => {
    // Only prevent default if we're actually moving (not a tap)
    // This stops the page from scrolling during pan/zoom but allows taps
    if (e.touches.length >= 1) {
      e.preventDefault();
    }

    if (e.touches.length === 1 && isPanning) {
      // Single touch - panning
      const dx = e.touches[0].clientX - panStart.x;
      const dy = e.touches[0].clientY - panStart.y;

      dragDistance.current += Math.abs(dx) + Math.abs(dy);

      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Two touches - pinch-to-zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);

      // Calculate zoom factor
      const zoomFactor = newDistance / lastTouchDistance.current;
      setScale(prev => Math.max(0.5, Math.min(3, prev * zoomFactor)));

      // Also allow panning while zooming
      const newCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
      if (lastTouchCenter.current) {
        const panDx = newCenter.x - lastTouchCenter.current.x;
        const panDy = newCenter.y - lastTouchCenter.current.y;
        setOffset(prev => ({ x: prev.x + panDx, y: prev.y + panDy }));
      }

      lastTouchDistance.current = newDistance;
      lastTouchCenter.current = newCenter;
    }
  };

  const handleTouchEnd = (e) => {
    // Don't prevent default on touchEnd - allow click events to fire for taps
    if (e.touches.length === 0) {
      // All touches released
      setIsPanning(false);
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    } else if (e.touches.length === 1) {
      // One finger still touching - switch back to pan mode
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  if (!map?.grid) {
    return <div className="hex-grid-loading">Loading map...</div>;
  }

  return (
    <div
      className="hex-grid-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="hex-grid-svg"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`
        }}
      // Add touch listeners for pan? (Need to be careful not to conflict with drag)
      >
        {/* Background pattern */}
        <defs>
          <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.05)" />
          </pattern>
        </defs>
        <rect x={bounds.minX} y={bounds.minY} width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY} fill="url(#grid-pattern)" />

        {/* Render hexes */}
        {map.grid.map(hex => renderHex(hex))}
      </svg>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={() => setScale(s => Math.min(3, s * 1.2))}>+</button>
        <button onClick={() => setScale(s => Math.max(0.5, s / 1.2))}>-</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
      </div>
    </div>
  );
}

export default HexGrid;
