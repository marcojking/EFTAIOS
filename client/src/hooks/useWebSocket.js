import { useState, useCallback, useRef, useEffect } from 'react';

function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const urlRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef([]);

  const connect = useCallback((url) => {
    // Prevent multiple simultaneous connection attempts
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('Already connected or connecting, skipping...');
      return;
    }

    // Store URL for reconnection
    urlRef.current = url;
    setError(null);
    setIsConnecting(true);

    try {
      console.log('Connecting to WebSocket:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);

        // Send any pending messages
        while (pendingMessagesRef.current.length > 0) {
          const msg = pendingMessagesRef.current.shift();
          ws.send(JSON.stringify(msg));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Debug logging for non-game-state messages to help trace room logic
          if (message.type !== 'GAME_STATE_UPDATE') {
            console.log('WS Message:', message);
          }

          // Special handling for GAME_STATE_UPDATE to keep it easily accessible
          if (message.type === 'GAME_STATE_UPDATE') {
            setGameState(message.gameState);
            return; // Don't clobber lastMessage with game state updates
          }

          // Always update lastMessage so App.js can react to ROOM_CREATED, etc.
          setLastMessage(message);

        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Auto-reconnect if not closed normally (1000)
        if (event.code !== 1000 && urlRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting reconnection...');
            connect(urlRef.current);
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection failed');
        setIsConnecting(false);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
    }
  }, []);

  const send = useCallback((message) => {
    console.log('useWebSocket.send called:', message.type, 'readyState:', wsRef.current?.readyState);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending message:', JSON.stringify(message));
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, queuing message:', message.type, 'State:', wsRef.current?.readyState);
      pendingMessagesRef.current.push(message);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    urlRef.current = null; // Clear URL to prevent reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    gameState,      // Convenience accessor for game state
    lastMessage,    // Raw message stream for events like ROOM_CREATED
    error,
    connect,
    send,
    disconnect
  };
}

export default useWebSocket;
