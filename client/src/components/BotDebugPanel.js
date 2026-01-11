import React, { useState } from 'react';
import './BotDebugPanel.css';

/**
 * BotDebugPanel - Debug visualization for bot decision-making
 * Only visible to host/spectator view
 */
function BotDebugPanel({ botDebugInfo, players }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  if (!botDebugInfo || Object.keys(botDebugInfo).length === 0) {
    return null;
  }

  // Get bot players
  const botPlayers = players?.filter(p => p.id?.startsWith('bot_')) || [];

  if (botPlayers.length === 0) {
    return null;
  }

  const selectedBotInfo = selectedBot ? botDebugInfo[selectedBot] : null;

  return (
    <div className={`bot-debug-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="debug-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="debug-title">Bot Debug</span>
        <span className="debug-toggle">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="debug-content">
          {/* Bot selector tabs */}
          <div className="bot-tabs">
            {botPlayers.map(bot => (
              <button
                key={bot.id}
                className={`bot-tab ${selectedBot === bot.id ? 'active' : ''} ${!bot.alive ? 'dead' : ''}`}
                onClick={() => setSelectedBot(selectedBot === bot.id ? null : bot.id)}
              >
                {bot.name}
                {bot.role && <span className={`role-indicator ${bot.role}`}></span>}
              </button>
            ))}
          </div>

          {/* Selected bot details */}
          {selectedBotInfo && (
            <div className="bot-details">
              {/* Personality */}
              <div className="debug-section">
                <h4>Personality</h4>
                <div className="personality-grid">
                  <PersonalityStat label="Aggression" value={selectedBotInfo.personality?.aggression} />
                  <PersonalityStat label="Risk Tolerance" value={selectedBotInfo.personality?.riskTolerance} />
                  <div className="personality-item">
                    <span className="stat-label">Hunting Style</span>
                    <span className="stat-value text">{selectedBotInfo.personality?.huntingStyle || 'N/A'}</span>
                  </div>
                  <div className="personality-item">
                    <span className="stat-label">Deception Style</span>
                    <span className="stat-value text">{selectedBotInfo.personality?.deceptionStyle || 'N/A'}</span>
                  </div>
                  <div className="personality-item">
                    <span className="stat-label">Escape Urgency</span>
                    <span className="stat-value">Turn {selectedBotInfo.personality?.escapeUrgency || '?'}</span>
                  </div>
                </div>
              </div>

              {/* Current Thought */}
              <div className="debug-section">
                <h4>Current Thought</h4>
                <div className="current-thought">
                  {selectedBotInfo.currentThought || 'No decision yet'}
                </div>
              </div>

              {/* Tracker Info - Player Beliefs */}
              {selectedBotInfo.trackerInfo && Object.keys(selectedBotInfo.trackerInfo).length > 0 && (
                <div className="debug-section">
                  <h4>Player Beliefs</h4>
                  <div className="beliefs-list">
                    {Object.entries(selectedBotInfo.trackerInfo).map(([playerId, belief]) => (
                      <div key={playerId} className="belief-item">
                        <span className="belief-name">{belief.name}</span>
                        <span className={`belief-role ${belief.roleProb?.human > 0.5 ? 'human' : 'alien'}`}>
                          {belief.roleProb?.human > 0.5
                            ? `Human (${(belief.roleProb.human * 100).toFixed(0)}%)`
                            : `Alien (${(belief.roleProb.alien * 100).toFixed(0)}%)`
                          }
                        </span>
                        <span className="belief-location">
                          @ {belief.mostLikelySector || '?'} ({(belief.highestProb * 100).toFixed(0)}%)
                        </span>
                        {belief.isEscaped && <span className="belief-status escaped">Escaped</span>}
                        {belief.isEliminated && <span className="belief-status dead">Dead</span>}
                        {belief.isMutated && <span className="belief-status mutated">Mutated</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Decision Log */}
              {selectedBotInfo.moveHistory && selectedBotInfo.moveHistory.length > 0 && (
                <div className="debug-section">
                  <h4>Recent Decisions</h4>
                  <div className="decision-log">
                    {selectedBotInfo.moveHistory.slice().reverse().map((move, idx) => (
                      <div key={idx} className="decision-item">
                        <span className="decision-turn">T{move.turn}</span>
                        <span className="decision-action">{move.decision?.action}</span>
                        <span className="decision-reason">{move.decision?.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug Log */}
              {selectedBotInfo.plannerInfo?.debugLog && selectedBotInfo.plannerInfo.debugLog.length > 0 && (
                <div className="debug-section">
                  <h4>Debug Log</h4>
                  <div className="debug-log">
                    {selectedBotInfo.plannerInfo.debugLog.map((log, idx) => (
                      <div key={idx} className="log-line">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary view when no bot selected */}
          {!selectedBotInfo && (
            <div className="debug-summary">
              <p className="summary-hint">Select a bot above to see detailed debug info</p>
              <div className="summary-grid">
                {botPlayers.map(bot => {
                  const info = botDebugInfo[bot.id];
                  return (
                    <div key={bot.id} className="summary-card">
                      <div className="summary-name">{bot.name}</div>
                      <div className="summary-thought">
                        {info?.currentThought || 'Waiting...'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonalityStat({ label, value }) {
  const percentage = value ? (value * 100).toFixed(0) : 0;
  const barWidth = value ? value * 100 : 0;

  return (
    <div className="personality-item">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-container">
        <div className="stat-bar" style={{ width: `${barWidth}%` }}></div>
        <span className="stat-value">{percentage}%</span>
      </div>
    </div>
  );
}

export default BotDebugPanel;
