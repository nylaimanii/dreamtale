const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate an illustration using Gemini's image generation
router.post('/generate', async (req, res) => {
  try {
    const { prompt, style = 'children book illustration' } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const fullPrompt = `${style}, colorful, whimsical, magical, child-friendly: ${prompt}`;

    // Use Gemini 2.0 Flash image generation
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-preview-image-generation',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const response = result.response;
    const candidates = response.candidates || [];

    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts || [])) {
        if (part.inlineData) {
          return res.json({
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        }
      }
    }

    // Fallback: return a placeholder signal
    return res.json({ placeholder: true, prompt: fullPrompt });
  } catch (err) {
    console.error('Image generate error:', err);
    // Return placeholder on error so story still works
    res.json({ placeholder: true, prompt: req.body.prompt, error: err.message });
  }
});

// Generate story cover illustration
router.post('/cover', async (req, res) => {
  try {
    const { title, description } = req.body;

    const prompt = `Children's book cover illustration for "${title}": ${description}.
    Colorful, magical, whimsical, exciting, bright colors, professional children's book art style.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-preview-image-generation',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    const candidates = result.response.candidates || [];
    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts || [])) {
        if (part.inlineData) {
          return res.json({
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        }
      }
    }

    res.json({ placeholder: true });
  } catch (err) {
    console.error('Cover generate error:', err);
    res.json({ placeholder: true, error: err.message });
  }
});

module.exports = router;
