import React, { useState, useEffect } from 'react';
import './LandingScreen.css';

function LandingScreen({ onCreateRoom, onJoinRoom, isConnecting, error }) {
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

    return (
        <div className="landing-screen">
            <div className="landing-content">
                <h1>EFTAIOS</h1>
                <div className="subtitle">Escape From The Alien In Outer Space</div>

                {error && <div className="error-message">{error}</div>}

                {mode === 'menu' && (
                    <div className="menu-options">
                        <button
                            className="option-btn host-btn"
                            onClick={handleCreate}
                            disabled={isConnecting}
                        >
                            {isConnecting ? 'Creating...' : 'Create New Room (Host)'}
                        </button>
                        <div className="divider">OR</div>
                        <button
                            className="option-btn join-btn"
                            onClick={() => setMode('join')}
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
                                disabled={isConnecting || !name || roomCode.length !== 4}
                            >
                                {isConnecting ? 'Connecting...' : 'Join Room'}
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
