
// --- UI Update Functions ---
function updateCashDisplay() { if (cashElement) cashElement.textContent = `Cash: ${cash}`; }
function updateHealthDisplay() {
    if (!healthElement) return;
    healthElement.textContent = `Health: ${Math.max(0, Math.ceil(health))}`;
    const healthPerc = health / 100;
    healthElement.style.color = healthPerc > 0.5 ? '#FFFFFF' : (healthPerc > 0.25 ? '#FFEB3B' : '#F44336');
}
function updateWaveDisplay() { if (waveIndicatorElement) waveIndicatorElement.textContent = `Wave: ${currentWave}`; }
function updateEnemiesRemainingUI() {
    if (!enemiesRemainingElement) return;
    // Show during more states, including pause and in-game shop
    if (gameState === 'playing' || gameState === 'waveIntermission' || gameState === 'paused' || gameState === 'inGameShop') {
        let text = bossActive ? "BOSS" : `Enemies: ${enemiesRemainingInWave}`;
        if (nanoBots.length > 0) { text += ` | Bots: ${nanoBots.length}`; }
        enemiesRemainingElement.textContent = text;
        enemiesRemainingElement.style.display = 'block';
    } else {
        enemiesRemainingElement.style.display = 'none';
    }
}

// --- Menu / Panel Visibility ---
function showUpgradePanel() {
    if (!upgradePanel || gameState === 'paused' || gameState === 'inGameShop') return; // Don't show if paused or in shop
    updateUpgradeUI(); // Update content before showing
    upgradePanel.style.display = 'block';
    requestAnimationFrame(() => { upgradePanel.style.opacity = '1'; });
}
function hideUpgradePanel() {
    if (!upgradePanel) return;
    upgradePanel.style.opacity = '0';
    upgradePanel.addEventListener('transitionend', () => {
        if (upgradePanel.style.opacity === '0') {
            upgradePanel.style.display = 'none';
        }
    }, { once: true });
}

function togglePause() {
    if (!pauseMenu || !pauseBtn || !inGameShopBtn) return;

    if (gameState === 'playing') {
        console.log("[togglePause] Pausing game.");
        previousGameState = gameState;
        gameState = 'paused';
        pauseMenu.classList.add('visible');
        if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
        hideUpgradePanel();
        pauseBtn.textContent = 'Resume';
        inGameShopBtn.style.display = 'none'; // Hide shop button when paused

    } else if (gameState === 'paused') {
        console.log("[togglePause] Resuming game from pause.");
        gameState = 'playing'; // Always return to playing from normal pause
        pauseMenu.classList.remove('visible');
        lastFrameTime = performance.now();
        if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
        showUpgradePanel();
        pauseBtn.textContent = 'Pause';
        inGameShopBtn.style.display = 'block'; // Show shop button again

    } else {
        console.warn(`[togglePause] Called in unexpected state: ${gameState}`);
    }
}

// --- In-Game Shop Logic ---
function openInGameShop() {
    // Only allow opening from 'playing' state
    if (gameState !== 'playing') {
        console.warn(`[openInGameShop] Attempted to open from state: ${gameState}`);
        return;
    }
    if (!shopOverlay || !inGameShopBtn || !closeShopOverlayBtn) return;
    console.log("[openInGameShop] Opening in-game shop...");

    previousGameState = gameState; // Store 'playing' state
    gameState = 'inGameShop'; // Set specific state

    // Pause game loop
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;

    updateShopOverlayUI(); // Populate the main shop overlay
    shopOverlay.classList.add('visible'); // Show the main shop overlay

    // Change the "Voltar" button's action to close the *in-game* shop
    closeShopOverlayBtn.onclick = closeInGameShop;

    // Update UI elements
    hideUpgradePanel();
    pauseBtn.style.display = 'none'; // Hide normal pause button
    inGameShopBtn.textContent = 'Close Shop'; // Change button text
    inGameShopBtn.onclick = closeInGameShop; // Make this button also close the shop

    console.log("[openInGameShop] State changed to 'inGameShop', game paused.");
}

