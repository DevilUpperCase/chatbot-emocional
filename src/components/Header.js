import React from 'react';

const emojis = {
  "default": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif" },
  "processing": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.gif" },
  "😂": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif" },
  "😊": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif" },
  "😢": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif" },
  "🤔": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.gif" },
  "👍": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif" },
  "❤️": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif" },
  "😮": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif" }
};


function Header({ currentEmojiKey, isMuted, ttsSupported, onToggleMute }) {
  const emojiData = emojis[currentEmojiKey] || emojis.default;

  return (
    <div className="header">
      <div className="emoji-container">
        <img
          id="current-emoji" // Mantener ID si algún estilo lo usa
          className="emoji-gif"
          src={emojiData.gif}
          alt={currentEmojiKey}
        />
      </div>
      <button
        id="tts-button" // Mantener ID si algún estilo lo usa
        onClick={onToggleMute}
        disabled={!ttsSupported}
        className={isMuted ? 'muted' : ''}
        title={
          !ttsSupported
            ? "Voz no soportada"
            : isMuted
            ? "Activar Voz"
            : "Desactivar Voz"
        }
      >
        <i className={`fas ${!ttsSupported || isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
      </button>
    </div>
  );
}

export default Header;