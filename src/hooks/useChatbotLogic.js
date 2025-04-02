import { useState, useEffect, useRef, useCallback } from 'react';
import { synthesizeSpeech } from '../index';

// URLs de webhook
const WEBHOOK_URLS = {
  test: 'https://n8n-n8n.am4jxh.easypanel.host/webhook-test/fbf1d13f-fbdf-4f97-8656-6896fb3263f8',
  production: 'https://n8n-n8n.am4jxh.easypanel.host/webhook/fbf1d13f-fbdf-4f97-8656-6896fb3263f8'
};

// Helper to convert file to Base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Extract Base64 part
    reader.onerror = error => reject(error);
  });
};

// Custom Hook for Chatbot Logic
function useChatbotLogic() {
  const [messages, setMessages] = useState([]);
  const [currentEmojiKey, setCurrentEmojiKey] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ttsMuted') === 'true');
  const [ttsSupported, setTtsSupported] = useState(false);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState({ messageId: null, charIndex: -1 });
  const [isTestMode, setIsTestMode] = useState(false); // Default to production
  const audioRef = useRef(null); // Para controlar la reproducción de audio TTS
  const ttsQueue = useRef([]); // Cola para manejar TTS secuencialmente
  const isPlayingTTS = useRef(false); // Estado para saber si algo se está reproduciendo
  const nextMessageId = useRef(0); // Simple ID generator for messages
  const emojiDisplayTimer = useRef(null); // Timer para controlar la duración del emoji

  // Función para actualizar el emoji y configurar un timer para volver al estado por defecto
  const showEmojiTemporarily = useCallback((emojiType, duration = 8000) => {
    // Limpiar timer anterior si existe
    if (emojiDisplayTimer.current) {
      clearTimeout(emojiDisplayTimer.current);
    }
    
    // Actualizar el emoji actual
    setCurrentEmojiKey(emojiType || 'default');
    
    // Configurar un timer para volver al emoji por defecto después de la duración
    emojiDisplayTimer.current = setTimeout(() => {
      setCurrentEmojiKey('default');
      emojiDisplayTimer.current = null;
    }, duration);
  }, []);

  // Check TTS support
  useEffect(() => {
    setTtsSupported('speechSynthesis' in window);
  }, []);

  // Limpia el timer cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (emojiDisplayTimer.current) {
        clearTimeout(emojiDisplayTimer.current);
      }
    };
  }, []);

  // Toggle Test Mode
  const toggleTestMode = useCallback(() => {
    setIsTestMode(prev => !prev);
    // Optionally, add a user feedback message here
    console.log(`Switched to ${!isTestMode ? 'Test' : 'Production'} Mode`);
  }, [isTestMode]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('ttsMuted', newState.toString());
      if (newState && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        ttsQueue.current = []; // Clear queue if muted
        isPlayingTTS.current = false;
        setHighlightedWordInfo({ messageId: null, charIndex: -1 });
      }
      return newState;
    });
  }, []);

  // Send message (text and/or files) to webhook
  const sendToWebhook = useCallback(async (payload) => {
    const webhookUrl = isTestMode ? WEBHOOK_URLS.test : WEBHOOK_URLS.production;
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`Webhook response error: ${response.status} ${response.statusText}`);
      }
      return await response.json(); // Expect { message, code, emoji }
    } catch (error) {
      console.error('Error sending to webhook:', error);
      // Return a default error structure or re-throw
      return { message: "Error al conectar. Inténtalo de nuevo.", code: "error", emoji: "😢" };
    }
  }, [isTestMode]);

  // Process TTS Queue
  const processTTSQueue = useCallback(async () => {
    if (isMuted || isPlayingTTS.current || ttsQueue.current.length === 0) {
      return;
    }

    isPlayingTTS.current = true;
    const { text, messageId } = ttsQueue.current.shift();

    try {
      const audioSrc = await synthesizeSpeech(text);
      if (audioRef.current) {
         audioRef.current.src = audioSrc;
         audioRef.current.play().catch(e => console.error("Error playing audio:", e));

         // Handle word highlighting during playback
         const words = text.split(/\s+/);
         let wordStartTime = 0;
         let wordIndex = 0;

         audioRef.current.ontimeupdate = () => {
            if (audioRef.current && wordIndex < words.length) {
              // Rough estimation based on average speech rate (adjust as needed)
              const estimatedWordDuration = (audioRef.current.duration / words.length) * 1000;
              if (audioRef.current.currentTime * 1000 >= wordStartTime) {
                setHighlightedWordInfo({ 
                  messageId, 
                  charIndex: text.indexOf(words[wordIndex]) // Cambio de wordIndex a charIndex para compatibilidad
                });
                wordStartTime += estimatedWordDuration;
                wordIndex++;
              }
            }
          };

      }
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      // Continue queue even if one fails
      isPlayingTTS.current = false;
      setHighlightedWordInfo({ messageId: null, charIndex: null });
      processTTSQueue();
    }
  }, [isMuted]);

  // Effect for audio playback end
  useEffect(() => {
    const audioElement = audioRef.current;
    const handleAudioEnd = () => {
      isPlayingTTS.current = false;
      setHighlightedWordInfo({ messageId: null, charIndex: -1 });
      processTTSQueue(); // Process next item in queue
    };

    if (audioElement) {
      audioElement.addEventListener('ended', handleAudioEnd);
      audioElement.addEventListener('error', handleAudioEnd); // Treat error as end
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleAudioEnd);
        audioElement.removeEventListener('error', handleAudioEnd);
      }
    };
  }, [processTTSQueue]);

  // Add message to state and potentially TTS queue
  const addMessage = useCallback((sender, text, files = [], status = 'sent', emoji = null) => {
    const newMessage = {
      id: nextMessageId.current++,
      sender,
      text,
      timestamp: new Date(),
      files: files.map(f => ({ // Store minimal info needed for display
        name: f.name,
        type: f.type,
        url: URL.createObjectURL(f) // Create blob URL for display in Message component
      })),
      status,
      emoji // Store emoji if provided (for bot messages)
    };
    setMessages(prev => [...prev, newMessage]);

    if (sender === 'bot' && text && !isMuted && ttsSupported) {
      ttsQueue.current.push({ text, messageId: newMessage.id });
      processTTSQueue();
    }

    // Clean up blob URLs when message is eventually removed (if implementing message deletion)
    // Or potentially after a certain time / number of messages
  }, [isMuted, ttsSupported, processTTSQueue]);

  // Handle Sending Message (Text and Files)
  const handleSendMessage = useCallback(async (text, files = []) => {
    const userMessageId = nextMessageId.current;
    // Add user message immediately with 'sending' status and previews
     const userMessageFiles = files.map(file => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file) // Create Blob URL for immediate display
    }));
    setMessages(prev => [...prev, {
        id: userMessageId,
        sender: 'user',
        text,
        timestamp: new Date(),
        files: userMessageFiles,
        status: 'sending' // Initial status
    }]);

    // Mostrar el emoji de "processing" mientras se espera la respuesta
    setIsTyping(true);
    showEmojiTemporarily('processing');

    // Prepare files for webhook (convert to Base64)
    const filesPayload = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        content: await fileToBase64(file),
        type: file.type,
      }))
    );

    // Send to webhook
    const payload = { message: text, files: filesPayload };
    const response = await sendToWebhook(payload);

     // Update user message status to 'delivered'
     setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === userMessageId ? { ...msg, status: 'delivered' } : msg
     ));

     // Revoke Blob URLs for user message files now that they are sent
     userMessageFiles.forEach(f => URL.revokeObjectURL(f.url));

    setIsTyping(false);

    // Handle webhook response
    if (response) {
      try {
        // La respuesta es un array de objetos [{"message":"texto","emoji":"tipo"}]
        if (Array.isArray(response)) {
          // Procesar cada mensaje en el array de respuestas
          response.forEach((item, index) => {
            if (item && item.message) {
              const emojiType = item.emoji || 'default';
              
              // Mostrar el emoji temporalmente (solo para el primer mensaje)
              if (index === 0) {
                // Forzar reset del emoji para asegurar que siempre cambie, incluso si es el mismo tipo
                setCurrentEmojiKey('default');
                // Pequeño retraso para garantizar que el cambio sea perceptible
                setTimeout(() => {
                  showEmojiTemporarily(emojiType, 8000);
                }, 10);
              }
              
              addMessage('bot', item.message, [], 'received', emojiType);
            }
          });
        } 
        // Compatibilidad con formato anterior (objeto simple)
        else if (response.message) {
          const emojiType = response.emoji || 'default';
          // Forzar reset del emoji para asegurar que siempre cambie, incluso si es el mismo tipo
          setCurrentEmojiKey('default');
          // Pequeño retraso para garantizar que el cambio sea perceptible
          setTimeout(() => {
            showEmojiTemporarily(emojiType, 8000);
          }, 10);
          addMessage('bot', response.message, [], 'received', emojiType);
        } 
        else {
          throw new Error('Formato de respuesta desconocido');
        }
      } catch (error) {
        console.error('Error procesando la respuesta:', error);
        // Forzar reset del emoji
        setCurrentEmojiKey('default');
        setTimeout(() => {
          showEmojiTemporarily('decepción', 8000);
        }, 10);
        addMessage('bot', "Hubo un problema procesando tu solicitud.", [], 'received', 'decepción');
      }
    } else {
      // Handle potential errors or unexpected responses
      // Forzar reset del emoji
      setCurrentEmojiKey('default');
      setTimeout(() => {
        showEmojiTemporarily('decepción', 8000);
      }, 10);
      addMessage('bot', "Hubo un problema procesando tu solicitud.", [], 'received', 'decepción');
    }

  }, [sendToWebhook, addMessage, showEmojiTemporarily]);

  // Simulate initial bot message (optional)
  useEffect(() => {
    // addMessage('bot', "¡Hola! ¿Cómo puedo ayudarte hoy?", [], 'received', '😊');
  }, [addMessage]); // Dependency ensures addMessage is stable

  return {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    isTestMode,
    handleSendMessage,
    // handleSendFile, // No longer needed
    handleToggleMute,
    toggleTestMode,
    audioRef // Expose audioRef if needed externally (e.g., for testing)
  };
}

export default useChatbotLogic;
