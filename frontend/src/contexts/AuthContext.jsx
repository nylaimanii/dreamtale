import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          setProfile(snap.data());
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function createUserProfile(uid, data) {
    const profileData = {
      ...data,
      uid,
      createdAt: serverTimestamp(),
      storyStars: 0,
      readingStreak: 0,
      badges: [],
      storiesRead: 0,
      preferences: {},
    };
    await setDoc(doc(db, 'users', uid), profileData, { merge: true });
    setProfile(profileData);
    return profileData;
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    if (!snap.exists()) {
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        childName: result.user.displayName?.split(' ')[0] || 'Friend',
        childAge: null,
        onboardingComplete: false,
      });
    }
    return result;
  }

  async function signInWithApple() {
    const result = await signInWithPopup(auth, appleProvider);
    const snap = await getDoc(doc(db, 'users', result.user.uid));
    if (!snap.exists()) {
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName || 'Friend',
        email: result.user.email,
        childName: result.user.displayName?.split(' ')[0] || 'Friend',
        childAge: null,
        onboardingComplete: false,
      });
    }
    return result;
  }

  async function signUpWithEmail(email, password, childName, childAge) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: childName });
    await createUserProfile(result.user.uid, {
      displayName: childName,
      email,
      childName,
      childAge,
      onboardingComplete: true,
    });
    return result;
  }

  async function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function updateUserProfile(data) {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    setProfile(prev => ({ ...prev, ...data }));
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithGoogle, signInWithApple,
      signUpWithEmail, signInWithEmail,
      updateUserProfile, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
