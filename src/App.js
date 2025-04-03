import React from 'react';
import './App.css';
import './styles/markdown.css'; // Importamos los estilos de markdown
import { Header, ChatContainer, InputArea, useChatbotLogic } from './index';

function App() {
  const {
    messages,
    currentEmojiKey,
    isTyping,
    isTestMode,
    sendMessage, 
    toggleTestMode,
  } = useChatbotLogic();

  // El useEffect que causaba errores ha sido eliminado.
  // La lógica de inicialización ahora está dentro de useChatbotLogic.

  return (
    <div className="app-container">
      <Header
        currentEmojiKey={currentEmojiKey}
        isTestMode={isTestMode}
        onToggleTestMode={toggleTestMode}
      />
      <ChatContainer
         messages={messages}
         isTyping={isTyping}
      />
      <InputArea onSendMessage={sendMessage} />
    </div>
  );
}

export default App;