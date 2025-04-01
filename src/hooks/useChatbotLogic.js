import { useState, useEffect, useRef, useCallback } from 'react';
import { synthesizeSpeech } from '../services/googleTtsApi.js';

// Función auxiliar para simular respuesta
const simulateServerResponse = (message) => {
  const responses = [
    { text: "¡Ja ja ja! Eso fue muy gracioso.\nMe encanta tu sentido del humor. 😂", emoji: "😂" },
    { text: "Entiendo perfectamente lo que dices.\n¿En qué más puedo ayudarte hoy? 😊", emoji: "😊" },
    { text: "Lamento mucho escuchar eso.\nSi necesitas hablar o ayuda, estoy aquí para ti. 😢", emoji: "😢" },
    { text: "Vaya, esa es una pregunta muy interesante.\nDéjame pensarlo un momento... 🤔", emoji: "🤔" },
    { text: "¡Totalmente de acuerdo contigo!\nEsa es una excelente perspectiva. 👍", emoji: "👍" },
    { text: "¡Eso es maravilloso!\nMe alegra mucho escucharlo. ❤️", emoji: "❤️" },
    { text: "¡Vaya!\nNo me esperaba esa respuesta. 😮", emoji: "😮" },
    { text: "Gracias por compartir eso conmigo.\n¿Hay algo más en lo que pueda ayudarte hoy? 😊", emoji: "😊" }
  ];
  message = message.toLowerCase();
  if (message.includes('jaja') || message.includes('risa') || message.includes('divertido') || message.includes('😂')) return responses[0];
  if (message.includes('triste') || message.includes('mal') || message.includes('tristeza') || message.includes('deprimido') || message.includes('😢')) return responses[2];
  if (message.includes('?') || message.includes('por qué') || message.includes('cómo') || message.includes('cuándo') || message.includes('🤔')) return responses[3];
  if (message.includes('gracias') || message.includes('agradecimiento') || message.includes('agradezco') || message.includes('❤️')) return responses[5];
  if (message.includes('sorpresa') || message.includes('increíble') || message.includes('wow') || message.includes('😮')) return responses[6];
  if (message.includes('hola') || message.includes('buenos días') || message.includes('buenas tardes') || message.includes('😊')) return responses[1];
  if (message.includes('ok') || message.includes('vale') || message.includes('entiendo') || message.includes('👍')) return responses[4];
  return responses[Math.floor(Math.random() * responses.length)];
};

// Función auxiliar para obtener la hora actual
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Regex mejorado para filtrar más tipos de emojis
const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\u200D[\p{Emoji}])+\s*/gu;

// Función auxiliar para limpiar texto de emojis y caracteres especiales
const cleanTextForSpeech = (text) => {
  return text
    .replace(emojiRegex, '') // Quitar todos los emojis
    .replace(/\n/g, ' ')     // Reemplazar saltos de línea con espacios
    .replace(/\s+/g, ' ')    // Normalizar espacios múltiples
    .trim();                 // Quitar espacios sobrantes
};

// Función para dividir texto en palabras con sus posiciones
const splitTextIntoWords = (text) => {
  const words = [];
  const regex = /\S+/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    words.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return words;
};

