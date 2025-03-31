import React, { useEffect, useRef } from 'react';
import Message from './Message';
import TypingIndicator from './TypingIndicator';

function ChatContainer({ messages, isTyping, highlightedWordInfo }) {
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]); // Scroll on new messages or typing indicator change

  return (
    <div className="chat-container">
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} highlightedWordInfo={highlightedWordInfo} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={chatEndRef} /> {/* Elemento invisible para hacer scroll */}
    </div>
  );
}

export default ChatContainer;