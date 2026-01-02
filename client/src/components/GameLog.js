import React, { useEffect, useRef } from 'react';
import { formatToastMessage, getToastIcon, getToastClass } from '../utils/announcementUtils';
import './GameLog.css';

// Events that should be filtered out from LOG (same as Toasts)
const SILENT_TYPES = [
  'GLOBAL_POPUP',      // Popups are shown separately
  'POWER_USED',        // Keep power usage secret
  'ITEM_USED',         // Keep item usage secret
  'DEFENSE_USED',      // Defense appears as miss
  'CLONE_USED',        // Clone appears as respawn
  'SILENT_SECTOR',     // This triggers SILENT_MOVE toast instead
];

function GameLog({ announcements }) {
  const logRef = useRef(null);

  // Auto-scroll to top when new announcements arrive (since newest are at top)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [announcements]);

  const filteredAnnouncements = (announcements || [])
    .filter(a => !SILENT_TYPES.includes(a.type))
    .reverse();

  return (
    <div className="game-log">
      <div className="log-header">
        <h3>Game Log</h3>
      </div>

      <div className="log-entries" ref={logRef}>
        {filteredAnnouncements.length === 0 && (
          <div className="log-empty">
            No events yet...
          </div>
        )}

        {filteredAnnouncements.map((announcement, index) => (
          <div
            key={index}
            className={`log-entry ${getToastClass(announcement.type)}`}
          >
            <div className="entry-header">
              <span className="entry-icon">{getToastIcon(announcement.type, announcement)}</span>
              <span className="entry-turn">Turn {announcement.turn}</span>
            </div>
            <div className="entry-message">
              {formatToastMessage(announcement)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameLog;
