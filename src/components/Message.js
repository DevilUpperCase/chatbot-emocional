import React, { useMemo } from 'react';

// Función auxiliar para obtener la hora actual
const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Función auxiliar para dividir el texto en palabras y espacios, guardando índice original
const splitTextIntoSpans = (text) => {
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
  const { id, text, sender, timestamp } = message;
  const isBot = sender === 'bot';

  // Divide el texto en spans solo para mensajes del bot y memorízalo
  const messageParts = useMemo(() => {
    if (isBot) {
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
       for (let i = 0; i < messageParts.length; i++) {
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


  return (
    <div className={`message ${sender}-message`}>
      <div> {/* Contenedor del texto */}
        {isBot && messageParts ? (
          messageParts.map((part, index) => {
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
          })
        ) : (
          // Para mensajes de usuario, reemplazar \n con <br>
          <span dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br>') }} />
        )}
      </div>
      <div className="timestamp">{timestamp || getCurrentTime()}</div>
    </div>
  );
});

export default Message;