import { useRef, useCallback } from 'react';

/**
 * Hook to manage "hold to drag" interaction
 * @param {object} params
 * @param {string} params.playerId - The ID of the player being interacted with
 * @param {Function} params.onDragStart - Called when hold duration is met (300ms)
 * @param {Function} params.onTap - Called if released before hold duration (click/tap)
 * @param {number} params.holdDuration - ms to hold before drag starts (default 300)
 */
export function useTokenDrag({ playerId, onDragStart, onTap, holdDuration = 300 }) {
    const timerRef = useRef(null);
    const startPosRef = useRef(null);
    const isDraggingRef = useRef(false);

    // START: Mouse/Touch Down
    const handleStart = useCallback((e) => {
        // Prevent default to stop scrolling/text selection
        // e.preventDefault(); // CAREFUL: This might block scrolling if we are strict. 
        // Usually better to only prevent if we confirm it's a drag, but for hold-to-drag, 
        // we might need to let the browser decide until timer fires.

        // Get coordinates
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        startPosRef.current = { x: clientX, y: clientY };
        isDraggingRef.current = false;

        // Start Timer
        timerRef.current = setTimeout(() => {
            isDraggingRef.current = true;
            // Trigger drag start callback
            if (onDragStart) {
                onDragStart(playerId, { x: clientX, y: clientY });
            }
            // Vibrate if on mobile for feedback
            if (navigator.vibrate) navigator.vibrate(50);
        }, holdDuration);

    }, [playerId, onDragStart, holdDuration]);

    // MOVE: Cancel timer if moved too much before timer fires
    const handleMove = useCallback((e) => {
        if (!timerRef.current || isDraggingRef.current) return;

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
        // If timer is still running, it means we released EARLY -> Tap
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;

            if (!isDraggingRef.current && onTap) {
                // It was a tap
                // e.preventDefault(); 
                onTap(playerId);
            }
        }

        // Reset state
        isDraggingRef.current = false;
        startPosRef.current = null;
    }, [playerId, onTap]);

    return {
        handlers: {
            onMouseDown: handleStart,
            onTouchStart: handleStart,
            onMouseMove: handleMove,
            onTouchMove: handleMove,
            onMouseUp: handleEnd,
            onTouchEnd: handleEnd,
            onMouseLeave: handleEnd // Cancel if leaving element while holding
        }
    };
}
