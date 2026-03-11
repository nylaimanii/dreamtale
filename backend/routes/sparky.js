const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SPARKY_SYSTEM = `You are Sparky, a magical, warm, funny, and encouraging AI storytelling companion for children ages 3-10.
You help children create personalized stories they will love.
Your personality: warm, funny, exciting, patient, uses simple words, very enthusiastic, uses gentle humor.
You use age-appropriate language. For younger kids (3-5) you use very simple words and short sentences. For older kids (6-10) you can be more descriptive.
Always end your messages with either a question to keep the conversation going, or a clear "Ready!" signal when you have enough info.
Use fun expressions like "Ooooh!", "Wow!", "That's AMAZING!", "How exciting!", "I love it!"
Keep responses SHORT — max 3 sentences + a question. Kids have short attention spans.
When you have gathered enough info for a great story (name, age, interests, story preferences), include the exact text "STORY_READY" at the very end of your message (hidden from display).`;

// In-memory session store (in production use Redis/Firestore)
const sessions = new Map();

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, childAge, childName, context } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SPARKY_SYSTEM,
    });

    // Get or create chat history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.9,
      },
    });

    // Build context-aware message for first turn
    let userMessage = message;
    if (history.length === 0) {
      userMessage = `[Child info: Name=${childName || 'friend'}, Age=${childAge || 'unknown'}] ${message}`;
    }

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    // Update history
    history.push(
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: responseText }] }
    );
    sessions.set(sessionId, history);

    const isReady = responseText.includes('STORY_READY');
    const displayText = responseText.replace('STORY_READY', '').trim();

    res.json({ message: displayText, isReady, sessionId });
  } catch (err) {
    console.error('Sparky chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    const { childName, childAge, sessionId } = req.body;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SPARKY_SYSTEM,
    });

    const greeting = `The child's name is ${childName || 'friend'} and they are ${childAge || 'a child'} years old.
    Greet them warmly by name, introduce yourself as Sparky, and ask them what kind of story they want to hear today.
    Make it magical and exciting! Ask about their favorite things (animals, colors, adventures, etc.)`;

    const result = await model.generateContent(greeting);
    const responseText = result.response.text();

    // Init session with this as first model turn
    sessions.set(sessionId, [
      { role: 'model', parts: [{ text: responseText }] }
    ]);

    res.json({ message: responseText, sessionId });
  } catch (err) {
    console.error('Sparky start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Extract story preferences from conversation
router.post('/extract-prefs', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const history = sessions.get(sessionId) || [];

    if (history.length === 0) {
      return res.json({ prefs: {} });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const conversationText = history.map(m =>
      `${m.role === 'user' ? 'Child' : 'Sparky'}: ${m.parts[0].text}`
    ).join('\n');

    const prompt = `Based on this conversation between Sparky and a child, extract story preferences as JSON.

Conversation:
${conversationText}

Return ONLY valid JSON with these fields:
{
  "favoriteAnimals": [],
  "favoriteColors": [],
  "storyTheme": "",
  "mainCharacterType": "",
  "settingPreference": "",
  "mood": "",
  "interests": [],
  "narratorPreference": "",
  "additionalNotes": ""
}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let prefs = {};
    try { prefs = JSON.parse(text); } catch (e) { prefs = {}; }

    res.json({ prefs });
  } catch (err) {
    console.error('Extract prefs error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

module.exports = router;
