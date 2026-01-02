import React, { useState, useEffect, useRef } from 'react';
import './LogToast.css';

// Events that should NOT show toasts (internal/popup only)
const SILENT_TYPES = [
    'GLOBAL_POPUP',      // Popups are shown separately
    'POWER_USED',        // Keep power usage secret
    'ITEM_USED',         // Keep item usage secret
    'DEFENSE_USED',      // Defense appears as miss
    'CLONE_USED',        // Clone appears as respawn
    'SILENT_SECTOR',     // This triggers SILENT_MOVE toast instead
];

function LogToast({ announcements }) {
    const [toasts, setToasts] = useState([]);
    const processedCountRef = useRef(0);

    // Process new announcements
    useEffect(() => {
        if (!announcements || announcements.length === 0) {
            processedCountRef.current = 0;
            return;
        }

        // Only process NEW announcements since last check
        const newAnnouncements = announcements.slice(processedCountRef.current);

        if (newAnnouncements.length === 0) return;

        // Update processed count
        processedCountRef.current = announcements.length;

        // Filter and create toasts for new announcements
        const newToasts = newAnnouncements
            .filter(a => !SILENT_TYPES.includes(a.type))
            .map(a => ({
                ...a,
                id: `${a.timestamp}-${a.type}`,
                formattedMessage: formatToastMessage(a),
                expiresAt: Date.now() + 6000
            }));

        if (newToasts.length > 0) {
            setToasts(prev => [...prev, ...newToasts]);
        }
    }, [announcements]);

    // Clean up expired toasts
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setToasts(prev => {
                const remaining = prev.filter(t => t.expiresAt > now);
                if (remaining.length !== prev.length) {
                    return remaining;
                }
                return prev;
            });
        }, 100);

        return () => clearInterval(interval);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="log-toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`log-toast ${getToastClass(toast.type)}`}>
                    <span className="toast-icon">{getToastIcon(toast.type, toast)}</span>
                    <span className="toast-message">{toast.formattedMessage}</span>
                </div>
            ))}
        </div>
    );
}

function formatToastMessage(announcement) {
    const { type, playerName, sector, sectors, message } = announcement;

    switch (type) {
        case 'GAME_START':
            return message || 'Game started!';

        case 'NOISE':
            // Handle double noise (sectors array) vs single noise
            if (sectors && sectors.length === 2) {
                return `${playerName} — Noise in ${sectors[0]} and ${sectors[1]}`;
            }
            return `${playerName} — Noise in ${sector}`;

        case 'SILENCE':
            return `${playerName} — Silence in all sectors`;

        case 'SILENT_MOVE':
        case 'SILENT_SECTOR':
            return `${playerName} — Silent Sector`;

        case 'ATTACK': {
            const victims = announcement.victims || [];
            if (victims.length === 0) {
                return `${playerName} attacked ${sector} — miss!`;
            }
            // Check if any victims mutated (human -> alien)
            const mutated = victims.filter(v => v.role === 'human');
            const killed = victims.filter(v => v.role === 'alien');

            if (mutated.length > 0 && killed.length > 0) {
                const mutatedNames = mutated.map(v => v.name).join(', ');
                const killedNames = killed.map(v => v.name).join(', ');
                return `${playerName} attacked ${sector} — ${mutatedNames} MUTATED! ${killedNames} killed!`;
            } else if (mutated.length > 0) {
                const names = mutated.map(v => v.name).join(', ');
                return `${playerName} attacked ${sector} — ${names} MUTATED!`;
            } else {
                const names = killed.map(v => v.name).join(', ');
                return `${playerName} attacked ${sector} — ${names} killed!`;
            }
        }

        case 'MUTATION':
            return `${playerName} MUTATED into an Alien!`;

        case 'ELIMINATED':
            return message || `${playerName} eliminated!`;

        case 'ESCAPE':
            return `${playerName} escaped via ${sector}!`;

        case 'ESCAPE_FAILED':
            return `${playerName} found ${sector} damaged!`;

        case 'SPOTLIGHT': {
            const revealed = announcement.revealed || [];
            if (revealed.length === 0) {
                return `Spotlight ${sector} — nobody found`;
            }
            const names = revealed.map(r => r.name).join(', ');
            return `Spotlight ${sector} — ${names} found!`;
        }

        case 'SENSOR': {
            if (announcement.immune) {
                return `Sensor — ${announcement.targetName} is immune!`;
            }
            return `Sensor — ${announcement.targetName} is in ${announcement.targetSector}`;
        }

        case 'REVEAL_IDENTITY': {
            const role = announcement.targetRole?.toUpperCase() || 'UNKNOWN';
            return `${playerName} revealed ${announcement.targetName} is ${role}`;
        }

        case 'GAME_END':
            return message || 'Game Over!';

        default:
            return message || 'Event occurred';
    }
}

function getToastIcon(type, announcement) {
    switch (type) {
        case 'GAME_START': return '🚀';
        case 'NOISE': return '📢';
        case 'SILENCE':
        case 'SILENT_MOVE':
        case 'SILENT_SECTOR': return '🤫';
        case 'ATTACK': {
            // Use different icons based on outcome
            const victims = announcement?.victims || [];
            if (victims.length === 0) return '⚔️';
            const hasMutation = victims.some(v => v.role === 'human');
            if (hasMutation) return '🧬';
            return '💀';
        }
        case 'MUTATION': return '🧬';
        case 'ELIMINATED': return '💀';
        case 'ESCAPE': return '🚪';
        case 'ESCAPE_FAILED': return '🔒';
        case 'SPOTLIGHT': return '🔦';
        case 'SENSOR': return '📡';
        case 'REVEAL_IDENTITY': return '🩺';
        case 'GAME_END': return '🏁';
        default: return '📝';
    }
}

function getToastClass(type) {
    switch (type) {
        case 'ATTACK':
        case 'ELIMINATED':
        case 'MUTATION':
            return 'danger';
        case 'ESCAPE':
            return 'success';
        case 'ESCAPE_FAILED':
            return 'warning';
        case 'GAME_END':
            return 'highlight';
        case 'SPOTLIGHT':
        case 'SENSOR':
        case 'REVEAL_IDENTITY':
            return 'info';
        default:
            return '';
    }
}

export default LogToast;
