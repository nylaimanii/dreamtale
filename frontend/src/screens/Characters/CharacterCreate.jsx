import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { createCharacterFromDesc, analyzeDrawing, generateImage } from '../../services/api';
import toast from 'react-hot-toast';
import './CharacterCreate.css';

const VOICE_LABELS = {
  squeaky: '🐭 Squeaky & Silly',
  booming: '🦁 Big & Booming',
  mysterious: '🌙 Soft & Mysterious',
  excited: '⚡ Fast & Excited',
  wise: '🦉 Slow, Wise & Dramatic',
  grumpy: '🐻 Grumpy but Kind',
};

export default function CharacterCreate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState('choose'); // choose | describe | draw
  const [step, setStep] = useState('input'); // input | preview | saving
  const [description, setDescription] = useState('');
  const [drawingFile, setDrawingFile] = useState(null);
  const [drawingPreview, setDrawingPreview] = useState(null);
  const [character, setCharacter] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const childName = profile?.childName || 'Friend';
  const childAge = profile?.childAge || 7;

  function handleDrawingUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDrawingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setDrawingPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleCreateFromDescription() {
    if (!description.trim()) return toast.error('Tell me about your character first!');
    setLoading(true);
    try {
      const res = await createCharacterFromDesc({ description, childName, childAge });
      const char = res.data.character;
      setCharacter(char);

      // Generate illustration
      try {
        const imgRes = await generateImage({ prompt: char.illustrationPrompt, style: 'children book character illustration' });
        if (!imgRes.data.placeholder) setCharacterImage(imgRes.data.imageBase64);
      } catch (e) {}

      setStep('preview');
    } catch (e) {
      toast.error('Oops! Magic hiccup! Try again? 🌟');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeDrawing() {
    if (!drawingFile) return toast.error('Upload your drawing first!');
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target.result;
          const res = await analyzeDrawing({
            imageBase64: base64,
            mimeType: drawingFile.type || 'image/png',
            childName, childAge,
          });
          const char = res.data.character;
          setCharacter(char);
          setCharacterImage(null);
          setStep('preview');
        } catch (e) {
          toast.error('Could not analyze drawing, try again!');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(drawingFile);
    } catch (e) {
      toast.error('Something went wrong!');
      setLoading(false);
    }
  }

  async function handleSaveCharacter() {
    if (!character) return;
    setStep('saving');
    try {
      await addDoc(collection(db, 'characters'), {
        userId: user.uid,
        authorName: childName,
        ...character,
        imageBase64: characterImage || null,
        drawingBase64: drawingPreview || null,
        createdAt: serverTimestamp(),
        storiesStarred: 0,
      });
      toast.success(`${character.name} saved to your Hero Library! 🎉`);
      navigate('/characters');
    } catch (e) {
      toast.error('Could not save character');
      setStep('preview');
    }
  }

  return (
    <div className="create-screen screen">
      <div className="content create-content">
        <header className="create-header">
          <button className="back-btn" onClick={() => navigate('/characters')}>← Back</button>
          <h1>Create a Hero ✨</h1>
          <div style={{ width: 60 }} />
        </header>

        {/* Method selection */}
        {method === 'choose' && (
          <div className="method-choose bounce-in">
            <div className="method-sparky float">🦸</div>
            <h2>How do you want to create your hero?</h2>

            <button className="method-card" onClick={() => setMethod('describe')}>
              <span className="method-icon">💬</span>
              <div>
                <div className="method-title">Describe Your Hero</div>
                <div className="method-sub">Tell Sparky what they're like!</div>
              </div>
            </button>

            <button className="method-card" onClick={() => setMethod('draw')}>
              <span className="method-icon">🎨</span>
              <div>
                <div className="method-title">Upload a Drawing</div>
                <div className="method-sub">Let Sparky bring your drawing to life!</div>
              </div>
            </button>
          </div>
        )}

        {/* Describe form */}
        {method === 'describe' && step === 'input' && (
          <div className="describe-form bounce-in">
            <div className="form-sparky float">🌟</div>
            <h2>Describe your hero!</h2>
            <p className="form-hint">What do they look like? What's their personality? Do they have a superpower?</p>

            <textarea
              className="describe-input"
              placeholder="Example: A tiny purple dragon who loves to bake cookies and is afraid of butterflies. She's really fast and can breathe rainbow fire!"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
            />

            <div className="form-actions">
              <button className="btn-yellow" onClick={handleCreateFromDescription} disabled={loading}>
                {loading ? '✨ Creating magic...' : '🚀 Create My Hero!'}
              </button>
              <button className="back-to-choose" onClick={() => setMethod('choose')}>← Back</button>
            </div>

            {loading && (
              <div className="creating-loading">
                <div className="spinner" />
                <p>Sparky is bringing your hero to life! ✨</p>
              </div>
            )}
          </div>
        )}

        {/* Drawing upload */}
        {method === 'draw' && step === 'input' && (
          <div className="draw-form bounce-in">
            <div className="form-sparky float">🎨</div>
            <h2>Upload your drawing!</h2>
            <p className="form-hint">Take a photo or upload a picture of your character drawing!</p>

            <div
              className={`upload-zone ${drawingPreview ? 'has-image' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              {drawingPreview ? (
                <img src={drawingPreview} alt="Your drawing" className="drawing-preview" />
              ) : (
                <>
                  <span className="upload-icon">📸</span>
                  <p>Tap to upload your drawing!</p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleDrawingUpload}
            />

            <div className="form-actions">
              <button className="btn-yellow" onClick={handleAnalyzeDrawing} disabled={loading || !drawingFile}>
                {loading ? '✨ Analyzing your art...' : '🌟 Bring to Life!'}
              </button>
              <button className="back-to-choose" onClick={() => setMethod('choose')}>← Back</button>
            </div>

            {loading && (
              <div className="creating-loading">
                <div className="spinner" />
                <p>Sparky loves your drawing! Creating your hero... ✨</p>
              </div>
            )}
          </div>
        )}

        {/* Character preview */}
        {step === 'preview' && character && (
          <div className="char-preview bounce-in">
            {/* Portrait */}
            <div className="char-portrait">
              {characterImage ? (
                <img src={`data:image/png;base64,${characterImage}`} alt={character.name} />
              ) : drawingPreview ? (
                <img src={drawingPreview} alt={character.name} className="drawing-as-portrait" />
              ) : (
                <div className="char-portrait-placeholder">🦸</div>
              )}
            </div>

            {/* Info */}
            <div className="char-info card">
              <h2 className="char-name">{character.name}</h2>
              <div className="char-species">{character.species}</div>

              <div className="char-traits">
                <div className="trait">
                  <span className="trait-icon">💬</span>
                  <div>
                    <div className="trait-label">Personality</div>
                    <div className="trait-val">{character.personality}</div>
                  </div>
                </div>
                <div className="trait">
                  <span className="trait-icon">⚡</span>
                  <div>
                    <div className="trait-label">Superpower</div>
                    <div className="trait-val">{character.superpower}</div>
                  </div>
                </div>
                <div className="trait">
                  <span className="trait-icon">😨</span>
                  <div>
                    <div className="trait-label">Biggest Fear</div>
                    <div className="trait-val">{character.biggestFear}</div>
                  </div>
                </div>
                <div className="trait">
                  <span className="trait-icon">💬</span>
                  <div>
                    <div className="trait-label">Catchphrase</div>
                    <div className="trait-val">"{character.catchphrase}"</div>
                  </div>
                </div>
                <div className="trait">
                  <span className="trait-icon">🎤</span>
                  <div>
                    <div className="trait-label">Voice</div>
                    <div className="trait-val">{VOICE_LABELS[character.voiceType] || character.voiceType}</div>
                  </div>
                </div>
              </div>

              {character.drawingObservations && (
                <div className="drawing-praise">
                  <p>🎨 <em>{character.drawingObservations}</em></p>
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button className="btn-yellow" onClick={handleSaveCharacter} disabled={step === 'saving'}>
                {step === 'saving' ? '✨ Saving...' : '💾 Save to My Heroes!'}
              </button>
              <button className="btn-primary" onClick={() => { setStep('input'); setCharacter(null); }}>
                🔄 Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
