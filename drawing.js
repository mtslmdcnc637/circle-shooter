// --- Main Game Loop ---

function update(dt) {
    // Update game state first
    if (typeof updateWaveState === 'function') updateWaveState(dt);

    // Update objects only if playing
    if (gameState === 'playing') {
        if (typeof updatePlayer === 'function') updatePlayer(dt);
        if (typeof updateEnemies === 'function') updateEnemies(dt);
        if (typeof updateNanoBots === 'function') updateNanoBots(dt);
        if (typeof updateBullets === 'function') updateBullets(dt);
        if (typeof updatePowerups === 'function') updatePowerups(dt);
    }

    // Update effects regardless of state? (Particles, Shake)
    if (typeof updateParticles === 'function') updateParticles(dt);
    if (typeof updateScreenShake === 'function') updateScreenShake(dt);

    // Final check for game over
    if (health <= 0 && gameState === 'playing') {
        if (typeof gameOver === 'function') gameOver();
    }
}

function gameLoop(timestamp) {
    // Ensure game hasn't been stopped
    if (gameState === 'gameOver' || gameState === 'start' || gameState === 'shoppingOverlay') {
         animationFrameId = null; // Make sure loop doesn't restart accidentally
         return;
    }
    if (gameState === 'paused') { // Explicitly check paused state
         animationFrameId = requestAnimationFrame(gameLoop); // Keep requesting frame but don't update/draw gameplay
         return;
    }


    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    deltaTime = Math.min(deltaTime, 0.1); // Clamp dt

    // --- Update Game State ---
    update(deltaTime);

    // --- Draw Frame ---
    if (typeof draw === 'function') draw(); // Call the main drawing function

    // --- Request Next Frame ---
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Initialization and Event Listeners ---
function init() {
    console.log("Initializing Game...");

    if (!canvas || !ctx) {
        console.error("Canvas or Context not found! Game cannot start.");
        // Display an error message to the user on the page?
        document.body.innerHTML = '<h1 style="color: red; text-align: center;">Error: Could not initialize Canvas.</h1>';
        return; // Stop initialization
    }

    // Initial Resize and Setup
    resizeCanvas(); // Set initial canvas size
    loadGameData(); // Load saved state

    // Setup Event Listeners (check if elements exist first)
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (startShopBtn) startShopBtn.addEventListener('click', openShopOverlay);
    if (closeShopOverlayBtn) closeShopOverlayBtn.addEventListener('click', closeShopOverlay);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

    // Input listeners
    if (canvas) {
        canvas.addEventListener('mousemove', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('mousedown', (e) => { if (gameState === 'playing') updateAimPosition(e); }); // Update aim on click too
        canvas.addEventListener('touchmove', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
        canvas.addEventListener('touchstart', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
    }

    window.addEventListener('keydown', (e) => {
        // Pause / Unpause / Close Shop
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (gameState === 'shoppingOverlay') closeShopOverlay();
            else if (gameState === 'playing' || gameState === 'paused') togglePause();
        }
        if (gameState === 'playing') {
            // Upgrade Hotkeys (1-7)
            if (e.key >= '1' && e.key <= '7') buyUpgradeByIndex(parseInt(e.key) - 1);
            // Deploy Nanobot Hotkey ('b' or 'B')
            if (e.key.toLowerCase() === 'b') deployNanoBot();
            // Activate Shield Hotkey (Space or 's'/'S')
            if (e.key === ' ' || e.key.toLowerCase() === 's') activateShield();
        }
    });

    // Initial UI Updates and State
    updateCashDisplay(); updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();
    if(startScreen) startScreen.classList.add('visible');
    if(gameOverElement) gameOverElement.classList.remove('visible');
    if(pauseMenu) pauseMenu.classList.remove('visible');
    if(shopOverlay) shopOverlay.classList.remove('visible');
    if(pauseBtn) pauseBtn.style.display = 'none';
    hideUpgradePanel(); // Ensure it starts hidden

    console.log("Initialization Complete. Ready.");
}

// --- Start the Game Initialization ---
// Wrap in DOMContentLoaded to ensure HTML is ready before selecting elements
document.addEventListener('DOMContentLoaded', init);