function closeInGameShop() {
    // Only allow closing from 'inGameShop' state
    if (gameState !== 'inGameShop') {
         console.warn(`[closeInGameShop] Attempted to close from state: ${gameState}`);
         return;
    }
    if (!shopOverlay || !inGameShopBtn || !pauseBtn || !closeShopOverlayBtn) return;
    console.log("[closeInGameShop] Closing in-game shop...");

    shopOverlay.classList.remove('visible'); // Hide the shop overlay
    gameState = 'playing'; // Return to playing state

    // Resume game loop
    lastFrameTime = performance.now();
    if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);

    // Restore UI elements
    showUpgradePanel();
    pauseBtn.style.display = 'block'; // Show normal pause button
    inGameShopBtn.textContent = 'Shop'; // Restore button text
    inGameShopBtn.onclick = openInGameShop; // Restore button action

    // Restore the "Voltar" button's action for the start screen shop
    closeShopOverlayBtn.onclick = closeShopOverlay;

    console.log("[closeInGameShop] State changed to 'playing', game resumed.");
}


function gameOver() {
    if (gameState === 'gameOver') return;
    if (!gameOverElement || !finalCashElement || !pauseBtn || !inGameShopBtn) return;

    console.log("--- GAME OVER ---");
    previousGameState = gameState;
    gameState = 'gameOver';
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;

    finalCashElement.textContent = `Final Cash: ${cash}`;
    gameOverElement.classList.add('visible');
    pauseBtn.style.display = 'none';
    inGameShopBtn.style.display = 'none';
    hideUpgradePanel();
    updateEnemiesRemainingUI(); // Update one last time
    // Consider clearing intervals/timeouts if any exist
    saveGameData();
}

function restartGame() {
    if (!gameOverElement || !startScreen || !inGameShopBtn || !pauseBtn || !closeShopOverlayBtn) return;

    console.log("[restartGame] Restarting game...");
    // Hide all overlays except start screen
    gameOverElement.classList.remove('visible');
    shopOverlay.classList.remove('visible');
    pauseMenu.classList.remove('visible');
    startScreen.classList.add('visible');

    // Reset game variables
    health = 100; cash = 0; // Reset cash too? Or load from storage? Let's load.
    currentWave = 0; bossActive = false;
    enemies = []; bullets = []; particles = []; powerups = []; nanoBots = []; convertedBullets = []; enemyBullets = []; damageNumbers = [];
    player.activePowerups = {}; player.shieldState = 'inactive'; player.shieldTimer = 0; player.lastBulletTime = 0;
    enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0;
    waveTimer = 0; waveClearMessageTimer = 0; lastEnemySpawnTime = 0; currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
    shakeIntensity = 0; shakeDuration = 0; shakeOffsetX = 0; shakeOffsetY = 0;

    // Reset UI elements and button states
    inGameShopBtn.style.display = 'none';
    inGameShopBtn.textContent = 'Shop';
    inGameShopBtn.onclick = openInGameShop; // Ensure correct initial listener
    pauseBtn.style.display = 'none';
    pauseBtn.textContent = 'Pause';
    closeShopOverlayBtn.onclick = closeShopOverlay; // Ensure correct initial listener for start screen shop

    loadGameData(); // Load persistent upgrades/cash AFTER resetting volatile vars
    resizeCanvas();
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI(); updateCashDisplay();
    hideUpgradePanel();

    previousGameState = 'start';
    gameState = 'start'; // Set the correct initial state
    console.log("[restartGame] Game reset to 'start' state.");
}

