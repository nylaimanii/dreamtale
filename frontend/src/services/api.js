import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 120000, // 2 min for AI calls
});

// Sparky
export const sparkyStart = (data) => api.post('/api/sparky/start', data);
export const sparkyChat = (data) => api.post('/api/sparky/chat', data);
export const sparkyExtractPrefs = (data) => api.post('/api/sparky/extract-prefs', data);
export const sparkyDeleteSession = (id) => api.delete(`/api/sparky/session/${id}`);

// Story
export const generateStory = (data) => api.post('/api/story/generate', data);
export const generateSeriesRecap = (data) => api.post('/api/story/series-recap', data);

// Character
export const createCharacterFromDesc = (data) => api.post('/api/character/create-from-description', data);
export const analyzeDrawing = (data) => api.post('/api/character/analyze-drawing', data);
export const getVoiceTypes = () => api.get('/api/character/voice-types');

// Image
export const generateImage = (data) => api.post('/api/image/generate', data);
export const generateCover = (data) => api.post('/api/image/cover', data);

// TTS
export const narrateText = (data) => api.post('/api/tts/narrate', data);
export const sparkySpeak = (data) => api.post('/api/tts/sparky-speak', data);

export default api;
