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
        gameState = 'paused';
        pauseMenu.classList.add('visible');
        if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
        hideUpgradePanel(); pauseBtn.textContent = 'Resume';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        pauseMenu.classList.remove('visible');
        lastFrameTime = performance.now(); // Reset dt timer
        if (!animationFrameId) requestAnimationFrame(gameLoop); // Restart loop
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
        if (upgrade.requiresShield && !player.shieldUnlocked) return;
        const itemDiv = createShopOverlayItem(upgrade);
        if (itemDiv) shopItemsContainerOverlay.appendChild(itemDiv);
    });
}

// --- Upgrade Creation & Purchase Logic ---
function calculateUpgradeCost(baseCost, level) { return Math.floor(baseCost * Math.pow(1.3, level)); }

function getUpgradeLevel(upgrade) {
    if (!upgrade?.levelKey) return 0; // Optional chaining for safety
    return player[upgrade.levelKey] || 0; // Use stored level directly
}

function createUpgradeItem(upgrade, index) { // For In-Game Panel
    if (!upgrade) return null;
    const upgradeDiv = document.createElement('div');
    upgradeDiv.classList.add('upgradeItem');

    const currentLevel = getUpgradeLevel(upgrade);
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);
    const canAfford = cash >= cost;
    let levelDisplay = upgrade.levelKey && !isPurchased ? (isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`) : "";

    upgradeDiv.innerHTML = `
        <div class="info">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            ${isPurchased || isMaxed ? '' : `<span class="cost">Cost: ${cost}</span>`}
            <span class="details">${upgrade.description}</span>
        </div>
        <button data-index="${index}" ${isMaxed || isPurchased || !canAfford ? 'disabled' : ''}>
            ${isPurchased ? 'Owned' : (isMaxed ? 'Maxed' : 'Buy')}
        </button>`;
    if (isMaxed) upgradeDiv.classList.add('maxed');
    if (isPurchased) upgradeDiv.classList.add('purchased');
    const button = upgradeDiv.querySelector('button');
    if (button && !isPurchased && !isMaxed) button.onclick = () => buyUpgradeByIndex(index);
    else if (button) button.onclick = null;
    return upgradeDiv;
}

function createShopOverlayItem(upgrade) { // For Shop Overlay
    if (!upgrade) return null;
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('shopItemOverlay');

    const currentLevel = getUpgradeLevel(upgrade);
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);
    const canAfford = cash >= cost;
    let levelDisplay = upgrade.levelKey && !isPurchased ? (isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`) : "";

    itemDiv.innerHTML = `
        <div class="description">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            <span class="details">${upgrade.description}</span>
        </div>
        ${isPurchased || isMaxed ? '' : `<span class="cost">Cost: ${cost}</span>`}
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

function buyUpgrade(upgrade) {
    if (!upgrade) { console.warn("buyUpgrade: null upgrade."); return; }
    const currentLevel = getUpgradeLevel(upgrade);
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased || isMaxed ? 0 : (upgrade.levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);
    if (isPurchased || isMaxed) { console.log(`Upgrade "${upgrade.name}" owned/maxed.`); return; }
    if (cash < cost) { console.log(`Cannot afford "${upgrade.name}". Need ${cost}.`); return; }

    cash -= cost;
    let nextLevel = currentLevel + 1;
    if (upgrade.action) upgrade.action(nextLevel);
    else if(upgrade.levelKey) player[upgrade.levelKey] = nextLevel; // Fallback if action missing
    else console.warn(`Upgrade "${upgrade.name}" has no action/levelKey.`);

    console.log(`Bought: ${upgrade.name}, Lvl: ${upgrade.levelKey ? nextLevel : 'N/A'}, Cash: ${cash}`);
    updateCashDisplay(); updateUpgradeUI(); saveGameData();
}

function buyUpgradeByIndex(visibleIndex) {
    let actualIndex = -1; let count = 0;
    for (let i = 0; i < upgrades.length; i++) {
        if (!(upgrades[i].requiresShield && !player.shieldUnlocked)) {
            if (count === visibleIndex) { actualIndex = i; break; }
            count++;
        }
    }
    if (actualIndex !== -1) buyUpgrade(upgrades[actualIndex]);
    else console.warn(`buyUpgradeByIndex: Index ${visibleIndex} not found.`);
}

function buyUpgradeById(id) {
    const upgrade = upgrades.find(upg => upg.id === id);
    if (upgrade) buyUpgrade(upgrade);
    else console.warn(`buyUpgradeById: ID ${id} not found.`);
}