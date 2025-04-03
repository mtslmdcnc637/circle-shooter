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
    // Only skip update/draw if paused, but keep requesting frames to allow unpausing
    if (gameState === 'paused') {
         animationFrameId = requestAnimationFrame(gameLoop); // Keep requesting frame
         return; // Skip update/draw
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
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause); // Listener for pause button
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause); // Listener for resume button

    // Input listeners for Canvas
    if (canvas) {
        canvas.addEventListener('mousemove', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('mousedown', (e) => { if (gameState === 'playing') updateAimPosition(e); }); // Update aim on click too
        canvas.addEventListener('touchmove', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
        canvas.addEventListener('touchstart', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
    } else {
         console.error("Canvas element not found for input listeners.");
    }

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        // Pause / Unpause / Close Shop
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (gameState === 'shoppingOverlay') closeShopOverlay();
            else if (gameState === 'playing' || gameState === 'paused') togglePause(); // Toggle pause on Esc/P
        }
        if (gameState === 'playing') {
            // Upgrade Hotkeys (1-7) - Find the correct index excluding nanobot button
             if (e.key >= '1' && e.key <= '9') { // Check 1-9 maybe? Depends on visible upgrades
                let targetVisibleIndex = parseInt(e.key) - 1;
                let currentVisibleIndex = 0;
                let actualUpgradeIndex = -1;
                for(let i=0; i<upgrades.length; i++){
                    if(upgrades[i].id === 'nanobot') continue; // Skip nanobot for number hotkeys
                    if (upgrades[i].requiresShield && !player.shieldUnlocked) continue; // Skip unavailable shield upgrades

                    if(currentVisibleIndex === targetVisibleIndex){
                        actualUpgradeIndex = i;
                        break;
                    }
                    currentVisibleIndex++;
                }
                 if(actualUpgradeIndex !== -1) {
                     buyUpgradeByIndex(targetVisibleIndex); // Pass visible index
                 }
             }

            // Deploy Nanobot Hotkey ('b' or 'B')
            if (e.key.toLowerCase() === 'b') {
                 // Add cost check here for the hotkey
                 if (cash >= NANO_BOT_DEPLOY_COST) {
                     cash -= NANO_BOT_DEPLOY_COST;
                     updateCashDisplay();
                     saveGameData();
                     deployNanoBot(); // Now safe to call
                     updateUpgradeUI(); // Update panel button state
                     console.log("Bought Nanobot via Hotkey.");
                 } else {
                     console.log("Cannot afford Nanobot (Hotkey).");
                     // Optional visual feedback
                 }
            }
            // Activate Shield Hotkey (Space or 's'/'S')
            if (e.key === ' ' || e.key.toLowerCase() === 's') {
                 activateShield();
            }
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
document.addEventListener('DOMContentLoaded', init);