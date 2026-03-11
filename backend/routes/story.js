const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AGE_CONFIG = {
  '3-5': { pages: 8, wordsPerPage: 40, totalMins: 3, complexity: 'very simple words, short sentences, repetition is good, rhymes welcome' },
  '6-8': { pages: 10, wordsPerPage: 60, totalMins: 5, complexity: 'simple engaging language, some descriptive words, exciting action' },
  '9-10': { pages: 12, wordsPerPage: 80, totalMins: 7, complexity: 'richer vocabulary, more complex plot, deeper emotions, clever humor' },
};

const NARRATOR_VOICES = {
  wizard: { name: 'The Wise Wizard', style: 'wise, mystical, uses old-fashioned phrases like "Ah, young one" and "Indeed"' },
  silly: { name: 'The Silly Sidekick', style: 'goofy, makes puns, uses sound effects in text like "BOING!" and "WHOOSH!"' },
  star: { name: 'The Friendly Star', style: 'warm, cheerful, encouraging, often addresses the reader directly' },
  explorer: { name: 'The Brave Explorer', style: 'adventurous, dramatic, uses exclamations, makes everything sound epic' },
};

function getAgeTier(age) {
  const n = parseInt(age);
  if (n <= 5) return '3-5';
  if (n <= 8) return '6-8';
  return '9-10';
}

router.post('/generate', async (req, res) => {
  try {
    const {
      childName, childAge, prefs = {}, narrator = 'star',
      character = null, seriesContext = null
    } = req.body;

    const tier = getAgeTier(childAge);
    const config = AGE_CONFIG[tier];
    const narratorInfo = NARRATOR_VOICES[narrator] || NARRATOR_VOICES.star;

    const characterSection = character
      ? `Main character: ${character.name} — ${character.personality}. Catchphrase: "${character.catchphrase}". Superpower: ${character.superpower}.
         ${character.isNarrating ? `This story is narrated IN FIRST PERSON by ${character.name} themselves.` : ''}`
      : `Create an original main character based on the child's preferences.`;

    const seriesSection = seriesContext
      ? `This is part of a series. Previous story summary: ${seriesContext.lastSummary}. Established lore: ${seriesContext.lore}.`
      : '';

    const lessonTopics = ['kindness', 'bravery', 'honesty', 'friendship', 'creativity', 'perseverance', 'empathy', 'curiosity'];
    const lesson = lessonTopics[Math.floor(Math.random() * lessonTopics.length)];

    const prompt = `Create a magical children's story for ${childName}, age ${childAge}.

Story preferences from conversation with Sparky:
- Favorite things: ${JSON.stringify(prefs.interests || [])}
- Theme: ${prefs.storyTheme || 'adventure'}
- Setting: ${prefs.settingPreference || 'magical world'}
- Mood: ${prefs.mood || 'fun and exciting'}
- Favorite animals: ${JSON.stringify(prefs.favoriteAnimals || [])}

${characterSection}
${seriesSection}

Narrator style: ${narratorInfo.name} — ${narratorInfo.style}
Language complexity: ${config.complexity}
Number of pages: ${config.pages}
Words per page: ~${config.wordsPerPage}
Hidden micro-lesson to weave in naturally: ${lesson}

Rules:
1. Generate EXACTLY ${config.pages} pages
2. Each page should be a natural story paragraph that works on its own
3. Include the child's name (${childName}) naturally in the story
4. Weave in the micro-lesson organically — never preach it
5. Make it exciting, funny, and magical
6. End with a satisfying conclusion that leaves room for a sequel

Return ONLY valid JSON:
{
  "title": "creative story title",
  "coverDescription": "vivid description of the cover illustration (for image generation)",
  "pages": [
    {
      "pageNumber": 1,
      "text": "page text here",
      "illustrationPrompt": "detailed child-friendly illustration prompt for this page, colorful, magical, whimsical art style",
      "soundEffect": "optional ambient sound (e.g. 'forest', 'ocean', 'city', 'magic sparkles', 'cozy home')"
    }
  ],
  "hiddenLesson": "${lesson}",
  "seriesSummary": "2-sentence summary of this story for series tracking",
  "newLoreElements": "any new characters, places, or rules established in this story"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: 4000, temperature: 1.0 },
    });

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let story;
    try {
      story = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error, raw:', text.substring(0, 500));
      return res.status(500).json({ error: 'Failed to parse story JSON', raw: text.substring(0, 200) });
    }

    res.json({ story });
  } catch (err) {
    console.error('Story generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-title', async (req, res) => {
  try {
    const { theme, childName, characters } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(
      `Generate 5 creative, magical, child-friendly story titles for a story about: ${theme}.
       Child's name: ${childName}. Characters: ${characters}.
       Return ONLY a JSON array of 5 title strings.`
    );
    let text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const titles = JSON.parse(text);
    res.json({ titles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/series-recap', async (req, res) => {
  try {
    const { seriesName, lastSummary, childName } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(
      `Create an exciting, fun recap of the last episode of "${seriesName}" for ${childName}.
       Last story summary: ${lastSummary}
       Write it as Sparky would say it — exciting, warm, 3-4 sentences max.
       Start with "Last time on ${seriesName}..."`
    );
    res.json({ recap: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
