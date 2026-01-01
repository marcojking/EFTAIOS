import React, { useState, useEffect } from 'react';
import './LandingScreen.css';

function LandingScreen({ onCreateRoom, onJoinRoom, isConnecting, isConnected, error }) {
    const [mode, setMode] = useState('menu');
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false); // Hidden by default, toggle with button

    const [isJoining, setIsJoining] = useState(false);

    // Log helper
    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [...prev.slice(-10), `[${time}] ${msg}`]);
    };

    // Check URL query params for initial room code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('room');
        if (code) {
            setRoomCode(code);
            setMode('join');
            addLog(`URL has room code: ${code}`);
        }
    }, []);

    // Log connection state changes
    useEffect(() => {
        addLog(`isConnected: ${isConnected}, isConnecting: ${isConnecting}`);
    }, [isConnected, isConnecting]);

    // Log errors and reset joining state
    useEffect(() => {
        if (error) {
            addLog(`ERROR: ${error}`);
            setIsJoining(false); // Reset join state on error
        }
    }, [error]);

    const handleCreate = () => {
        addLog('Create Room button clicked!');
        if (!isConnected) {
            addLog('WARNING: Not connected, button should be disabled');
            return;
        }
        addLog('Calling onCreateRoom...');
        onCreateRoom();
    };

    const handleJoin = (e) => {
        e.preventDefault();
        addLog(`Join Room clicked: name=${name}, code=${roomCode}`);
        if (name && roomCode && !isJoining) {
            setIsJoining(true); // Disable button to prevent double clicks
            onJoinRoom(name, roomCode);

            // Safety timeout in case server doesn't respond
            setTimeout(() => {
                setIsJoining(false);
            }, 5000);
        }
    };

    const isReady = isConnected && !isConnecting;

    return (
        <div className="landing-screen">
            <div className="landing-content">
                <h1>EFTAIOS</h1>
                <div className="subtitle">Escape From The Alien In Outer Space</div>

                {error && <div className="error-message">{error}</div>}

                {/* Connection Status - Always visible */}
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    background: isConnected ? 'rgba(0,255,0,0.2)' : 'rgba(255,165,0,0.2)',
                    border: `1px solid ${isConnected ? '#0f0' : '#fa0'}`,
                    color: isConnected ? '#0f0' : '#fa0'
                }}>
                    {isConnected ? '✅ Connected to Server' : '⏳ Connecting to Server...'}
                </div>

                {mode === 'menu' && (
                    <div className="menu-options">
                        <button
                            className="option-btn host-btn"
                            onClick={handleCreate}
                            disabled={!isReady}
                            style={{
                                opacity: !isReady ? 0.5 : 1,
                                cursor: !isReady ? 'not-allowed' : 'pointer',
                                pointerEvents: 'auto' // Force clickable for debugging
                            }}
                        >
                            {!isConnected ? '⏳ Waiting for Connection...' : 'Create New Room (Host)'}
                        </button>
                        <div className="divider">OR</div>
                        <button
                            className="option-btn join-btn"
                            onClick={() => { addLog('Join mode clicked'); setMode('join'); }}
                            disabled={!isReady}
                            style={{ opacity: !isReady ? 0.5 : 1 }}
                        >
                            Join Existing Room
                        </button>
                    </div>
                )}

                {mode === 'join' && (
                    <form className="join-form" onSubmit={handleJoin}>
                        <div className="form-group">
                            <label>Room Code</label>
                            <input
                                type="text"
                                placeholder="ABCD"
                                value={roomCode}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase().slice(0, 4);
                                    setRoomCode(val);
                                }}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Player Name</label>
                            <input
                                type="text"
                                placeholder="Enter Name"
                                value={name}
                                onChange={(e) => {
                                    const val = e.target.value.slice(0, 12);
                                    setName(val);
                                }}
                                required
                            />
                        </div>

                        <div className="button-group">
                            <button
                                type="button"
                                className="back-btn"
                                onClick={() => setMode('menu')}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="confirm-join-btn"
                                disabled={!isReady || !name || roomCode.length !== 4 || isJoining}
                            >
                                {isConnecting ? 'Joining...' : (isJoining ? 'Joining...' : 'Join Room')}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Debug Panel - Toggle with button */}
            <div style={{ marginTop: '20px', width: '100%', maxWidth: '500px' }}>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid #444',
                        color: '#888',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '10px'
                    }}
                >
                    {showDebug ? 'Hide' : 'Show'} Debug Log
                </button>

                {showDebug && (
                    <div style={{
                        background: 'rgba(0,0,0,0.8)',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        padding: '10px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#0f0',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        textAlign: 'left'
                    }}>
                        {debugLogs.length === 0 ? (
                            <div style={{ color: '#666' }}>Waiting for events...</div>
                        ) : (
                            debugLogs.map((log, i) => <div key={i}>{log}</div>)
                        )}
                    </div>
                )}
            </div>

            <div className="version-tag">Cloud Edition v2.1 - Debug Mode</div>
        </div>
    );
}

export default LandingScreen;