function startGame() {
    // Strict check for 'start' state
    if (gameState !== 'start') {
        console.warn(`[startGame] Attempted to start game from state: ${gameState}. Aborting.`);
        // Force reset to start state? Or just log? Let's just log for now.
        // If the shop is incorrectly visible, this prevents starting.
        // We need to find WHY the state is wrong initially.
        return;
    }
    if (!startScreen || !pauseBtn || !inGameShopBtn) return;

    console.log("[startGame] Starting game...");
    previousGameState = gameState; // Store 'start'
    gameState = 'playing'; // Set to 'playing'
    console.log(`[startGame] Game state changed to: ${gameState}`);

    startScreen.classList.remove('visible');

    // Show in-game UI buttons
    pauseBtn.style.display = 'block';
    pauseBtn.textContent = 'Pause';
    inGameShopBtn.style.display = 'block';
    inGameShopBtn.textContent = 'Shop';
    inGameShopBtn.onclick = openInGameShop;

    // Reset wave-specific variables
    currentWave = 0; enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0; lastEnemySpawnTime = 0; waveTimer = 0; waveClearMessageTimer = 0; bossActive = false;
    enemies = []; bullets = []; // Clear arrays

    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();
    showUpgradePanel();

    startNextWave(); // Start the first wave process

    lastFrameTime = performance.now();
    if (!animationFrameId) {
        console.log("[startGame] Requesting animation frame...");
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
         console.warn("[startGame] Animation frame ID already exists?");
    }
}

// --- Shop Overlay Logic (Start Screen Shop) ---
function openShopOverlay() {
    // This is the shop accessed from the START SCREEN
    if (gameState !== 'start') {
        console.warn(`[openShopOverlay] Attempted to open start screen shop from state: ${gameState}`);
        return;
    }
    if (!shopOverlay || !startScreen || !closeShopOverlayBtn) return;
    console.log("[openShopOverlay] Opening start screen shop...");

    previousGameState = gameState;
    gameState = 'shoppingOverlay'; // Different state from in-game shop
    updateShopOverlayUI(); // Populate the shop

    // Ensure the "Voltar" button calls the correct close function
    closeShopOverlayBtn.onclick = closeShopOverlay;

    startScreen.classList.remove('visible');
    shopOverlay.classList.add('visible'); // Show the shop
    console.log("[openShopOverlay] State changed to 'shoppingOverlay'");
}

function closeShopOverlay() {
    // This closes the shop accessed from the START SCREEN
    if (gameState !== 'shoppingOverlay') {
        console.warn(`[closeShopOverlay] Attempted to close start screen shop from state: ${gameState}`);
        // If called incorrectly (e.g., from inGameShop state due to listener issue), try to recover
        if (gameState === 'inGameShop') {
            console.warn("[closeShopOverlay] Incorrectly called, redirecting to closeInGameShop...");
            closeInGameShop();
            return;
        }
        // Otherwise, if state is totally unexpected, maybe force back to start?
        // For now, just prevent closing if state isn't right.
        return;
    }
    if (!shopOverlay || !startScreen) return;
    console.log("[closeShopOverlay] Closing start screen shop...");

    gameState = 'start'; // Return to start screen state
    shopOverlay.classList.remove('visible');
    startScreen.classList.add('visible');
    console.log("[closeShopOverlay] State changed to 'start'");
}

function updateShopOverlayUI() {
    if (!shopCashOverlayElement || !shopItemsContainerOverlay) return;
    shopCashOverlayElement.textContent = `Cash: ${cash}`;
    shopItemsContainerOverlay.innerHTML = '';

    const permanentUpgrades = upgrades.filter(upgrade => upgrade && upgrade.id !== 'nanobot');

    permanentUpgrades.forEach((upgrade) => {
        if (upgrade.requiresShield && !player.shieldUnlocked) return;
        const itemDiv = createShopOverlayItem(upgrade);
        if (itemDiv) shopItemsContainerOverlay.appendChild(itemDiv);
    });
}

// --- Upgrade Creation & Purchase Logic ---
// (calculateUpgradeCost, getUpgradeLevel - unchanged from previous correct version)
function calculateUpgradeCost(baseCost, level) { return Math.floor(baseCost * Math.pow(1.35, level)); }
function getUpgradeLevel(upgrade) { if (!upgrade?.levelKey) return 0; return player[upgrade.levelKey] || 0; }

