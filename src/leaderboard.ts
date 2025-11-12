import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { firestore } from './config/firebase';
import { getCurrentUser } from './auth';

export async function saveLeaderboardScore(entry: {
  name: string;
  score: number;
}): Promise<void> {
  const col = collection(firestore, 'leaderboards', 'traffic-run', 'scores');
  const currentUser = getCurrentUser();

  if (!currentUser || !currentUser.email) {
    throw new Error('User must be logged in to save scores');
  }

  const dataToSave = {
    email: currentUser.email,
    name: entry.name,
    score: entry.score,
    createdAt: Timestamp.now(),
  };

  try {
    await addDoc(col, dataToSave);
    console.log('✅ Score saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}


