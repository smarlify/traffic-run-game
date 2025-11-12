// UI element references
const scoreElement = document.getElementById('score');
const buttonsElement = document.getElementById('buttons');
const instructionsElement = document.getElementById('instructions');
const resultsElement = document.getElementById('results');
const pauseDialogElement = document.getElementById('pause-dialog');
const resetInstructionElement = document.getElementById('reset-instruction');
const finalScoreElement = document.getElementById('final-score');
const retryButtonElement = document.getElementById('retry-button');
const gameResultInfoElement = document.getElementById('game-result-info');
const playerNameDisplayElement = document.getElementById('player-name-display');
const signInContainerElement = document.getElementById('sign-in-container');
const signInButtonElement = document.getElementById('sign-in-button');
const signInPromptElement = document.getElementById('sign-in-prompt');
const userInfoDisplayElement = document.getElementById('user-info-display');
const signedInNameElement = document.getElementById('signed-in-name');

// Create arrow buttons
const upButton = document.createElement('button');
upButton.id = 'accelerate';
upButton.innerHTML = `<svg width="30" height="30" viewBox="0 0 10 10"><g transform="rotate(0, 5,5)"><path d="M5,4 L7,6 L3,6 L5,4" /></g></svg>`;
const downButton = document.createElement('button');
downButton.id = 'decelerate';
downButton.innerHTML = `<svg width="30" height="30" viewBox="0 0 10 10"><g transform="rotate(180, 5,5)"><path d="M5,4 L7,6 L3,6 L5,4" /></g></svg>`;
const leftButton = document.createElement('button');
leftButton.id = 'left';
leftButton.innerHTML = `<svg width="30" height="30" viewBox="0 0 10 10"><g transform="rotate(-90, 5,5)"><path d="M5,4 L7,6 L3,6 L5,4" /></g></svg>`;
const rightButton = document.createElement('button');
rightButton.id = 'right';
rightButton.innerHTML = `<svg width="30" height="30" viewBox="0 0 10 10"><g transform="rotate(90, 5,5)"><path d="M5,4 L7,6 L3,6 L5,4" /></g></svg>`;

// Create a cross layout for the arrow keys
const dpad = document.createElement('div');
dpad.id = 'dpad';
dpad.style.display = 'flex';
dpad.style.flexDirection = 'column';
dpad.style.alignItems = 'center';
dpad.style.justifyContent = 'center';
dpad.innerHTML = `
  <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 6px;">
    <div style="width: 28px;"></div>
    <div id="dpad-up"></div>
    <div style="width: 28px;"></div>
  </div>
  <div style="display: flex; justify-content: center; align-items: center;">
    <div id="dpad-left"></div>
    <div style="width: 11px;"></div>
    <div id="dpad-down"></div>
    <div style="width: 11px;"></div>
    <div id="dpad-right"></div>
  </div>
`;

// Insert buttons into the dpad
setTimeout(() => {
  const up = dpad.querySelector('#dpad-up');
  const down = dpad.querySelector('#dpad-down');
  const left = dpad.querySelector('#dpad-left');
  const right = dpad.querySelector('#dpad-right');
  if (up) up.appendChild(upButton);
  if (down) down.appendChild(downButton);
  if (left) left.appendChild(leftButton);
  if (right) right.appendChild(rightButton);
}, 0);

const buttonsParent = document.getElementById('buttons');
if (buttonsParent) {
  buttonsParent.innerHTML = '';
  buttonsParent.appendChild(dpad);
}

// UI state and callbacks
let onAccelerate = null;
let onDecelerate = null;
let onReset = null;
let onStart = null;
let onRetry = null;

function setScore(value) {
  if (scoreElement) scoreElement.innerText = value;
}
function setFinalScore(value: number) {
  if (finalScoreElement) finalScoreElement.innerText = value.toString();
}

function showGameResult(playerName: string, score: number) {
  if (playerNameDisplayElement) playerNameDisplayElement.innerText = playerName;
  if (finalScoreElement) finalScoreElement.innerText = score.toString();
  if (gameResultInfoElement) gameResultInfoElement.style.display = 'block';
}

function hideGameResult() {
  if (gameResultInfoElement) gameResultInfoElement.style.display = 'none';
  if (playerNameDisplayElement) playerNameDisplayElement.innerText = '—';
}
function showResults(show) {
  if (resultsElement) resultsElement.style.display = show ? 'flex' : 'none';
}
function setInstructionsOpacity(opacity) {
  if (instructionsElement) instructionsElement.style.opacity = opacity;
}
function setButtonsOpacity(opacity) {
  if (buttonsElement) buttonsElement.style.opacity = opacity;
}
function showPauseDialog() {
  if (pauseDialogElement) pauseDialogElement.style.display = 'flex';
}
function hidePauseDialog() {
  if (pauseDialogElement) pauseDialogElement.style.display = 'none';
}
function showPlayerGreeting(name: string, score: number) {
  showGameResult(name, score);
  if (retryButtonElement) retryButtonElement.style.display = 'block';
}

function hidePlayerUI() {
  if (retryButtonElement) retryButtonElement.style.display = 'none';
  hideGameResult();
}

