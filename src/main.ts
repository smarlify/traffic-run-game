import './style.css';
import * as THREE from 'three';
import {
  scene,
  camera,
  renderer,
  setAnimationLoop,
  stopAnimationLoop,
  cameraWidth,
  cameraHeight,
  audioListener,
} from './scene';
import {
  Car,
  Truck,
  Tree,
  addVehicle,
  moveOtherVehicles,
  pickRandom,
} from './vehicles';
import {
  renderMap,
  trackRadius,
  arcCenterX,
  innerTrackRadius,
  outerTrackRadius,
} from './track';
import {
  setScore,
  setFinalScore,
  showResults,
  setInstructionsOpacity,
  setButtonsOpacity,
  setupUIHandlers,
  showPauseDialog,
  hidePauseDialog,
  showPlayerNamePrompt,
  showPlayerGreeting,
  hidePlayerUI,
  showLeaderboard,
} from './ui';
import { getPlayerData, setPlayerName, hasPlayerName } from './player';
import { initAudio, playBackgroundMusic, stopBackgroundMusic, pauseBackgroundMusic, resumeBackgroundMusic } from './audio';
import { checkCollision } from './collision';
import { vehicleColors } from './vehicles';
import { initializeLeaderboard, saveLeaderboardScore, getTopScores } from './leaderboard';

// Game state
let playerCar: THREE.Group | null = null;
let otherVehicles: THREE.Group[] = [];
let score: number = 0;
let playerAngleMoved: number = 0;
let accelerate: boolean = false;
let decelerate: boolean = false;
let ready: boolean = false;
let lastTimestamp: number | null = null;
let playerLane: 'inner' | 'outer' = 'inner';
let playerCarColor: string | null = null;
const laneOffset: number = 20;

const speed: number = 0.0017;
const playerAngleInitial: number = Math.PI;
let paused: boolean = false;
let gameOver: boolean = false;
let gameOverPending: boolean = false;
let firstGameOver: boolean = true;

// Timeout management
let activeTimeouts: number[] = [];

function clearAllTimeouts(): void {
  activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  activeTimeouts = [];
}

function addTimeout(callback: () => void, delay: number): number {
  const timeoutId = setTimeout(() => {
    activeTimeouts = activeTimeouts.filter(id => id !== timeoutId);
    callback();
  }, delay);
  activeTimeouts.push(timeoutId);
  return timeoutId;
}

// Make timeout management functions available globally for collision.ts
(window as any).addTimeout = addTimeout;
(window as any).clearAllTimeouts = clearAllTimeouts;

function pauseGame(): void {
  if (!paused && !gameOver && !gameOverPending) {
    stopAnimationLoop();
    showPauseDialog();
    paused = true;
    // Pause background music when game is paused
    pauseBackgroundMusic();
  }
}
function resumeGame(): void {
  if (paused && !gameOver && !gameOverPending) {
    hidePauseDialog();
    lastTimestamp = undefined;
    setAnimationLoop(animation);
    paused = false;
    // Resume background music when game is resumed
    resumeBackgroundMusic();
  }
}

function handleGameOver(): void {
  gameOver = true;

  // Update final score in dialog
  setFinalScore(score);

  // Save score to leaderboard
  const playerData = getPlayerData();
  if (playerData) {
    saveLeaderboardScore({
      id: playerData.id,
      name: playerData.name,
      score: score,
    }).catch(error => {
      console.error('Failed to save leaderboard score:', error);
    });
  }

  // Fetch and display top scores
  getTopScores(10)
    .then(scores => {
      showLeaderboard(scores);
    })
    .catch(error => {
      console.error('Failed to fetch leaderboard:', error);
    });

  // Check if player has a name stored
  if (hasPlayerName()) {
    const playerData = getPlayerData();
    if (playerData) {
      showPlayerGreeting(playerData.name);
    }
  } else if (firstGameOver) {
    // First game over and no name - show prompt
    showPlayerNamePrompt();
    firstGameOver = false;
  } else {
    // Subsequent game overs without name
    hidePlayerUI();
  }
}

function handlePlayerNameSubmit(name: string): void {
  setPlayerName(name);
  showPlayerGreeting(name);
}

function reset(): void {
  // Clear all active timeouts to prevent state inconsistencies
  clearAllTimeouts();

  playerAngleMoved = 0;
  score = 0;
  setScore('Press UP');
  // Remove other vehicles and explosions
  otherVehicles.forEach(vehicle => {
    scene.remove(vehicle.mesh);
    vehicle.crashed = false;
    // Remove explosion meshes if any
    if (vehicle.explosionMesh) {
      scene.remove(vehicle.explosionMesh);
      vehicle.explosionMesh = null;
    }
  });
  otherVehicles = [];
  showResults(false);
  hidePlayerUI();
  // Clear leaderboard display
  const leaderboardContainer = document.getElementById('leaderboard-container');
  if (leaderboardContainer) {
    leaderboardContainer.style.display = 'none';
  }
  lastTimestamp = undefined;
  // Place the player's car to the starting position
  movePlayerCar(0);
  // --- Restore player car visuals ---
  if (playerCar) {
    playerCar.traverse(child => {
      if (child.material) {
        if (
          child.material.color &&
          child.material.userData &&
          child.material.userData.originalColor
        ) {
          child.material.color.copy(child.material.userData.originalColor);
        } else if (child.material.color) {
          // Save original color if not already saved
          child.material.userData = child.material.userData || {};
          child.material.userData.originalColor = child.material.color.clone();
        }
        child.material.opacity = 1;
        child.material.transparent = false;
      }
    });
    playerCar.scale.set(1, 1, 1);
    playerCar.rotation.z = playerAngleInitial - Math.PI / 2;
  }
  renderer.render(scene, camera);
  ready = true;
  gameOver = false;
  gameOverPending = false;
  // Resume background music after reset
  resumeBackgroundMusic();
}

