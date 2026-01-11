import React, { useState, useEffect } from 'react';
import './LandingScreen.css';

function LandingScreen({ onCreateRoom, onJoinRoom, isConnecting, isConnected, error }) {
    const [mode, setMode] = useState('menu');
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false); // Hidden by default, toggle with button
    const [showMenu, setShowMenu] = useState(false); // Side menu state
    const [difficulty, setDifficulty] = useState('standard'); // beginner | standard | advanced

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
            {/* Menu Button */}
            <button
                className="menu-toggle-btn"
                onClick={() => setShowMenu(true)}
                title="Open Menu"
            >
                ☰
            </button>

            {/* Side Menu */}
            <div className={`side-menu ${showMenu ? 'open' : ''}`}>
                <div className="menu-header">
                    <h3>Menu</h3>
                    <button
                        className="close-menu-btn"
                        onClick={() => setShowMenu(false)}
                    >
                        ×
                    </button>
                </div>

                <div className="menu-content">
                    {/* Connection Status */}
                    <div className="status-indicator" style={{
                        borderColor: isConnected ? '#0f0' : '#fa0',
                        color: isConnected ? '#0f0' : '#fa0',
                        background: isConnected ? 'rgba(0,255,0,0.1)' : 'rgba(255,165,0,0.1)'
                    }}>
                        <div className="status-dot" style={{ background: isConnected ? '#0f0' : '#fa0' }}></div>
                        {isConnected ? 'Connected to Server' : 'Connecting...'}
                    </div>

                    <div className="menu-divider"></div>

                    {/* Version Info */}
                    <div className="version-info">
                        Cloud Edition v2.1<br />
                        <span className="debug-tag">DEBUG MODE</span>
                    </div>

                    <div className="menu-divider"></div>

                    {/* Debug Logs */}
                    <div className="debug-section">
                        <button
                            className="toggle-debug-btn"
                            onClick={() => setShowDebug(!showDebug)}
                        >
                            {showDebug ? 'Hide' : 'Show'} Debug Log
                        </button>

                        {showDebug && (
                            <div className="debug-console">
                                {debugLogs.length === 0 ? (
                                    <div className="empty-log">Waiting for events...</div>
                                ) : (
                                    debugLogs.map((log, i) => <div key={i} className="log-line">{log}</div>)
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Backdrop for menu */}
            {showMenu && <div className="menu-backdrop" onClick={() => setShowMenu(false)}></div>}

            <div className="landing-content">
                {/* Restored Cool Title */}
                <div className="game-title">
                    <span className="title-escape">ESCAPE</span>
                    <span className="title-from">FROM THE</span>
                    <span className="title-aliens">ALIENS</span>
                    <span className="title-space">IN OUTER SPACE</span>
                </div>

                {error && <div className="error-message">{error}</div>}

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
                            <span className="mode-icon">🚀</span>
                            <span className="mode-label">Create New Room</span>
                            <span className="mode-desc">Start a new game as Host</span>
                        </button>

                        <div className="divider-text">OR</div>

                        <button
                            className="option-btn join-btn"
                            onClick={() => { addLog('Join mode clicked'); setMode('join'); }}
                            disabled={!isReady}
                            style={{ opacity: !isReady ? 0.5 : 1 }}
                        >
                            <span className="mode-icon">👾</span>
                            <span className="mode-label">Join Existing Room</span>
                        </button>


                    </div>
                )}

                {mode === 'join' && (
                    <form className="join-form" onSubmit={handleJoin}>
                        <div className="form-header" style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <h2>Join Game</h2>
                        </div>

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
                                autoFocus
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
        </div>
    );
}

export default LandingScreen;
