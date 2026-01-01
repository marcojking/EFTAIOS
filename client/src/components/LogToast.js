import React, { useState, useEffect } from 'react';
import './LogToast.css';

function LogToast({ announcements }) {
    const [visibleToasts, setVisibleToasts] = useState([]);
    const [lastCount, setLastCount] = useState(0);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        const currentCount = announcements.length;

        // Check if there are new announcements
        if (currentCount > lastCount && lastCount > 0) {
            // Get new announcements (the ones added since last check)
            const newAnnouncements = announcements.slice(lastCount);

            // Add each new announcement as a toast
            newAnnouncements.forEach((announcement, idx) => {
                const toastId = `${Date.now()}-${idx}`;

                setVisibleToasts(prev => [...prev, { ...announcement, id: toastId }]);

                // Remove after 2 seconds
                setTimeout(() => {
                    setVisibleToasts(prev => prev.filter(t => t.id !== toastId));
                }, 2000);
            });
        }

        setLastCount(currentCount);
    }, [announcements, lastCount]);

    const getIcon = (type) => {
        switch (type) {
            case 'GAME_START': return '🚀';
            case 'NOISE': return '📢';
            case 'SILENCE': return '🤫';
            case 'SILENT_MOVE': return '🤫';
            case 'ATTACK': return '⚔️';
            case 'DEFENSE_USED': return '🛡️';
            case 'ESCAPE': return '🚪';
            case 'ESCAPE_FAILED': return '🔒';
            case 'ELIMINATED': return '💀';
            case 'SPOTLIGHT': return '🔦';
            case 'POWER_USED': return '✨';
            case 'GAME_END': return '🏁';
            default: return '📝';
        }
    };

    if (visibleToasts.length === 0) return null;

    return (
        <div className="log-toast-container">
            {visibleToasts.map((toast) => (
                <div key={toast.id} className={`log-toast log-toast-${toast.type?.toLowerCase()}`}>
                    <span className="log-toast-icon">{getIcon(toast.type)}</span>
                    <span className="log-toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}

export default LogToast;
