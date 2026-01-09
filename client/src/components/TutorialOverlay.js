import React, { useState, useEffect } from 'react';
import './TutorialOverlay.css';

/**
 * TutorialOverlay - Displays tutorial tips and guidance for new players
 * 
 * Props:
 * - tips: Array of tip objects { title, message, priority }
 * - isFirstTurn: boolean - show full walkthrough on first turn
 * - turnNumber: current turn number
 * - onDismiss: callback when tips are dismissed
 */
function TutorialOverlay({ tips, isFirstTurn, turnNumber, onDismiss }) {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isMinimized, setIsMinimized] = useState(false);
    const [hasSeenFirstTurn, setHasSeenFirstTurn] = useState(false);

    // Reset when new tips arrive
    useEffect(() => {
        if (tips && tips.length > 0) {
            setCurrentTipIndex(0);
            setIsMinimized(false);
        }
    }, [tips]);

    // Track if user has seen the first turn walkthrough
    useEffect(() => {
        if (isFirstTurn && !hasSeenFirstTurn) {
            setHasSeenFirstTurn(true);
        }
    }, [isFirstTurn, hasSeenFirstTurn]);

    if (!tips || tips.length === 0) {
        return null;
    }

    const currentTip = tips[currentTipIndex];
    const hasMultipleTips = tips.length > 1;

    const handleNext = () => {
        if (currentTipIndex < tips.length - 1) {
            setCurrentTipIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentTipIndex > 0) {
            setCurrentTipIndex(prev => prev - 1);
        }
    };

    const handleMinimize = () => {
        setIsMinimized(true);
    };

    const handleExpand = () => {
        setIsMinimized(false);
    };

    // Minimized view - small floating badge
    if (isMinimized) {
        return (
            <div className="tutorial-minimized" onClick={handleExpand}>
                <span className="tutorial-minimized-icon">🎓</span>
                <span className="tutorial-minimized-text">Tips</span>
                <span className="tutorial-minimized-count">{tips.length}</span>
            </div>
        );
    }

    // First turn full walkthrough
    if (isFirstTurn && turnNumber === 1) {
        return (
            <div className="tutorial-overlay tutorial-first-turn">
                <div className="tutorial-card tutorial-welcome">
                    <div className="tutorial-header">
                        <span className="tutorial-icon">🎓</span>
                        <h2>Your Turn!</h2>
                        <button className="tutorial-minimize" onClick={handleMinimize}>−</button>
                    </div>

                    <div className="tutorial-content">
                        <div className="tutorial-tip-title">{currentTip?.title}</div>
                        <div className="tutorial-tip-message">{currentTip?.message}</div>
                    </div>

                    {hasMultipleTips && (
                        <div className="tutorial-navigation">
                            <button
                                className="tutorial-nav-btn"
                                onClick={handlePrevious}
                                disabled={currentTipIndex === 0}
                            >
                                ← Prev
                            </button>
                            <span className="tutorial-nav-indicator">
                                {currentTipIndex + 1} / {tips.length}
                            </span>
                            <button
                                className="tutorial-nav-btn"
                                onClick={handleNext}
                                disabled={currentTipIndex === tips.length - 1}
                            >
                                Next →
                            </button>
                        </div>
                    )}

                    <div className="tutorial-footer">
                        <div className="tutorial-hint">
                            ⭐ = Recommended moves &nbsp; ⚠️ = Risky moves
                        </div>
                        <button className="tutorial-got-it" onClick={handleMinimize}>
                            Got it! Show me the map
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Regular tip banner (turns 2+)
    return (
        <div className="tutorial-overlay tutorial-banner">
            <div className="tutorial-card tutorial-compact">
                <div className="tutorial-header-compact">
                    <span className="tutorial-icon-small">💡</span>
                    <span className="tutorial-tip-title-compact">{currentTip?.title}</span>
                    <button className="tutorial-close" onClick={handleMinimize}>×</button>
                </div>
                <div className="tutorial-tip-message-compact">{currentTip?.message}</div>

                {hasMultipleTips && (
                    <div className="tutorial-dots">
                        {tips.map((_, idx) => (
                            <span
                                key={idx}
                                className={`tutorial-dot ${idx === currentTipIndex ? 'active' : ''}`}
                                onClick={() => setCurrentTipIndex(idx)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TutorialOverlay;
