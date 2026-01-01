import React, { useEffect, useRef } from 'react';
import './GameLog.css';

function GameLog({ announcements }) {
  const logRef = useRef(null);

  // Auto-scroll to top when new announcements arrive (since newest are at top)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [announcements]);

  const getAnnouncementIcon = (type) => {
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
  };

  const getAnnouncementClass = (type) => {
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
  };

  return (
    <div className="game-log">
      <div className="log-header">
        <h3>Game Log</h3>
      </div>

      <div className="log-entries" ref={logRef}>
        {(!announcements || announcements.length === 0) && (
          <div className="log-empty">
            No events yet...
          </div>
        )}

        {[...(announcements || [])].reverse().map((announcement, index) => (
          <div
            key={index}
            className={`log-entry ${getAnnouncementClass(announcement.type)}`}
          >
            <div className="entry-header">
              <span className="entry-icon">{getAnnouncementIcon(announcement.type)}</span>
              <span className="entry-turn">Turn {announcement.turn}</span>
            </div>
            <div className="entry-message">
              {announcement.message}
            </div>
            {announcement.sector && (
              <div className="entry-sector">
                Sector: <strong>{announcement.sector}</strong>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameLog;
