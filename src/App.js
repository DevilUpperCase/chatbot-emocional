import React from 'react'; // No necesitas useEffect aquí ahora
import './App.css';
import { Header, ChatContainer, InputArea, useChatbotLogic } from './index';

function App() {
  const {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    isTestMode,
    handleSendMessage, // Renombrar o reutilizar para manejar texto y archivos
    // handleSendFile, // Ya no se necesita como prop separada
    handleToggleMute,
    toggleTestMode,
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
        isTestMode={isTestMode}
        onToggleTestMode={toggleTestMode}
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