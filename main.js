// --- Main Game Loop ---

function update(dt) {
    // Check for valid game states where updates should happen
    const canUpdate = gameState === 'playing' || gameState === 'waveIntermission';
    if (!canUpdate) return; // Skip updates if paused, game over, etc.

    // Update game state first
    if (typeof updateWaveState === 'function') updateWaveState(dt);

    // Update objects only if playing (not intermission)
    if (gameState === 'playing') {
        if (typeof updatePlayer === 'function') updatePlayer(dt);
        if (typeof updateEnemies === 'function') updateEnemies(dt);
        if (typeof updateEnemyBullets === 'function') updateEnemyBullets(dt);
        if (typeof updateNanoBots === 'function') updateNanoBots(dt);
        if (typeof updateBullets === 'function') updateBullets(dt); // Player/Converted Bullets
        if (typeof updatePowerups === 'function') updatePowerups(dt);
    }

    // Update effects (Particles, Shake, Damage Numbers) - can update even during intermission
    if (typeof updateParticles === 'function') updateParticles(dt);
    if (typeof updateDamageNumbers === 'function') updateDamageNumbers(dt);
    if (typeof updateScreenShake === 'function') updateScreenShake(dt);

    // Final check for game over
    if (health <= 0 && gameState === 'playing') { // Check state again after updates
        if (typeof gameOver === 'function') gameOver();
    }
}


function gameLoop(timestamp) {
    // Request next frame immediately
    animationFrameId = requestAnimationFrame(gameLoop);

    // Calculate deltaTime
    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    deltaTime = Math.min(deltaTime, 0.1); // Clamp dt

    // --- Update Game State (only if not paused) ---
    if (gameState !== 'paused') {
        update(deltaTime);
    }

    // --- Draw Frame (always draw, even if paused to show menus/paused state) ---
    if (typeof draw === 'function') {
        draw();
    } else {
        console.error("Draw function is not defined!"); // Should not happen
    }

}

// --- Initialization and Event Listeners ---
function init() {
    console.log("Initializing Game v3...");

    if (!canvas || !ctx) {
        console.error("Canvas or Context not found! Game cannot start.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center;">Error: Could not initialize Canvas.</h1>';
        return;
    }

    resizeCanvas(); loadGameData();

    // Setup Event Listeners
    if (startBtn) startBtn.addEventListener('click', startGame); else console.warn("Start button not found");
    if (startShopBtn) startShopBtn.addEventListener('click', openShopOverlay); else console.warn("Start Shop button not found");
    if (closeShopOverlayBtn) closeShopOverlayBtn.addEventListener('click', closeShopOverlay); else console.warn("Close Shop button not found");
    if (restartBtn) restartBtn.addEventListener('click', restartGame); else console.warn("Restart button not found");
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause); else console.warn("Pause button not found");
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause); else console.warn("Resume button not found");

    if (canvas) {
        canvas.addEventListener('mousemove', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('mousedown', (e) => { if (gameState === 'playing') updateAimPosition(e); });
        canvas.addEventListener('touchmove', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
        canvas.addEventListener('touchstart', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
    } else { console.error("Canvas element not found for input listeners."); }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (gameState === 'shoppingOverlay') closeShopOverlay();
            else if (gameState === 'playing' || gameState === 'paused') togglePause();
        }
        if (gameState === 'playing') {
            if (e.key >= '1' && e.key <= '9') { // Hotkeys 1-9
                 let targetVisibleIndex = parseInt(e.key) - 1;
                 let currentVisibleIndex = 0;
                 let actualUpgradeIndex = -1;
                 for(let i=0; i<upgrades.length; i++){
                     if (!upgrades[i]) continue; // Safety check
                     if (upgrades[i].id === 'nanobot') continue;
                     if (upgrades[i].requiresShield && !player.shieldUnlocked) continue;
                     if(currentVisibleIndex === targetVisibleIndex){ actualUpgradeIndex = i; break; }
                     currentVisibleIndex++;
                 }
                  if(actualUpgradeIndex !== -1) { buyUpgradeByIndex(actualUpgradeIndex); }
             }
            if (e.key.toLowerCase() === 'b') { // Nanobot hotkey
                 if (cash >= NANO_BOT_DEPLOY_COST) { cash -= NANO_BOT_DEPLOY_COST; updateCashDisplay(); saveGameData(); deployNanoBot(); updateUpgradeUI(); }
                 else { displayCannotAfford('nanobot'); }
            }
            if (e.key === ' ' || e.key.toLowerCase() === 's') { activateShield(); } // Shield hotkey
        }
    });

    // Initial UI Updates and State
    updateCashDisplay(); updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();
    if(startScreen) startScreen.classList.add('visible'); else console.warn("Start screen not found");
    if(gameOverElement) gameOverElement.classList.remove('visible'); else console.warn("Game Over element not found");
    if(pauseMenu) pauseMenu.classList.remove('visible'); else console.warn("Pause menu not found");
    if(shopOverlay) shopOverlay.classList.remove('visible'); else console.warn("Shop overlay not found");
    if(pauseBtn) pauseBtn.style.display = 'none';
    hideUpgradePanel();

    console.log("Initialization Complete. Ready.");
    // Don't start the game loop here, wait for Start button
}

// --- Start the Game Initialization ---
document.addEventListener('DOMContentLoaded', init);