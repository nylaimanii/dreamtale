const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const VOICE_TYPES = [
  { id: 'squeaky', label: 'Squeaky & Silly', ttsVoice: 'en-US-Journey-F', pitch: 8, rate: 1.2 },
  { id: 'booming', label: 'Big & Booming', ttsVoice: 'en-US-Journey-D', pitch: -6, rate: 0.85 },
  { id: 'mysterious', label: 'Soft & Mysterious', ttsVoice: 'en-US-Journey-F', pitch: -2, rate: 0.9 },
  { id: 'excited', label: 'Fast-Talking & Excited', ttsVoice: 'en-US-Journey-O', pitch: 4, rate: 1.3 },
  { id: 'wise', label: 'Slow, Wise & Dramatic', ttsVoice: 'en-US-Journey-D', pitch: -4, rate: 0.75 },
  { id: 'grumpy', label: 'Grumpy but Kind', ttsVoice: 'en-US-Journey-D', pitch: -3, rate: 0.95 },
];

router.post('/create-from-description', async (req, res) => {
  try {
    const { description, childName, childAge } = req.body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `A child named ${childName} (age ${childAge}) described their character like this: "${description}"

Create a magical, fun character profile based on their description.
Return ONLY valid JSON:
{
  "name": "character name (fun and memorable)",
  "species": "what kind of creature/person they are",
  "personality": "2-3 sentence personality description",
  "catchphrase": "a fun catchphrase they always say",
  "superpower": "their special ability or skill",
  "biggestFear": "something silly or endearing they're afraid of",
  "voiceType": "one of: squeaky, booming, mysterious, excited, wise, grumpy",
  "appearance": "detailed visual description for illustration",
  "illustrationPrompt": "detailed prompt for generating a character portrait illustration, colorful, child-friendly, whimsical cartoon style, full body, white background",
  "funFact": "one surprising fun fact about them",
  "friendshipStyle": "how they act with friends"
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let character;
    try {
      character = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse character JSON' });
    }

    const voiceInfo = VOICE_TYPES.find(v => v.id === character.voiceType) || VOICE_TYPES[0];
    character.voiceConfig = voiceInfo;

    res.json({ character });
  } catch (err) {
    console.error('Character create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze-drawing', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', childName, childAge } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `A child named ${childName} (age ${childAge}) drew this character! Look at their drawing with wonder and creativity.

Analyze this drawing and create an amazing character profile inspired by what you see.
Be imaginative and positive — treat every drawing as a masterpiece.
If it's hard to tell what it is, invent something wonderful based on the shapes and colors.

Return ONLY valid JSON:
{
  "name": "name inspired by the drawing",
  "species": "what kind of creature/being they are",
  "personality": "2-3 sentence personality description",
  "catchphrase": "their signature saying",
  "superpower": "their special power",
  "biggestFear": "something endearing they fear",
  "voiceType": "one of: squeaky, booming, mysterious, excited, wise, grumpy",
  "appearance": "what you see in the drawing, described lovingly",
  "illustrationPrompt": "prompt to recreate and enhance this character as a polished illustration, colorful, whimsical, child-friendly cartoon style",
  "drawingObservations": "3-4 warm, encouraging sentences about the actual drawing",
  "funFact": "a fun fact about this character",
  "friendshipStyle": "how they treat friends"
}`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
    ]);

    let text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let character;
    try {
      character = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse character JSON' });
    }

    const voiceInfo = VOICE_TYPES.find(v => v.id === character.voiceType) || VOICE_TYPES[0];
    character.voiceConfig = voiceInfo;

    res.json({ character });
  } catch (err) {
    console.error('Analyze drawing error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sparky-interview', async (req, res) => {
  try {
    const { message, sessionId, step, childName } = req.body;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are Sparky helping a child build their character through fun questions.
      Ask ONE question at a time about their character's appearance, personality, or powers.
      Be enthusiastic and encouraging. Keep responses SHORT.
      After 5-6 exchanges, include CHARACTER_COMPLETE at the end when you have enough to build the character.`,
    });

    const questions = [
      `Ask ${childName} what their character looks like — are they big or small? Furry or scaly? What color?`,
      'Ask what special power or skill their character has',
      'Ask what their character\'s personality is like — shy or bold? Silly or serious?',
      'Ask what their character is afraid of (make it fun and silly)',
      'Ask for their character\'s name and catchphrase',
    ];

    const questionPrompt = step < questions.length ? questions[step] : 'Wrap up and say CHARACTER_COMPLETE';

    const chat = model.startChat({
      generationConfig: { maxOutputTokens: 150, temperature: 0.9 },
    });

    const result = await chat.sendMessage(message || questionPrompt);
    const responseText = result.response.text();
    const isComplete = responseText.includes('CHARACTER_COMPLETE');

    res.json({
      message: responseText.replace('CHARACTER_COMPLETE', '').trim(),
      isComplete,
      nextStep: step + 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/voice-types', (req, res) => {
  res.json({ voiceTypes: VOICE_TYPES });
});

module.exports = router;