function startGame() {
  if (ready) {
    ready = false;
    setScore(0);
    setButtonsOpacity(1);
    setInstructionsOpacity(0);
    setAnimationLoop(animation);
    gameOver = false;
    gameOverPending = false;
    // Resume background music if it was paused
    resumeBackgroundMusic();
  }
}

function getPlayerLaneRadius() {
  return playerLane === 'inner'
    ? innerTrackRadius + laneOffset
    : outerTrackRadius - laneOffset;
}

function movePlayerCar(timeDelta) {
  const playerSpeed = getPlayerSpeed();
  playerAngleMoved -= playerSpeed * timeDelta;
  const totalPlayerAngle = playerAngleInitial + playerAngleMoved;
  const playerRadius = getPlayerLaneRadius();
  const playerX = Math.cos(totalPlayerAngle) * playerRadius - arcCenterX;
  const playerY = Math.sin(totalPlayerAngle) * playerRadius;
  playerCar.position.x = playerX;
  playerCar.position.y = playerY;
  playerCar.rotation.z = totalPlayerAngle - Math.PI / 2;
}

function getPlayerSpeed() {
  if (accelerate) return speed * 2;
  if (decelerate) return speed * 0.5;
  return speed;
}

function switchLane(direction) {
  if (direction === 'left') {
    playerLane = 'outer';
  } else if (direction === 'right') {
    playerLane = 'inner';
  }
}

function animation(timestamp: number): void {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }
  if (gameOverPending) {
    // Stop background music when game over is pending
    stopBackgroundMusic();
    renderer.render(scene, camera);
    lastTimestamp = timestamp;
    return;
  }
  const timeDelta = timestamp - lastTimestamp;
  movePlayerCar(timeDelta);
  const laps = Math.floor(Math.abs(playerAngleMoved) / (Math.PI * 2));
  if (laps !== score) {
    score = laps;
    setScore(score);
  }
  // Change: spawn a new car after every 3 laps (not 5)
  if (otherVehicles.length < (laps + 1) / 3)
    addVehicle(
      scene,
      otherVehicles,
      Car,
      Truck,
      playerCarColor,
      playerAngleInitial + playerAngleMoved
    );
  moveOtherVehicles(otherVehicles, speed, timeDelta, trackRadius, arcCenterX);
  const hit = checkCollision({
    playerCar,
    playerAngleInitial,
    playerAngleMoved,
    otherVehicles,
    showResults: (show) => {
      showResults(show);
      if (show) {
        handleGameOver();
      }
    },
    stopAnimationLoop,
    scene, // Pass scene for explosions
  });
  if (hit) {
    gameOverPending = true;
    return;
  }
  renderer.render(scene, camera);
  lastTimestamp = timestamp;
}

function positionScoreElement() {
  const arcCenterXinPixels = (arcCenterX / cameraWidth) * window.innerWidth;
  if (document.getElementById('score')) {
    document.getElementById('score').style.cssText = `
      left: ${window.innerWidth / 2 - arcCenterXinPixels * 1.3}px;
      top: ${window.innerHeight / 2}px
    `;
  }
}

// UI event wiring
setupUIHandlers({
  onAccelerateDown: val => {
    if (!paused && !gameOver && !gameOverPending) accelerate = val;
  },
  onDecelerateDown: val => {
    if (!paused && !gameOver && !gameOverPending) decelerate = val;
  },
  onResetKey: reset,
  onStartKey: () => {
    if (gameOver || gameOverPending) {
      reset();
    } else if (paused) {
      resumeGame();
    } else {
      startGame();
    }
  },
  onLeftKey: () => {
    if (!paused && !gameOver && !gameOverPending) playerLane = 'outer';
  },
  onRightKey: () => {
    if (!paused && !gameOver && !gameOverPending) playerLane = 'inner';
  },
  onNameSubmit: handlePlayerNameSubmit,
});

// Initialize audio
initAudio(audioListener);

// Start background music on page load
setTimeout(() => {
  playBackgroundMusic();
}, 1000); // Small delay to ensure audio is loaded

// Responsive
window.addEventListener('resize', () => {
  const newAspectRatio = window.innerWidth / window.innerHeight;
  const adjustedCameraHeight = cameraWidth / newAspectRatio;
  camera.top = adjustedCameraHeight / 2;
  camera.bottom = adjustedCameraHeight / -2;
  camera.updateProjectionMatrix();
  positionScoreElement();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});

// Auto-pause when window becomes inactive
window.addEventListener('visibilitychange', () => {
  if (document.hidden && !paused && !gameOver && !gameOverPending && ready) {
    pauseGame();
  } else if (!document.hidden && paused && !gameOver && !gameOverPending && ready) {
    resumeGame();
  }
});

// Game initialization
async function init() {
  // Initialize leaderboard
  await initializeLeaderboard();

  // Pick a random color for the player
  playerCarColor = pickRandom(vehicleColors);
  playerCar = Car([playerCarColor]);
  scene.add(playerCar);
  renderMap(
    scene,
    cameraWidth,
    cameraHeight * 2,
    { curbs: true, trees: true },
    positionScoreElement,
    Tree
  );
  reset();
}

init();

window.addEventListener('keydown', event => {
  if (event.key === ' ') {
    event.preventDefault();
    if (gameOver) {
      // During game over, space key should restart the game
      reset();
      return;
    }
    if (paused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }
  if (event.key === 'ArrowLeft') switchLane('left');
  if (event.key === 'ArrowRight') switchLane('right');
});
