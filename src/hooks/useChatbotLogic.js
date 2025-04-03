import { useState, useEffect, useRef, useCallback } from 'react';
import { synthesizeSpeech } from '../index';

// URLs para la API HTTP (sin cambiar el endpoint original)
const API_URLS = {
  test: 'https://n8n-n8n.am4jxh.easypanel.host/webhook-test/fbf1d13f-fbdf-4f97-8656-6896fb3263f8',
  production: 'https://n8n-n8n.am4jxh.easypanel.host/webhook/fbf1d13f-fbdf-4f97-8656-6896fb3263f8'
};

// Respuesta de fallback para cuando el servidor no responde
const FALLBACK_RESPONSE = [
  {
    message: "Lo siento, parece que estoy teniendo problemas para conectarme en este momento. Por favor, intenta de nuevo en unos segundos.",
    emoji: "decepción"
  }
];

// Configuración de retries
const FETCH_CONFIG = {
  maxRetries: 5,            // Número máximo de intentos
  retryDelay: 1000,         // Tiempo de espera entre reintentos base (ms)
  maxRetryDelay: 8000,      // Tiempo máximo de espera entre reintentos (ms)
  timeout: 20000,           // Tiempo máximo de espera (ms)
  exponentialBackoff: true  // Usar backoff exponencial para reintentos
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

// Función para esperar un tiempo específico
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para calcular tiempo de espera con backoff exponencial
const calculateBackoff = (attempt) => {
  if (!FETCH_CONFIG.exponentialBackoff) return FETCH_CONFIG.retryDelay;
  
  // Formula: retryDelay * 2^attempt + random jitter
  const delay = FETCH_CONFIG.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
  
  // Limitar al máximo configurado
  return Math.min(delay, FETCH_CONFIG.maxRetryDelay);
};

// Generador seguro de IDs únicos
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Custom Hook for Chatbot Logic
function useChatbotLogic() {
  // Estado
  const [messages, setMessages] = useState([]);
  const [currentEmojiKey, setCurrentEmojiKey] = useState('default');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ttsMuted') === 'true');
  const [ttsSupported, setTtsSupported] = useState(false);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState({ messageId: null, charIndex: -1 });
  const [isTestMode, setIsTestMode] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [serverHealthStatus, setServerHealthStatus] = useState({
    lastSuccessTime: null,
    successCount: 0,
    failureCount: 0,
    isHealthy: true
  });
  
  // Referencias
  const audioRef = useRef(null);
  const ttsQueue = useRef([]);
  const isPlayingTTS = useRef(false);
  const emojiDisplayTimer = useRef(null);
  const fetchControllers = useRef({});
  const fetchTimeouts = useRef({});
  const activeRequests = useRef(new Set());
  const lastSentMessages = useRef({}); // Caché de mensajes enviados recientemente

  // Función para actualizar el emoji temporalmente
  const showEmojiTemporarily = useCallback((emojiType, duration = 8000) => {
    if (emojiDisplayTimer.current) {
      clearTimeout(emojiDisplayTimer.current);
    }
    
    setCurrentEmojiKey(emojiType || 'default');
    
    emojiDisplayTimer.current = setTimeout(() => {
      setCurrentEmojiKey('default');
      emojiDisplayTimer.current = null;
    }, duration);
  }, []);

  // Función para actualizar el estado de salud del servidor
  const updateServerHealth = useCallback((success) => {
    setServerHealthStatus(prev => {
      const now = Date.now();
      
      // Actualizar contador de éxitos/fallos
      const successCount = success ? prev.successCount + 1 : prev.successCount;
      const failureCount = success ? 0 : prev.failureCount + 1; // Resetea fallos si hay éxito
      
      // Actualizar última vez que tuvimos éxito
      const lastSuccessTime = success ? now : prev.lastSuccessTime;
      
      // Determinar si el servidor está "saludable"
      // Lo consideramos saludable si:
      // 1. Ha habido al menos un éxito reciente (últimos 2 minutos) o
      // 2. Ha habido menos de 3 fallos consecutivos
      const isHealthy = (lastSuccessTime && (now - lastSuccessTime < 120000)) || failureCount < 3;
      
      return {
        lastSuccessTime,
        successCount,
        failureCount,
        isHealthy
      };
    });
  }, []);

  // Función para enviar mensaje al servidor HTTP con reintento automático
  const sendViaHTTP = useCallback(async (payload, messageId) => {
    const apiUrl = isTestMode ? API_URLS.test : API_URLS.production;
    let retries = 0;
    let lastError = null;
    
    // Guardar en la caché
    const cacheKey = `${payload.message}_${Date.now()}`;
    lastSentMessages.current[cacheKey] = {
      timestamp: Date.now(),
      payload
    };
    
    // Limpiar caché antigua (mantener solo últimos 10 mensajes)
    const cacheKeys = Object.keys(lastSentMessages.current);
    if (cacheKeys.length > 10) {
      const oldestKey = cacheKeys.sort((a, b) => 
        lastSentMessages.current[a].timestamp - lastSentMessages.current[b].timestamp
      )[0];
      delete lastSentMessages.current[oldestKey];
    }
    
    // Crear un AbortController para esta solicitud
    fetchControllers.current[messageId] = new AbortController();
    const signal = fetchControllers.current[messageId].signal;
    
    // Establecer timeout
    fetchTimeouts.current[messageId] = setTimeout(() => {
      if (fetchControllers.current[messageId]) {
        fetchControllers.current[messageId].abort();
        console.log(`Request timeout for message ${messageId}`);
      }
    }, FETCH_CONFIG.timeout);
    
    // Marcar esta solicitud como activa
    activeRequests.current.add(messageId);
    
    try {
      // Si el servidor no está saludable, reducir el número de reintentos
      const actualMaxRetries = serverHealthStatus.isHealthy 
        ? FETCH_CONFIG.maxRetries 
        : Math.min(FETCH_CONFIG.maxRetries, 2);
      
      // Bucle de reintento
      while (retries <= actualMaxRetries) {
        try {
          console.log(`Request attempt ${retries + 1} for message ${messageId}`);
          
          // Realizar fetch
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            body: JSON.stringify(payload),
            signal,
            cache: 'no-store',
            credentials: 'omit' // Evitar enviar cookies que podrían causar problemas
          });
          
          // Verificar respuesta HTTP
          if (!response.ok) {
            const statusText = response.statusText || '';
            const status = response.status || 0;
            
            // Log del error HTTP detallado
            console.error(`HTTP error ${status} ${statusText} for message ${messageId}`);
            
            // Si es un error 429 (too many requests), esperar más tiempo
            if (status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : calculateBackoff(retries + 2);
              await wait(retryMs);
            }
            
            throw new Error(`HTTP error: ${status} ${statusText}`);
          }
          
          // Obtener los datos como texto primero para validar
          const responseText = await response.text();
          
          // Si está vacío, tratar como error
          if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response received');
          }
          
          // Intentar parsear como JSON
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError, 'Raw response:', responseText);
            throw new Error('Invalid JSON response');
          }
          
          // Validar que la respuesta tenga el formato esperado
          if (Array.isArray(responseData)) {
            if (responseData.length === 0) {
              throw new Error('Empty array response');
            }
            
            // Verificar que al menos un elemento tenga mensaje
            const hasValidMessages = responseData.some(item => item && typeof item.message === 'string');
            if (!hasValidMessages) {
              throw new Error('Response array contains no valid messages');
            }
          } else if (responseData && typeof responseData === 'object') {
            if (typeof responseData.message !== 'string') {
              throw new Error('Response object missing message property');
            }
          } else {
            throw new Error('Response is neither an array nor an object');
          }
          
          // Resetear bandera de error de conexión
          setConnectionError(false);
          
          // Actualizar estado de salud del servidor
          updateServerHealth(true);
          
          // Limpiar timeout
          if (fetchTimeouts.current[messageId]) {
            clearTimeout(fetchTimeouts.current[messageId]);
            delete fetchTimeouts.current[messageId];
          }
          
          // Quitar del conjunto de solicitudes activas
          activeRequests.current.delete(messageId);
          
          // Eliminar el controlador
          delete fetchControllers.current[messageId];
          
          // Retornar los datos
          return responseData;
        } catch (error) {
          // Si se abortó, no reintentar
          if (error.name === 'AbortError') {
            console.log(`Request aborted for message ${messageId}`);
            throw error;
          }
          
          lastError = error;
          retries++;
          
          // Si aún quedan reintentos, esperar y continuar
          if (retries <= actualMaxRetries) {
            const backoffTime = calculateBackoff(retries);
            console.log(`Retrying in ${backoffTime}ms (${retries}/${actualMaxRetries})`);
            await wait(backoffTime);
          }
        }
      }
      
      // Si llegamos aquí, se agotaron los reintentos
      console.error(`Max retries (${actualMaxRetries}) exceeded for message ${messageId}`);
      
      // Actualizar estado de salud del servidor
      updateServerHealth(false);
      
      setConnectionError(true);
      throw lastError;
    } catch (error) {
      // No reportar errores de abortados como fallos de conexión
      if (error.name !== 'AbortError') {
        console.error('Error en la solicitud HTTP:', error);
        setConnectionError(true);
        updateServerHealth(false);
      }
      
      // Limpiar timeout
      if (fetchTimeouts.current[messageId]) {
        clearTimeout(fetchTimeouts.current[messageId]);
        delete fetchTimeouts.current[messageId];
      }
      
      // Quitar del conjunto de solicitudes activas
      activeRequests.current.delete(messageId);
      
      // Eliminar el controlador
      if (fetchControllers.current[messageId]) {
        delete fetchControllers.current[messageId];
      }
      
      throw error;
    }
  }, [isTestMode, updateServerHealth, serverHealthStatus.isHealthy]);

  // Procesar la cola de TTS
  const processTTSQueue = useCallback(() => {
    if (isMuted || isPlayingTTS.current || ttsQueue.current.length === 0) {
      return;
    }

    isPlayingTTS.current = true;
    const { text, messageId } = ttsQueue.current.shift();

    synthesizeSpeech(text)
      .then(audioSrc => {
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          audioRef.current.play().catch(e => console.error("Error playing audio:", e));

          // Handle word highlighting during playback
          const words = text.split(/\s+/);
          let wordStartTime = 0;
          let wordIndex = 0;

          audioRef.current.ontimeupdate = () => {
            if (audioRef.current && wordIndex < words.length) {
              // Rough estimation based on average speech rate
              const estimatedWordDuration = (audioRef.current.duration / words.length) * 1000;
              if (audioRef.current.currentTime * 1000 >= wordStartTime) {
                setHighlightedWordInfo({ 
                  messageId, 
                  charIndex: text.indexOf(words[wordIndex])
                });
                wordStartTime += estimatedWordDuration;
                wordIndex++;
              }
            }
          };
        }
      })
      .catch(error => {
        console.error("Error synthesizing speech:", error);
      })
      .finally(() => {
        if (!audioRef.current) {
          isPlayingTTS.current = false;
          setHighlightedWordInfo({ messageId: null, charIndex: null });
          processTTSQueue();
        }
      });
  }, [isMuted]);

  // Añadir mensaje al estado
  const addMessage = useCallback((sender, text, files = [], status = 'sent', emoji = null) => {
    const messageId = generateUniqueId();
    const newMessage = {
      id: messageId,
      sender,
      text,
      timestamp: new Date(),
      files: files.map(f => ({
        name: f.name,
        type: f.type,
        url: URL.createObjectURL(f)
      })),
      status,
      emoji
    };
    
    setMessages(prev => [...prev, newMessage]);

    if (sender === 'bot' && text && !isMuted && ttsSupported) {
      ttsQueue.current.push({ text, messageId });
      processTTSQueue();
    }

    return messageId;
  }, [isMuted, ttsSupported, processTTSQueue]);

  // Manejar respuestas del servidor
  const handleResponse = useCallback((response) => {
    setIsTyping(false);
    
    if (!response) {
      setCurrentEmojiKey('default');
      setTimeout(() => showEmojiTemporarily('decepción', 8000), 10);
      addMessage('bot', "Lo siento, estoy teniendo dificultades para responder en este momento. Por favor, intenta de nuevo.", [], 'received', 'decepción');
      return;
    }
    
    try {
      // Simulación de datos si estamos en modo de prueba y no hay conexión
      if (isTestMode && connectionError) {
        console.log("Usando respuesta simulada en modo de prueba debido a error de conexión");
        response = [
          {
            message: "Esto es una respuesta simulada para pruebas. El servidor real no está disponible en este momento.",
            emoji: "automatizado"
          }
        ];
      }
      
      // Validar que la respuesta tenga un formato correcto
      if (!Array.isArray(response) && typeof response !== 'object') {
        console.error('Formato de respuesta inválido:', response);
        throw new Error('Formato de respuesta desconocido');
      }
      
      // Array de respuestas [{"message":"texto","emoji":"tipo"}]
      if (Array.isArray(response)) {
        if (response.length === 0) {
          console.warn('Se recibió un array vacío como respuesta');
          setCurrentEmojiKey('default');
          setTimeout(() => showEmojiTemporarily('decepción', 8000), 10);
          addMessage('bot', "El servidor no devolvió una respuesta válida.", [], 'received', 'decepción');
          return;
        }
        
        response.forEach((item, index) => {
          if (item && item.message) {
            const emojiType = item.emoji || 'default';
            
            // Solo mostrar emoji para el primer mensaje
            if (index === 0) {
              setCurrentEmojiKey('default');
              setTimeout(() => showEmojiTemporarily(emojiType, 8000), 10);
            }
            
            addMessage('bot', item.message, [], 'received', emojiType);
          }
        });
      } 
      // Objeto simple {"message":"texto","emoji":"tipo"}
      else if (response && response.message) {
        const emojiType = response.emoji || 'default';
        setCurrentEmojiKey('default');
        setTimeout(() => showEmojiTemporarily(emojiType, 8000), 10);
        addMessage('bot', response.message, [], 'received', emojiType);
      } 
      else {
        console.error('Respuesta sin formato esperado:', response);
        throw new Error('Formato de respuesta desconocido');
      }
    } catch (error) {
      console.error('Error procesando la respuesta:', error);
      setCurrentEmojiKey('default');
      setTimeout(() => showEmojiTemporarily('decepción', 8000), 10);
      addMessage('bot', "Hubo un problema procesando tu solicitud.", [], 'received', 'decepción');
    }
  }, [showEmojiTemporarily, addMessage, isTestMode, connectionError]);

  // Enviar mensaje
  const handleSendMessage = useCallback(async (text, files = []) => {
    const userMessageId = addMessage('user', text, files, 'sending');

    // Mostrar emoji de procesamiento
    setIsTyping(true);
    showEmojiTemporarily('procesando');

    try {
      // Convertir archivos a Base64 si hay alguno
      const filesPayload = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
          type: file.type,
        }))
      );

      // Crear payload según lo que espera el backend de n8n
      const payload = { 
        voice: null, // Campo para las voces (todavía no implementado)
        message: text,
        files: filesPayload.length > 0 ? filesPayload : null
      };
      
      // Actualizar estado a enviando
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === userMessageId ? { ...msg, status: 'sending' } : msg
      ));
      
      // Comprobar si el servidor está saludable
      if (!serverHealthStatus.isHealthy) {
        console.error("Error: El servidor no está saludable");
        throw new Error("El servidor no está saludable");
      }
      else {
        try {
          // Enviar por HTTP con posibilidad de reintentos
          const response = await sendViaHTTP(payload, userMessageId);
          
          // Actualizar estado a entregado
          setMessages(prevMessages => prevMessages.map(msg =>
            msg.id === userMessageId ? { ...msg, status: 'delivered' } : msg
          ));
          
          // Limpiar URLs de Blob
          files.forEach(f => URL.revokeObjectURL(f.url));
          
          // Procesar respuesta
          handleResponse(response);
        } catch (error) {
          console.error('Error al enviar mensaje:', error);
          setIsTyping(false);
          
          setCurrentEmojiKey('default');
          setTimeout(() => showEmojiTemporarily('decepción', 8000), 10);
          
          // Actualizar estado a error
          setMessages(prevMessages => prevMessages.map(msg =>
            msg.id === userMessageId ? { ...msg, status: 'error' } : msg
          ));
          
          // Limpiar URLs de Blob si existen
          files.forEach(f => {
            if (f.url) URL.revokeObjectURL(f.url);
          });
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setIsTyping(false);
      
      setCurrentEmojiKey('default');
      setTimeout(() => showEmojiTemporarily('decepción', 8000), 10);
      
      // Actualizar estado a error
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === userMessageId ? { ...msg, status: 'error' } : msg
      ));
      
      // Limpiar URLs de Blob si existen
      files.forEach(f => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
    }
  }, [showEmojiTemporarily, addMessage, sendViaHTTP, handleResponse, isTestMode, connectionError, serverHealthStatus.isHealthy]);

  // Alternar modo de prueba
  const toggleTestMode = useCallback(() => {
    setIsTestMode(prev => {
      const newMode = !prev;
      console.log(`Switched to ${newMode ? 'Test' : 'Production'} Mode`);
      return newMode;
    });
  }, []);

  // Alternar silencio
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('ttsMuted', newState.toString());
      
      if (newState && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        ttsQueue.current = [];
        isPlayingTTS.current = false;
        setHighlightedWordInfo({ messageId: null, charIndex: -1 });
      }
      
      return newState;
    });
  }, []);

  // Efecto: Verificar soporte de TTS
  useEffect(() => {
    setTtsSupported('speechSynthesis' in window);
  }, []);

  // Efecto: Iniciar comprobación de conexión solo al principio
  useEffect(() => {
    // Función para verificar el estado del servidor
    const checkConnection = async () => {
      try {
        const apiUrl = isTestMode ? API_URLS.test : API_URLS.production;
        
        // Usamos POST para verificar la conexión
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({
            message: 'hola',
            voice: null,
            files: null
          }),
          credentials: 'omit' // Evitar enviar cookies
        });
        
        clearTimeout(timeoutId);
        
        const wasError = connectionError;
        const newError = !response.ok;
        setConnectionError(newError);
        
        // Actualizar estado de salud del servidor
        updateServerHealth(!newError);
        
        // Si el estado ha cambiado de error a ok, loguear
        if (wasError && !newError) {
          console.log('Conexión restablecida con el servidor');
        }
      } catch (error) {
        console.error('Error al comprobar conexión:', error);
        setConnectionError(true);
        updateServerHealth(false);
      }
    };
    
    // Comprobar solo al inicio, no periódicamente
    checkConnection();
    
    // No establecemos ningún intervalo para evitar peticiones periódicas
  }, [isTestMode, connectionError, updateServerHealth]);

  // Efecto: Manejar finalización de audio
  useEffect(() => {
    const handleAudioEnd = () => {
      isPlayingTTS.current = false;
      setHighlightedWordInfo({ messageId: null, charIndex: null });
      processTTSQueue();
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('ended', handleAudioEnd);
      audioElement.addEventListener('error', handleAudioEnd);
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleAudioEnd);
        audioElement.removeEventListener('error', handleAudioEnd);
      }
    };
  }, [processTTSQueue]);

  // Efecto: Limpiar temporizadores y solicitudes pendientes al desmontar
  useEffect(() => {
    return () => {
      if (emojiDisplayTimer.current) {
        clearTimeout(emojiDisplayTimer.current);
      }
      
      // Limpiar todos los controladores de solicitudes
      Object.values(fetchControllers.current).forEach(controller => {
        if (controller && typeof controller.abort === 'function') {
          controller.abort();
        }
      });
      
      // Limpiar todos los timeouts
      Object.values(fetchTimeouts.current).forEach(timeoutId => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  return {
    messages,
    currentEmojiKey,
    isTyping,
    isMuted,
    ttsSupported,
    highlightedWordInfo,
    isTestMode,
    connectionError,
    handleSendMessage,
    handleToggleMute,
    toggleTestMode,
    audioRef
  };
}

export default useChatbotLogic;
