
import React, { useState, useEffect } from 'react';
// Fix: Use scoped @firebase/auth import to resolve type resolution issues
import { onAuthStateChanged } from '@firebase/auth';
import { doc, onSnapshot, getDoc } from '@firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';

// Pages
import AuthPage from './views/AuthPage';
import UserDashboard from './views/UserDashboard';
import HostDashboard from './views/HostDashboard';
import AdminDashboard from './views/AdminDashboard';
import BannedPage from './views/BannedPage';
import SplashScreen from './components/SplashScreen';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserListener: (() => void) | null = null;

    // Standard modular onAuthStateChanged listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear existing listener when auth state changes
      if (unsubscribeUserListener) {
        unsubscribeUserListener();
        unsubscribeUserListener = null;
      }

      if (firebaseUser) {
        try {
          // Identify the correct collection (users or hosts) once
          const userRef = doc(db, 'users', firebaseUser.uid);
          const hostRef = doc(db, 'hosts', firebaseUser.uid);

          const userSnap = await getDoc(userRef);
          let targetRef = userRef;

          if (!userSnap.exists()) {
            const hostSnap = await getDoc(hostRef);
            if (hostSnap.exists()) {
              targetRef = hostRef;
            }
          }

          // Attach a persistent real-time listener to the identified document
          unsubscribeUserListener = onSnapshot(targetRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              if (userData.isBanned) {
                setIsBanned(true);
                setCurrentUser(null);
              } else {
                setIsBanned(false);
                setCurrentUser({ ...userData, uid: docSnap.id });
              }
            } else {
              setCurrentUser(null);
            }
            setLoading(false);
          }, (err) => {
            console.error("User data snapshot error:", err);
            setLoading(false);
          });
        } catch (err) {
          console.error("Auth check error:", err);
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setIsBanned(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserListener) unsubscribeUserListener();
    };
  }, []);

  if (loading) return <SplashScreen />;

  if (isBanned) return <BannedPage />;

  if (!currentUser) {
    return <AuthPage />;
  }

  // Route based on role
  switch (currentUser.role) {
    case 'admin':
      return <AdminDashboard user={currentUser} />;
    case 'host':
      return <HostDashboard user={currentUser} />;
    case 'user':
    default:
      return <UserDashboard user={currentUser} />;
  }
};

export default App;
