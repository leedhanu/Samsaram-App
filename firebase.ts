
// Use modular Firebase SDK v9+
// Using @firebase scoped packages directly to resolve type resolution issues in some environments
import { initializeApp } from '@firebase/app';
import { initializeFirestore } from '@firebase/firestore';
import { getAuth } from '@firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAneN6QMHrD_nOdfDUL-8jPVRoYEm2yiEg",
  authDomain: "kinnaram-7b4eb.firebaseapp.com",
  projectId: "kinnaram-7b4eb",
  storageBucket: "kinnaram-7b4eb.firebasestorage.app",
  messagingSenderId: "136497108896",
  appId: "1:136497108896:web:765000a7a420d64fd0b6c5"
};

// Standard modular initialization for Firebase v9+
const app = initializeApp(firebaseConfig);

// Use initializeFirestore with modular SDK and specific settings for stability
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Modular auth initialization
export const auth = getAuth(app);
