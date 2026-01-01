import React from 'react';
import './DragOverlay.css';

function DragOverlay({ dragItem, cursorPos }) {
    if (!dragItem || !cursorPos) return null;

    const { initials, color } = dragItem;

    const style = {
        position: 'fixed',
        left: cursorPos.x,
        top: cursorPos.y,
        transform: 'translate(-50%, -50%) scale(1.2)', // Centered on cursor and slightly larger
        pointerEvents: 'none', // Crucial: lets events pass through to underlying elements
        zIndex: 9999,
    };

    return (
        <div className="drag-overlay" style={style}>
            <div
                className="drag-token"
                style={{
                    borderColor: color,
                    color: color,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    boxShadow: `0 0 15px ${color}`
                }}
            >
                <span className="token-initials">{initials}</span>
            </div>
        </div>
    );
}

export default DragOverlay;
