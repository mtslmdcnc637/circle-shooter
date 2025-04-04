
// Global state variable to track state before pause/shop
let previousGameState = 'start';

// --- Main Game Loop ---
function update(dt) {
    // Game logic updates only run if playing
    if (gameState !== 'playing') return;

    // Update game state first (wave progression, etc.)
    if (typeof updateWaveState === 'function') updateWaveState(dt);

    // Update game objects
    if (typeof updatePlayer === 'function') updatePlayer(dt);
    if (typeof updateEnemies === 'function') updateEnemies(dt);
    if (typeof updateEnemyBullets === 'function') updateEnemyBullets(dt);
    if (typeof updateNanoBots === 'function') updateNanoBots(dt);
    if (typeof updateBullets === 'function') updateBullets(dt); // Player/Converted Bullets
    if (typeof updatePowerups === 'function') updatePowerups(dt);

    // Update effects (Particles, Shake, Damage Numbers)
    if (typeof updateParticles === 'function') updateParticles(dt);
    if (typeof updateDamageNumbers === 'function') updateDamageNumbers(dt);
    if (typeof updateScreenShake === 'function') updateScreenShake(dt);

    // Game over checks are now inside enemy/bullet updates that can cause health to drop to 0
}


function gameLoop(timestamp) {
    // Calculate deltaTime - essential for smooth, frame-rate independent movement
    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000; // deltaTime in seconds
    lastFrameTime = timestamp;
    // Clamp deltaTime to prevent physics explosions if frame rate drops significantly
    deltaTime = Math.min(deltaTime, 0.1); // Max 100ms update step

    // --- Update Game State ---
    // Update only runs if gameState is 'playing' (checked inside update function)
    update(deltaTime);

    // --- Draw Frame ---
    // Drawing should happen regardless of gameState to show menus, pause screen, etc.
    if (typeof draw === 'function') {
        draw(); // Call the main drawing function in drawing.js
    } else {
        console.error("Draw function is not defined!");
    }

    // Request the next frame if the game isn't permanently stopped
    if (gameState !== 'gameOver') {
         // Ensure previous frame ID is cleared before requesting a new one
         // (Might not be strictly necessary with modern browsers, but good practice)
         if (animationFrameId) { animationFrameId = null; }
         animationFrameId = requestAnimationFrame(gameLoop);
    } else {
         // Ensure loop stops cleanly on game over
         if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
         }
    }
}

