import React, { useEffect, useState } from 'react';
import './GlobalPopup.css';

const GlobalPopup = ({ message, header, subMessage, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 500); // Wait for animation
    };

    const getPopupStyle = () => {
        switch (type) {
            case 'kill':
                return {
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(50, 0, 0, 0.95)',
                    boxShadow: '0 0 50px rgba(255, 0, 0, 0.5)'
                };
            case 'escape':
                return {
                    borderColor: '#44ff44',
                    backgroundColor: 'rgba(0, 50, 0, 0.95)',
                    boxShadow: '0 0 50px rgba(0, 255, 0, 0.5)'
                };
            case 'mutation':
                return {
                    borderColor: '#bd00ff',
                    backgroundColor: 'rgba(40, 0, 50, 0.95)',
                    boxShadow: '0 0 50px rgba(189, 0, 255, 0.5)'
                };
            case 'win':
                return {
                    borderColor: '#44ff44',
                    backgroundColor: 'rgba(0, 50, 0, 0.95)',
                    boxShadow: '0 0 50px rgba(0, 255, 0, 0.5)'
                };
            case 'loss':
                return {
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(50, 0, 0, 0.95)',
                    boxShadow: '0 0 50px rgba(255, 0, 0, 0.5)'
                };
            default:
                return {};
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'kill': return '☠️';
            case 'escape': return '🚀';
            case 'mutation': return '🧬';
            case 'win': return '🏆';
            case 'loss': return '👽';
            default: return '📢';
        }
    };

    return (
        <div className={`global-popup-overlay ${isVisible ? 'visible' : ''}`}>
            <div
                className={`global-popup-content ${type}`}
                style={getPopupStyle()}
            >
                <div className="popup-icon">{getIcon()}</div>
                <h1 className="popup-header">{header}</h1>
                <p className="popup-message">{message}</p>
                {subMessage && <p className="popup-submessage">{subMessage}</p>}

                <button className="popup-close-btn" onClick={handleClose}>
                    ACKNOWLEDGE
                </button>
            </div>
        </div>
    );
};

export default GlobalPopup;
