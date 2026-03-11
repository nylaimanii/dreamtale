const express = require('express');
const router = express.Router();

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const API_KEY = process.env.GEMINI_API_KEY;

const NARRATOR_VOICES = {
  wizard:   { name: 'en-US-Journey-D', pitch: -4.0, rate: 0.85 },
  silly:    { name: 'en-US-Journey-O', pitch:  6.0, rate: 1.15 },
  star:     { name: 'en-US-Journey-F', pitch:  2.0, rate: 1.0  },
  explorer: { name: 'en-US-Journey-D', pitch:  0.0, rate: 1.05 },
  sparky:   { name: 'en-US-Journey-F', pitch:  5.0, rate: 1.1  },
};

const CHARACTER_VOICES = {
  squeaky:    { name: 'en-US-Journey-F', pitch: 8.0,  rate: 1.2  },
  booming:    { name: 'en-US-Journey-D', pitch: -6.0, rate: 0.85 },
  mysterious: { name: 'en-US-Journey-F', pitch: -2.0, rate: 0.9  },
  excited:    { name: 'en-US-Journey-O', pitch: 4.0,  rate: 1.3  },
  wise:       { name: 'en-US-Journey-D', pitch: -4.0, rate: 0.75 },
  grumpy:     { name: 'en-US-Journey-D', pitch: -3.0, rate: 0.95 },
};

async function synthesizeSpeech(text, voiceConfig) {
  const body = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: voiceConfig.name,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      pitch: voiceConfig.pitch || 0,
      speakingRate: voiceConfig.rate || 1.0,
    },
  };

  const response = await fetch(`${TTS_API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS API error: ${err}`);
  }

  const data = await response.json();
  return data.audioContent; // base64 MP3
}

router.post('/narrate', async (req, res) => {
  try {
    const { text, narratorType = 'star', characterVoiceType } = req.body;

    if (!text) return res.status(400).json({ error: 'text required' });

    const voiceConfig = characterVoiceType
      ? CHARACTER_VOICES[characterVoiceType] || CHARACTER_VOICES.excited
      : NARRATOR_VOICES[narratorType] || NARRATOR_VOICES.star;

    const audioBase64 = await synthesizeSpeech(text, voiceConfig);

    res.json({ audioBase64, mimeType: 'audio/mp3' });
  } catch (err) {
    console.error('TTS narrate error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sparky-speak', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    const audioBase64 = await synthesizeSpeech(text, NARRATOR_VOICES.sparky);
    res.json({ audioBase64, mimeType: 'audio/mp3' });
  } catch (err) {
    console.error('Sparky TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
