import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { narrateText, generateImage } from '../../services/api';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';
import './StoryReader.css';

export default function StoryReader() {
  const { storyId } = useParams();
  const { state } = useLocation();
  const { user, profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [story, setStory] = useState(state?.story || null);
  const [narrator, setNarrator] = useState(state?.narrator || 'star');
  const [loading, setLoading] = useState(!state?.story);

  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIdx, setCurrentWordIdx] = useState(-1);
  const [pageAudio, setPageAudio] = useState({}); // pageIdx -> audioUrl
  const [pageImages, setPageImages] = useState({}); // pageIdx -> imageBase64
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [storyComplete, setStoryComplete] = useState(false);
  const [userRating, setUserRating] = useState(null);

  const audioRef = useRef(null);
  const wordTimingsRef = useRef([]);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!story) fetchStory();
  }, [storyId]);

  useEffect(() => {
    if (story) {
      loadPageAssets(currentPage);
    }
  }, [story, currentPage]);

  // Preload next page
  useEffect(() => {
    if (story && currentPage < story.pages.length - 1) {
      setTimeout(() => loadPageAssets(currentPage + 1), 2000);
    }
  }, [currentPage, story]);

  async function fetchStory() {
    try {
      const snap = await getDoc(doc(db, 'stories', storyId));
      if (snap.exists()) {
        setStory(snap.data());
        setNarrator(snap.data().narrator || 'star');
      }
    } catch (e) {
      toast.error('Could not load story');
    } finally {
      setLoading(false);
    }
  }

  async function loadPageAssets(pageIdx) {
    const page = story?.pages?.[pageIdx];
    if (!page) return;

    // Load image if not cached
    if (!pageImages[pageIdx]) {
      setLoadingImage(true);
      try {
        const res = await generateImage({ prompt: page.illustrationPrompt });
        if (!res.data.placeholder && res.data.imageBase64) {
          setPageImages(prev => ({ ...prev, [pageIdx]: res.data.imageBase64 }));
        }
      } catch (e) {
        console.log('Image load failed for page', pageIdx);
      } finally {
        setLoadingImage(false);
      }
    }

    // Load audio if not cached
    if (!pageAudio[pageIdx]) {
      try {
        const res = await narrateText({ text: page.text, narratorType: narrator });
        const audioBlob = b64ToBlob(res.data.audioBase64, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        setPageAudio(prev => ({ ...prev, [pageIdx]: audioUrl }));
      } catch (e) {
        console.log('Audio load failed for page', pageIdx);
      }
    }
  }

  function b64ToBlob(b64, mimeType) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mimeType });
  }

  function buildWordTimings(text, audioDuration) {
    const words = text.split(/\s+/).filter(Boolean);
    const avgTime = audioDuration / words.length;
    let t = 0;
    return words.map((word, i) => {
      const start = t;
      // Slightly longer for punctuated words
      const mult = /[.,!?;:]$/.test(word) ? 1.3 : 1.0;
      t += avgTime * mult;
      return { word, start, end: t, idx: i };
    });
  }

  async function togglePlay() {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const audioUrl = pageAudio[currentPage];
    if (!audioUrl) {
      setLoadingAudio(true);
      try {
        const page = story.pages[currentPage];
        const res = await narrateText({ text: page.text, narratorType: narrator });
        const audioBlob = b64ToBlob(res.data.audioBase64, 'audio/mp3');
        const url = URL.createObjectURL(audioBlob);
        setPageAudio(prev => ({ ...prev, [currentPage]: url }));
        playAudio(url, story.pages[currentPage].text);
      } catch (e) {
        toast.error('Could not load audio');
      } finally {
        setLoadingAudio(false);
      }
    } else {
      playAudio(audioUrl, story.pages[currentPage].text);
    }
  }

  function playAudio(url, text) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current = new Audio(url);
    }

    audioRef.current.play();
    setIsPlaying(true);
    setCurrentWordIdx(0);

    audioRef.current.addEventListener('loadedmetadata', () => {
      wordTimingsRef.current = buildWordTimings(text, audioRef.current.duration);
    }, { once: true });

    const updateWord = () => {
      if (!audioRef.current) return;
      const ct = audioRef.current.currentTime;
      const timings = wordTimingsRef.current;
      if (timings.length > 0) {
        const active = timings.findIndex(w => ct >= w.start && ct < w.end);
        setCurrentWordIdx(active);
      }
      animFrameRef.current = requestAnimationFrame(updateWord);
    };
    animFrameRef.current = requestAnimationFrame(updateWord);

    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentWordIdx(-1);
      cancelAnimationFrame(animFrameRef.current);
    }, { once: true });
  }

  function goToPage(newPage) {
    // Stop audio
    if (audioRef.current) { audioRef.current.pause(); }
    setIsPlaying(false);
    setCurrentWordIdx(-1);
    cancelAnimationFrame(animFrameRef.current);

    if (newPage >= story.pages.length) {
      handleStoryComplete();
      return;
    }
    setCurrentPage(newPage);
  }

  async function handleStoryComplete() {
    setStoryComplete(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 6000);

    // Award stars
    try {
      const newStars = (profile?.storyStars || 0) + 10;
      const newCount = (profile?.storiesRead || 0) + 1;
      await updateUserProfile({ storyStars: newStars, storiesRead: newCount });
    } catch (e) {}
  }

  async function handleRate(stars) {
    setUserRating(stars);
    try {
      await updateDoc(doc(db, 'stories', storyId), { rating: stars });
    } catch (e) {}
  }

  const page = story?.pages?.[currentPage];
  const words = page?.text?.split(/\s+/).filter(Boolean) || [];
  const totalPages = story?.pages?.length || 0;

  if (loading) {
    return (
      <div className="loading-screen screen">
        <div className="spinner" />
        <p>Loading your story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="loading-screen screen">
        <p>Story not found 😢</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="reader-screen screen">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} colors={['#7C3AED','#FCD34D','#EC4899','#4ADE80','#60A5FA']} />}

      <div className="reader-content content">
        {/* Header */}
        <header className="reader-header">
          <button className="back-btn" onClick={() => navigate('/')}>✕</button>
          <div className="reader-title-area">
            <h1 className="reader-title">{story.title}</h1>
          </div>
          <div className="page-counter">{currentPage + 1}/{totalPages}</div>
        </header>

        {/* Progress bar */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} />
        </div>

        {/* Story content */}
        {!storyComplete ? (
          <div className="page-container">
            {/* Illustration */}
            <div className="illustration-frame">
              {pageImages[currentPage] ? (
                <img
                  src={`data:image/png;base64,${pageImages[currentPage]}`}
                  alt={`Page ${currentPage + 1} illustration`}
                  className="illustration-img"
                />
              ) : (
                <div className="illustration-placeholder">
                  <div className="illus-loading">
                    {loadingImage ? <div className="spinner" /> : <span className="page-emoji">🌟</span>}
                  </div>
                  <p className="illus-prompt-preview">{page?.illustrationPrompt?.substring(0, 60)}...</p>
                </div>
              )}
            </div>

            {/* Karaoke text */}
            <div className="karaoke-container">
              <p className="karaoke-text">
                {words.map((word, idx) => (
                  <span
                    key={idx}
                    className={`karaoke-word ${idx === currentWordIdx ? 'active' : idx < currentWordIdx ? 'done' : ''}`}
                  >
                    {word}{' '}
                  </span>
                ))}
              </p>
            </div>

            {/* Audio controls */}
            <div className="audio-controls">
              <button className="play-btn pulse-glow" onClick={togglePlay} disabled={loadingAudio}>
                {loadingAudio ? '⏳' : isPlaying ? '⏸' : '▶'}
              </button>
            </div>

            {/* Navigation */}
            <div className="page-nav">
              <button
                className="nav-arrow"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                ←
              </button>
              <div className="page-dots">
                {story.pages.slice(0, Math.min(totalPages, 12)).map((_, i) => (
                  <div
                    key={i}
                    className={`page-dot ${i === currentPage ? 'active' : i < currentPage ? 'read' : ''}`}
                    onClick={() => goToPage(i)}
                  />
                ))}
              </div>
              <button
                className="nav-arrow"
                onClick={() => goToPage(currentPage + 1)}
              >
                {currentPage === totalPages - 1 ? '🎉' : '→'}
              </button>
            </div>
          </div>
        ) : (
          /* Story complete screen */
          <div className="story-complete bounce-in">
            <div className="complete-emoji float">🎉</div>
            <h2>The End!</h2>
            <h3>{story.title}</h3>
            <p className="complete-by">Written by {story.authorName}, Illustrated by DreamTale AI</p>

            <div className="complete-stars-earn">
              <span>✨ You earned</span>
              <span className="stars-earned">+10 Stars!</span>
            </div>

            <div className="rating-section">
              <p>How did you like this story?</p>
              <div className="star-rating">
                {[1,2,3,4,5].map(s => (
                  <button
                    key={s}
                    className={`star-btn ${userRating >= s ? 'lit' : ''}`}
                    onClick={() => handleRate(s)}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="complete-actions">
              <button className="btn-yellow" onClick={() => navigate('/sparky')}>
                🌟 New Story!
              </button>
              <button className="btn-primary" onClick={() => { setStoryComplete(false); setCurrentPage(0); }}>
                📖 Read Again
              </button>
              <button className="complete-home-btn" onClick={() => navigate('/')}>
                🏠 Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
