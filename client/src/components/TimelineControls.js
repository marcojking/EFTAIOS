import React from 'react';
import './TimelineControls.css';

function TimelineControls({
    currentTurn,
    maxTurn,
    viewingTurn,
    isGameEnded,
    onPrevTurn,
    onNextTurn,
    onGoToTurn,
    onGoLive,
    turnSummary
}) {
    const isLive = viewingTurn === null || viewingTurn === currentTurn;
    const displayTurn = viewingTurn ?? currentTurn;

    // Generate turn options for dropdown
    const turnOptions = [];
    for (let i = 1; i <= (isGameEnded ? currentTurn : currentTurn); i++) {
        turnOptions.push(i);
    }

    return (
        <div className={`timeline-controls ${isLive ? 'live' : 'historical'}`}>
            {/* Live/Historical Indicator */}
            <div className="timeline-status">
                {isLive ? (
                    <div className="live-indicator">
                        <span className="live-dot"></span>
                        <span className="live-text">LIVE</span>
                    </div>
                ) : (
                    <div className="historical-indicator">
                        <span className="history-icon">⏪</span>
                        <span className="history-text">VIEWING HISTORY</span>
                    </div>
                )}
            </div>

            {/* Navigation Controls */}
            <div className="timeline-nav">
                <button
                    className="nav-btn prev"
                    onClick={onPrevTurn}
                    disabled={displayTurn <= 1}
                    title="Previous Turn"
                >
                    ◀
                </button>

                <div className="turn-selector">
                    <span className="turn-label">Turn</span>
                    <select
                        value={displayTurn}
                        onChange={(e) => onGoToTurn(parseInt(e.target.value))}
                        className="turn-dropdown"
                    >
                        {turnOptions.map(t => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                    <span className="turn-max">/ {isGameEnded ? currentTurn : maxTurn}</span>
                </div>

                <button
                    className="nav-btn next"
                    onClick={onNextTurn}
                    disabled={isLive || displayTurn >= currentTurn}
                    title="Next Turn"
                >
                    ▶
                </button>

                {!isLive && (
                    <button
                        className="live-btn"
                        onClick={onGoLive}
                        title="Return to Live View"
                    >
                        <span className="live-pulse"></span>
                        GO LIVE
                    </button>
                )}
            </div>

            {/* Turn Summary */}
            {turnSummary && (
                <div className="turn-summary">
                    {turnSummary}
                </div>
            )}
        </div>
    );
}

export default TimelineControls;
