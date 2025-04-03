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
    if (gameState === 'playing' || gameState === 'waveIntermission') {
        const text = bossActive ? "BOSS" : `Enemies: ${enemiesRemainingInWave}`;
        enemiesRemainingElement.textContent = text;
        enemiesRemainingElement.style.display = 'block';
    } else {
        enemiesRemainingElement.style.display = 'none';
    }
}

// --- Menu / Panel Visibility ---
function showUpgradePanel() {
    if (!upgradePanel) return;
    upgradePanel.style.display = 'block';
    requestAnimationFrame(() => { upgradePanel.style.opacity = '1'; });
}
function hideUpgradePanel() {
    if (!upgradePanel) return;
    upgradePanel.style.opacity = '0';
    setTimeout(() => { if (upgradePanel.style.opacity === '0') upgradePanel.style.display = 'none'; }, 300);
}
function togglePause() {
    if (!pauseMenu || !pauseBtn) return;
    if (gameState === 'playing') {
        gameState = 'paused'; pauseMenu.classList.add('visible');
        if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
        hideUpgradePanel(); pauseBtn.textContent = 'Resume';
        console.log("Game Paused"); // Debug log
    } else if (gameState === 'paused') {
        gameState = 'playing'; pauseMenu.classList.remove('visible');
        lastFrameTime = performance.now(); // Reset dt timer! IMPORTANT!
        if (!animationFrameId) requestAnimationFrame(gameLoop); // Restart loop ONLY if not already running
        showUpgradePanel(); pauseBtn.textContent = 'Pause';
        console.log("Game Resumed"); // Debug log
    }
}
function gameOver() {
    if (!gameOverElement || !finalCashElement || !pauseBtn) return;
    gameState = 'gameOver';
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    finalCashElement.textContent = `Final Cash: ${cash}`;
    gameOverElement.classList.add('visible');
    pauseBtn.style.display = 'none';
    hideUpgradePanel(); updateEnemiesRemainingUI(); saveGameData();
}
function restartGame() {
    if (!gameOverElement || !startScreen) return;
    gameOverElement.classList.remove('visible'); startScreen.classList.add('visible');

    health = 100; currentWave = 0; bossActive = false;
    enemies = []; bullets = []; particles = []; powerups = []; nanoBots = []; convertedBullets = [];
    player.activePowerups = {}; player.shieldActive = false; player.shieldState = 'inactive'; player.shieldTimer = 0; player.lastBulletTime = 0;
    enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0;
    waveTimer = 0; lastEnemySpawnTime = 0; currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
    shakeIntensity = 0; shakeDuration = 0; shakeOffsetX = 0; shakeOffsetY = 0;

    loadGameData(); resizeCanvas();
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI(); updateCashDisplay();
    gameState = 'start';
}
function startGame() {
    if (!startScreen || !pauseBtn) return;
    gameState = 'playing'; startScreen.classList.remove('visible');
    pauseBtn.style.display = 'block'; pauseBtn.textContent = 'Pause';

    currentWave = 0; enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0; lastEnemySpawnTime = 0;

    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();
    showUpgradePanel(); updateUpgradeUI();
    startNextWave(); // Start wave 1 sequence

    lastFrameTime = performance.now();
    if (!animationFrameId) requestAnimationFrame(gameLoop); // Start loop
}

// --- Shop Overlay Logic ---
function openShopOverlay() {
    if (gameState !== 'start' || !shopOverlay || !startScreen) return;
    gameState = 'shoppingOverlay'; updateShopOverlayUI();
    startScreen.classList.remove('visible'); shopOverlay.classList.add('visible');
}
function closeShopOverlay() {
    if (gameState !== 'shoppingOverlay' || !shopOverlay || !startScreen) return;
    gameState = 'start'; shopOverlay.classList.remove('visible');
    startScreen.classList.add('visible');
}
function updateShopOverlayUI() {
    if (!shopCashOverlayElement || !shopItemsContainerOverlay) return;
    shopCashOverlayElement.textContent = `Cash: ${cash}`;
    shopItemsContainerOverlay.innerHTML = '';
    upgrades.forEach((upgrade) => {
        // Exclude the consumable nanobot purchase from the permanent shop
        if (upgrade.id === 'nanobot') return;
        if (upgrade.requiresShield && !player.shieldUnlocked) return;
        const itemDiv = createShopOverlayItem(upgrade);
        if (itemDiv) shopItemsContainerOverlay.appendChild(itemDiv);
    });
}

