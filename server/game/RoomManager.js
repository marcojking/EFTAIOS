const { v4: uuidv4 } = require('uuid');
const GameState = require('./GameState');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // code -> { gameState, lastActivity }
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000); // Check every minute
    }

    // Generate a random 4-letter code
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O to avoid confusion with 1, 0
        let code = '';
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    createRoom(mapData) {
        const code = this.generateCode();
        const gameState = new GameState(mapData);

        this.rooms.set(code, {
            gameState,
            lastActivity: Date.now()
        });

        console.log(`Room created: ${code}`);
        return code;
    }

    getRoom(code) {
        // Case insensitive lookup
        const upperCode = code?.toUpperCase();
        const room = this.rooms.get(upperCode);

        if (room) {
            room.lastActivity = Date.now();
            return room.gameState;
        }
        return null;
    }

    removeRoom(code) {
        this.rooms.delete(code);
        console.log(`Room removed: ${code}`);
    }

    // Remove empty rooms that haven't been touched in 1 hour
    cleanup() {
        const now = Date.now();
        const TIMEOUT = 60 * 60 * 1000; // 1 hour

        for (const [code, room] of this.rooms.entries()) {
            if (now - room.lastActivity > TIMEOUT) {
                this.removeRoom(code);
            }
        }
    }
}

module.exports = RoomManager;
