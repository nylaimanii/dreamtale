import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/Auth/AuthScreen';
import Onboarding from './screens/Auth/Onboarding';
import Home from './screens/Home/Home';
import SparkyConversation from './screens/Sparky/SparkyConversation';
import StoryReader from './screens/StoryReader/StoryReader';
import CharacterCreate from './screens/Characters/CharacterCreate';
import CharacterLibrary from './screens/Characters/CharacterLibrary';
import StoryLibrary from './screens/Library/StoryLibrary';
import AuthorProfile from './screens/Profile/AuthorProfile';

function PrivateRoute({ children }) {
  const { user, profile } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (user && profile && !profile.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthScreen />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/sparky" element={<PrivateRoute><SparkyConversation /></PrivateRoute>} />
        <Route path="/story/:storyId" element={<PrivateRoute><StoryReader /></PrivateRoute>} />
        <Route path="/characters" element={<PrivateRoute><CharacterLibrary /></PrivateRoute>} />
        <Route path="/characters/create" element={<PrivateRoute><CharacterCreate /></PrivateRoute>} />
        <Route path="/library" element={<PrivateRoute><StoryLibrary /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><AuthorProfile /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