// --- Upgrade Creation & Purchase Logic ---
function calculateUpgradeCost(baseCost, level) { return Math.floor(baseCost * Math.pow(1.3, level)); }

function getUpgradeLevel(upgrade) {
    if (!upgrade?.levelKey) return 0;
    return player[upgrade.levelKey] || 0;
}

// --- Modified createUpgradeItem ---
function createUpgradeItem(upgrade, index) { // For In-Game Panel
    if (!upgrade) return null;
    const upgradeDiv = document.createElement('div');
    upgradeDiv.classList.add('upgradeItem');

    const isNanobotPurchase = upgrade.id === 'nanobot';
    const currentLevel = isNanobotPurchase ? 0 : getUpgradeLevel(upgrade); // Nanobot has no level
    const isMaxed = !isNanobotPurchase && upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = !isNanobotPurchase && upgrade.isPurchased && upgrade.isPurchased(); // One-time unlocks like shield
    const cost = upgrade.cost; // Use direct cost (Nanobot cost is fixed, others calculate below if needed)
    const finalCost = isNanobotPurchase ? cost : (isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(cost, currentLevel) : cost));
    const canAfford = cash >= finalCost;

    let levelDisplay = "";
    if (!isNanobotPurchase && upgrade.levelKey && !isPurchased) {
        levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`;
    }

    let buttonText = 'Buy';
    let buttonDisabled = false;

    if (isNanobotPurchase) {
        buttonText = 'Deploy';
        buttonDisabled = !canAfford; // Only disable if cannot afford
    } else { // Regular Upgrades
        if (isPurchased) { buttonText = 'Owned'; buttonDisabled = true; }
        else if (isMaxed) { buttonText = 'Maxed'; buttonDisabled = true; }
        else if (!canAfford) { buttonDisabled = true; }
        // else: Buy button, enabled
    }

    upgradeDiv.innerHTML = `
        <div class="info">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            ${(isPurchased || isMaxed) && !isNanobotPurchase ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
            <span class="details">${upgrade.description}</span>
        </div>
        <button data-index="${index}" ${buttonDisabled ? 'disabled' : ''}>
            ${buttonText}
        </button>`;

    if (isMaxed) upgradeDiv.classList.add('maxed');
    if (isPurchased) upgradeDiv.classList.add('purchased');

    const button = upgradeDiv.querySelector('button');
    if (button && !buttonDisabled) { // Attach listener only if enabled
        if (isNanobotPurchase) {
            button.onclick = () => buyNanoBotUpgrade(); // Specific handler for nanobot button
        } else {
            button.onclick = () => buyUpgradeByIndex(index); // Handler for regular upgrades
        }
    } else if (button) {
        button.onclick = null; // Ensure no listener if disabled
    }
    return upgradeDiv;
}


function createShopOverlayItem(upgrade) { // For Shop Overlay
    if (!upgrade || upgrade.id === 'nanobot') return null; // Exclude nanobot consumable
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('shopItemOverlay');

    const currentLevel = getUpgradeLevel(upgrade);
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = upgrade.cost;
    const finalCost = isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(cost, currentLevel) : cost);
    const canAfford = cash >= finalCost;
    let levelDisplay = upgrade.levelKey && !isPurchased ? (isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`) : "";

    itemDiv.innerHTML = `
        <div class="description">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            <span class="details">${upgrade.description}</span>
        </div>
        ${isPurchased || isMaxed ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
        <button data-id="${upgrade.id}" ${isMaxed || isPurchased || !canAfford ? 'disabled' : ''}>
             ${isPurchased ? 'Owned' : (isMaxed ? 'Maxed' : 'Buy')}
        </button>`;
    if (isMaxed) itemDiv.classList.add('maxed');
    if (isPurchased) itemDiv.classList.add('purchased');
    const button = itemDiv.querySelector('button');
    if (button && !isPurchased && !isMaxed) button.onclick = () => buyUpgradeById(upgrade.id);
    else if (button) button.onclick = null;
    return itemDiv;
}