// --- Initialization and Event Listeners ---
function init() {
    console.log("[init] Initializing Game v3...");
    // <<< GARANTIR ESTADO INICIAL CORRETO ANTES DE QUALQUER COISA >>>
    gameState = 'start';
    previousGameState = 'start';
    console.log(`[init] Initial gameState set to: ${gameState}`);

    // Critical check for canvas
    if (!canvas || !ctx) {
        console.error("[init] Canvas or Context not found! Game cannot start.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center;">Error: Could not initialize Canvas.</h1>';
        return; // Stop initialization
    }

    // Initial setup calls
    resizeCanvas(); // Set initial canvas size
    loadGameData(); // Load saved progress (cash, upgrades)

    // --- Setup Event Listeners ---
    console.log("[init] Setting up event listeners...");

    // Botões da Tela Inicial
    if (startBtn) startBtn.addEventListener('click', startGame); else console.warn("Start button not found");
    if (startShopBtn) startShopBtn.addEventListener('click', openShopOverlay); else console.warn("Start Shop button (start screen) not found");

    // Botão "Voltar" da Loja (listener inicial para a loja da tela inicial)
    if (closeShopOverlayBtn) {
        closeShopOverlayBtn.onclick = closeShopOverlay; // Correct initial assignment
    } else { console.warn("Close Shop 'Voltar' button not found"); }

    // Botão 'X' da Loja (NOVO)
    if (shopCloseButtonX) {
        shopCloseButtonX.addEventListener('click', () => {
            console.log(`[shopCloseButtonX clicked] Current state: ${gameState}`);
            // Determine which close function to call based on current state
            if (gameState === 'shoppingOverlay') {
                closeShopOverlay();
            } else if (gameState === 'inGameShop') {
                closeInGameShop();
            } else {
                 console.warn(`[shopCloseButtonX clicked] Clicked in unexpected state: ${gameState}`);
                 // Optional: Force close any potentially visible overlay?
                 if(shopOverlay) shopOverlay.classList.remove('visible');
                 if(pauseMenu) pauseMenu.classList.remove('visible');
                 // Avoid changing state if unsure
            }
        });
    } else { console.warn("Shop 'X' Close button not found"); }

    // Clique Fora da Loja (NOVO)
    if (shopOverlay) {
        shopOverlay.addEventListener('click', (event) => {
            // Check if the click was directly on the overlay background
            if (event.target === shopOverlay) {
                console.log(`[shopOverlay background clicked] Current state: ${gameState}`);
                 if (gameState === 'shoppingOverlay') {
                    closeShopOverlay();
                } else if (gameState === 'inGameShop') {
                    closeInGameShop();
                } else {
                    console.warn(`[shopOverlay background clicked] Clicked in unexpected state: ${gameState}`);
                }
            }
        });
    } else { console.warn("Shop overlay element not found for background click listener."); }

    // Botão de Restart (Game Over)
    if (restartBtn) restartBtn.addEventListener('click', restartGame); else console.warn("Restart button not found");

    // Botões In-Game
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause); else console.warn("Pause button not found");
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause); else console.warn("Resume button not found");
    if (inGameShopBtn) {
        inGameShopBtn.onclick = openInGameShop; // Set initial listener
    } else { console.warn("In-Game Shop button not found"); }

    // Canvas Input Listeners (Using Pointer Events)
    if (canvas) {
        canvas.addEventListener('pointermove', (e) => {
            if (gameState === 'playing') {
                e.preventDefault();
                updateAimPosition(e);
            }
        });
        canvas.addEventListener('pointerdown', (e) => {
            if (gameState === 'playing') {
                e.preventDefault();
                updateAimPosition(e);
                shootBullet(); // Shoot on down press
            }
        });
        // Prevent context menu on long press/right click
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    } else { console.error("[init] Canvas element not found for input listeners."); }

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase(); // Normalize key to lowercase

        // Escape Key Logic
        if (key === 'escape') {
            e.preventDefault();
            console.log(`[keydown:Escape] Current state: ${gameState}`);
            if (gameState === 'inGameShop') { closeInGameShop(); }
            else if (gameState === 'shoppingOverlay') { closeShopOverlay(); }
            else if (gameState === 'playing' || gameState === 'paused') { togglePause(); }
        }

        // P Key for Pause (alternative)
        if (key === 'p') {
             if (gameState === 'playing' || gameState === 'paused') {
                 e.preventDefault();
                 togglePause();
             }
        }

        // --- Hotkeys during 'playing' state ---
        if (gameState === 'playing') {
            // Upgrade Hotkeys (1-9 for visible items in the panel)
            if (e.key >= '1' && e.key <= '9') {
                 e.preventDefault();
                 let targetVisibleIndex = parseInt(e.key) - 1; // 0-based index
                 let currentVisibleIndex = 0;
                 let actualUpgradeIndex = -1;

                 // Iterate through upgrades, considering visibility rules
                 for(let i=0; i<upgrades.length; i++){
                     const upg = upgrades[i];
                     if (!upg) continue; // Safety check
                     // Skip upgrades hidden due to requirements
                     if (upg.requiresShield && !player.shieldUnlocked) continue;

                     // If this visible upgrade matches the target index, store its actual array index
                     if(currentVisibleIndex === targetVisibleIndex){
                         actualUpgradeIndex = i;
                         break;
                     }
                     currentVisibleIndex++; // Increment visible index only for items that would show
                 }

                  // If a valid upgrade was found, attempt purchase
                  if(actualUpgradeIndex !== -1) {
                      console.log(`Hotkey ${e.key} pressed, attempting purchase for upgrade index ${actualUpgradeIndex}`);
                      buyUpgradeByIndex(actualUpgradeIndex);
                  } else {
                      console.log(`Hotkey ${e.key} pressed, but no corresponding visible upgrade found.`);
                  }
             }

            // Nanobot Deploy Hotkey (B)
            if (key === 'b') {
                 e.preventDefault();
                 deployNanoBot(); // Handles cost check internally
            }

            // Shield Activation Hotkey (Space or S)
            if (e.key === ' ' || key === 's') {
                e.preventDefault();
                activateShield();
            }
        } // End 'playing' state hotkeys
    });
    console.log("[init] Event listeners set.");

    // Initial UI Updates and State Setup
    console.log("[init] Updating initial UI states...");
    updateCashDisplay(); updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();

    // <<< GARANTIR QUE APENAS A TELA INICIAL ESTÁ VISÍVEL >>>
    if(startScreen) startScreen.classList.add('visible'); else console.warn("Start screen not found");
    if(gameOverElement) gameOverElement.classList.remove('visible'); else console.warn("Game Over element not found");
    if(pauseMenu) pauseMenu.classList.remove('visible'); else console.warn("Pause menu not found");
    if(shopOverlay) {
        // Double-check removal of visibility
        shopOverlay.classList.remove('visible');
        console.log("[init] Shop overlay visibility explicitly removed.");
    } else { console.warn("Shop overlay not found"); }

    // Hide in-game buttons initially
    if(pauseBtn) pauseBtn.style.display = 'none';
    if(inGameShopBtn) inGameShopBtn.style.display = 'none';

    hideUpgradePanel(); // Ensure upgrade panel is hidden
    console.log("[init] Initial UI update complete.");

    console.log(`[init] Final gameState before exiting init: ${gameState}`); // Should be 'start'
    console.log("[init] Initialization Complete. Ready.");
    // Game loop does NOT start here. It starts when 'startGame' is called.
}

// --- Start the Game Initialization on DOM Load ---
document.addEventListener('DOMContentLoaded', init);