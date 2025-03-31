import { useState, useEffect, useRef, useCallback } from 'react';


// Mover emojis aquí si usas el hook
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


export function useChatbotLogic() {
  const [messages, setMessages] = useState([]);
  const [currentEmojiKey, setCurrentEmojiKey] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Estado inicial TTS activo
  const [ttsSupported, setTtsSupported] = useState(false);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState({ messageId: null, charIndex: null });

  const synthRef = useRef(null);
  const utteranceRef = useRef(null);
  const defaultEmojiTimeoutRef = useRef(null);

  // --- Inicialización y Soporte TTS ---
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setTtsSupported(true);

      // Opcional: Cargar voces (puede ser asíncrono)
      const loadVoices = () => {
          const voices = synthRef.current?.getVoices();
          // console.log("Voces cargadas:", voices); // Para depurar
          // Podrías guardar las voces aquí si necesitas seleccionarlas explícitamente
      };
      if (synthRef.current?.getVoices().length) {
          loadVoices();
      } else if (synthRef.current) {
          synthRef.current.onvoiceschanged = loadVoices;
      }

    } else {
      console.warn("La API de Speech Synthesis no es soportada por este navegador.");
      setTtsSupported(false);
      setIsMuted(true); // Forzar mute si no hay soporte
    }

    // Limpieza al desmontar
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel(); // Detener habla al salir
        synthRef.current.onvoiceschanged = null;
      }
      clearTimeout(defaultEmojiTimeoutRef.current);
    };
  }, []);

  // --- Función para hablar ---
   const speakMessage = useCallback((text, messageId) => {
       if (!synthRef.current || isMuted || !text) {
           setHighlightedWordInfo({ messageId: null, charIndex: null }); // Limpiar resaltado si no habla
           return;
       }

       synthRef.current.cancel(); // Cancela habla anterior

       const emojiRegex = /([\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}])+\s*/gu;
       const textToSpeak = text.replace(emojiRegex, '').replace(/\n/g, ' ').trim();

       if (textToSpeak.length === 0) {
            console.log("No hay texto para hablar después de quitar emojis.");
            setHighlightedWordInfo({ messageId: null, charIndex: null });
           return;
       }

       const utterance = new SpeechSynthesisUtterance(textToSpeak);
       utteranceRef.current = utterance;
       utterance.lang = 'es-ES'; // Intenta usar español de España
       // utterance.pitch = 1;
       // utterance.rate = 1;

       // Evento para resaltar palabras
       utterance.onboundary = (event) => {
           if (event.name === 'word') {
               // Actualizar el estado para que el componente Message sepa qué resaltar
                setHighlightedWordInfo({ messageId: messageId, charIndex: event.charIndex });
           }
       };

       // Evento al finalizar
       utterance.onend = () => {
           setHighlightedWordInfo({ messageId: null, charIndex: null }); // Limpiar resaltado
           utteranceRef.current = null;
       };

       // Evento en caso de error
       utterance.onerror = (event) => {
           console.error('SpeechSynthesisUtterance.onerror', event);
           setHighlightedWordInfo({ messageId: null, charIndex: null }); // Limpiar resaltado
           utteranceRef.current = null;
       };

        // Pequeña pausa antes de hablar puede ayudar en algunos navegadores
       setTimeout(() => {
           if (synthRef.current && utteranceRef.current === utterance) { // Asegurarse que no se canceló mientras esperaba
                synthRef.current.speak(utterance);
           }
       }, 50); // 50ms delay

   }, [isMuted]); // Depende de isMuted

  // --- Manejo de Envío de Mensajes ---
  const handleSendMessage = useCallback((userMessageText) => {
    // Cancelar habla y timeout de emoji anterior
    if (synthRef.current) synthRef.current.cancel();
    clearTimeout(defaultEmojiTimeoutRef.current);
     setHighlightedWordInfo({ messageId: null, charIndex: null }); // Limpiar resaltado inmediato

    // Añadir mensaje de usuario
    const newUserMessage = {
      id: Date.now(),
      text: userMessageText,
      sender: 'user',
      timestamp: getCurrentTime(),
    };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);

    // Mostrar indicador de escribiendo y emoji de procesamiento
    setIsTyping(true);
    setCurrentEmojiKey('processing');

    // Simular respuesta del bot
    setTimeout(() => {
      const response = simulateServerResponse(userMessageText);
      const newBotMessage = {
        id: Date.now() + 1, // Asegurar ID único
        text: response.text,
        sender: 'bot',
        timestamp: getCurrentTime(),
      };

      setIsTyping(false);
      setMessages(prevMessages => [...prevMessages, newBotMessage]);
      setCurrentEmojiKey(response.emoji || 'default');

      // Hablar la respuesta del bot si TTS está activo
      speakMessage(response.text, newBotMessage.id);


      // Resetear emoji a default después de un tiempo
       clearTimeout(defaultEmojiTimeoutRef.current);
      defaultEmojiTimeoutRef.current = setTimeout(() => {
        setCurrentEmojiKey('default');
      }, 8000);

    }, 1500 + Math.random() * 1500); // Simular delay

  }, [speakMessage]); // speakMessage es ahora una dependencia


  // --- Toggle Mute ---
  const handleToggleMute = useCallback(() => {
      if (!ttsSupported) return;

      const newMutedState = !isMuted;
      setIsMuted(newMutedState);

      if (newMutedState && synthRef.current) {
          synthRef.current.cancel(); // Detener habla si se silencia
          setHighlightedWordInfo({ messageId: null, charIndex: null }); // Limpiar resaltado
      }
      // No reiniciamos la última frase al desmutear por simplicidad
  }, [isMuted, ttsSupported]);


  return {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    handleSendMessage,
    handleToggleMute,
  };
}