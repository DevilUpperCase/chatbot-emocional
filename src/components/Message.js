import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileAlt, faCheck, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';

// Función auxiliar para obtener la hora actual
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message = React.memo(({ message }) => {
  // Extraemos las propiedades del mensaje, incluyendo files
  const { id, text, sender, timestamp, type, fileData, status, files = [], emoji } = message;
  const isBot = sender === 'bot';
  const isUser = sender === 'user';

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
      'procesando': '🤖',
      'tarea hecha': '👍',
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
    
    // Simplified text rendering with markdown for all messages
    return (
      <div className="message-text markdown-content">
        <ReactMarkdown 
          components={{
            a: ({node, children, ...props}) => (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
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