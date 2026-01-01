import React, { useState, useEffect } from 'react';
import './LandingScreen.css';

function LandingScreen({ onCreateRoom, onJoinRoom, isConnecting, isConnected, error }) {
    const [mode, setMode] = useState('menu'); // 'menu', 'join', 'create'
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');

    // Check URL query params for initial room code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('room');
        if (code) {
            setRoomCode(code);
            setMode('join');
        }
    }, []);

    const handleCreate = () => {
        onCreateRoom();
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (name && roomCode) {
            onJoinRoom(name, roomCode);
        }
    };

    // Ready if connected AND not currently busy connecting/creating
    // Note: isConnecting is typically false once connected, unless we reuse it for 'creating room' spinner
    // In App.js logic, isConnecting comes from useWebSocket which is strictly WS connection status.
    // So if isConnected is true, isConnecting should be false.
    const isReady = isConnected && !isConnecting;

    return (
        <div className="landing-screen">
            <div className="landing-content">
                <h1 className="game-title">
                    <span className="title-escape">ESCAPE</span>
                    <span className="title-from">FROM THE</span>
                    <span className="title-aliens">ALIENS</span>
                    <span className="title-space">IN OUTER SPACE</span>
                </h1>

                {error && <div className="error-message">{error}</div>}

                {/* Visual feedback for connection status */}
                {!isConnected && !error && (
                    <div style={{ color: '#aaa', marginBottom: '20px' }}>
                        <span className="loading-spinner"></span> Connecting to server...
                    </div>
                )}

                {mode === 'menu' && (
                    <div className="menu-options">
                        <button
                            className="option-btn host-btn"
                            onClick={handleCreate}
                            disabled={!isReady}
                            style={{ opacity: !isReady ? 0.6 : 1, cursor: !isReady ? 'not-allowed' : 'pointer' }}
                        >
                            {!isConnected ? 'Connecting...' : (isConnecting ? 'Creating...' : 'Create New Room (Host)')}
                        </button>
                        <div className="divider">OR</div>
                        <button
                            className="option-btn join-btn"
                            onClick={() => setMode('join')}
                            disabled={!isReady}
                            style={{ opacity: !isReady ? 0.6 : 1 }}
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
                                maxLength="4"
                                placeholder="ABCD"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Player Name</label>
                            <input
                                type="text"
                                placeholder="Enter Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                maxLength="12"
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
                                disabled={!isReady || !name || roomCode.length !== 4}
                            >
                                {isConnecting ? 'Joining...' : 'Join Room'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="version-tag">Cloud Edition v2.0 - Room System</div>
        </div>
    );
}

export default LandingScreen;
