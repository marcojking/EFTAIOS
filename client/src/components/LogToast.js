import React, { useState, useEffect } from 'react';
import './LogToast.css';

function LogToast({ announcements }) {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        // Get the latest announcement
        const latest = announcements[announcements.length - 1];

        // Check if we already have this one (simple timestamp/id check)
        // Using a combination of timestamp and type/message to be unique enough
        const id = `${latest.timestamp}-${latest.type}-${latest.message.substring(0, 10)}`;

        // Avoid duplicate toasts for the same event if re-renders happen
        setToasts(prev => {
            if (prev.some(t => t.id === id)) return prev;
            return [...prev, { ...latest, id, expiresAt: Date.now() + 6000 }];
        });

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
                    <span className="toast-icon">{getAnnouncementIcon(toast.type)}</span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}

function getToastClass(type) {
    switch (type) {
        case 'ATTACK':
        case 'ELIMINATED':
            return 'danger';
        case 'ESCAPE':
            return 'success';
        case 'ESCAPE_FAILED':
            return 'warning';
        case 'GAME_END':
            return 'highlight';
        default:
            return '';
    }
}

function getAnnouncementIcon(type) {
    switch (type) {
        case 'GAME_START': return '🚀';
        case 'NOISE': return '📢';
        case 'SILENCE': return '🤫';
        case 'ATTACK': return '⚔️';
        case 'DEFENSE_USED': return '🛡️';
        case 'ESCAPE': return '🚪';
        case 'ESCAPE_FAILED': return '🔒';
        case 'ELIMINATED': return '💀';
        case 'SPOTLIGHT': return '🔦';
        case 'GAME_END': return '🏁';
        default: return '📝';
    }
}

export default LogToast;
