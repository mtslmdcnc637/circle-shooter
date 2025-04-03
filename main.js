// --- Main Game Loop ---

function update(dt) {
    // Update game state first
    if (typeof updateWaveState === 'function') updateWaveState(dt);

    // Update objects only if playing
    if (gameState === 'playing') {
        if (typeof updatePlayer === 'function') updatePlayer(dt);
        if (typeof updateEnemies === 'function') updateEnemies(dt);
        if (typeof updateEnemyBullets === 'function') updateEnemyBullets(dt); // UPDATE ENEMY BULLETS
        if (typeof updateNanoBots === 'function') updateNanoBots(dt);
        if (typeof updateBullets === 'function') updateBullets(dt); // Player/Converted Bullets
        if (typeof updatePowerups === 'function') updatePowerups(dt);
    }

    // Update effects regardless of state? (Particles, Shake, Damage Numbers)
    if (typeof updateParticles === 'function') updateParticles(dt);
    if (typeof updateDamageNumbers === 'function') updateDamageNumbers(dt); // UPDATE DAMAGE NUMBERS
    if (typeof updateScreenShake === 'function') updateScreenShake(dt);

    // Final check for game over
    if (health <= 0 && gameState === 'playing') {
        if (typeof gameOver === 'function') gameOver();
    }
}

function gameLoop(timestamp) {
    // Ensure game hasn't been stopped
    if (gameState === 'gameOver' || gameState === 'start' || gameState === 'shoppingOverlay') {
         animationFrameId = null; return;
    }
    if (gameState === 'paused') {
         animationFrameId = requestAnimationFrame(gameLoop); return;
    }

    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000; lastFrameTime = timestamp;
    deltaTime = Math.min(deltaTime, 0.1); // Clamp dt

    update(deltaTime); // Update Game State
    if (typeof draw === 'function') draw(); // Draw Frame
    animationFrameId = requestAnimationFrame(gameLoop); // Request Next Frame
}

// --- Initialization and Event Listeners ---
function init() {
    console.log("Initializing Game v3..."); // Version indication

    if (!canvas || !ctx) {
        console.error("Canvas or Context not found! Game cannot start.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center;">Error: Could not initialize Canvas.</h1>';
        return;
    }

    resizeCanvas(); loadGameData();

    // Setup Event Listeners
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (startShopBtn) startShopBtn.addEventListener('click', openShopOverlay);
    if (closeShopOverlayBtn) closeShopOverlayBtn.addEventListener('click', closeShopOverlay);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

    // Input listeners for Canvas
    if (canvas) {
        canvas.addEventListener('mousemove', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('mousedown', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('touchmove', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
        canvas.addEventListener('touchstart', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
    } else { console.error("Canvas element not found for input listeners."); }

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (gameState === 'shoppingOverlay') closeShopOverlay();
            else if (gameState === 'playing' || gameState === 'paused') togglePause();
        }
        if (gameState === 'playing') {
            // Upgrade Hotkeys (Map number to VISIBLE upgrade index, excluding nanobot)
             if (e.key >= '1' && e.key <= '9') {
                 let targetVisibleIndex = parseInt(e.key) - 1;
                 let currentVisibleIndex = 0;
                 let actualUpgradeIndex = -1;
                 for(let i=0; i<upgrades.length; i++){
                     // Skip non-hotkeyable upgrades or those not visible
                     if (upgrades[i].id === 'nanobot') continue;
                     if (upgrades[i].requiresShield && !player.shieldUnlocked) continue;

                     if(currentVisibleIndex === targetVisibleIndex){
                         actualUpgradeIndex = i; // This is the index in the original upgrades array
                         break;
                     }
                     currentVisibleIndex++;
                 }
                  if(actualUpgradeIndex !== -1) {
                      // Call using the ACTUAL index in the main array
                      buyUpgradeByIndex(actualUpgradeIndex);
                  }
             }
            // Deploy Nanobot Hotkey ('b' or 'B')
            if (e.key.toLowerCase() === 'b') {
                 if (cash >= NANO_BOT_DEPLOY_COST) {
                     cash -= NANO_BOT_DEPLOY_COST; updateCashDisplay(); saveGameData();
                     deployNanoBot(); updateUpgradeUI();
                 } else { /* displayCannotAfford('nanobot'); */ } // Optional feedback
            }
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
    hideUpgradePanel();

    console.log("Initialization Complete. Ready.");
}

// --- Start the Game Initialization ---
document.addEventListener('DOMContentLoaded', init);