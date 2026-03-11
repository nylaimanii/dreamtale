import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { sparkyStart, sparkyChat, sparkyExtractPrefs, generateStory, generateCover } from '../../services/api';
import toast from 'react-hot-toast';
import './SparkyConversation.css';

const NARRATOR_OPTIONS = [
  { id: 'star', name: 'The Friendly Star', emoji: '⭐', desc: 'Warm and cheerful' },
  { id: 'wizard', name: 'The Wise Wizard', emoji: '🧙', desc: 'Mystical and wise' },
  { id: 'silly', name: 'The Silly Sidekick', emoji: '🤪', desc: 'Goofy and fun' },
  { id: 'explorer', name: 'The Brave Explorer', emoji: '🗺️', desc: 'Epic and adventurous' },
];

export default function SparkyConversation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => `${user?.uid}-${Date.now()}`);
  const [phase, setPhase] = useState('chat'); // chat | narrator | generating
  const [narrator, setNarrator] = useState('star');
  const [loading, setLoading] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const childName = profile?.childName || 'Friend';
  const childAge = profile?.childAge || 7;

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startConversation() {
    setLoading(true);
    try {
      const res = await sparkyStart({ childName, childAge, sessionId });
      setMessages([{ role: 'sparky', text: res.data.message, id: Date.now() }]);
    } catch (e) {
      setMessages([{
        role: 'sparky',
        text: `Hi ${childName}! I'm Sparky! ✨ What kind of magical story do you want to hear today? Tell me about your favorite things!`,
        id: Date.now()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, id: Date.now() }]);
    setLoading(true);

    try {
      const res = await sparkyChat({
        message: userMsg, sessionId, childAge, childName,
      });

      const { message, isReady } = res.data;
      setMessages(prev => [...prev, { role: 'sparky', text: message, id: Date.now() }]);

      if (isReady) {
        setTimeout(() => setPhase('narrator'), 800);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'sparky',
        text: "Oops! I lost my train of thought! Tell me more about what you'd like in your story! 🌟",
        id: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateStory() {
    setPhase('generating');
    setGeneratingStory(true);

    const loadingMessages = [
      '✨ Sparky is sprinkling magic...',
      '🌟 Weaving your adventure...',
      '🎨 Painting the illustrations...',
      '📖 Writing the perfect story...',
      '🦋 Almost ready...',
    ];

    let msgIdx = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIdx]);
    }, 2000);

    try {
      // Extract preferences from conversation
      const prefsRes = await sparkyExtractPrefs({ sessionId });
      const prefs = prefsRes.data.prefs || {};

      // Generate story
      const storyRes = await generateStory({
        childName, childAge, prefs, narrator,
      });

      const story = storyRes.data.story;

      // Generate cover image
      let coverImage = null;
      try {
        const coverRes = await generateCover({
          title: story.title,
          description: story.coverDescription,
        });
        if (!coverRes.data.placeholder) {
          coverImage = coverRes.data.imageBase64;
        }
      } catch (e) {
        console.log('Cover generation failed, using placeholder');
      }

      // Save to Firestore
      const storyDoc = await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        authorName: childName,
        title: story.title,
        pages: story.pages,
        coverImage,
        coverEmoji: ['📖','🌟','🦋','🐉','🌈','⚡','🎭','🏰'][Math.floor(Math.random() * 8)],
        narrator,
        hiddenLesson: story.hiddenLesson,
        seriesSummary: story.seriesSummary,
        newLoreElements: story.newLoreElements,
        coverDescription: story.coverDescription,
        prefs,
        rating: null,
        createdAt: serverTimestamp(),
      });

      clearInterval(interval);
      navigate(`/story/${storyDoc.id}`, { state: { story, narrator } });
    } catch (e) {
      clearInterval(interval);
      console.error('Story generation error:', e);
      toast.error('Oops! Magic hiccup! Try again? 🌟');
      setPhase('narrator');
      setGeneratingStory(false);
    }
  }

  return (
    <div className="sparky-screen screen">
      <div className="content sparky-content">
        {/* Header */}
        <header className="sparky-header">
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <div className="sparky-header-center">
            <span className="sparky-header-icon float">🌟</span>
            <span className="sparky-header-name">Sparky</span>
          </div>
          <div style={{ width: 60 }} />
        </header>

        {/* Chat area */}
        {phase === 'chat' && (
          <div className="chat-container">
            <div className="messages-list">
              {messages.map(msg => (
                <div key={msg.id} className={`message-row ${msg.role}`}>
                  {msg.role === 'sparky' && <div className="sparky-avatar-sm">🌟</div>}
                  <div className={`message-bubble ${msg.role}`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row sparky">
                  <div className="sparky-avatar-sm">🌟</div>
                  <div className="message-bubble sparky typing">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-row" onSubmit={sendMessage}>
              <input
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={loading}
              />
              <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
                🚀
              </button>
            </form>
          </div>
        )}

        {/* Narrator selection */}
        {phase === 'narrator' && (
          <div className="narrator-phase bounce-in">
            <div className="narrator-sparky float">🌟</div>
            <div className="narrator-bubble">
              Yay! I have everything I need! 🎉<br />
              Now pick who tells your story!
            </div>

            <div className="narrator-grid">
              {NARRATOR_OPTIONS.map(n => (
                <button
                  key={n.id}
                  className={`narrator-card ${narrator === n.id ? 'selected' : ''}`}
                  onClick={() => setNarrator(n.id)}
                >
                  <div className="narrator-emoji">{n.emoji}</div>
                  <div className="narrator-name">{n.name}</div>
                  <div className="narrator-desc">{n.desc}</div>
                </button>
              ))}
            </div>

            <button className="btn-yellow generate-btn" onClick={handleGenerateStory}>
              ✨ Make My Story!
            </button>

            <button className="back-to-chat" onClick={() => setPhase('chat')}>
              ← Go back to Sparky
            </button>
          </div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <div className="generating-phase">
            <div className="generating-sparky">🌟</div>
            <div className="generating-ring" />
            <h2 className="generating-title">Creating Your Story!</h2>
            <p className="generating-msg">{loadingMsg}</p>
            <div className="generating-dots">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="gen-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
