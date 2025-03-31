import { useState, useEffect, useRef } from 'react';
import EmojiHeader from './components/EmojiHeader';
import ChatContainer from './components/ChatContainer';
import InputArea from './components/InputArea';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('default');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef(null);
  const synth = window.speechSynthesis;
  const currentUtterance = useRef(null);

  // Configuración inicial de emojis
  const emojis = {
    "default": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.gif" },
    "processing": { gif: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.gif" },
    // ... resto de emojis
  };

  // Efecto para scroll automático
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Funciones principales (sendMessage, simulateResponse, etc...)
  // ... (continuará abajo)

  return (
    <div className="container">
      <EmojiHeader 
        currentEmoji={emojis[currentEmoji].gif} 
        isMuted={isMuted} 
        toggleMute={() => setIsMuted(!isMuted)}
      />
      
      <ChatContainer 
        messages={messages} 
        chatContainerRef={chatContainerRef}
      />
      
      <InputArea 
        inputText={inputText}
        setInputText={setInputText}
        sendMessage={handleSendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default App;