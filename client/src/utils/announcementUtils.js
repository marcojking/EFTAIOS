
// Helper utilities for announcement formatting
// Shared between LogToast and GameLog

export function formatToastMessage(announcement) {
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

export function getToastIcon(type, announcement) {
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

export function getToastClass(type) {
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
