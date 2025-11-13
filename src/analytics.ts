/**
 * Game Analytics Utilities for Traffic Run
 * 
 * Tracks game play events and maintains play counts in localStorage + Firebase
 */

import { 
  initializeFirebaseAuth, 
  syncGameStatsWithFirebase, 
  trackFirebaseEvent,
  GameStats 
} from './firebase';

const STORAGE_KEY = 'playful_game_stats';
const GAME_NAME = 'Traffic Run';

/**
 * Get all game statistics from localStorage
 */
export function getGameStats(): GameStats {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading game stats:', error);
    return {};
  }
}

/**
 * Save game statistics to localStorage
 */
function saveGameStats(stats: GameStats): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving game stats:', error);
  }
}

/**
 * Track when a game is played
 * Increments play count and updates timestamps
 * Syncs with Firebase automatically
 */
export async function trackGamePlayed(): Promise<void> {
  const stats = getGameStats();
  const now = new Date().toISOString();
  
  if (stats[GAME_NAME]) {
    // Update existing game stats
    stats[GAME_NAME].playCount += 1;
    stats[GAME_NAME].lastPlayed = now;
  } else {
    // Create new game stats
    stats[GAME_NAME] = {
      playCount: 1,
      lastPlayed: now,
      firstPlayed: now,
      maxLevel: 0
    };
  }
  
  saveGameStats(stats);
  
  // Track with Google Analytics / GTM
  if (typeof window !== 'undefined' && window.trackEvent) {
    // Event 1: PLAY_GAME - tracks each play instance
    window.trackEvent('play_game', {
      game_name: GAME_NAME,
      timestamp: now
    });
    
    // Event 2: GAME_PLAYED_TOTAL - tracks cumulative play count per user
    window.trackEvent('game_played_total', {
      game_name: GAME_NAME,
      play_count: stats[GAME_NAME].playCount,
      first_played: stats[GAME_NAME].firstPlayed,
      last_played: stats[GAME_NAME].lastPlayed
    });
  }

  // Track with Firebase Analytics
  trackFirebaseEvent('play_game', {
    game_name: GAME_NAME,
    timestamp: now,
    play_count: stats[GAME_NAME].playCount
  });

  trackFirebaseEvent('game_played_total', {
    game_name: GAME_NAME,
    play_count: stats[GAME_NAME].playCount,
    first_played: stats[GAME_NAME].firstPlayed,
    last_played: stats[GAME_NAME].lastPlayed
  });

  // Sync with Firebase (async, don't wait)
  try {
    await syncGameStatsWithFirebase();
  } catch (error) {
    console.error('Error syncing with Firebase:', error);
  }
}

/**
 * Track max level achieved (laps completed)
 * Updates max level in localStorage and Firebase
 */
export async function trackMaxLevel(level: number): Promise<void> {
  const stats = getGameStats();
  const now = new Date().toISOString();
  
  if (stats[GAME_NAME]) {
    // Update max level if this is higher
    if (level > (stats[GAME_NAME].maxLevel || 0)) {
      stats[GAME_NAME].maxLevel = level;
      stats[GAME_NAME].lastPlayed = now;
      
      saveGameStats(stats);
      
      // Track with Google Analytics / GTM
      if (typeof window !== 'undefined' && window.trackEvent) {
        window.trackEvent('max_level_achieved', {
          game_name: GAME_NAME,
          max_level: level,
          timestamp: now
        });
      }
      
      // Track with Firebase Analytics
      trackFirebaseEvent('max_level_achieved', {
        game_name: GAME_NAME,
        max_level: level,
        timestamp: now
      });
      
      // Sync with Firebase (async, don't wait)
      try {
        await syncGameStatsWithFirebase();
      } catch (error) {
        console.error('Error syncing with Firebase:', error);
      }
    }
  }
}

/**
 * Get play count for this game
 */
export function getGamePlayCount(): number {
  const stats = getGameStats();
  return stats[GAME_NAME]?.playCount || 0;
}

/**
 * Get max level for this game
 */
export function getMaxLevel(): number {
  const stats = getGameStats();
  return stats[GAME_NAME]?.maxLevel || 0;
}