function createUpgradeItem(upgrade, actualIndex) { // IN-GAME PANEL item
    if (!upgrade) return null;
    const upgradeDiv = document.createElement('div');
    upgradeDiv.classList.add('upgradeItem');
    upgradeDiv.classList.remove('cannotAfford', 'purchased', 'maxed'); // Reset classes

    const isNanobotPurchase = upgrade.id === 'nanobot';
    const isUnlockable = !upgrade.levelKey && typeof upgrade.isPurchased === 'function';
    let currentLevel = 0; let isMaxed = false; let isPurchased = false; let finalCost = upgrade.cost;

    if (isNanobotPurchase) { finalCost = NANO_BOT_DEPLOY_COST; }
    else if (isUnlockable) { isPurchased = upgrade.isPurchased(); isMaxed = isPurchased; finalCost = isPurchased ? 0 : upgrade.cost; }
    else if (upgrade.levelKey) { currentLevel = getUpgradeLevel(upgrade); isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel; finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel); }

    const canAfford = cash >= finalCost;
    let levelDisplay = "";
    if (!isNanobotPurchase && !isUnlockable && upgrade.levelKey) { levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`; }

    let buttonText = 'Buy'; let buttonDisabled = false;
    if (isNanobotPurchase) { buttonText = 'Deploy'; buttonDisabled = !canAfford; if (!canAfford) upgradeDiv.classList.add('cannotAfford'); }
    else if (isPurchased) { buttonText = 'Owned'; buttonDisabled = true; upgradeDiv.classList.add('purchased'); }
    else if (isMaxed) { buttonText = 'Maxed'; buttonDisabled = true; upgradeDiv.classList.add('maxed'); }
    else if (!canAfford) { buttonText = 'Buy'; buttonDisabled = true; upgradeDiv.classList.add('cannotAfford');} // Keep text 'Buy' but disable

    upgradeDiv.innerHTML = `
        <div class="info">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            ${(isPurchased || isMaxed || isNanobotPurchase) ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
            ${isNanobotPurchase ? `<span class="cost">Cost: ${finalCost}</span>` : ''}
            <span class="details">${upgrade.description}</span>
        </div>
        <button data-index="${actualIndex}" ${buttonDisabled ? 'disabled' : ''}>
            ${buttonText}
        </button>`;

    const button = upgradeDiv.querySelector('button');
    if (button && !buttonDisabled) {
        if (isNanobotPurchase) { button.onclick = () => deployNanoBot(); }
        else { button.onclick = () => buyUpgradeByIndex(actualIndex); }
    } else if (button) { button.onclick = null; }
    return upgradeDiv;
}

function createShopOverlayItem(upgrade) { // SHOP OVERLAY item
    if (!upgrade || upgrade.id === 'nanobot') return null;
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('shopItemOverlay');
     itemDiv.classList.remove('cannotAfford', 'purchased', 'maxed'); // Reset classes

    const isUnlockable = !upgrade.levelKey && typeof upgrade.isPurchased === 'function';
    let currentLevel = 0; let isMaxed = false; let isPurchased = false; let finalCost = upgrade.cost;

    if (isUnlockable) { isPurchased = upgrade.isPurchased(); isMaxed = isPurchased; finalCost = isPurchased ? 0 : upgrade.cost; }
    else if (upgrade.levelKey) { currentLevel = getUpgradeLevel(upgrade); isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel; finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel); }

    const canAfford = cash >= finalCost;
    let levelDisplay = "";
    if (!isUnlockable && upgrade.levelKey) { levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`; }

    let buttonText = 'Buy'; let buttonDisabled = false;
    if (isPurchased) { buttonText = 'Owned'; buttonDisabled = true; itemDiv.classList.add('purchased'); }
    else if (isMaxed) { buttonText = 'Maxed'; buttonDisabled = true; itemDiv.classList.add('maxed'); }
    else if (!canAfford) { buttonText = 'Buy'; buttonDisabled = true; itemDiv.classList.add('cannotAfford');} // Keep text 'Buy'

    itemDiv.innerHTML = `
        <div class="description">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            <span class="details">${upgrade.description}</span>
        </div>
        ${(isPurchased || isMaxed) ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
        <button data-id="${upgrade.id}" ${buttonDisabled ? 'disabled' : ''}>
             ${buttonText}
        </button>`;

    const button = itemDiv.querySelector('button');
    if (button && !buttonDisabled) { button.onclick = () => buyUpgradeById(upgrade.id); }
    else if (button) { button.onclick = null; }
    return itemDiv;
}

