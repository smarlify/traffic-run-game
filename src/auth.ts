import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from './config/firebase';

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const displayName = result.user.displayName;
    console.log('Signed in as:', displayName);
    return displayName;
  } catch (error) {
    console.error('Sign-in failed:', error);
    throw error;
  }
}

/**
 * Check if user is logged in with a Google account (not anonymous)
 */
export function isUserLoggedIn(): boolean {
  const user = auth.currentUser;
  return user !== null && !user.isAnonymous;
}

/**
 * Get current user's display name
 */
export function getCurrentUserName(): string | null {
  const user = auth.currentUser;
  if (user && !user.isAnonymous && user.displayName) {
    return user.displayName;
  }
  return null;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (isLoggedIn: boolean) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    const isLoggedIn = user !== null && !user.isAnonymous;
    callback(isLoggedIn);
  });
}

/**
 * Get current user info
 */
export function getCurrentUser() {
  return auth.currentUser;
}
