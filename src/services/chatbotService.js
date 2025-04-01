// Ejemplo: Moviendo la simulación aquí
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

// La función que necesita ser exportada
export const getChatbotResponse = async (userMessageText, chatHistory) => {
  // Simula una llamada asíncrona
  await new Promise(resolve => setTimeout(resolve, 500)); // Simula delay de red

  const simulatedData = simulateServerResponse(userMessageText);

  // Devuelve la estructura esperada { responseText, analysis }
  // Por ahora, analysis puede ser null o un objeto vacío.
  return {
      responseText: simulatedData.text, // Asume que simulateServerResponse devuelve { text, emoji }
      analysis: { sentiment: 'neutral', emoji: simulatedData.emoji } // Ejemplo de análisis
  };
}; 