function updateUpgradeUI() { // Updates In-Game Panel content ONLY
    if (!upgradeItemsContainer) return;
    upgradeItemsContainer.innerHTML = '';
    upgrades.forEach((upg, actualIndex) => {
        if (!upg) return;
        if (upg.requiresShield && !player.shieldUnlocked) return;
        const item = createUpgradeItem(upg, actualIndex);
        if(item) upgradeItemsContainer.appendChild(item);
    });
}

function displayCannotAfford(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    const cost = upgrade?.cost || NANO_BOT_DEPLOY_COST; // Get cost
    console.log(`Cannot afford "${upgrade?.name}". Need ${cost}, Have ${cash}`);

    // Find button in either panel or overlay
    const buttonInPanel = upgradeItemsContainer?.querySelector(`button[data-index='${upgrades.findIndex(u => u.id === upgradeId)}']`);
    const buttonInOverlay = shopItemsContainerOverlay?.querySelector(`button[data-id='${upgradeId}']`);
    const button = buttonInPanel || buttonInOverlay; // Prefer panel button if both somehow exist

    if (button) {
        const itemElement = button.closest('.upgradeItem, .shopItemOverlay');
        if (itemElement) {
            itemElement.style.transition = 'background-color 0.1s ease-in-out';
            itemElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Red flash
            setTimeout(() => {
                itemElement.style.backgroundColor = ''; // Reset background
                 // Ensure button is re-disabled visually if needed (though logic prevents click)
                 if (!button.disabled) button.disabled = true;
            }, 200);
        }
    }
}

function buyUpgrade(upgrade) { // General purchase logic
    if (!upgrade || upgrade.id === 'nanobot') { console.warn("buyUpgrade: Invalid or nanobot upgrade passed."); return; }
    const isUnlockable = !upgrade.levelKey && typeof upgrade.isPurchased === 'function';
    let currentLevel = 0; let isMaxed = false; let isPurchased = false; let finalCost = upgrade.cost;

    if (isUnlockable) { isPurchased = upgrade.isPurchased(); isMaxed = isPurchased; finalCost = isPurchased ? 0 : upgrade.cost; }
    else if (upgrade.levelKey) { currentLevel = getUpgradeLevel(upgrade); isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel; finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel); }

    if (isPurchased || isMaxed) { console.log(`Upgrade "${upgrade.name}" already owned/maxed.`); return; }
    if (cash < finalCost) { displayCannotAfford(upgrade.id); return; }

    cash -= finalCost;
    let nextLevel = currentLevel + 1;
    if (upgrade.action) { upgrade.action(nextLevel); console.log(`Bought: ${upgrade.name}, ${upgrade.levelKey ? `Lvl: ${nextLevel}` : 'Unlock'}, Cost: ${finalCost}, Cash: ${cash}`); }
    else { console.warn(`Upgrade "${upgrade.name}" missing action function.`); /* Refund? cash += finalCost; */ }

    updateCashDisplay();
    updateUpgradeUI(); // Update the in-game panel
    if (shopOverlay?.classList.contains('visible')) { updateShopOverlayUI(); } // Update shop overlay if open
    saveGameData();
}

function buyUpgradeByIndex(actualIndex) { // Called by IN-GAME PANEL buttons
     if (actualIndex >= 0 && actualIndex < upgrades.length) {
         const upgrade = upgrades[actualIndex];
         if (!upgrade) { console.warn(`buyUpgradeByIndex: No upgrade found at index ${actualIndex}`); return; }
         if (upgrade.id === 'nanobot') { deployNanoBot(); }
         else { buyUpgrade(upgrade); }
     } else { console.warn(`buyUpgradeByIndex: Invalid index ${actualIndex}`); }
}

function buyUpgradeById(id) { // Called by SHOP OVERLAY buttons
    const upgrade = upgrades.find(upg => upg && upg.id === id);
    if (upgrade && upgrade.id !== 'nanobot') { buyUpgrade(upgrade); }
    else if (upgrade && upgrade.id === 'nanobot') { console.warn(`buyUpgradeById: Nanobot purchase attempted through permanent shop.`); }
    else { console.warn(`buyUpgradeById: ID ${id} not found.`); }
}
