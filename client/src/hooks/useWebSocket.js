import { useState, useCallback, useRef, useEffect } from 'react';

function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const urlRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pendingMessagesRef = useRef([]);
  const isConnectingRef = useRef(false);

  const connect = useCallback((url) => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('Already connecting, skipping...');
      return;
    }

    // Store URL for reconnection
    urlRef.current = url;
    setError(null);

    // Close existing connection cleanly
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = true;

    try {
      console.log('Connecting to WebSocket:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnectingRef.current = false;
        setConnected(true);

        // Send any pending messages
        while (pendingMessagesRef.current.length > 0) {
          const msg = pendingMessagesRef.current.shift();
          ws.send(JSON.stringify(msg));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected, code:', event.code);
        isConnectingRef.current = false;
        setConnected(false);
        wsRef.current = null;

        // Only reconnect on abnormal closure and if we have a URL
        if (event.code !== 1000 && urlRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting reconnection...');
            connect(urlRef.current);
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't set error state here immediately as onclose usually follows with more info
        // or unexpected errors might recover. But for connection failure it's key.
        setError('Connection failed');
        isConnectingRef.current = false;
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect');
      isConnectingRef.current = false;
    }
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, queuing message:', message.type);
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
      wsRef.current.onclose = null; // Prevent reconnect
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    lastMessage,
    error,
    connect,
    send,
    disconnect
  };
}

export default useWebSocket;
