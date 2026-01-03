import React, { useState, useEffect, useRef } from 'react';
import { formatToastMessage, getToastIcon, getToastClass } from '../utils/announcementUtils';
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
    const touchStartY = useRef(null);

    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartY.current === null) return;

        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchStartY.current - touchEndY;

        // Swipe up (positive diffY) > 50px
        if (diffY > 50) {
            setToasts([]);
        }

        touchStartY.current = null;
    };

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
                <div
                    key={toast.id}
                    className={`log-toast ${getToastClass(toast.type)}`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <span className="toast-icon">{getToastIcon(toast.type, toast)}</span>
                    <span className="toast-message">{toast.formattedMessage}</span>
                </div>
            ))}
        </div>
    );
}

export default LogToast;
