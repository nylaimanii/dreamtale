import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AuthScreen.css';

export default function AuthScreen() {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('landing'); // landing | login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigate('/');
    } catch (e) {
      toast.error('Could not sign in with Google');
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    try {
      setLoading(true);
      await signInWithApple();
      navigate('/');
    } catch (e) {
      toast.error('Could not sign in with Apple');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    try {
      setLoading(true);
      await signInWithEmail(email, password);
      navigate('/');
    } catch (e) {
      toast.error('Wrong email or password!');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup(e) {
    e.preventDefault();
    if (!childName.trim()) return toast.error('Please enter your name!');
    if (!childAge) return toast.error('Please pick your age!');
    try {
      setLoading(true);
      await signUpWithEmail(email, password, childName.trim(), parseInt(childAge));
      navigate('/');
    } catch (e) {
      toast.error(e.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen screen">
      <div className="content auth-content">
        {/* Logo */}
        <div className="auth-logo float">
          <div className="logo-star">⭐</div>
          <h1 className="logo-text">DreamTale</h1>
          <p className="logo-tagline">Where YOUR stories come to life ✨</p>
        </div>

        {/* Sparky mascot */}
        <div className="sparky-mascot bounce-in">
          <div className="sparky-bubble">Hi! I'm Sparky! 👋<br/>Ready to make some magic?</div>
          <div className="sparky-avatar">🌟</div>
        </div>

        {mode === 'landing' && (
          <div className="auth-landing bounce-in">
            <button className="btn-primary auth-btn" onClick={handleGoogle} disabled={loading}>
              <span>🔵</span> Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>
            <button className="btn-yellow auth-btn" onClick={() => setMode('signup')}>
              ✨ Create New Account
            </button>
            <button className="auth-text-btn" onClick={() => setMode('login')}>
              Already have an account? Sign In
            </button>
          </div>
        )}

        {mode === 'login' && (
          <form className="auth-form bounce-in" onSubmit={handleEmailLogin}>
            <h2>Welcome Back! 👋</h2>
            <input
              type="email" placeholder="Your email" value={email}
              onChange={e => setEmail(e.target.value)} required className="auth-input"
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required className="auth-input"
            />
            <button type="submit" className="btn-primary auth-btn" disabled={loading}>
              {loading ? '✨ Signing in...' : '🚀 Sign In'}
            </button>
            <button type="button" className="auth-text-btn" onClick={() => setMode('landing')}>
              ← Back
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form className="auth-form bounce-in" onSubmit={handleEmailSignup}>
            <h2>Let's Get Started! 🚀</h2>
            <input
              type="text" placeholder="What's your first name?" value={childName}
              onChange={e => setChildName(e.target.value)} required className="auth-input"
              maxLength={30}
            />
            <select
              value={childAge} onChange={e => setChildAge(e.target.value)}
              required className="auth-input auth-select"
            >
              <option value="">How old are you? 🎂</option>
              {[3,4,5,6,7,8,9,10].map(a => (
                <option key={a} value={a}>{a} years old</option>
              ))}
            </select>
            <input
              type="email" placeholder="Parent's email" value={email}
              onChange={e => setEmail(e.target.value)} required className="auth-input"
            />
            <input
              type="password" placeholder="Create a password" value={password}
              onChange={e => setPassword(e.target.value)} required className="auth-input"
              minLength={6}
            />
            <button type="submit" className="btn-yellow auth-btn" disabled={loading}>
              {loading ? '✨ Creating magic...' : '🌟 Start My Adventure!'}
            </button>
            <button type="button" className="auth-text-btn" onClick={() => setMode('landing')}>
              ← Back
            </button>
          </form>
        )}
      </div>

      {/* Floating decorations */}
      <div className="auth-deco deco-1">🦋</div>
      <div className="auth-deco deco-2">🌈</div>
      <div className="auth-deco deco-3">🐉</div>
      <div className="auth-deco deco-4">🌙</div>
      <div className="auth-deco deco-5">⚡</div>
    </div>
  );
}
