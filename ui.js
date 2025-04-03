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
        let text = bossActive ? "BOSS" : `Enemies: ${enemiesRemainingInWave}`;
        // Add nanobot count display (simple version)
        if (nanoBots.length > 0) {
             text += ` | Bots: ${nanoBots.length}`;
        }
        enemiesRemainingElement.textContent = text;
        enemiesRemainingElement.style.display = 'block';
    } else {
        enemiesRemainingElement.style.display = 'none';
    }
}

// --- Menu / Panel Visibility ---
function showUpgradePanel() {
    if (!upgradePanel) return;
    updateUpgradeUI(); // Update content before showing
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
    } else if (gameState === 'paused') {
        gameState = 'playing'; pauseMenu.classList.remove('visible');
        lastFrameTime = performance.now();
        if (!animationFrameId) requestAnimationFrame(gameLoop);
        showUpgradePanel(); pauseBtn.textContent = 'Pause';
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
    // Reset all game state variables
    health = 100; currentWave = 0; bossActive = false;
    enemies = []; bullets = []; particles = []; powerups = []; nanoBots = []; convertedBullets = []; enemyBullets = []; damageNumbers = [];
    player.activePowerups = {}; player.shieldActive = false; player.shieldState = 'inactive'; player.shieldTimer = 0; player.lastBulletTime = 0;
    // Reset player levels loaded from storage potentially? No, keep persistent upgrades.
    enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0;
    waveTimer = 0; waveClearMessageTimer = 0; lastEnemySpawnTime = 0; currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
    shakeIntensity = 0; shakeDuration = 0; shakeOffsetX = 0; shakeOffsetY = 0;

    loadGameData(); // Reload persistent cash/upgrades
    resizeCanvas();
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI(); updateCashDisplay();
    gameState = 'start';
}
function startGame() {
    if (!startScreen || !pauseBtn) return;
    gameState = 'playing'; startScreen.classList.remove('visible');
    pauseBtn.style.display = 'block'; pauseBtn.textContent = 'Pause';
    currentWave = 0; enemiesRemainingInWave = 0; enemiesToSpawnThisWave = 0; enemiesSpawnedThisWave = 0; lastEnemySpawnTime = 0;
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI();
    showUpgradePanel();
    startNextWave();
    lastFrameTime = performance.now();
    if (!animationFrameId) requestAnimationFrame(gameLoop);
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
function updateShopOverlayUI() { // Excludes consumable nanobot purchase
    if (!shopCashOverlayElement || !shopItemsContainerOverlay) return;
    shopCashOverlayElement.textContent = `Cash: ${cash}`;
    shopItemsContainerOverlay.innerHTML = '';
    upgrades.forEach((upgrade) => {
        if (upgrade.id === 'nanobot') return; // Skip consumable
        if (upgrade.requiresShield && !player.shieldUnlocked) return;
        const itemDiv = createShopOverlayItem(upgrade);
        if (itemDiv) shopItemsContainerOverlay.appendChild(itemDiv);
    });
}

// --- Upgrade Creation & Purchase Logic ---
function calculateUpgradeCost(baseCost, level) { return Math.floor(baseCost * Math.pow(1.35, level)); } // Slightly increased cost scaling

function getUpgradeLevel(upgrade) {
    if (!upgrade?.levelKey) return 0;
    return player[upgrade.levelKey] || 0;
}

function createUpgradeItem(upgrade, index) { // For In-Game Panel
    if (!upgrade) return null;
    const upgradeDiv = document.createElement('div');
    upgradeDiv.classList.add('upgradeItem');

    const isNanobotPurchase = upgrade.id === 'nanobot';
    const isUnlockable = !upgrade.levelKey && upgrade.isPurchased; // Like shield, pierce, explode

    let currentLevel = 0;
    let isMaxed = false;
    let isPurchased = false;
    let finalCost = upgrade.cost; // Base cost

    if (isNanobotPurchase) {
         // Handled below
    } else if (isUnlockable) {
        isPurchased = upgrade.isPurchased();
        isMaxed = isPurchased; // Unlockables are maxed once purchased
        finalCost = isPurchased ? 0 : upgrade.cost;
    } else if (upgrade.levelKey) { // Leveled upgrade
        currentLevel = getUpgradeLevel(upgrade);
        isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
        finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel);
    }

    const canAfford = cash >= finalCost;
    let levelDisplay = "";
    if (!isNanobotPurchase && !isUnlockable && upgrade.levelKey) { // Only show level for actual leveled upgrades
        levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`;
    }

    let buttonText = 'Buy'; let buttonDisabled = false;
    if (isNanobotPurchase) { buttonText = 'Deploy'; buttonDisabled = !canAfford; }
    else if (isPurchased) { buttonText = 'Owned'; buttonDisabled = true; }
    else if (isMaxed) { buttonText = 'Maxed'; buttonDisabled = true; }
    else if (!canAfford) { buttonDisabled = true; } // Can't afford buyable upgrade

    upgradeDiv.innerHTML = `
        <div class="info">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            ${(isPurchased || isMaxed) ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
            <span class="details">${upgrade.description}</span>
        </div>
        <button data-index="${index}" ${buttonDisabled ? 'disabled' : ''}>
            ${buttonText}
        </button>`;
    if (isMaxed) upgradeDiv.classList.add('maxed'); // Includes purchased unlockables
    const button = upgradeDiv.querySelector('button');
    if (button && !buttonDisabled) {
        if (isNanobotPurchase) button.onclick = () => buyNanoBotUpgrade();
        else button.onclick = () => buyUpgradeByIndex(index);
    } else if (button) button.onclick = null;
    return upgradeDiv;
}

function createShopOverlayItem(upgrade) { // For Shop Overlay
    if (!upgrade || upgrade.id === 'nanobot') return null; // Exclude consumable
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('shopItemOverlay');

    const isUnlockable = !upgrade.levelKey && upgrade.isPurchased;
    let currentLevel = 0; let isMaxed = false; let isPurchased = false; let finalCost = upgrade.cost;

    if (isUnlockable) { isPurchased = upgrade.isPurchased(); isMaxed = isPurchased; finalCost = isPurchased ? 0 : upgrade.cost; }
    else if (upgrade.levelKey) { currentLevel = getUpgradeLevel(upgrade); isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel; finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel); }

    const canAfford = cash >= finalCost;
    let levelDisplay = "";
    if (!isUnlockable && upgrade.levelKey) { levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`; }

    let buttonText = 'Buy'; let buttonDisabled = false;
    if (isPurchased) { buttonText = 'Owned'; buttonDisabled = true; }
    else if (isMaxed) { buttonText = 'Maxed'; buttonDisabled = true; }
    else if (!canAfford) { buttonDisabled = true; }

    itemDiv.innerHTML = `
        <div class="description">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            <span class="details">${upgrade.description}</span>
        </div>
        ${(isPurchased || isMaxed) ? '' : `<span class="cost">Cost: ${finalCost}</span>`}
        <button data-id="${upgrade.id}" ${buttonDisabled ? 'disabled' : ''}>
             ${buttonText}
        </button>`;
    if (isMaxed) itemDiv.classList.add('maxed');
    const button = itemDiv.querySelector('button');
    if (button && !buttonDisabled) button.onclick = () => buyUpgradeById(upgrade.id);
    else if (button) button.onclick = null;
    return itemDiv;
}


function updateUpgradeUI() { // Updates BOTH panels' content
    if (!upgradeItemsContainer) return;
    // console.log("Updating Upgrade Panel UI..."); // Reduce log spam
    upgradeItemsContainer.innerHTML = '';
    let visibleIndexForHotkey = 0; // Index used for number hotkeys (ignores nanobot button)
    upgrades.forEach((upg, actualIndex) => {
        // console.log("Processing upgrade for panel:", upg.id);
        if (upg.requiresShield && !player.shieldUnlocked) return;

        // Pass the actual array index for the button's data attribute
        const item = createUpgradeItem(upg, actualIndex);
        if(item) {
            upgradeItemsContainer.appendChild(item);
            // Only increment the hotkey index for non-consumable items
            // if (upg.id !== 'nanobot') {
            //     visibleIndexForHotkey++; // This logic needs care if order changes
            // }
        } else {
            console.warn(`Failed to create upgrade item for ${upg.id}`);
        }
    });
    // console.log("Upgrade panel update complete.");
    if (gameState === 'shoppingOverlay') updateShopOverlayUI();
}


function displayCannotAfford(upgradeId) {
    // Find the button in the upgrade panel and flash it red briefly
    let button = null;
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;

    // Find the corresponding element in the panel
     const items = upgradeItemsContainer.querySelectorAll('.upgradeItem button');
     items.forEach((btn, index) => {
         // We need a reliable way to map button back to upgrade ID, data-index isn't ideal if list order changes
         // Let's temporarily rely on the text content (fragile) or add data-id to panel items too
         // For now, let's flash the cost element if possible
         const upgradeItemDiv = btn.closest('.upgradeItem');
         if (upgradeItemDiv) {
             const nameSpan = upgradeItemDiv.querySelector('.name');
             // Rough check - ideally use data-id if we add it
             if (nameSpan && nameSpan.textContent.includes(upgrade.name)) {
                 const costSpan = upgradeItemDiv.querySelector('.cost');
                 if (costSpan) {
                      costSpan.style.transition = 'color 0.1s ease-in-out';
                      costSpan.style.color = '#F44336'; // Flash red
                      setTimeout(() => { costSpan.style.color = '#FFEB3B'; }, 200); // Revert color
                 }
             }
         }
     });
    console.log(`Cannot afford "${upgrade?.name}".`);
}

// General purchase logic for leveled/permanent upgrades
function buyUpgrade(upgrade) {
    if (!upgrade || upgrade.id === 'nanobot') { console.warn("buyUpgrade: Invalid upgrade passed."); return; }

    const isUnlockable = !upgrade.levelKey && upgrade.isPurchased;
    let currentLevel = 0; let isMaxed = false; let isPurchased = false; let finalCost = upgrade.cost;

    if (isUnlockable) { isPurchased = upgrade.isPurchased(); isMaxed = isPurchased; finalCost = isPurchased ? 0 : upgrade.cost; }
    else if (upgrade.levelKey) { currentLevel = getUpgradeLevel(upgrade); isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel; finalCost = isMaxed ? 0 : calculateUpgradeCost(upgrade.cost, currentLevel); }

    if (isPurchased || isMaxed) { /* console.log(`Upgrade "${upgrade.name}" owned/maxed.`); */ return; } // Silent fail
    if (cash < finalCost) { displayCannotAfford(upgrade.id); return; }

    cash -= finalCost;
    let nextLevel = currentLevel + 1;
    if (upgrade.action) upgrade.action(nextLevel); // Call action, pass next level if applicable
    else console.warn(`Upgrade "${upgrade.name}" missing action.`);

    console.log(`Bought: ${upgrade.name}, Lvl: ${upgrade.levelKey ? nextLevel : 'N/A'}, Cost: ${finalCost}, Cash: ${cash}`);
    updateCashDisplay(); updateUpgradeUI(); saveGameData();
}

// Specific purchase handler for Nanobot Button
function buyNanoBotUpgrade() {
    if (cash < NANO_BOT_DEPLOY_COST) { displayCannotAfford('nanobot'); return; }
    cash -= NANO_BOT_DEPLOY_COST; updateCashDisplay(); saveGameData();
    deployNanoBot(); updateUpgradeUI(); // Update panel button state (affordability)
}


function buyUpgradeByIndex(actualIndex) { // Index is now the actual index in the 'upgrades' array
     if (actualIndex >= 0 && actualIndex < upgrades.length) {
         const upgrade = upgrades[actualIndex];
         if (upgrade.id === 'nanobot') { // If nanobot button somehow got here
             buyNanoBotUpgrade();
         } else {
             buyUpgrade(upgrade); // Use general buy function for others
         }
     } else {
         console.warn(`buyUpgradeByIndex: Invalid index ${actualIndex}`);
     }
}


function buyUpgradeById(id) { // Used by shop overlay
    const upgrade = upgrades.find(upg => upg.id === id);
    if (upgrade && upgrade.id !== 'nanobot') buyUpgrade(upgrade); // Ensure it's not the consumable
    else if (upgrade && upgrade.id === 'nanobot') console.warn(`buyUpgradeById: Nanobot purchase attempted through permanent shop.`);
    else console.warn(`buyUpgradeById: ID ${id} not found.`);
}