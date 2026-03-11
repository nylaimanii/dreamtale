require('dotenv').config();
const express = require('express');
const cors = require('cors');

const storyRoutes = require('./routes/story');
const characterRoutes = require('./routes/character');
const sparkyRoutes = require('./routes/sparky');
const imageRoutes = require('./routes/image');
const ttsRoutes = require('./routes/tts');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/story', storyRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/sparky', sparkyRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/tts', ttsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DreamTale Backend' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DreamTale backend running on port ${PORT}`);
});
