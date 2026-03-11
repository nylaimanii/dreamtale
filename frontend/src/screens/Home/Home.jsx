import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import BottomNav from '../../components/BottomNav';
import './Home.css';

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Home() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [recentStories, setRecentStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchRecent() {
      try {
        const q = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        const snap = await getDocs(q);
        setRecentStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStories(false);
      }
    }
    fetchRecent();
  }, [user]);

  const childName = profile?.childName || user?.displayName?.split(' ')[0] || 'Friend';
  const stars = profile?.storyStars || 0;
  const streak = profile?.readingStreak || 0;

  async function handleSurpriseMe() {
    if (recentStories.length === 0) {
      navigate('/sparky');
      return;
    }
    const random = recentStories[Math.floor(Math.random() * recentStories.length)];
    navigate(`/story/${random.id}`);
  }

  return (
    <div className="home-screen screen">
      <div className="content home-content">
        {/* Header */}
        <header className="home-header">
          <div className="header-left">
            <p className="greeting">{GREETING()},</p>
            <h1 className="child-name">{childName}! 👋</h1>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="stat-icon">⭐</span>
              <span className="stat-val">{stars}</span>
            </div>
            <div className="stat-badge">
              <span className="stat-icon">🔥</span>
              <span className="stat-val">{streak}</span>
            </div>
          </div>
        </header>

        {/* Sparky Hero CTA */}
        <div className="sparky-hero card pulse-glow" onClick={() => navigate('/sparky')}>
          <div className="sparky-hero-left">
            <div className="sparky-icon float">🌟</div>
          </div>
          <div className="sparky-hero-right">
            <h2>Talk to Sparky!</h2>
            <p>Let Sparky create a magical story just for you ✨</p>
            <button className="btn-yellow hero-btn">Start a New Story 🚀</button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="quick-actions">
          <button className="quick-btn" onClick={() => navigate('/characters/create')}>
            <span className="quick-icon">🦸</span>
            <span>Create Hero</span>
          </button>
          <button className="quick-btn" onClick={handleSurpriseMe}>
            <span className="quick-icon">🎲</span>
            <span>Surprise Me!</span>
          </button>
          <button className="quick-btn" onClick={() => navigate('/library')}>
            <span className="quick-icon">📚</span>
            <span>My Stories</span>
          </button>
          <button className="quick-btn" onClick={() => navigate('/characters')}>
            <span className="quick-icon">✨</span>
            <span>My Heroes</span>
          </button>
        </div>

        {/* Recent stories */}
        <section className="recent-section">
          <div className="section-header">
            <h2>📖 Recent Stories</h2>
            <button className="see-all" onClick={() => navigate('/library')}>See all</button>
          </div>

          {loadingStories ? (
            <div className="stories-loading">
              {[1,2].map(i => <div key={i} className="story-skeleton" />)}
            </div>
          ) : recentStories.length === 0 ? (
            <div className="empty-stories card">
              <div className="empty-emoji">📭</div>
              <p>No stories yet! Talk to Sparky to create your first one! ✨</p>
              <button className="btn-primary" onClick={() => navigate('/sparky')}>
                Start My First Story!
              </button>
            </div>
          ) : (
            <div className="stories-grid">
              {recentStories.map(story => (
                <StoryCard key={story.id} story={story} onClick={() => navigate(`/story/${story.id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* Bottom padding for nav */}
        <div style={{ height: 100 }} />
      </div>

      <BottomNav />
    </div>
  );
}

function StoryCard({ story, onClick }) {
  return (
    <div className="story-card card" onClick={onClick}>
      <div className="story-cover">
        {story.coverImage ? (
          <img src={`data:image/png;base64,${story.coverImage}`} alt={story.title} />
        ) : (
          <div className="story-cover-placeholder">
            <span>{story.coverEmoji || '📖'}</span>
          </div>
        )}
      </div>
      <div className="story-info">
        <h3 className="story-title">{story.title}</h3>
        <p className="story-meta">By {story.authorName} • {story.pages?.length || 0} pages</p>
        {story.rating && (
          <div className="story-stars">
            {'⭐'.repeat(story.rating)}
          </div>
        )}
      </div>
    </div>
  );
}
