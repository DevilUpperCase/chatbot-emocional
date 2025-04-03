import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode, faRocket } from '@fortawesome/free-solid-svg-icons';

const emojis = {
  "default": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif" },
  "procesando": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.gif", emoji: "🤔" },
  
  // Mapeo de emociones a GIFs
  "gracioso": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif", emoji: "😂" },
  "gratitud": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif", emoji: "🙏" },
  "decepción": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif", emoji: "😔" },
  "tarea hecha": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif", emoji: "👍" },
  "cariño": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif", emoji: "😊" },
  "asombro": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif", emoji: "😲" },
  
  // Compatibilidad con emojis directos (para referencias existentes)
  "😂": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif", emoji: "😂" },
  "😊": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif", emoji: "😊" },
  "😔": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif", emoji: "😔" },
  "🤖": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.gif", emoji: "🤖" },
  "👍": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif", emoji: "👍" },
  "🙏": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif", emoji: "🙏" },
  "😲": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif", emoji: "😲" },
  "🤔": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.gif", emoji: "🤔" }
};

function Header({ currentEmojiKey, isTestMode, onToggleTestMode }) {
  const emojiData = emojis[currentEmojiKey] || emojis.default;

  return (
    <div className="header">
      <div className="mode-toggle-container">
        <button
          id="env-toggle-button"
          onClick={onToggleTestMode}
          className={`env-toggle ${isTestMode ? 'test-mode' : 'prod-mode'}`}
          title={isTestMode ? "Modo prueba activo - Click para cambiar a producción" : "Modo producción activo - Click para cambiar a prueba"}
        >
          <FontAwesomeIcon icon={isTestMode ? faCode : faRocket} />
          <span className="mode-label">{isTestMode ? "TEST" : "PROD"}</span>
        </button>
      </div>
      <div className="emoji-container">
        <img
          id="current-emoji"
          className="emoji-gif"
          src={emojiData.gif}
          alt={currentEmojiKey}
        />
      </div>
    </div>
  );
}

export default Header;