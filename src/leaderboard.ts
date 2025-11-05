import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

// Firebase config for leaderboard
const firebaseConfig = {
  apiKey: import.meta.env.VITE_LEADERBOARD_API_KEY,
  authDomain: import.meta.env.VITE_LEADERBOARD_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_LEADERBOARD_PROJECT_ID,
  storageBucket: import.meta.env.VITE_LEADERBOARD_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_LEADERBOARD_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_LEADERBOARD_APP_ID,
};

// Create a dedicated named app to avoid conflicts
const app = getApps().find(a => a.name === 'leaderboard') || initializeApp(firebaseConfig, 'leaderboard');
const db = getFirestore(app);

export async function saveLeaderboardScore(
  entry: { id: string; name: string; score: number }
): Promise<void> {
  const col = collection(db, 'leaderboards', 'traffic-run', 'scores');
  await addDoc(col, {
    id: entry.id,
    name: entry.name,
    score: entry.score,
    createdAt: Timestamp.now(),
  });
}


