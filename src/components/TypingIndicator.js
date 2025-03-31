import React from 'react';

function TypingIndicator() {
  return (
    <div className="message bot-message typing-message">
      <div className="typing-indicator">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  );
}

export default TypingIndicator;