function updateUpgradeUI() { // Updates BOTH panels' content
    if (!upgradeItemsContainer) return;
    upgradeItemsContainer.innerHTML = '';
    let visibleIndex = 0;
    upgrades.forEach((upg) => {
        if (upg.requiresShield && !player.shieldUnlocked) return;
        const item = createUpgradeItem(upg, visibleIndex);
        if(item) { upgradeItemsContainer.appendChild(item); visibleIndex++; }
    });
    if (gameState === 'shoppingOverlay') updateShopOverlayUI();
}

// General purchase logic for leveled/permanent upgrades
function buyUpgrade(upgrade) {
    if (!upgrade || upgrade.id === 'nanobot') { console.warn("buyUpgrade: Invalid upgrade passed."); return; } // Don't use this for nanobot button

    const currentLevel = getUpgradeLevel(upgrade);
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = upgrade.cost;
    const finalCost = isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(cost, currentLevel) : cost);

    if (isPurchased || isMaxed) { console.log(`Upgrade "${upgrade.name}" owned/maxed.`); return; }
    if (cash < finalCost) { console.log(`Cannot afford "${upgrade.name}". Need ${finalCost}.`); return; }

    cash -= finalCost;
    let nextLevel = currentLevel + 1;

    if (upgrade.action) upgrade.action(nextLevel); // Pass the *new* level
    else if(upgrade.levelKey) player[upgrade.levelKey] = nextLevel; // Fallback
    else console.warn(`Upgrade "${upgrade.name}" has no action/levelKey.`);

    console.log(`Bought: ${upgrade.name}, Lvl: ${upgrade.levelKey ? nextLevel : 'N/A'}, Cash: ${cash}`);
    updateCashDisplay(); updateUpgradeUI(); saveGameData();
}

// --- Specific purchase handler for Nanobot Button ---
function buyNanoBotUpgrade() {
    if (cash < NANO_BOT_DEPLOY_COST) {
        console.log("Cannot afford Nanobot deployment.");
        // Optional: Add visual feedback (e.g., flash cost red)
        return;
    }
    cash -= NANO_BOT_DEPLOY_COST;
    updateCashDisplay();
    saveGameData(); // Save immediately after purchase
    deployNanoBot(); // Call the function to actually create the bot
    updateUpgradeUI(); // Update panel to reflect potentially changed disabled state
    console.log("Bought Nanobot via UI.");
}


function buyUpgradeByIndex(visibleIndex) {
    let actualIndex = -1; let count = 0;
    for (let i = 0; i < upgrades.length; i++) {
        // Skip nanobot button for index mapping
        if (upgrades[i].id === 'nanobot') continue;
        if (!(upgrades[i].requiresShield && !player.shieldUnlocked)) {
            if (count === visibleIndex) { actualIndex = i; break; }
            count++;
        }
    }
    if (actualIndex !== -1) buyUpgrade(upgrades[actualIndex]); // Use general buy function
    else console.warn(`buyUpgradeByIndex: Index ${visibleIndex} not found for standard upgrade.`);
}

function buyUpgradeById(id) {
    const upgrade = upgrades.find(upg => upg.id === id);
    // Ensure it's not the nanobot button being bought via the permanent shop
    if (upgrade && upgrade.id !== 'nanobot') buyUpgrade(upgrade);
    else if (upgrade && upgrade.id === 'nanobot') console.warn(`buyUpgradeById: Nanobot purchase attempted through permanent shop.`);
    else console.warn(`buyUpgradeById: ID ${id} not found.`);
}