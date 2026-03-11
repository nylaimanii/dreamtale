import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import BottomNav from '../../components/BottomNav';
import './AuthorProfile.css';

const BADGES = [
  { id: 'first_story', icon: '📖', name: 'First Story!', desc: 'Wrote your very first story', req: (s) => s >= 1 },
  { id: 'story_5', icon: '✨', name: 'Story Wizard', desc: 'Wrote 5 stories', req: (s) => s >= 5 },
  { id: 'story_10', icon: '🌟', name: 'Story Master', desc: 'Wrote 10 stories', req: (s) => s >= 10 },
  { id: 'char_1', icon: '🦸', name: 'Hero Creator', desc: 'Created your first hero', req: (s, c) => c >= 1 },
  { id: 'char_5', icon: '🏰', name: 'Hero Collector', desc: 'Created 5 heroes', req: (s, c) => c >= 5 },
  { id: 'star_50', icon: '⭐', name: 'Star Collector', desc: 'Earned 50 Story Stars', req: (s, c, stars) => stars >= 50 },
];

export default function AuthorProfile() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ stories: 0, characters: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchStats() {
      try {
        const [storiesSnap, charsSnap] = await Promise.all([
          getDocs(query(collection(db, 'stories'), where('userId', '==', user.uid))),
          getDocs(query(collection(db, 'characters'), where('userId', '==', user.uid))),
        ]);
        const stories = storiesSnap.docs.map(d => d.data());
        const totalPages = stories.reduce((acc, s) => acc + (s.pages?.length || 0), 0);
        setStats({ stories: stories.length, characters: charsSnap.size, totalPages });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const childName = profile?.childName || 'Friend';
  const stars = profile?.storyStars || 0;
  const streak = profile?.readingStreak || 0;

  const earnedBadges = BADGES.filter(b => b.req(stats.stories, stats.characters, stars));

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="profile-screen screen">
      <div className="content profile-content">
        {/* Author card */}
        <div className="author-card card pulse-glow">
          <div className="author-avatar float">
            <div className="avatar-inner">{childName[0]?.toUpperCase()}</div>
          </div>
          <h1 className="author-name">{childName}</h1>
          <p className="author-title">✨ Magical Story Author ✨</p>
          <p className="author-credit">Written by {childName}, Illustrated by DreamTale AI</p>

          <div className="author-stats">
            <div className="author-stat">
              <div className="astat-val">{stats.stories}</div>
              <div className="astat-label">Stories</div>
            </div>
            <div className="author-stat">
              <div className="astat-val">{stats.characters}</div>
              <div className="astat-label">Heroes</div>
            </div>
            <div className="author-stat">
              <div className="astat-val">{stars}</div>
              <div className="astat-label">Stars</div>
            </div>
            <div className="author-stat">
              <div className="astat-val">{streak}</div>
              <div className="astat-label">🔥 Streak</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <section className="badges-section">
          <h2>🏆 My Badges</h2>
          <div className="badges-grid">
            {BADGES.map(badge => {
              const earned = badge.req(stats.stories, stats.characters, stars);
              return (
                <div key={badge.id} className={`badge-item ${earned ? 'earned' : 'locked'}`}>
                  <div className="badge-icon">{earned ? badge.icon : '🔒'}</div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-desc">{badge.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Year in review */}
        <section className="year-review card">
          <h2>📅 My Year in Stories</h2>
          <div className="year-stats">
            <div className="yst">
              <span className="yst-emoji">📖</span>
              <span className="yst-num">{stats.stories}</span>
              <span className="yst-label">stories written</span>
            </div>
            <div className="yst">
              <span className="yst-emoji">📄</span>
              <span className="yst-num">{stats.totalPages}</span>
              <span className="yst-label">pages read</span>
            </div>
            <div className="yst">
              <span className="yst-emoji">⭐</span>
              <span className="yst-num">{stars}</span>
              <span className="yst-label">stars earned</span>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="profile-actions">
          <button className="profile-action-btn" onClick={() => navigate('/sparky')}>
            🌟 Talk to Sparky
          </button>
          <button className="profile-action-btn" onClick={() => navigate('/library')}>
            📚 My Library
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>

        <div style={{ height: 100 }} />
      </div>
      <BottomNav />
    </div>
  );
}
