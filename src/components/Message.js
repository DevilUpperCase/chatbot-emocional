import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileAlt, faCheck, faCheckDouble } from '@fortawesome/free-solid-svg-icons';

// Función auxiliar para obtener la hora actual
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Función auxiliar para dividir el texto en palabras y espacios, guardando índice original
const splitTextIntoSpans = (text) => {
  if (!text) return [];
  
  const parts = [];
  let charIndexOriginal = 0;
  // Regex mejorado para capturar palabras (incluyendo acentos y ñ) y espacios/saltos de línea
  const regex = /(\S+)|(\s+)/gu;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const part = match[0];
    if (match[1]) { // Es una palabra
      parts.push({
        type: 'word',
        text: part,
        charIndexOriginal: charIndexOriginal,
      });
    } else if (match[2]) { // Es espacio/salto de línea
      // Reemplazar saltos de línea con <br/> para renderizar, pero mantener el texto original para índices
      const renderedText = part.replace(/\n/g, '<br/>');
      parts.push({ type: 'space', text: renderedText, originalText: part });
    }
    charIndexOriginal += part.length; // Siempre avanzar por la longitud original
  }
  return parts;
};

const Message = React.memo(({ message, highlightedWordInfo }) => {
  // Extraemos las propiedades del mensaje, incluyendo files
  const { id, text, sender, timestamp, type, fileData, status, files = [], emoji } = message;
  const isBot = sender === 'bot';
  const isUser = sender === 'user';

  // Divide el texto en spans solo para mensajes del bot
  const messageParts = useMemo(() => {
    if (isBot && text) {
      return splitTextIntoSpans(text);
    }
    return null; // No necesitamos spans para el usuario
  }, [isBot, text]);

  // Determina qué palabra resaltar
  const highlightedIndex = useMemo(() => {
    if (!isBot || !highlightedWordInfo || highlightedWordInfo.messageId !== id || highlightedWordInfo.charIndex === null) {
      return -1; // No hay resaltado para este mensaje
    }

    const { charIndex } = highlightedWordInfo;
    let currentSpanIndex = -1;
    // Encuentra el span cuya posición original sea la más cercana <= charIndex
    for (let i = 0; i < (messageParts || []).length; i++) {
      if (messageParts[i].type === 'word') {
        const spanStartIndex = messageParts[i].charIndexOriginal;
        if (spanStartIndex <= charIndex) {
          currentSpanIndex = i;
        } else {
          // Si el índice del span es mayor, el span correcto fue el anterior.
          break;
        }
      }
    }
    return currentSpanIndex;
  }, [isBot, highlightedWordInfo, id, messageParts]);

  // Formatea el timestamp a una cadena legible
  const formattedTimestamp = timestamp instanceof Date
    ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : getCurrentTime(); // Fallback por si acaso

  // Mapeamos los tipos de emoji a emojis reales
  const getEmojiByType = (emojiType) => {
    const emojiMap = {
      'gracioso': '😂',
      'gratitud': '🙏',
      'decepción': '😔',
      'automatizado': '🤖',
      'aprobación': '👍',
      'cariño': '😊',
      'asombro': '😲',
      'default': '🤔' // Emoji por defecto si no coincide con ninguno
    };
    
    return emojiMap[emojiType] || emojiMap.default;
  };

  // Renderizar archivos adjuntos (imágenes o PDFs)
  const renderAttachments = () => {
    if (!files || files.length === 0) {
      // Compatibilidad con formato antiguo (si existe)
      if (type === 'image' && fileData) {
        return (
          <div className="file-attachment">
            <img 
              src={fileData.url} 
              alt={fileData.name || "Imagen adjunta"} 
              className="attached-image"
            />
            <div className="file-name">{fileData.name}</div>
          </div>
        );
      } else if (type === 'file' && fileData) {
        return (
          <div className="file-attachment">
            <a 
              href={fileData.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="file-link"
            >
              <div className="file-icon">
                {fileData.type === 'application/pdf' ? (
                  <FontAwesomeIcon icon={faFilePdf} size="3x" />
                ) : (
                  <FontAwesomeIcon icon={faFileAlt} size="3x" />
                )}
              </div>
              <div className="file-name">{fileData.name}</div>
            </a>
          </div>
        );
      }
      return null;
    }

    return (
      <div className="message-attachments">
        {files.map((file, index) => {
          if (file.type.startsWith('image/')) {
            return (
              <div key={index} className="file-attachment">
                <img 
                  src={file.url} 
                  alt={file.name || "Imagen adjunta"} 
                  className="attached-image"
                />
                {file.name && <div className="file-name">{file.name}</div>}
              </div>
            );
          } else if (file.type === 'application/pdf') {
            return (
              <div key={index} className="file-attachment">
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="file-link"
                >
                  <div className="file-icon">
                    <FontAwesomeIcon icon={faFilePdf} size="3x" />
                  </div>
                  <div className="file-name">{file.name}</div>
                </a>
              </div>
            );
          } else {
            return (
              <div key={index} className="file-attachment">
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="file-link"
                >
                  <div className="file-icon">
                    <FontAwesomeIcon icon={faFileAlt} size="3x" />
                  </div>
                  <div className="file-name">{file.name}</div>
                </a>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // Renderizar contenido de texto
  const renderTextContent = () => {
    if (!text || text.trim() === '') return null;
    
    if (isBot && messageParts) {
      // Mensaje de texto del bot (con posible resaltado)
      return (
        <div className="message-text">
          {messageParts.map((part, index) => {
            if (part.type === 'word') {
              return (
                <span
                  key={index}
                  className={`word ${index === highlightedIndex ? 'highlighted' : ''}`}
                  data-char-index-original={part.charIndexOriginal}
                >
                  {part.text}
                </span>
              );
            } else { // Es espacio o <br/>
              // Usamos dangerouslySetInnerHTML para renderizar <br/> correctamente
              return <span key={index} dangerouslySetInnerHTML={{ __html: part.text }} />;
            }
          })}
        </div>
      );
    } else {
      // Mensajes de texto normales del usuario o tipo desconocido
      return (
        <div className="message-text">
          <span dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br>') }} />
        </div>
      );
    }
  };

  return (
    <div className={`message ${sender}-message`}>
      <div className="message-content">
        {isBot && emoji && (
          <div className="message-emoji">
            {getEmojiByType(emoji)}
          </div>
        )}
        {renderAttachments()}
        {renderTextContent()}
        <div className="message-metadata">
          <span className="timestamp">{formattedTimestamp}</span>
          {isUser && (
            <span className="message-status">
              {status === 'sent' && <FontAwesomeIcon icon={faCheck} className="status-icon sent" />}
              {status === 'delivered' && <FontAwesomeIcon icon={faCheckDouble} className="status-icon delivered" />}
              {status === 'read' && <FontAwesomeIcon icon={faCheckDouble} className="status-icon read" />}
              {status === 'sending' && <span className="status-text sending">Enviando...</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default Message;