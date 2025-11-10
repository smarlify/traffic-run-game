import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { firestore } from './config/firebase';

export async function saveLeaderboardScore(entry: {
  id: string;
  name: string;
  score: number;
}): Promise<void> {
  const col = collection(firestore, 'leaderboards', 'traffic-run', 'scores');

  const dataToSave = {
    id: entry.id,
    name: entry.name,
    score: entry.score,
    createdAt: Timestamp.now(),
  };

  try {
    await addDoc(col, dataToSave);
  } catch (error) {
    console.error('❌ Error saving to Firestore:', error);
    throw error;
  }
}


