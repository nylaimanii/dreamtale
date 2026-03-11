import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Onboarding.css';

export default function Onboarding() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      emoji: '👋',
      title: "What's your name?",
      subtitle: "Sparky wants to know!",
    },
    {
      emoji: '🎂',
      title: 'How old are you?',
      subtitle: 'So Sparky can make perfect stories for you!',
    },
    {
      emoji: '🎉',
      title: `Welcome, ${childName || 'Friend'}!`,
      subtitle: "You're all set for magical adventures!",
    },
  ];

  async function handleFinish() {
    if (!childName.trim()) return toast.error('Please tell me your name!');
    if (!childAge) return toast.error('Please pick your age!');
    try {
      setLoading(true);
      await updateUserProfile({
        childName: childName.trim(),
        childAge: parseInt(childAge),
        onboardingComplete: true,
        displayName: childName.trim(),
      });
      navigate('/');
    } catch (e) {
      toast.error('Something went wrong, try again!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-screen screen">
      <div className="content onboarding-content">
        <div className="sparky-onboard float">🌟</div>

        <div className="step-card card bounce-in" key={step}>
          <div className="step-emoji">{steps[step].emoji}</div>
          <h2>{steps[step].title}</h2>
          <p>{steps[step].subtitle}</p>

          {step === 0 && (
            <input
              className="onboard-input"
              type="text"
              placeholder="My name is..."
              value={childName}
              onChange={e => setChildName(e.target.value)}
              autoFocus
              maxLength={30}
            />
          )}

          {step === 1 && (
            <div className="age-grid">
              {[3,4,5,6,7,8,9,10].map(age => (
                <button
                  key={age}
                  className={`age-btn ${childAge === String(age) ? 'selected' : ''}`}
                  onClick={() => setChildAge(String(age))}
                >
                  {age}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="welcome-content">
              <div className="stars-row">⭐⭐⭐⭐⭐</div>
              <p className="welcome-msg">
                Sparky is SO excited to make stories just for you, {childName}! 🎉
              </p>
            </div>
          )}

          <div className="step-actions">
            {step < 2 ? (
              <button
                className="btn-primary"
                onClick={() => {
                  if (step === 0 && !childName.trim()) return toast.error('Tell me your name first!');
                  if (step === 1 && !childAge) return toast.error('Pick your age!');
                  setStep(s => s + 1);
                }}
              >
                Next ✨
              </button>
            ) : (
              <button className="btn-yellow" onClick={handleFinish} disabled={loading}>
                {loading ? '✨ Setting up magic...' : "Let's Go! 🚀"}
              </button>
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="step-dots">
          {steps.map((_, i) => (
            <div key={i} className={`dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