function showSignInContainer() {
  if (signInContainerElement) signInContainerElement.style.display = 'block';
}

function hideSignInContainer() {
  if (signInContainerElement) signInContainerElement.style.display = 'none';
}

function showUserInfo(userName: string) {
  // Hide the sign-in button and prompt
  if (signInButtonElement) signInButtonElement.style.display = 'none';
  if (signInPromptElement) signInPromptElement.style.display = 'none';

  // Show the user info display
  if (userInfoDisplayElement) userInfoDisplayElement.style.display = 'block';
  if (signedInNameElement) signedInNameElement.innerText = userName;
}

function hideUserInfo() {
  // Show the sign-in button and prompt
  if (signInButtonElement) signInButtonElement.style.display = 'block';
  if (signInPromptElement) signInPromptElement.style.display = 'block';

  // Hide the user info display
  if (userInfoDisplayElement) userInfoDisplayElement.style.display = 'none';
}
function setupUIHandlers({
  onAccelerateDown,
  onDecelerateDown,
  onResetKey,
  onStartKey,
  onLeftKey,
  onRightKey,
  onRetryClick,
  onSignIn,
}) {
  onAccelerate = onAccelerateDown;
  onDecelerate = onDecelerateDown;
  onReset = onResetKey;
  onStart = onStartKey;
  onRetry = onRetryClick;
  if (upButton) {
    upButton.addEventListener('mousedown', () => {
      if (onStart) onStart();
      if (onAccelerate) onAccelerate(true);
    });
    upButton.addEventListener('mouseup', () => {
      if (onAccelerate) onAccelerate(false);
    });
    upButton.addEventListener('touchstart', () => {
      if (onStart) onStart();
      if (onAccelerate) onAccelerate(true);
    });
    upButton.addEventListener('touchend', () => {
      if (onAccelerate) onAccelerate(false);
    });
  }
  if (downButton) {
    downButton.addEventListener('mousedown', () => {
      if (onDecelerate) onDecelerate(true);
    });
    downButton.addEventListener('mouseup', () => {
      if (onDecelerate) onDecelerate(false);
    });
    downButton.addEventListener('touchstart', () => {
      if (onDecelerate) onDecelerate(true);
    });
    downButton.addEventListener('touchend', () => {
      if (onDecelerate) onDecelerate(false);
    });
  }
  if (leftButton) {
    leftButton.addEventListener('mousedown', () => {
      if (onLeftKey) onLeftKey();
    });
    leftButton.addEventListener('touchstart', () => {
      if (onLeftKey) onLeftKey();
    });
  }
  if (rightButton) {
    rightButton.addEventListener('mousedown', () => {
      if (onRightKey) onRightKey();
    });
    rightButton.addEventListener('touchstart', () => {
      if (onRightKey) onRightKey();
    });
  }
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp') {
      if (onStart) onStart();
      if (onAccelerate) onAccelerate(true);
    }
    if (event.key === 'ArrowDown') {
      if (onDecelerate) onDecelerate(true);
    }
    if (event.key === 'ArrowLeft') {
      if (onLeftKey) onLeftKey();
    }
    if (event.key === 'ArrowRight') {
      if (onRightKey) onRightKey();
    }
    if (event.key === 'R' || event.key === 'r') {
      if (onReset) onReset();
    }
  });
  window.addEventListener('keyup', event => {
    if (event.key === 'ArrowUp') {
      if (onAccelerate) onAccelerate(false);
    }
    if (event.key === 'ArrowDown') {
      if (onDecelerate) onDecelerate(false);
    }
  });

  // Retry button handler
  if (retryButtonElement) {
    retryButtonElement.addEventListener('click', () => {
      if (onRetry) onRetry();
    });
    // Add hover effects for retry button
    retryButtonElement.addEventListener('mouseenter', () => {
      retryButtonElement.style.transform = 'scale(1.05)';
    });
    retryButtonElement.addEventListener('mouseleave', () => {
      retryButtonElement.style.transform = 'scale(1)';
    });
    retryButtonElement.addEventListener('mousedown', () => {
      retryButtonElement.style.transform = 'scale(0.95)';
      retryButtonElement.style.boxShadow = '1px 2px 0px 0px rgba(0, 0, 0, 0.75)';
    });
    retryButtonElement.addEventListener('mouseup', () => {
      retryButtonElement.style.transform = 'scale(1.05)';
      retryButtonElement.style.boxShadow = 'none';
    });
  }

  // Sign-in button handler
  if (signInButtonElement && onSignIn) {
    signInButtonElement.addEventListener('click', () => {
      onSignIn();
    });
  }
}

export {
  setScore,
  setFinalScore,
  showResults,
  setInstructionsOpacity,
  setButtonsOpacity,
  setupUIHandlers,
  scoreElement,
  buttonsElement,
  instructionsElement,
  resultsElement,
  showPauseDialog,
  hidePauseDialog,
  showPlayerGreeting,
  hidePlayerUI,
  showGameResult,
  hideGameResult,
  showSignInContainer,
  hideSignInContainer,
  showUserInfo,
  hideUserInfo,
};
