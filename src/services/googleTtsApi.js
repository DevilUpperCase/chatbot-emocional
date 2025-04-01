// ¡ADVERTENCIA! Tu clave API será expuesta en el código del cliente.
// Asegúrate de restringir la clave API en la consola de Google Cloud.
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY; // o import.meta.env.VITE_GOOGLE_API_KEY para Vite
const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

export const synthesizeSpeech = async (text) => {
  if (!API_KEY) {
    console.error("Error: Google API Key no está configurada.");
    // Podrías devolver un error o audio vacío/silencio
    return null;
  }

  const requestBody = {
    input: { text: text },
    // Puedes personalizar la voz aquí: https://cloud.google.com/text-to-speech/docs/voices
    voice: { languageCode: 'es-ES', name: 'es-ES-Standard-A' },
    audioConfig: { audioEncoding: 'MP3' }, // MP3 es ampliamente compatible
  };

  try {
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error en la API de Google TTS:', response.status, errorData);
      // Considera cómo manejar el error en la UI
      return null;
    }

    const data = await response.json();
    // El audio viene codificado en base64
    return data.audioContent;

  } catch (error) {
    console.error('Error al llamar a la API de Google TTS:', error);
    return null;
  }
};

// Ya no exportamos esta función porque ahora usamos la función playAudio en useChatbotLogic
// Pero la mantenemos para referencia o compatibilidad con código existente
export const playBase64Audio = (base64Audio) => {
    if (!base64Audio) return;
    const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
    const audio = new Audio(audioSrc);
    audio.play().catch(e => console.error("Error al reproducir audio:", e));
}; 