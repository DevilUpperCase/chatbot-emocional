import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';


function InputArea({ onSendMessage }) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef(null);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const maxHeight = 150; // Max height from CSS (--max-height equivalent)
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Ajustar altura inicial
  useEffect(() => {
    adjustTextareaHeight();
  }, []);


  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      // Reset height after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }, 0);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline on Enter
      handleSendClick();
    }
  };

  const isSendDisabled = inputValue.trim().length === 0;

  return (
    <div className="input-container">
      <textarea
        ref={textareaRef}
        id="message-input" // Mantener id si algún estilo lo usa específicamente
        placeholder="Escribe tu mensaje..."
        rows="1"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
      />
      <button
        id="send-button" // Mantener id si algún estilo lo usa específicamente
        onClick={handleSendClick}
        disabled={isSendDisabled}
        title="Enviar mensaje"
      >
        <FontAwesomeIcon icon={faPaperPlane} />

      </button>
    </div>
  );
}

export default InputArea;