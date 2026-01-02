import { useRef, useCallback } from 'react';

/**
 * Hook to manage token interactions:
 * - Click/tap: Select token for placement on map
 * - Right-click or long-press: Toggle guess color
 * @param {object} params
 * @param {string} params.playerId - The ID of the player being interacted with
 * @param {Function} params.onSelect - Called when token is tapped/clicked (for placement)
 * @param {Function} params.onToggleGuess - Called on right-click or long-press (for color change)
 * @param {number} params.holdDuration - ms to hold before guess toggle triggers (default 500)
 */
export function useTokenDrag({ playerId, onSelect, onToggleGuess, holdDuration = 500 }) {
    const timerRef = useRef(null);
    const startPosRef = useRef(null);
    const longPressTriggeredRef = useRef(false);

    // START: Mouse/Touch Down
    const handleStart = useCallback((e) => {
        // Ignore right-click here - handled by context menu
        if (e.button === 2) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        startPosRef.current = { x: clientX, y: clientY };
        longPressTriggeredRef.current = false;

        // Start long-press timer for guess toggle
        timerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            // Trigger guess toggle on long press
            if (onToggleGuess) {
                onToggleGuess(playerId);
            }
            // Vibrate if on mobile for feedback
            if (navigator.vibrate) navigator.vibrate(50);
        }, holdDuration);

    }, [playerId, onToggleGuess, holdDuration]);

    // MOVE: Cancel timer if moved too much before timer fires
    const handleMove = useCallback((e) => {
        if (!timerRef.current || longPressTriggeredRef.current) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate distance moved
        const dx = clientX - startPosRef.current.x;
        const dy = clientY - startPosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Tolerance for 'wiggle' during hold (10px)
        if (dist > 10) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // END: Mouse/Touch Up
    const handleEnd = useCallback((e) => {
        // If timer is still running, it means we released EARLY -> Select for placement
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;

            if (!longPressTriggeredRef.current && onSelect) {
                // It was a tap/click -> Select token for placement
                onSelect(playerId);
            }
        }

        // Reset state
        longPressTriggeredRef.current = false;
        startPosRef.current = null;
    }, [playerId, onSelect]);

    // RIGHT-CLICK: Toggle guess color
    const handleContextMenu = useCallback((e) => {
        e.preventDefault(); // Prevent browser context menu
        if (onToggleGuess) {
            onToggleGuess(playerId);
        }
    }, [playerId, onToggleGuess]);

    return {
        handlers: {
            onMouseDown: handleStart,
            onTouchStart: handleStart,
            onMouseMove: handleMove,
            onTouchMove: handleMove,
            onMouseUp: handleEnd,
            onTouchEnd: handleEnd,
            onMouseLeave: handleEnd,
            onContextMenu: handleContextMenu // Right-click handler
        }
    };
}
