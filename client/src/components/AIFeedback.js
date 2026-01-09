import React, { useState } from 'react';
import './AIFeedback.css';

/**
 * AI Feedback Component
 * Allows users to rate AI moves and provide feedback for strategy improvement
 */
function AIFeedback({
    currentTurn,
    lastAIMove,
    onFeedback,
    onExportLog,
    isMinimized = false
}) {
    const [comment, setComment] = useState('');
    const [showReason, setShowReason] = useState(false);
    const [minimized, setMinimized] = useState(isMinimized);

    if (!lastAIMove) return null;

    const handleFeedback = (rating) => {
        onFeedback(currentTurn, rating, comment);
        setComment('');
    };

    if (minimized) {
        return (
            <div className="ai-feedback-minimized" onClick={() => setMinimized(false)}>
                🤖 AI Made Move: {lastAIMove.target}
            </div>
        );
    }

    return (
        <div className="ai-feedback-panel">
            <div className="ai-feedback-header">
                <span className="ai-icon">🤖</span>
                <span>AI moved to <strong>{lastAIMove.target}</strong></span>
                <button className="minimize-btn" onClick={() => setMinimized(true)}>−</button>
            </div>

            {/* Show AI's reasoning */}
            <div className="ai-reasoning">
                <button
                    className="toggle-reason-btn"
                    onClick={() => setShowReason(!showReason)}
                >
                    {showReason ? '▼ Hide Reasoning' : '▶ Why this move?'}
                </button>

                {showReason && (
                    <ul className="reason-list">
                        {lastAIMove.reasons?.map((reason, i) => (
                            <li key={i}>{reason}</li>
                        ))}
                        <li className="score-info">Score: {lastAIMove.score}</li>
                    </ul>
                )}
            </div>

            {/* Feedback buttons */}
            <div className="feedback-section">
                <span className="feedback-prompt">Rate this move:</span>
                <div className="feedback-buttons">
                    <button
                        className="feedback-btn good"
                        onClick={() => handleFeedback('good')}
                        title="Good move"
                    >
                        👍
                    </button>
                    <button
                        className="feedback-btn neutral"
                        onClick={() => handleFeedback('neutral')}
                        title="Okay move"
                    >
                        😐
                    </button>
                    <button
                        className="feedback-btn bad"
                        onClick={() => handleFeedback('bad')}
                        title="Bad move"
                    >
                        👎
                    </button>
                </div>
            </div>

            {/* Optional comment */}
            <div className="comment-section">
                <input
                    type="text"
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="comment-input"
                />
            </div>

            {/* Export log button */}
            {onExportLog && (
                <button className="export-btn" onClick={onExportLog}>
                    📥 Export Strategy Log
                </button>
            )}
        </div>
    );
}

export default AIFeedback;
