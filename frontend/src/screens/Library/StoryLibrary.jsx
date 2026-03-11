import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import BottomNav from '../../components/BottomNav';
import './StoryLibrary.css';

const EMOJIS = ['📖','🌟','🦋','🐉','🌈','⚡','🎭','🏰','🦄','🐋','🌺','🗺️'];

export default function StoryLibrary() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | rated | recent

  useEffect(() => {
    if (!user) return;
    async function fetchStories() {
      try {
        const q = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [user]);

  function handleSurprise() {
    if (stories.length === 0) return navigate('/sparky');
    const r = stories[Math.floor(Math.random() * stories.length)];
    navigate(`/story/${r.id}`);
  }

  const filtered = stories.filter(s => {
    if (filter === 'rated') return s.rating >= 4;
    return true;
  });

  return (
    <div className="story-lib-screen screen">
      <div className="content story-lib-content">
        {/* Header */}
        <header className="story-lib-header">
          <h1>📚 My Story Library</h1>
          <p className="lib-subtitle">{stories.length} {stories.length === 1 ? 'story' : 'stories'} written by {profile?.childName || 'you'}</p>
        </header>

        {/* Action row */}
        <div className="lib-actions">
          <button className="btn-yellow lib-cta" onClick={() => navigate('/sparky')}>
            ✨ New Story
          </button>
          <button className="surprise-btn" onClick={handleSurprise}>
            🎲 Surprise Me!
          </button>
        </div>

        {/* Filters */}
        {stories.length > 0 && (
          <div className="filter-row">
            {[['all', '📚 All'], ['rated', '⭐ Favorites']].map(([val, label]) => (
              <button
                key={val}
                className={`filter-btn ${filter === val ? 'active' : ''}`}
                onClick={() => setFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Bookshelf */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : stories.length === 0 ? (
          <div className="empty-shelf card">
            <div className="empty-shelf-visual">
              <span className="shelf-emoji">📭</span>
            </div>
            <h2>Your shelf is empty!</h2>
            <p>Talk to Sparky and your magical stories will appear here! ✨</p>
            <button className="btn-primary" onClick={() => navigate('/sparky')}>
              Create My First Story! 🚀
            </button>
          </div>
        ) : (
          <>
            {/* Bookshelf visual */}
            <div className="bookshelf">
              <div className="shelf-plank" />
              <div className="books-row">
                {filtered.slice(0, 6).map((story, i) => (
                  <BookSpine
                    key={story.id}
                    story={story}
                    idx={i}
                    onClick={() => navigate(`/story/${story.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Story cards grid */}
            <div className="stories-list">
              {filtered.map(story => (
                <StoryListCard
                  key={story.id}
                  story={story}
                  onClick={() => navigate(`/story/${story.id}`)}
                />
              ))}
            </div>
          </>
        )}

        <div style={{ height: 100 }} />
      </div>
      <BottomNav />
    </div>
  );
}

function BookSpine({ story, idx, onClick }) {
  const colors = [
    'linear-gradient(180deg, #7C3AED, #4C1D95)',
    'linear-gradient(180deg, #EC4899, #9D174D)',
    'linear-gradient(180deg, #F97316, #C2410C)',
    'linear-gradient(180deg, #FCD34D, #D97706)',
    'linear-gradient(180deg, #4ADE80, #15803D)',
    'linear-gradient(180deg, #60A5FA, #1D4ED8)',
  ];
  return (
    <div
      className="book-spine"
      style={{ background: colors[idx % colors.length] }}
      onClick={onClick}
      title={story.title}
    >
      <div className="spine-title">{story.title}</div>
      {story.rating && <div className="spine-stars">{'⭐'.repeat(story.rating)}</div>}
    </div>
  );
}

function StoryListCard({ story, onClick }) {
  const createdAt = story.createdAt?.toDate?.() || new Date();
  const dateStr = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="story-list-card card" onClick={onClick}>
      <div className="slc-cover">
        {story.coverImage ? (
          <img src={`data:image/png;base64,${story.coverImage}`} alt={story.title} />
        ) : (
          <div className="slc-cover-placeholder">
            <span>{story.coverEmoji || EMOJIS[Math.floor(Math.random() * EMOJIS.length)]}</span>
          </div>
        )}
      </div>
      <div className="slc-info">
        <h3 className="slc-title">{story.title}</h3>
        <p className="slc-meta">By {story.authorName} • {story.pages?.length || 0} pages</p>
        <p className="slc-date">{dateStr}</p>
        {story.rating && (
          <div className="slc-stars">{'⭐'.repeat(story.rating)}</div>
        )}
      </div>
      <div className="slc-arrow">→</div>
    </div>
  );
}