export const useChatbotLogic = (initialMessages = []) => {
  const [messages, setMessages] = useState(initialMessages);
  const [currentEmojiKey, setCurrentEmojiKey] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false); 
  const [ttsSupported, setTtsSupported] = useState(true); // Google TTS siempre disponible si hay API KEY
  const [highlightedWordInfo, setHighlightedWordInfo] = useState({ messageId: null, charIndex: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);
  
  const defaultEmojiTimeoutRef = useRef(null);
  const currentAudioRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const wordTimersRef = useRef([]);
  
  // Para limpiar todos los timers de resaltado
  const clearAllHighlightTimers = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    
    wordTimersRef.current.forEach(timer => clearTimeout(timer));
    wordTimersRef.current = [];
    
    setHighlightedWordInfo({ messageId: null, charIndex: null });
  }, []);

  // Para detener cualquier audio en reproducción
  const stopCurrentAudio = useCallback(() => {
    clearAllHighlightTimers();
    
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        console.log("[audio] Audio anterior detenido");
      } catch (e) {
        console.error("[audio] Error al detener audio:", e);
      }
    }
  }, [clearAllHighlightTimers]);

  // Función para reproducir audio con Google TTS y simular resaltado
  const playGoogleTTS = useCallback((text, messageId) => {
    if (isMuted || !text) {
      return;
    }
    
    stopCurrentAudio();
    
    // Limpiar el texto para la síntesis de voz
    const cleanedText = cleanTextForSpeech(text);
    
    if (cleanedText.length === 0) {
      console.log("[TTS] No hay texto para hablar después de quitar emojis");
      return;
    }
    
    console.log("[TTS] Texto limpio para TTS:", cleanedText);
    
    // Preparar resaltado basado en palabras
    const words = splitTextIntoWords(cleanedText);
    console.log("[TTS] Palabras para resaltado:", words);
    
    // Solicitar audio a Google Cloud TTS
    synthesizeSpeech(cleanedText)
      .then(audioContent => {
        if (!audioContent) {
          console.error("[TTS] No se pudo obtener audio de Google TTS");
          return;
        }
        
        // Crear y reproducir el audio
        const audioSrc = `data:audio/mp3;base64,${audioContent}`;
        const audio = new Audio(audioSrc);
        currentAudioRef.current = audio;
        
        // Configurar duración promedio por palabra para simular resaltado
        // Aproximadamente 3-4 palabras por segundo para un habla normal
        const wordDuration = 300; // milliseconds por palabra
        const startDelay = 50;   // pequeño retraso antes de empezar
        
        // Configurar resaltado de palabras basado en tiempo
        words.forEach((word, index) => {
          const timer = setTimeout(() => {
            console.log(`[TTS] Resaltando palabra: "${word.text}" en posición ${word.start}`);
            setHighlightedWordInfo({ 
              messageId: messageId, 
              charIndex: word.start 
            });
          }, startDelay + (index * wordDuration));
          
          wordTimersRef.current.push(timer);
        });
        
        // Limpiar resaltado al finalizar
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedWordInfo({ messageId: null, charIndex: null });
          console.log("[TTS] Finalizando resaltado");
        }, startDelay + (words.length * wordDuration) + 500);
        
        // Configurar eventos de audio
        audio.onended = () => {
          currentAudioRef.current = null;
          console.log("[audio] Reproducción completada");
        };
        
        audio.onerror = (e) => {
          console.error("[audio] Error en reproducción:", e);
          currentAudioRef.current = null;
          clearAllHighlightTimers();
        };
        
        // Reproducir el audio
        audio.play().catch(e => {
          console.error("[audio] Error al iniciar reproducción:", e);
          currentAudioRef.current = null;
          clearAllHighlightTimers();
        });
        
        console.log("[audio] Nueva reproducción iniciada");
      })
      .catch(error => {
        console.error("[TTS] Error al sintetizar voz:", error);
      });
  }, [isMuted, stopCurrentAudio, clearAllHighlightTimers]);

  // Inicialización
  useEffect(() => {
    // Limpieza al desmontar
    return () => {
      stopCurrentAudio();
      clearTimeout(defaultEmojiTimeoutRef.current);
      clearAllHighlightTimers();
      isMounted.current = false;
    };
  }, [stopCurrentAudio, clearAllHighlightTimers]);

  const addMessage = useCallback((text, sender = 'user', type = 'text') => {
    console.log(`[addMessage] Intentando añadir: "${text}" de ${sender}`);
    const newMessage = {
      id: Date.now() + Math.random(),
      text,
      sender,
      timestamp: new Date(),
      type,
    };
    setMessages((prevMessages) => {
        console.log(`[addMessage ${sender}] Estado PREVIO:`, prevMessages.length);
        const updatedMessages = [...prevMessages, newMessage];
        console.log(`[addMessage ${sender}] Estado NUEVO:`, updatedMessages.length);
        return updatedMessages;
    });
    console.log(`[addMessage ${sender}] Mensaje añadido (objeto devuelto):`, newMessage.id);
    return newMessage;
  }, []);

  const processAndAddChatbotResponse = useCallback(async (userMessageText) => {
    console.log("[process] Iniciado.");
    setIsLoading(true);
    setError(null);

    try {
      console.log("[process] Obteniendo respuesta simulada...");
      const simulatedData = simulateServerResponse(userMessageText);
      console.log("[process] Respuesta simulada:", simulatedData);

      console.log("[process] Esperando delay simulado...");
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[process] Delay simulado terminado.");

      const responseText = simulatedData.text;
      const analysis = { sentiment: 'neutral', emoji: simulatedData.emoji };

      console.log(`[process] Añadiendo mensaje del BOT: "${responseText}"`);
      const botMessage = addMessage(responseText, 'bot');

      if (!botMessage) {
        console.error("[process] ¡addMessage para el bot devolvió undefined!");
      } else {
        console.log("[process] Mensaje del bot añadido OK, ID:", botMessage.id);

        // --- TTS con Google Cloud y resaltado simulado ---
        if (botMessage.text && !isMuted) {
            console.log("[process] Procesando texto para Google TTS con resaltado simulado");
            // Pequeña demora para asegurar que el mensaje se haya renderizado
            setTimeout(() => {
              playGoogleTTS(botMessage.text, botMessage.id);
            }, 100);
        } else {
            console.log("[process] TTS deshabilitado, no se hablará");
        }
        // --- Fin TTS ---
      }

      if (analysis) {
          console.log("[process] Análisis de sentimiento:", analysis);
      }

      // *** Actualiza el estado del emoji ***
      if (analysis && analysis.emoji && typeof analysis.emoji === 'string') {
          setCurrentEmojiKey(analysis.emoji);
          console.log("[process] Emoji actualizado a:", analysis.emoji);

          clearTimeout(defaultEmojiTimeoutRef.current);
          defaultEmojiTimeoutRef.current = setTimeout(() => {
              setCurrentEmojiKey('default');
              console.log("[process] Emoji vuelto a 'default' por timeout.");
          }, 8000); // 8 segundos

      } else {
          setCurrentEmojiKey('default');
          console.log("[process] No se encontró emoji válido, usando 'default'.");
      }
      // *** Fin actualización emoji ***

    } catch (err) {
      if (!isMounted.current) {
          console.log("[process] Error capturado, pero componente ya desmontado.");
          return;
      }
      console.error("[process] Error en try/catch:", err);
      const errorMessage = err.message || 'Ocurrió un error.';
      setError(errorMessage);
      addMessage(errorMessage, 'error');
      setCurrentEmojiKey('default');
    } finally {
      console.log("[process] Bloque finally ejecutado.");
      console.log("[process] Estableciendo isLoading = false.");
      setIsLoading(false);
    }
  }, [addMessage, setCurrentEmojiKey, stopCurrentAudio, playGoogleTTS, isMuted]);

  const handleSendMessage = useCallback((userMessageText) => {
    console.log(`[handleSendMessage] Iniciado con texto: "${userMessageText}"`);
    if (!userMessageText.trim() || isLoading) { return; }
    console.log("[handleSendMessage] Añadiendo mensaje de USUARIO...");
    addMessage(userMessageText, 'user');
    console.log("[handleSendMessage] Llamando a processAndAddChatbotResponse...");
    processAndAddChatbotResponse(userMessageText);
  }, [isLoading, addMessage, processAndAddChatbotResponse]);

  // --- Toggle Mute ---
  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      stopCurrentAudio(); // Detiene el audio actual si silenciamos
    }
  }, [isMuted, stopCurrentAudio]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    isLoading,
    error,
    handleSendMessage,
    handleToggleMute,
    clearChat,
  };
};
