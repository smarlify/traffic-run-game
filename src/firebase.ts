import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, DocumentData } from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBs4ePPl25niBHozW6kv2AGou5iw0aG5hQ",
  authDomain: "smarlify-api.firebaseapp.com",
  projectId: "smarlify-api",
  storageBucket: "smarlify-api.firebasestorage.app",
  messagingSenderId: "117162085061",
  appId: "1:117162085061:web:cd64d13eff75941de17eac",
  measurementId: "G-1JZRLPFQVT"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
let analytics: any; // Use any for analytics to avoid strict type issues with getAnalytics
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

let currentUser: User | null = null;

// Define interfaces for game stats
export interface GameStats {
  [gameName: string]: {
    playCount: number;
    lastPlayed: string;
    firstPlayed: string;
    maxLevel?: number;
  };
}

export interface UserGameData {
  gameStats: GameStats;
  totalPlays: number;
  mostPlayedGame: string;
  lastUpdated: DocumentData; // Firebase serverTimestamp
  createdAt: DocumentData; // Firebase serverTimestamp
}

/**
 * Initialize Firebase authentication
 * Creates anonymous user if not already authenticated
 */
export async function initializeFirebaseAuth(): Promise<void> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        console.log('Firebase User:', currentUser.uid, currentUser.isAnonymous ? '(Anonymous)' : '(Authenticated)');
        resolve();
      } else {
        // No user signed in, sign in anonymously
        try {
          const userCredential = await signInAnonymously(auth);
          currentUser = userCredential.user;
          console.log('Signed in anonymously:', currentUser.uid);
          resolve();
        } catch (error: any) { // Use any for error to avoid strict type issues
          console.error('Error signing in anonymously:', error.message);
          resolve(); // Resolve even on error to not block the app
        }
      }
    });
  });
}

/**
 * Sync game statistics from localStorage to Firebase Firestore
 */
export async function syncGameStatsWithFirebase(): Promise<void> {
  if (!currentUser) {
    console.warn('Firebase user not authenticated yet. Skipping sync.');
    return;
  }

  const localStorageStats = JSON.parse(localStorage.getItem('playful_game_stats') || '{}');
  const userDocRef = doc(db, 'users', currentUser.uid);

  try {
    const docSnap = await getDoc(userDocRef);
    let firebaseData: UserGameData;

    if (docSnap.exists()) {
      firebaseData = docSnap.data() as UserGameData;
      // Merge localStorage stats with Firebase stats
      firebaseData.gameStats = { ...firebaseData.gameStats, ...localStorageStats };
      firebaseData.totalPlays = Object.values(firebaseData.gameStats).reduce((sum, game) => sum + game.playCount, 0);
      
      let mostPlayed: { name: string; count: number } | null = null;
      for (const gameName in firebaseData.gameStats) {
        if (firebaseData.gameStats.hasOwnProperty(gameName)) {
          const game = firebaseData.gameStats[gameName];
          if (!mostPlayed || game.playCount > mostPlayed.count) {
            mostPlayed = { name: gameName, count: game.playCount };
          }
        }
      }
      firebaseData.mostPlayedGame = mostPlayed ? mostPlayed.name : '';
      firebaseData.lastUpdated = serverTimestamp();
    } else {
      // New user or no data in Firebase, use localStorage stats
      const totalPlays = Object.values(localStorageStats).reduce((sum, game: any) => sum + game.playCount, 0); // Use any for game
      let mostPlayed: { name: string; count: number } | null = null;
      for (const gameName in localStorageStats) {
        if (localStorageStats.hasOwnProperty(gameName)) {
          const game = localStorageStats[gameName];
          if (!mostPlayed || game.playCount > mostPlayed.count) {
            mostPlayed = { name: gameName, count: game.playCount };
          }
        }
      }
      firebaseData = {
        gameStats: localStorageStats,
        totalPlays: totalPlays,
        mostPlayedGame: mostPlayed ? mostPlayed.name : '',
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
    }

    await setDoc(userDocRef, firebaseData, { merge: true });
    console.log('Game stats synced with Firebase for user:', currentUser.uid);
  } catch (error: any) { // Use any for error
    console.error('Error syncing game stats with Firebase:', error.message);
  }
}

/**
 * Track Firebase Analytics event
 */
export function trackFirebaseEvent(eventName: string, parameters: Record<string, unknown> = {}): void {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
    console.log('Firebase Analytics:', eventName, parameters);
  }
}