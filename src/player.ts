// Player management with localStorage

interface PlayerData {
  id: string;
  name: string;
}

const STORAGE_KEY = 'trafficRunPlayer';

function generateUniqueId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getPlayerData(): PlayerData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading player data:', error);
  }
  return null;
}

export function setPlayerName(name: string): PlayerData {
  const existingData = getPlayerData();
  const playerData: PlayerData = {
    id: existingData?.id || generateUniqueId(),
    name: name.trim(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerData));
  } catch (error) {
    console.error('Error saving player data:', error);
  }

  return playerData;
}

export function hasPlayerName(): boolean {
  const data = getPlayerData();
  return data !== null && data.name.length > 0;
}
