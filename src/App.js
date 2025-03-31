import React from 'react'; // No necesitas useEffect aquí ahora
import './App.css';
import Header from './components/Header';
import ChatContainer from './components/ChatContainer';
import InputArea from './components/InputArea';
import { useChatbotLogic } from './hooks/useChatbotLogic';

function App() {
  const {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    handleSendMessage,
    handleToggleMute,
  } = useChatbotLogic();

  // El useEffect que causaba errores ha sido eliminado.
  // La lógica de inicialización ahora está dentro de useChatbotLogic.

  return (
    <div className="app-container">
      <Header
        currentEmojiKey={currentEmojiKey}
        isMuted={isMuted}
        ttsSupported={ttsSupported}
        onToggleMute={handleToggleMute}
      />
      <ChatContainer
         messages={messages}
         isTyping={isTyping}
         highlightedWordInfo={highlightedWordInfo}
         // No necesitas pasar chatContainerRef aquí
      />
      <InputArea onSendMessage={handleSendMessage} />
    </div>
  );
}

export default App;