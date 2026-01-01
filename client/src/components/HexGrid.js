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

function HexGrid({
  map,
  myPosition,
  ghostTokens,
  players,
  isHost,
  escapeHatchStatus,
  selectedGhostPlayer,
  onHexClick,
  highlightMode
}) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Track drag distance to distinguish clicks from pans
  const dragDistance = useRef(0);

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

  // Get player initials and color
  const getPlayerDisplay = (playerId) => {
    const player = players?.find(p => p.id === playerId);
    if (!player) return { initials: '?', color: '#888' };

    const initials = player.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Color based on known role or default
    let color = '#888';
    if (player.revealed) {
      color = player.role === 'human' ? '#00d9ff' : '#e94560';
    }

    return { initials, color, name: player.name };
  };

  // Render a single hex
  const renderHex = (hex) => {
    const { x, y } = hexToPixel(hex.x, hex.y);
    const colors = getSectorColor(hex.state, escapeHatchStatus, hex.label);
    const isMyPosition = hex.label === myPosition;
    const ghostsHere = ghostTokens[hex.label] || [];

    // For host view, show all real player positions
    const playersHere = isHost
      ? players?.filter(p => p.position === hex.label && p.alive && !p.escaped) || []
      : [];

    const isHighlighted = highlightMode === 'noise-select';
    const isSelecting = selectedGhostPlayer !== null;

    return (
      <g
        key={hex.label}
        className={`hex-group ${isMyPosition ? 'my-position' : ''} ${isSelecting ? 'selecting' : ''}`}
        onClick={() => {
          if (dragDistance.current < 5) {
            onHexClick(hex.label);
          }
        }}
      >
        {/* Hex shape */}
        <polygon
          points={getHexPoints(x, y, HEX_SIZE - 1)}
          fill={colors.fill}
          stroke={isHighlighted ? '#e94560' : colors.stroke}
          strokeWidth={isHighlighted ? 2 : 1}
          className={`hex ${hex.state} ${isMyPosition ? 'current' : ''}`}
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
        >
          {hex.label}
        </text>

        {/* Sector type indicator */}
        {hex.state === 'airlock' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ffcc00">
            {getEscapeHatchNumber(hex.label)}
          </text>
        )}
        {hex.state === 'human-start' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#00d9ff">H</text>
        )}
        {hex.state === 'alien-start' && (
          <text x={x} y={y + 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#e94560">A</text>
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
          />
        )}

        {/* Ghost tokens */}
        {ghostsHere.map((playerId, idx) => {
          const { initials, color } = getPlayerDisplay(playerId);
          const offsetAngle = (idx / Math.max(ghostsHere.length, 1)) * Math.PI * 2;
          const tokenX = x + Math.cos(offsetAngle) * (HEX_SIZE * 0.3) * (ghostsHere.length > 1 ? 1 : 0);
          const tokenY = y + Math.sin(offsetAngle) * (HEX_SIZE * 0.3) * (ghostsHere.length > 1 ? 1 : 0);

          return (
            <g key={playerId} className="ghost-token">
              <circle
                cx={tokenX}
                cy={tokenY}
                r={10}
                fill={color}
                fillOpacity="0.6"
                stroke={color}
                strokeWidth="2"
              />
              <text
                x={tokenX}
                y={tokenY + 3}
                textAnchor="middle"
                fontSize="8"
                fill="white"
                fontWeight="bold"
              >
                {initials}
              </text>
            </g>
          );
        })}

        {/* Real player positions (host view only) */}
        {isHost && playersHere.map((player, idx) => {
          const { initials } = getPlayerDisplay(player.id);
          const playerColor = player.role === 'human' ? '#00d9ff' : '#e94560';
          const offsetAngle = (idx / Math.max(playersHere.length, 1)) * Math.PI * 2 + Math.PI / 4;
          const tokenX = x + Math.cos(offsetAngle) * (HEX_SIZE * 0.4) * (playersHere.length > 1 ? 1 : 0);
          const tokenY = y + Math.sin(offsetAngle) * (HEX_SIZE * 0.4) * (playersHere.length > 1 ? 1 : 0);

          return (
            <g key={`real-${player.id}`} className="real-player-token">
              <circle
                cx={tokenX}
                cy={tokenY}
                r={12}
                fill={playerColor}
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

      // Accumulate drag distance (manhattan distance is good enough approximation for "is this a click")
      dragDistance.current += Math.abs(dx) + Math.abs(dy);

      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
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
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="hex-grid-svg"
        style={{
          transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`
        }}
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
