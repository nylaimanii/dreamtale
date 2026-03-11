import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import BottomNav from '../../components/BottomNav';
import './CharacterLibrary.css';

const VOICE_LABELS = {
  squeaky: '🐭 Squeaky', booming: '🦁 Booming', mysterious: '🌙 Mysterious',
  excited: '⚡ Excited', wise: '🦉 Wise', grumpy: '🐻 Grumpy',
};

export default function CharacterLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function fetchChars() {
      try {
        const q = query(
          collection(db, 'characters'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchChars();
  }, [user]);

  return (
    <div className="library-screen screen">
      <div className="content lib-content">
        <header className="lib-header">
          <h1>✨ Hero Library</h1>
          <button className="btn-primary add-hero-btn" onClick={() => navigate('/characters/create')}>
            + New Hero
          </button>
        </header>

        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        ) : characters.length === 0 ? (
          <div className="empty-lib card">
            <div className="empty-lib-emoji">🦸</div>
            <h2>No Heroes Yet!</h2>
            <p>Create your first magical character and they'll live here in your Hero Library! ✨</p>
            <button className="btn-yellow" onClick={() => navigate('/characters/create')}>
              Create My First Hero!
            </button>
          </div>
        ) : (
          <div className="chars-grid">
            {characters.map(char => (
              <CharCard
                key={char.id}
                char={char}
                onClick={() => setSelected(char)}
              />
            ))}
          </div>
        )}

        {/* Character detail modal */}
        {selected && (
          <div className="char-modal-overlay" onClick={() => setSelected(null)}>
            <div className="char-modal card bounce-in" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>

              <div className="modal-portrait">
                {selected.imageBase64 ? (
                  <img src={`data:image/png;base64,${selected.imageBase64}`} alt={selected.name} />
                ) : selected.drawingBase64 ? (
                  <img src={selected.drawingBase64} alt={selected.name} />
                ) : (
                  <div className="modal-placeholder">🦸</div>
                )}
              </div>

              <h2>{selected.name}</h2>
              <div className="modal-species">{selected.species}</div>

              <div className="modal-traits">
                <div className="modal-trait"><b>⚡ Power:</b> {selected.superpower}</div>
                <div className="modal-trait"><b>😨 Fear:</b> {selected.biggestFear}</div>
                <div className="modal-trait"><b>💬</b> "{selected.catchphrase}"</div>
                <div className="modal-trait"><b>🎤 Voice:</b> {VOICE_LABELS[selected.voiceType] || selected.voiceType}</div>
              </div>

              <p className="modal-personality">{selected.personality}</p>

              <button
                className="btn-yellow"
                onClick={() => {
                  navigate('/sparky', { state: { character: selected } });
                }}
              >
                🚀 Make a Story with {selected.name}!
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>
      <BottomNav />
    </div>
  );
}

function CharCard({ char, onClick }) {
  return (
    <div className="char-card card" onClick={onClick}>
      <div className="char-card-portrait">
        {char.imageBase64 ? (
          <img src={`data:image/png;base64,${char.imageBase64}`} alt={char.name} />
        ) : char.drawingBase64 ? (
          <img src={char.drawingBase64} alt={char.name} />
        ) : (
          <div className="char-card-placeholder">🦸</div>
        )}
        <div className="char-card-glow" />
      </div>
      <div className="char-card-info">
        <h3>{char.name}</h3>
        <p className="char-card-species">{char.species}</p>
        <div className="char-card-power">⚡ {char.superpower?.substring(0, 40)}</div>
      </div>
    </div>
  );
}
