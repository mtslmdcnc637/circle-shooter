// --- Seletores ---
const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
const cashElement = document.getElementById('cashDisplay'); const healthElement = document.getElementById('health'); const waveIndicatorElement = document.getElementById('waveIndicator');
const enemiesRemainingElement = document.getElementById('enemiesRemaining'); // New selector
const startScreen = document.getElementById('startScreen'); const startBtn = document.getElementById('startBtn'); const startShopBtn = document.getElementById('startShopBtn');
const gameOverElement = document.getElementById('gameOver'); const finalCashElement = document.getElementById('finalCash'); const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn'); const pauseMenu = document.getElementById('pauseMenu'); const resumeBtn = document.getElementById('resumeBtn');
const upgradePanel = document.getElementById('upgradePanel'); const upgradeItemsContainer = document.getElementById('upgradeItemsContainer');
const shopOverlay = document.getElementById('shopOverlay'); const shopCashOverlayElement = document.getElementById('shopCashOverlay'); const shopItemsContainerOverlay = document.getElementById('shopItemsContainerOverlay'); const closeShopOverlayBtn = document.getElementById('closeShopOverlayBtn');

// --- Constantes ---
const PLAYER_COLOR = '#4CAF50'; const PLAYER_RADIUS = 20;
const BULLET_COLOR = '#2196F3'; const BULLET_RADIUS = 5; const BASE_BULLET_SPEED = 400; // Pixels per second
const BASE_BULLET_DAMAGE = 10;
const ENEMY_CIRCLE_COLOR = '#F44336'; const ENEMY_SQUARE_COLOR = '#FF9800'; const ENEMY_TRIANGLE_COLOR = '#9C27B0';
const BASE_ENEMY_RADIUS = 15; const BASE_ENEMY_HEALTH = 30; const BASE_ENEMY_SPEED = 40; // Pixels per second
const ENEMY_SPEED_RANDOMNESS = 15; // Pixels per second variation
const SHIELD_COLOR = '#FFEB3B'; const BASE_SHIELD_ACTIVE_DURATION = 5000; const BASE_SHIELD_COOLDOWN_DURATION = 8000; const MAX_WEAPON_LEVEL = 3;
const BOSS_WAVE_INTERVAL = 5; // Boss every 5 waves for testing
const BOSS_COLOR = '#E91E63'; const BOSS_HEALTH_MULTIPLIER = 30; const BOSS_RADIUS_MULTIPLIER = 2.5; const BOSS_MINION_SPAWN_COOLDOWN = 6000; const BOSS_MINION_COUNT = 3;
const POWERUP_DROP_CHANCE = 0.10; // Increased slightly
const POWERUP_DURATION = 7000;
const POWERUP_ATTRACTION_SPEED = 250; // Pixels per second
const POWERUP_ATTRACTION_START_DISTANCE = 150; // Pixels
const AUTO_AIM_POWERUP_COLOR = '#00BCD4'; // Cyan
const AUTO_AIM_DROP_CHANCE = 0.03; // Rarer than regular powerups

// Custos
const SHIELD_UNLOCK_COST = 150; const WEAPON_LEVEL_COST = 100; const DAMAGE_UP_COST = 120;
const FIRE_RATE_COST = 130; const BULLET_SPEED_COST = 90; const SHIELD_DURATION_COST = 110; const SHIELD_COOLDOWN_COST = 140;
const NANO_BOT_DEPLOY_COST = 50; // Cost to deploy ONE nanobot

// Valores Upgrades
const DAMAGE_INCREASE_AMOUNT = 0.20; const FIRE_RATE_INCREASE = 0.15; const BULLET_SPEED_INCREASE = 0.10;
const SHIELD_DURATION_INCREASE = 1000; const SHIELD_COOLDOWN_DECREASE = 750; const MIN_SHIELD_COOLDOWN = 2000;
const NANO_BOT_SPEED = 300; // Pixels per second
const NANO_BOT_INFECTION_TIME = 2000; // 2 seconds to infect
const CONVERTED_DURATION = 10000; // 10 seconds converted
const CONVERTED_ENEMY_RADIUS_FACTOR = 0.7; const CONVERTED_SHOOT_COOLDOWN = 1500;
const CONVERTED_BULLET_SPEED = 250; // Pixels per second
const CONVERTED_BULLET_RADIUS = 4; const CONVERTED_BULLET_DAMAGE = 5;
const CONVERTED_BULLET_COLOR = '#76FF03'; // Bright Green
const NANO_BOT_COLOR = '#00FF00';
const PARTICLE_COUNT = 5; const PARTICLE_SPEED = 150; const PARTICLE_LIFESPAN = 500; const PARTICLE_RADIUS = 2;

// Wave System
const BASE_ENEMIES_PER_WAVE = 5;
const ENEMIES_PER_WAVE_INCREASE = 2;
const WAVE_INTERMISSION_TIME = 3000; // 3 seconds between waves
const BASE_ENEMY_SPAWN_INTERVAL = 2000; // Time between spawns within a wave
const MIN_ENEMY_SPAWN_INTERVAL = 300;
const SPAWN_INTERVAL_REDUCTION_PER_WAVE = 50;

// Chaves LocalStorage (Nano Bot unlock key removed)
const STORAGE_KEY_PREFIX = 'circleShooterNanoV2_'; // Changed prefix slightly to avoid conflicts
const STORAGE_KEY_CASH = STORAGE_KEY_PREFIX + 'cash';
const STORAGE_KEY_SHIELD_UNLOCKED = STORAGE_KEY_PREFIX + 'shieldUnlocked';
const STORAGE_KEY_WEAPON_LEVEL = STORAGE_KEY_PREFIX + 'weaponLevel';
const STORAGE_KEY_DAMAGE_MULTIPLIER = STORAGE_KEY_PREFIX + 'damageMultiplier';
const STORAGE_KEY_FIRE_RATE_LEVEL = STORAGE_KEY_PREFIX + 'fireRateLevel';
const STORAGE_KEY_BULLET_SPEED_LEVEL = STORAGE_KEY_PREFIX + 'bulletSpeedLevel';
const STORAGE_KEY_SHIELD_DURATION_LEVEL = STORAGE_KEY_PREFIX + 'shieldDurationLevel';
const STORAGE_KEY_SHIELD_COOLDOWN_LEVEL = STORAGE_KEY_PREFIX + 'shieldCooldownLevel';
// const STORAGE_KEY_NANO_BOTS_UNLOCKED = STORAGE_KEY_PREFIX + 'nanoBotsUnlocked'; // REMOVED

// --- Estado do Jogo ---
let cash = 0; let health = 100; let gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver', 'shoppingOverlay', 'waveIntermission'
let enemies = []; let bullets = []; let particles = []; let powerups = []; let nanoBots = []; let convertedBullets = [];
let bossActive = false;
let aimX = 0, aimY = 0;
let currentWave = 0; let enemiesRemainingInWave = 0; let enemiesToSpawnThisWave = 0; let enemiesSpawnedThisWave = 0;
let waveTimer = 0; // Used for intermission and spawn timing
let lastEnemySpawnTime = 0;
let currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;

let shakeIntensity = 0; let shakeDuration = 0;
let lastFrameTime = 0; let deltaTime = 0;
let animationFrameId = null;

// --- Estado do Jogador ---
const player = {
    x: 0, y: 0, radius: PLAYER_RADIUS, color: PLAYER_COLOR,
    shieldUnlocked: false, weaponLevel: 0, damageMultiplier: 1,
    fireRateLevel: 0, bulletSpeedLevel: 0, shieldDurationLevel: 0, shieldCooldownLevel: 0,
    // nanoBotsUnlocked: false, // REMOVED
    shieldActive: false, shieldState: 'inactive', shieldTimer: 0,
    lastBulletTime: 0, // Moved from global
    activePowerups: {}, // e.g., { rapidFire: endTime, shieldBoost: endTime, damageBoost: endTime, autoAim: endTime }
};

// --- Upgrade Definitions ---
// Structure: { id, name, description, cost, levelKey, maxLevel (optional), action (on purchase), requiresShield (optional), isPurchased (optional, for one-time unlocks) }
const upgrades = [
    { id: 'shield', name: 'Unlock Shield', description: 'Deploy a temporary shield.', cost: SHIELD_UNLOCK_COST, levelKey: null, isPurchased: () => player.shieldUnlocked, action: () => { if (!player.shieldUnlocked) { player.shieldUnlocked = true; updateUpgradeUI(); updateShopOverlayUI(); saveGameData();} } },
    { id: 'weaponLevel', name: 'Weapon Level', description: 'Increases bullets per shot.', cost: WEAPON_LEVEL_COST, levelKey: 'weaponLevel', maxLevel: MAX_WEAPON_LEVEL, action: (level) => { player.weaponLevel = level; } },
    { id: 'damage', name: 'Damage Up', description: `Increase bullet damage by ${DAMAGE_INCREASE_AMOUNT * 100}%.`, cost: DAMAGE_UP_COST, levelKey: 'damageMultiplier', maxLevel: 10, // Example max level
        action: (level, currentVal) => { player.damageMultiplier = 1 + (level * DAMAGE_INCREASE_AMOUNT); } // Recalculate based on level
    },
    { id: 'fireRate', name: 'Fire Rate Up', description: `Increase fire rate by ${FIRE_RATE_INCREASE * 100}%.`, cost: FIRE_RATE_COST, levelKey: 'fireRateLevel', maxLevel: 10, action: (level) => { player.fireRateLevel = level; } },
    { id: 'bulletSpeed', name: 'Bullet Speed Up', description: `Increase bullet speed by ${BULLET_SPEED_INCREASE * 100}%.`, cost: BULLET_SPEED_COST, levelKey: 'bulletSpeedLevel', maxLevel: 10, action: (level) => { player.bulletSpeedLevel = level; } },
    { id: 'shieldDuration', name: 'Shield Duration', description: `Increase shield active time by ${SHIELD_DURATION_INCREASE / 1000}s.`, cost: SHIELD_DURATION_COST, levelKey: 'shieldDurationLevel', maxLevel: 5, requiresShield: true, action: (level) => { player.shieldDurationLevel = level; } },
    { id: 'shieldCooldown', name: 'Shield Cooldown', description: `Decrease shield cooldown by ${SHIELD_COOLDOWN_DECREASE / 1000}s.`, cost: SHIELD_COOLDOWN_COST, levelKey: 'shieldCooldownLevel', maxLevel: 8, requiresShield: true, action: (level) => { player.shieldCooldownLevel = level; } },
    // Nanobot unlock removed, it's now a consumable purchase in-game
];


// --- Funções Utilitárias ---
function degToRad(degrees) { return degrees * Math.PI / 180; }
function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(colorA, colorB, t) { /* ... (implementation unchanged) ... */
    const hexToRgb = hex => hex.match(/\w\w/g).map(x => parseInt(x, 16));
    const rgbToHex = rgb => '#' + rgb.map(x => { const hex = x.toString(16); return hex.length === 1 ? '0' + hex : hex; }).join('');
    const rgbA = hexToRgb(colorA); const rgbB = hexToRgb(colorB);
    const rgb = rgbA.map((start, i) => { const end = rgbB[i]; return Math.round(start + (end - start) * t); });
    return rgbToHex(rgb);
}


// --- Funções de Persistência ---
function loadGameData() {
    cash = parseInt(localStorage.getItem(STORAGE_KEY_CASH) || '0');
    player.shieldUnlocked = localStorage.getItem(STORAGE_KEY_SHIELD_UNLOCKED) === 'true';
    player.weaponLevel = parseInt(localStorage.getItem(STORAGE_KEY_WEAPON_LEVEL) || '0');
    player.damageMultiplier = parseFloat(localStorage.getItem(STORAGE_KEY_DAMAGE_MULTIPLIER) || '1');
    player.fireRateLevel = parseInt(localStorage.getItem(STORAGE_KEY_FIRE_RATE_LEVEL) || '0');
    player.bulletSpeedLevel = parseInt(localStorage.getItem(STORAGE_KEY_BULLET_SPEED_LEVEL) || '0');
    player.shieldDurationLevel = parseInt(localStorage.getItem(STORAGE_KEY_SHIELD_DURATION_LEVEL) || '0');
    player.shieldCooldownLevel = parseInt(localStorage.getItem(STORAGE_KEY_SHIELD_COOLDOWN_LEVEL) || '0');
    // player.nanoBotsUnlocked = localStorage.getItem(STORAGE_KEY_NANO_BOTS_UNLOCKED) === 'true'; // REMOVED
    updateCashDisplay();
}
function saveGameData() {
    localStorage.setItem(STORAGE_KEY_CASH, cash.toString());
    localStorage.setItem(STORAGE_KEY_SHIELD_UNLOCKED, player.shieldUnlocked.toString());
    localStorage.setItem(STORAGE_KEY_WEAPON_LEVEL, player.weaponLevel.toString());
    localStorage.setItem(STORAGE_KEY_DAMAGE_MULTIPLIER, player.damageMultiplier.toString());
    localStorage.setItem(STORAGE_KEY_FIRE_RATE_LEVEL, player.fireRateLevel.toString());
    localStorage.setItem(STORAGE_KEY_BULLET_SPEED_LEVEL, player.bulletSpeedLevel.toString());
    localStorage.setItem(STORAGE_KEY_SHIELD_DURATION_LEVEL, player.shieldDurationLevel.toString());
    localStorage.setItem(STORAGE_KEY_SHIELD_COOLDOWN_LEVEL, player.shieldCooldownLevel.toString());
    // localStorage.setItem(STORAGE_KEY_NANO_BOTS_UNLOCKED, player.nanoBotsUnlocked.toString()); // REMOVED
}

// --- Configuração Inicial e Controles ---
function resizeCanvas() {
    const aspectRatio = 16 / 9;
    let w = window.innerWidth - 20;
    let h = window.innerHeight - 20;
    if (w / h > aspectRatio) {
        w = h * aspectRatio;
    } else {
        h = w / aspectRatio;
    }
    canvas.width = Math.min(w, 1200);
    canvas.height = Math.min(h, 800);

    if (gameState === 'start' || gameState === 'gameOver' || !player.x) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
    aimX = canvas.width / 2;
    aimY = canvas.height / 2;
    // No need to redraw here, the game loop handles it
}
window.addEventListener('resize', resizeCanvas);

function updateAimPosition(event) {
    const rect = canvas.getBoundingClientRect(); let clientX, clientY;
    if (event.touches && event.touches.length > 0) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
    else if (event.clientX !== undefined) { clientX = event.clientX; clientY = event.clientY; }
    else { return; } // No position data
    aimX = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    aimY = Math.max(0, Math.min(canvas.height, clientY - rect.top));
}
canvas.addEventListener('mousemove', (e) => { if (gameState === 'playing') updateAimPosition(e); });
canvas.addEventListener('touchmove', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
canvas.addEventListener('touchstart', (e) => { if (gameState === 'playing') { e.preventDefault(); updateAimPosition(e); } }, { passive: false });
// Also update aim on mouse down/touch start for immediate response
canvas.addEventListener('mousedown', (e) => { if (gameState === 'playing') updateAimPosition(e); });
// No touch end needed for aim

window.addEventListener('keydown', (e) => {
    // Pause / Unpause / Close Shop
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault(); // Prevent potential browser shortcuts
        if (gameState === 'shoppingOverlay') { closeShopOverlay(); }
        else if (gameState === 'playing' || gameState === 'paused') { togglePause(); }
    }

    if (gameState === 'playing') {
        // Upgrade Hotkeys (adjust indices if upgrades change)
        if (e.key >= '1' && e.key <= '7') { // Use 1-7 for the defined upgrades
             buyUpgradeByIndex(parseInt(e.key) - 1);
        }
        // Deploy Nanobot Hotkey
        if (e.key.toLowerCase() === 'b') { // 'B' for Bot
            deployNanoBot();
        }
        // Activate Shield Hotkey
        if (e.key === ' ' || e.key.toLowerCase() === 's') { // Space or 'S' for Shield
             activateShield();
        }
    }
});

// --- Lógica da UI e Menus ---

function updateCashDisplay() { cashElement.textContent = `Cash: ${cash}`; }
function updateHealthDisplay() {
    healthElement.textContent = `Health: ${Math.max(0, Math.ceil(health))}`;
    healthElement.style.color = health > 50 ? '#FFFFFF' : (health > 25 ? '#FFEB3B' : '#F44336');
}
function updateWaveDisplay() { waveIndicatorElement.textContent = `Wave: ${currentWave}`; }
function updateEnemiesRemainingUI() {
    if (gameState === 'playing' || gameState === 'waveIntermission') {
        const text = bossActive ? "BOSS" : `Enemies: ${enemiesRemainingInWave}`;
        enemiesRemainingElement.textContent = text;
        enemiesRemainingElement.style.display = 'block';
    } else {
        enemiesRemainingElement.style.display = 'none';
    }
}
function showUpgradePanel() { upgradePanel.style.display = 'block'; upgradePanel.style.opacity = '1'; }
function hideUpgradePanel() { upgradePanel.style.opacity = '0'; setTimeout(() => { if (upgradePanel.style.opacity === '0') upgradePanel.style.display = 'none'; }, 300); } // Hide after fade
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused'; pauseMenu.classList.add('visible'); cancelAnimationFrame(animationFrameId); animationFrameId = null; // Stop the loop
        hideUpgradePanel(); pauseBtn.textContent = 'Resume';
    } else if (gameState === 'paused') {
        gameState = 'playing'; pauseMenu.classList.remove('visible'); lastFrameTime = performance.now(); // Reset timer
        gameLoop(); // Restart the loop
        showUpgradePanel(); pauseBtn.textContent = 'Pause';
    }
}
function gameOver() {
    gameState = 'gameOver'; cancelAnimationFrame(animationFrameId); animationFrameId = null; // Stop the loop
    finalCashElement.textContent = `Final Cash: ${cash}`; gameOverElement.classList.add('visible');
    pauseBtn.style.display = 'none'; hideUpgradePanel(); saveGameData(); // Save score immediately
}
function restartGame() { // Renamed from returnToStart
    gameOverElement.classList.remove('visible'); startScreen.classList.add('visible');
    // Reset game state completely
    health = 100; currentWave = 0; bossActive = false;
    enemies = []; bullets = []; particles = []; powerups = []; nanoBots = []; convertedBullets = [];
    player.activePowerups = {}; player.shieldActive = false; player.shieldState = 'inactive'; player.shieldTimer = 0;
    // Keep persistent upgrades and cash loaded by loadGameData
    loadGameData(); // Load cash and persistent upgrades again
    resizeCanvas(); // Recenter player
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI(); updateCashDisplay();
    gameState = 'start'; // Go back to start screen
}
function startGame() {
    gameState = 'playing'; startScreen.classList.remove('visible'); pauseBtn.style.display = 'block'; pauseBtn.textContent = 'Pause';
    updateHealthDisplay(); updateWaveDisplay(); updateEnemiesRemainingUI(); showUpgradePanel(); updateUpgradeUI(); // Update panel on start
    currentWave = 0; // Start at wave 0, first wave will be 1
    enemiesRemainingInWave = 0;
    startNextWave(); // Initiate the first wave
    lastFrameTime = performance.now();
    if (!animationFrameId) gameLoop(); // Start the loop if not already running
}

// --- Lógica da Loja Overlay ---
function openShopOverlay() {
    if (gameState !== 'start') return; gameState = 'shoppingOverlay';
    updateShopOverlayUI(); startScreen.classList.remove('visible'); shopOverlay.classList.add('visible');
}
function closeShopOverlay() {
    if (gameState !== 'shoppingOverlay') return; gameState = 'start';
    shopOverlay.classList.remove('visible'); startScreen.classList.add('visible');
}
function updateShopOverlayUI() {
    shopCashOverlayElement.textContent = `Cash: ${cash}`; shopItemsContainerOverlay.innerHTML = '';
    upgrades.forEach((upgrade) => {
        if (upgrade.requiresShield && !player.shieldUnlocked) return; // Skip shield upgrades if shield not unlocked
        const itemDiv = createShopOverlayItem(upgrade);
        shopItemsContainerOverlay.appendChild(itemDiv);
    });
}

// --- Lógica de Upgrades (In-Game Panel & Shop Overlay Purchase) ---
function calculateUpgradeCost(baseCost, level) { return Math.floor(baseCost * Math.pow(1.3, level)); /* Example scaling */ }

function createUpgradeItem(upgrade, index) { // For In-Game Panel
    const upgradeDiv = document.createElement('div');
    upgradeDiv.classList.add('upgradeItem');

    const levelKey = upgrade.levelKey;
    const currentLevel = levelKey ? (levelKey === 'damageMultiplier' ? Math.round((player[levelKey] - 1) / DAMAGE_INCREASE_AMOUNT) : player[levelKey]) : 0;
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased ? 0 : (levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);
    const canAfford = cash >= cost;

    let levelDisplay = "";
    if (levelKey && !isPurchased) {
         levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`;
    }

    upgradeDiv.innerHTML = `
        <div class="info">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            ${isPurchased ? '' : `<span class="cost">Cost: ${cost}</span>`}
            <span class="details">${upgrade.description}</span>
        </div>
        <button data-index="${index}" ${isMaxed || isPurchased || !canAfford ? 'disabled' : ''}>
            ${isPurchased ? 'Owned' : (isMaxed ? 'Maxed' : 'Buy')}
        </button>
    `;

    if (isMaxed) upgradeDiv.classList.add('maxed');
    if (isPurchased) upgradeDiv.classList.add('purchased');

    const button = upgradeDiv.querySelector('button');
    if (button && !isPurchased && !isMaxed) {
        button.onclick = () => buyUpgradeByIndex(index);
    }

    return upgradeDiv;
}

function createShopOverlayItem(upgrade) { // For Shop Overlay
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('shopItemOverlay');

    const levelKey = upgrade.levelKey;
    const currentLevel = levelKey ? (levelKey === 'damageMultiplier' ? Math.round((player[levelKey] - 1) / DAMAGE_INCREASE_AMOUNT) : player[levelKey]) : 0;
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased ? 0 : (levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);
    const canAfford = cash >= cost;

     let levelDisplay = "";
    if (levelKey && !isPurchased) {
         levelDisplay = isMaxed ? ` (Max)` : ` (Lvl ${currentLevel})`;
    }

    itemDiv.innerHTML = `
        <div class="description">
            <span class="name">${upgrade.name}${levelDisplay}</span>
            <span class="details">${upgrade.description}</span>
        </div>
        ${isPurchased ? '' : `<span class="cost">Cost: ${cost}</span>`}
        <button data-id="${upgrade.id}" ${isMaxed || isPurchased || !canAfford ? 'disabled' : ''}>
             ${isPurchased ? 'Owned' : (isMaxed ? 'Maxed' : 'Buy')}
        </button>
    `;

    if (isMaxed) itemDiv.classList.add('maxed');
    if (isPurchased) itemDiv.classList.add('purchased');

    const button = itemDiv.querySelector('button');
     if (button && !isPurchased && !isMaxed) {
        button.onclick = () => buyUpgradeById(upgrade.id);
    }

    return itemDiv;
}


function updateUpgradeUI() { // Updates BOTH panels if needed
    upgradeItemsContainer.innerHTML = ''; // Clear in-game panel
    upgrades.forEach((upg, index) => {
        if (upg.requiresShield && !player.shieldUnlocked) return;
        const item = createUpgradeItem(upg, index);
        upgradeItemsContainer.appendChild(item);
    });

    if (gameState === 'shoppingOverlay') {
        updateShopOverlayUI(); // Update shop overlay if it's open
    }
}

function buyUpgrade(upgrade) {
    if (!upgrade) return;

    const levelKey = upgrade.levelKey;
    const currentLevel = levelKey ? (levelKey === 'damageMultiplier' ? Math.round((player[levelKey] - 1) / DAMAGE_INCREASE_AMOUNT) : player[levelKey]) : 0;
    const isMaxed = upgrade.maxLevel !== undefined && currentLevel >= upgrade.maxLevel;
    const isPurchased = upgrade.isPurchased && upgrade.isPurchased();
    const cost = isPurchased ? 0 : (levelKey ? calculateUpgradeCost(upgrade.cost, currentLevel) : upgrade.cost);

    if (isPurchased || isMaxed || cash < cost) {
        console.log(`Cannot buy upgrade: ${upgrade.name}. Purchased: ${isPurchased}, Maxed: ${isMaxed}, Cost: ${cost}, Cash: ${cash}`);
        return; // Cannot buy
    }

    cash -= cost;
    let nextLevel = currentLevel + 1;

    // Perform the upgrade action
    if (upgrade.action) {
        if (levelKey) { // Pass level for level-based upgrades
             if(levelKey === 'damageMultiplier') {
                 upgrade.action(nextLevel, player[levelKey]); // Pass level and current value for multiplier
             } else {
                 upgrade.action(nextLevel); // Pass only level otherwise
             }
        } else { // For unlocks like shield
            upgrade.action();
        }
    }

    console.log(`Bought upgrade: ${upgrade.name}, New Level: ${levelKey ? nextLevel : 'N/A'}, Cash Remaining: ${cash}`);
    updateCashDisplay();
    updateUpgradeUI(); // Update display in both panels
    saveGameData();
}

function buyUpgradeByIndex(index) {
    if (index >= 0 && index < upgrades.length) {
        // Filter out upgrades that shouldn't be shown yet (like shield upgrades)
        const visibleUpgrades = upgrades.filter(upg => !(upg.requiresShield && !player.shieldUnlocked));
        if (index < visibleUpgrades.length) {
             buyUpgrade(visibleUpgrades[index]);
        }
    }
}

function buyUpgradeById(id) {
    const upgrade = upgrades.find(upg => upg.id === id);
    buyUpgrade(upgrade);
}

// --- Lógica do Jogo ---

function shootBullet() {
    const now = performance.now();
    const fireRateMultiplier = 1 / (1 + player.fireRateLevel * FIRE_RATE_INCREASE);
    const baseFireInterval = 500; // milliseconds between shots at base rate
    const currentFireInterval = baseFireInterval * fireRateMultiplier;

    if (now - player.lastBulletTime < currentFireInterval) return;

    player.lastBulletTime = now;

    const bulletSpeed = BASE_BULLET_SPEED * (1 + player.bulletSpeedLevel * BULLET_SPEED_INCREASE);
    const bulletDamage = BASE_BULLET_DAMAGE * player.damageMultiplier * (player.activePowerups.damageBoost ? 2 : 1);
    const finalBulletRadius = BULLET_RADIUS;

    // Auto-Aim Logic
    let angle;
    const autoAimActive = player.activePowerups.autoAim && player.activePowerups.autoAim > now;
    let targetEnemy = null;

    if (autoAimActive) {
        let closestDistSq = Infinity;
        enemies.forEach(enemy => {
             if (!enemy.converted && !enemy.isBossMinion) { // Don't auto-aim converted or boss minions maybe?
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    targetEnemy = enemy;
                }
            }
        });
    }

    if (targetEnemy) { // Auto-aim target found
        angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
    } else { // Manual aim
        angle = Math.atan2(aimY - player.y, aimX - player.x);
    }


    // Multi-shot based on weapon level
    const shots = player.weaponLevel + 1;
    const spreadAngle = degToRad(10); // Total spread for multi-shots

    for (let i = 0; i < shots; i++) {
        let shotAngle = angle;
        if (shots > 1) {
            shotAngle = angle - spreadAngle / 2 + (i / (shots - 1)) * spreadAngle;
        }

        const vx = Math.cos(shotAngle) * bulletSpeed;
        const vy = Math.sin(shotAngle) * bulletSpeed;

        bullets.push({
            x: player.x, y: player.y,
            vx: vx, vy: vy,
            radius: finalBulletRadius, color: BULLET_COLOR, damage: bulletDamage,
            creationTime: now
        });
    }
}

function shootConvertedBullet(sourceEnemy) {
    const now = performance.now();
    if (now - sourceEnemy.lastConvertedShot < CONVERTED_SHOOT_COOLDOWN) return;

     // Find nearest non-converted enemy
    let targetEnemy = null;
    let closestDistSq = Infinity;
    enemies.forEach(enemy => {
        if (!enemy.converted && enemy !== sourceEnemy && !enemy.isBossMinion) { // Target non-converted, non-self, non-minion
            const distSq = distanceSquared(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                targetEnemy = enemy;
            }
        }
    });

    if (!targetEnemy) return; // No valid target

    sourceEnemy.lastConvertedShot = now;
    const angle = Math.atan2(targetEnemy.y - sourceEnemy.y, targetEnemy.x - sourceEnemy.x);
    const vx = Math.cos(angle) * CONVERTED_BULLET_SPEED;
    const vy = Math.sin(angle) * CONVERTED_BULLET_SPEED;

    convertedBullets.push({
        x: sourceEnemy.x, y: sourceEnemy.y,
        vx: vx, vy: vy,
        radius: CONVERTED_BULLET_RADIUS, color: CONVERTED_BULLET_COLOR, damage: CONVERTED_BULLET_DAMAGE,
        creationTime: now
    });

}


function spawnEnemy() {
    if (bossActive) return; // Don't spawn regular enemies during boss fight (unless intended)

    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let spawnX, spawnY;
    const buffer = 50; // Spawn slightly off-screen

    switch (edge) {
        case 0: spawnX = Math.random() * canvas.width; spawnY = -buffer; break; // Top
        case 1: spawnX = canvas.width + buffer; spawnY = Math.random() * canvas.height; break; // Right
        case 2: spawnX = Math.random() * canvas.width; spawnY = canvas.height + buffer; break; // Bottom
        case 3: spawnX = -buffer; spawnY = Math.random() * canvas.height; break; // Left
    }

    // Basic enemy type variety (can be expanded)
    const typeRoll = Math.random();
    let type, color, healthMultiplier = 1, speedMultiplier = 1, radiusMultiplier = 1;
    if (currentWave > 15 && typeRoll > 0.8) {
        type = 'triangle'; color = ENEMY_TRIANGLE_COLOR; healthMultiplier = 1.5; speedMultiplier = 1.3; radiusMultiplier = 0.9;
    } else if (currentWave > 5 && typeRoll > 0.5) {
        type = 'square'; color = ENEMY_SQUARE_COLOR; healthMultiplier = 1.2; speedMultiplier = 0.8; radiusMultiplier = 1.1;
    } else {
        type = 'circle'; color = ENEMY_CIRCLE_COLOR;
    }

    const waveHealthBonus = Math.pow(1.05, currentWave); // Enemies get tougher each wave
    const waveSpeedBonus = Math.pow(1.01, currentWave);

    const speedVariance = (Math.random() - 0.5) * 2 * ENEMY_SPEED_RANDOMNESS; // +/- randomness
    const enemySpeed = (BASE_ENEMY_SPEED + speedVariance) * speedMultiplier * waveSpeedBonus;

    enemies.push({
        x: spawnX, y: spawnY,
        radius: BASE_ENEMY_RADIUS * radiusMultiplier,
        color: color, type: type,
        maxHealth: BASE_ENEMY_HEALTH * healthMultiplier * waveHealthBonus,
        health: BASE_ENEMY_HEALTH * healthMultiplier * waveHealthBonus,
        speed: Math.max(20, enemySpeed), // Ensure minimum speed
        targetX: player.x, targetY: player.y, // Initial target
        creationTime: performance.now(),
        converted: false,
        infectionTimer: null, // null = not infected, > 0 = infecting
        conversionEndTime: 0,
        lastConvertedShot: 0,
        isBossMinion: false, // Flag for boss minions
    });
}

function spawnBoss() {
    bossActive = true;
    enemiesRemainingInWave = 1; // Only the boss counts now
    updateEnemiesRemainingUI();

    const radius = BASE_ENEMY_RADIUS * BOSS_RADIUS_MULTIPLIER;
    const health = BASE_ENEMY_HEALTH * BOSS_HEALTH_MULTIPLIER * Math.pow(1.1, currentWave / BOSS_WAVE_INTERVAL); // Scale boss health too
    const speed = BASE_ENEMY_SPEED * 0.5; // Bosses are slower initially

    // Spawn boss similar to regular enemies (off-screen)
    const edge = Math.floor(Math.random() * 4);
    let spawnX, spawnY;
    const buffer = radius * 1.5;
    switch (edge) {
        case 0: spawnX = canvas.width / 2; spawnY = -buffer; break;
        case 1: spawnX = canvas.width + buffer; spawnY = canvas.height / 2; break;
        case 2: spawnX = canvas.width / 2; spawnY = canvas.height + buffer; break;
        case 3: spawnX = -buffer; spawnY = canvas.height / 2; break;
    }

    enemies.push({
        x: spawnX, y: spawnY,
        radius: radius,
        color: BOSS_COLOR, type: 'boss',
        maxHealth: health, health: health,
        speed: speed,
        targetX: player.x, targetY: player.y,
        creationTime: performance.now(),
        isBoss: true, lastMinionSpawnTime: 0,
        converted: false, infectionTimer: null, conversionEndTime: 0, // Bosses likely immune or highly resistant
        lastConvertedShot: 0, isBossMinion: false
    });
}

function spawnBossMinion(boss) {
     const angle = Math.random() * Math.PI * 2;
     const spawnDist = boss.radius + BASE_ENEMY_RADIUS + 10;
     const spawnX = boss.x + Math.cos(angle) * spawnDist;
     const spawnY = boss.y + Math.sin(angle) * spawnDist;
     const minionHealth = BASE_ENEMY_HEALTH * 0.5 * Math.pow(1.05, currentWave); // Weaker minions
     const minionSpeed = BASE_ENEMY_SPEED * 1.2 * Math.pow(1.01, currentWave); // Faster minions

    enemies.push({
        x: spawnX, y: spawnY,
        radius: BASE_ENEMY_RADIUS * 0.8,
        color: ENEMY_SQUARE_COLOR, type: 'square', // Or a specific minion type/color
        maxHealth: minionHealth, health: minionHealth,
        speed: minionSpeed,
        targetX: player.x, targetY: player.y,
        creationTime: performance.now(),
        converted: false, infectionTimer: null, conversionEndTime: 0,
        lastConvertedShot: 0,
        isBossMinion: true // Mark as minion
    });
}


function spawnPowerup(x, y) {
    const rand = Math.random();
    let type = 'cash'; // Default/fallback
    let color = '#FFEB3B'; // Yellow for cash

    // Determine type based on probability (adjust as needed)
    // Order matters - check rarest first
    if (rand < AUTO_AIM_DROP_CHANCE) {
        type = 'autoAim'; color = AUTO_AIM_POWERUP_COLOR;
    } else if (rand < AUTO_AIM_DROP_CHANCE + 0.05) { // Example: Shield Boost
        type = 'shieldBoost'; color = '#03A9F4'; // Light blue
    } else if (rand < AUTO_AIM_DROP_CHANCE + 0.10) { // Example: Damage Boost
        type = 'damageBoost'; color = '#FF5722'; // Deep Orange
    } else if (rand < AUTO_AIM_DROP_CHANCE + 0.18) { // Example: Rapid Fire
        type = 'rapidFire'; color = '#9C27B0'; // Purple
    } else if (rand < AUTO_AIM_DROP_CHANCE + 0.30) { // Cash is more common
        type = 'cash'; color = '#FFEB3B';
    }
     // Add more types here...
     else {
         // Make cash the most likely fallback if no other condition met
         type = 'cash'; color = '#FFEB3B';
     }


    powerups.push({
        x: x, y: y,
        radius: 10,
        color: color, type: type,
        creationTime: performance.now(),
        attractionTimer: 0 // Timer for attraction start delay maybe?
    });
}

function activatePowerup(type) {
    const now = performance.now();
    const duration = POWERUP_DURATION;

    switch (type) {
        case 'cash':
            const amount = Math.floor(Math.random() * 10) + 5 * currentWave; // Scale cash drops
            cash += amount;
            updateCashDisplay();
            saveGameData(); // Save cash immediately
            break;
        case 'rapidFire':
            player.activePowerups.rapidFire = now + duration;
            // Effect handled directly in fire rate calculation (or apply multiplier here)
            break;
        case 'shieldBoost': // Instantly recharge shield
            if (player.shieldUnlocked) {
                player.shieldState = 'active';
                player.shieldTimer = now + calculateShieldDuration(); // Activate for full duration
            }
            break;
         case 'damageBoost':
            player.activePowerups.damageBoost = now + duration;
             // Effect handled in shootBullet damage calculation
            break;
        case 'autoAim':
             player.activePowerups.autoAim = now + duration;
             // Effect handled in shootBullet aiming logic
             break;
        // Add cases for other powerups
    }
    // Update UI or visuals if needed for powerup activation
}


function createParticles(x, y, color, count = PARTICLE_COUNT) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * PARTICLE_SPEED + PARTICLE_SPEED / 2;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            radius: Math.random() * PARTICLE_RADIUS + 1,
            color: color,
            life: PARTICLE_LIFESPAN,
            creationTime: performance.now()
        });
    }
}

function activateShield() {
     const now = performance.now();
     if (!player.shieldUnlocked || player.shieldState !== 'inactive') return; // Only activate if ready

     const cooldown = calculateShieldCooldown();
     if (now - player.shieldTimer < cooldown) return; // Check cooldown (shieldTimer stores end time of last active OR end time of cooldown start)

     player.shieldState = 'active';
     player.shieldTimer = now; // Start timer for active duration
     // Visual indication will be handled in drawPlayer
}

function calculateShieldDuration() {
    return BASE_SHIELD_ACTIVE_DURATION + player.shieldDurationLevel * SHIELD_DURATION_INCREASE;
}
function calculateShieldCooldown() {
     return Math.max(MIN_SHIELD_COOLDOWN, BASE_SHIELD_COOLDOWN_DURATION - player.shieldCooldownLevel * SHIELD_COOLDOWN_DECREASE);
}

function deployNanoBot() {
    if (cash < NANO_BOT_DEPLOY_COST) {
        // Optional: feedback like "Not enough cash"
        return;
    }
    cash -= NANO_BOT_DEPLOY_COST;
    updateCashDisplay();
    saveGameData(); // Save cash after purchase

    nanoBots.push({
        x: player.x, y: player.y,
        target: null, // Enemy object
        state: 'seeking', // 'seeking', 'homing', 'infecting' (infecting is brief, bot removed after)
        creationTime: performance.now()
    });
    console.log("Deployed Nanobot!");
}

function convertEnemy(enemy) {
    if (enemy.converted || enemy.isBoss) return; // Don't convert already converted or bosses

    console.log("Converting enemy");
    enemy.converted = true;
    enemy.infectionTimer = null; // Stop infection process
    enemy.conversionEndTime = performance.now() + CONVERTED_DURATION;
    enemy.color = CONVERTED_BULLET_COLOR; // Change color
    enemy.radius *= CONVERTED_ENEMY_RADIUS_FACTOR;
    enemy.speed *= 0.3; // Slow down significantly
    enemy.lastConvertedShot = performance.now(); // Allow shooting soon
    // No longer counts towards wave total if converted? Or keep counting? Let's keep counting.
    // createParticles(enemy.x, enemy.y, CONVERTED_BULLET_COLOR, 15); // Conversion effect
}


// --- Funções de Atualização ---

function updatePlayer(dt) {
    // Shield Logic
    const now = performance.now();
    if (player.shieldState === 'active') {
        if (now - player.shieldTimer > calculateShieldDuration()) {
            player.shieldState = 'cooldown';
            player.shieldTimer = now; // Start cooldown timer
        }
    } else if (player.shieldState === 'cooldown') {
         if (now - player.shieldTimer > calculateShieldCooldown()) {
             player.shieldState = 'inactive'; // Ready again
             player.shieldTimer = now; // Reset timer base
         }
    }

    // Powerup Timers Check / Expiry
    for (const type in player.activePowerups) {
        if (player.activePowerups[type] < now) {
            delete player.activePowerups[type];
            // Optional: visual feedback for powerup expiry
        }
    }

     // Shooting (triggered by holding mouse/touch usually, handled in gameLoop)
     // Currently fires continuously towards aim if playing
     if (gameState === 'playing') {
         shootBullet(); // Attempt to shoot based on fire rate
     }
}


function updateBullets(dt) {
    const time = performance.now();
    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        // Remove bullets going off-screen
        if (bullet.x < -bullet.radius || bullet.x > canvas.width + bullet.radius ||
            bullet.y < -bullet.radius || bullet.y > canvas.height + bullet.radius) {
            bullets.splice(i, 1);
            continue;
        }

        // Bullet-Enemy Collision
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
             if (enemy.converted) continue; // Don't hit converted enemies

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                // Hit!
                enemy.health -= bullet.damage;
                createParticles(bullet.x, bullet.y, enemy.color, 3); // Small hit particle
                bullets.splice(i, 1); // Remove bullet

                if (enemy.health <= 0) {
                    // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.isBoss) cashGain *= 10;
                    if (enemy.isBossMinion) cashGain *= 0.5;
                    cash += Math.max(1, Math.floor(cashGain)); // Min 1 cash

                    createParticles(enemy.x, enemy.y, enemy.color, 15); // Death explosion
                    // Powerup Drop Chance
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) { // Minions don't drop powerups
                        spawnPowerup(enemy.x, enemy.y);
                    }

                    enemies.splice(j, 1); // Remove enemy
                    if (!enemy.converted) { // Only decrement if it wasn't already converted
                         enemiesRemainingInWave--;
                    }

                    if(enemy.isBoss) {
                        bossActive = false; // Boss defeated
                        // Maybe trigger next wave immediately or short intermission
                    }
                    updateCashDisplay();
                    updateEnemiesRemainingUI();
                    saveGameData(); // Save after cash gain
                }
                break; // Bullet hit an enemy, stop checking enemies for this bullet
            }
        }
    }

     // Converted Enemy Bullets
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
        const cBullet = convertedBullets[i];
        cBullet.x += cBullet.vx * dt;
        cBullet.y += cBullet.vy * dt;

        // Remove if off-screen
        if (cBullet.x < -cBullet.radius || cBullet.x > canvas.width + cBullet.radius ||
            cBullet.y < -cBullet.radius || cBullet.y > canvas.height + cBullet.radius) {
            convertedBullets.splice(i, 1);
            continue;
        }

         // Converted Bullet vs Non-Converted Enemy Collision
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if (enemy.converted || enemy.isBossMinion) continue; // Converted bullets only hit normal enemies

             const distSq = distanceSquared(cBullet.x, cBullet.y, enemy.x, enemy.y);
             const radiiSumSq = (cBullet.radius + enemy.radius) * (cBullet.radius + enemy.radius);

             if (distSq < radiiSumSq) {
                 enemy.health -= cBullet.damage;
                 createParticles(cBullet.x, cBullet.y, CONVERTED_BULLET_COLOR, 3);
                 convertedBullets.splice(i, 1); // Remove converted bullet

                 if (enemy.health <= 0) {
                    // Enemy defeated by conversion
                    let cashGain = 2 + Math.floor(currentWave * 0.2); // Less cash for converted kills?
                    cash += Math.max(1, Math.floor(cashGain));

                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                     // Less chance for powerup from converted kill?
                    if (Math.random() < POWERUP_DROP_CHANCE * 0.3) {
                        spawnPowerup(enemy.x, enemy.y);
                    }

                    enemies.splice(j, 1);
                    enemiesRemainingInWave--; // It was defeated
                    updateCashDisplay();
                    updateEnemiesRemainingUI();
                    saveGameData();
                 }
                 break; // Bullet hit
             }
         }
     }
}


function updateEnemies(dt) {
    const now = performance.now();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // --- Boss Specific Logic ---
        if (enemy.isBoss) {
             // Simple movement towards player
             const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
             enemy.x += Math.cos(angle) * enemy.speed * dt;
             enemy.y += Math.sin(angle) * enemy.speed * dt;

            // Spawn minions periodically
            if (now - enemy.lastMinionSpawnTime > BOSS_MINION_SPAWN_COOLDOWN) {
                 for(let m=0; m < BOSS_MINION_COUNT; m++) {
                      spawnBossMinion(enemy);
                 }
                 enemy.lastMinionSpawnTime = now;
            }
             // Add other boss attacks here...
        }
        // --- Converted Enemy Logic ---
        else if (enemy.converted) {
             // Check if conversion duration expired
             if (now > enemy.conversionEndTime) {
                 createParticles(enemy.x, enemy.y, '#AAAAAA', 10); // Fizzle effect
                 enemies.splice(i, 1);
                 // Don't decrement enemiesRemainingInWave here, it was counted when converted or originally spawned
                 updateEnemiesRemainingUI();
                 continue; // Skip rest of update for this removed enemy
             }

             // Wander slowly or stay still? Let's make them wander a bit.
             if (Math.random() < 0.01) { // Change direction occasionally
                 enemy.wanderAngle = Math.random() * Math.PI * 2;
             }
             if (!enemy.wanderAngle) enemy.wanderAngle = Math.random() * Math.PI * 2;
             enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * dt * 0.5; // Slower wander
             enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * dt * 0.5;

             // Keep within bounds (simple push back)
              enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x));
              enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y));


             // Try to shoot at nearest non-converted enemy
             shootConvertedBullet(enemy);
        }
        // --- Regular & Minion Enemy Logic ---
        else {
             // Infection Check
             if (enemy.infectionTimer !== null) {
                 enemy.infectionTimer += dt * 1000; // Add milliseconds
                 if (enemy.infectionTimer >= NANO_BOT_INFECTION_TIME) {
                     convertEnemy(enemy);
                     // Don't 'continue' here, let the rest of the converted logic run this frame if needed
                 } else {
                     // Pulsating green effect while infecting
                     const infectionProgress = enemy.infectionTimer / NANO_BOT_INFECTION_TIME;
                     enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.5 + Math.sin(infectionProgress * Math.PI * 4) * 0.3); // Lerp + pulse
                 }
             } else {
                 enemy.currentColor = enemy.color; // Use base color if not infecting
             }


             // Move towards player (unless infecting/recently hit?)
             if (enemy.infectionTimer === null) { // Stop moving while being infected? Optional.
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt;
                enemy.y += Math.sin(angle) * enemy.speed * dt;
             }

            // Player Collision Check (only for non-converted, non-infecting enemies?)
            if (!enemy.converted && !player.shieldActive) { // Shield negates damage
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                const radiiSumSq = (player.radius + enemy.radius) * (player.radius + enemy.radius);

                if (distSq < radiiSumSq) {
                    // Collision! Damage player
                    let damage = 10; // Base damage
                    if(enemy.isBoss) damage = 40;
                    if(enemy.isBossMinion) damage = 5;
                    if(enemy.type === 'triangle') damage *= 1.5; // Faster triangles do more damage?

                    health -= damage;
                    createParticles(player.x, player.y, '#FF0000', 5); // Red hit particles on player
                    updateHealthDisplay();
                    // Knockback effect? Apply small impulse away from enemy
                    const knockbackAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    // Move enemy slightly back to prevent sticking (optional)
                     enemy.x -= Math.cos(knockbackAngle) * 5;
                     enemy.y -= Math.sin(knockbackAngle) * 5;


                    // Screen Shake
                    triggerScreenShake(5, 150);

                    if (health <= 0) {
                        gameOver();
                        return; // Stop updating enemies if game over
                    }
                }
            }
        } // End of regular/minion/boss logic (non-converted part)

        // Keep enemies roughly within bounds (prevent them getting stuck way off screen)
        // Allow some overshoot for spawning effect
        const BORDER_BUFFER = 200;
         if (enemy.x < -BORDER_BUFFER || enemy.x > canvas.width + BORDER_BUFFER || enemy.y < -BORDER_BUFFER || enemy.y > canvas.height + BORDER_BUFFER) {
            if (!enemy.isBoss) { // Don't despawn boss this way
                console.log("Removing stray enemy");
                enemies.splice(i, 1);
                 if (!enemy.converted) { // Only decrement if it wasn't converted and strayed
                    enemiesRemainingInWave--;
                 }
                updateEnemiesRemainingUI();
            }
         }

    } // End enemy loop
}

function updateNanoBots(dt) {
    for (let i = nanoBots.length - 1; i >= 0; i--) {
        const bot = nanoBots[i];

        if (bot.state === 'seeking') {
            // Find nearest non-infected, non-converted enemy
            let closestDistSq = Infinity;
            let potentialTarget = null;
            for (const enemy of enemies) {
                if (!enemy.converted && enemy.infectionTimer === null && !enemy.isBoss) { // Don't target bosses? Or make infection time much longer? Let's skip bosses.
                    const distSq = distanceSquared(bot.x, bot.y, enemy.x, enemy.y);
                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        potentialTarget = enemy;
                    }
                }
            }

            if (potentialTarget) {
                bot.target = potentialTarget;
                bot.state = 'homing';
            } else {
                // No target found, maybe self-destruct after a while?
                if (performance.now() - bot.creationTime > 10000) { // 10 sec timeout
                    createParticles(bot.x, bot.y, '#AAAAAA', 5);
                    nanoBots.splice(i, 1);
                }
                // Could also add wandering behavior here
            }
        } // end seeking

        if (bot.state === 'homing') {
            if (!bot.target || bot.target.health <= 0 || bot.target.converted || bot.target.infectionTimer !== null) {
                // Target lost or invalid, go back to seeking
                bot.target = null;
                bot.state = 'seeking';
                continue;
            }

            // Move towards target
            const angle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
            bot.x += Math.cos(angle) * NANO_BOT_SPEED * dt;
            bot.y += Math.sin(angle) * NANO_BOT_SPEED * dt;

            // Check for collision with target
            const distSq = distanceSquared(bot.x, bot.y, bot.target.x, bot.target.y);
            const radiiSumSq = (5 + bot.target.radius) * (5 + bot.target.radius); // Approx radius for bot

            if (distSq < radiiSumSq) {
                // Hit target! Start infection process on enemy, remove bot
                bot.target.infectionTimer = 1; // Start timer (use 1ms to avoid zero issues)
                createParticles(bot.x, bot.y, NANO_BOT_COLOR, 8);
                nanoBots.splice(i, 1);
            }
        } // end homing

    } // end bot loop
}


function updatePowerups(dt) {
    const now = performance.now();
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];

        // Attraction Logic
        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        if (distSqToPlayer < POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE) {
            const angle = Math.atan2(player.y - p.y, player.x - p.x);
            p.x += Math.cos(angle) * POWERUP_ATTRACTION_SPEED * dt;
            p.y += Math.sin(angle) * POWERUP_ATTRACTION_SPEED * dt;
        }

        // Collision with Player
        const collectionDistSq = (player.radius + p.radius) * (player.radius + p.radius);
        if (distSqToPlayer < collectionDistSq) {
            activatePowerup(p.type);
            powerups.splice(i, 1);
            continue;
        }

        // Despawn after a while? (e.g., 15 seconds)
        if (now - p.creationTime > 15000) {
            powerups.splice(i, 1);
        }
    }
}

function updateParticles(dt) {
    const now = performance.now();
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1000; // Decrease life in ms

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateScreenShake(dt) {
     if (shakeDuration > 0) {
         shakeDuration -= dt * 1000;
         if (shakeDuration <= 0) {
             shakeIntensity = 0;
             ctx.translate(-shakeOffsetX, -shakeOffsetY); // Reset translation from last frame
             shakeOffsetX = 0;
             shakeOffsetY = 0;
         }
     }
}

// Store previous shake offset to counteract it before applying new shake
let shakeOffsetX = 0;
let shakeOffsetY = 0;

function triggerScreenShake(intensity, durationMs) {
    shakeIntensity = Math.max(shakeIntensity, intensity); // Use max intensity if triggered again quickly
    shakeDuration = Math.max(shakeDuration, durationMs);
}

function applyScreenShake() {
    // Reset previous frame's shake
    ctx.translate(-shakeOffsetX, -shakeOffsetY);

    if (shakeIntensity > 0 && shakeDuration > 0) {
        shakeOffsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
        ctx.translate(shakeOffsetX, shakeOffsetY);
    } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
}

// --- Wave Management ---
function startNextWave() {
    currentWave++;
    bossActive = false; // Reset boss flag

    // Check for Boss Wave
    if (currentWave > 0 && currentWave % BOSS_WAVE_INTERVAL === 0) {
         gameState = 'playing'; // Boss wave starts immediately
         enemiesToSpawnThisWave = 1; // Just the boss initially
         enemiesSpawnedThisWave = 0; // Reset spawn counter
         spawnBoss(); // Spawn the boss
         waveTimer = 0; // Reset timer
         lastEnemySpawnTime = performance.now();
    } else {
        // Regular Wave
        gameState = 'waveIntermission';
        waveTimer = WAVE_INTERMISSION_TIME;
        enemiesToSpawnThisWave = BASE_ENEMIES_PER_WAVE + (currentWave - 1) * ENEMIES_PER_WAVE_INCREASE;
        enemiesRemainingInWave = enemiesToSpawnThisWave;
        enemiesSpawnedThisWave = 0;
        currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - (currentWave * SPAWN_INTERVAL_REDUCTION_PER_WAVE));
        lastEnemySpawnTime = 0; // Reset spawn timer for the wave
         // Give cash bonus between waves?
         if (currentWave > 1) {
             let bonus = 20 + currentWave * 5;
             cash += bonus;
             updateCashDisplay();
             // Display bonus message?
         }
    }

    updateWaveDisplay();
    updateEnemiesRemainingUI();
    console.log(`Starting Wave ${currentWave}. Spawning ${enemiesToSpawnThisWave} enemies. Interval: ${currentEnemySpawnInterval}ms`);
}


function updateWaveState(dt) {
    const now = performance.now();

    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0) {
            gameState = 'playing'; // Start spawning
            lastEnemySpawnTime = now; // Set timer for first spawn
            console.log("Intermission ended, starting spawning.");
        }
    } else if (gameState === 'playing') {
         // Check if spawning is needed for the current wave (non-boss)
        if (!bossActive && enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
            if (now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                 spawnEnemy();
                 enemiesSpawnedThisWave++;
                 lastEnemySpawnTime = now;
                 // console.log(`Spawned enemy ${enemiesSpawnedThisWave}/${enemiesToSpawnThisWave}`);
            }
        }

        // Check if wave is complete (all spawned and defeated)
        if (enemiesRemainingInWave <= 0 && (enemiesSpawnedThisWave >= enemiesToSpawnThisWave || bossActive)) {
            // Need small delay to ensure boss death animation/particles can play?
            // Or just proceed if bossActive is now false (meaning boss was defeated)
             if (!bossActive || (bossActive && enemies.every(e => !e.isBoss))) { // Ensure boss is truly gone if it was active
                 console.log(`Wave ${currentWave} complete.`);
                 startNextWave();
             }
        }
    }
}


// --- Funções de Desenho ---

function drawPlayer() {
    // Auto-aim indicator
    if (player.activePowerups.autoAim && player.activePowerups.autoAim > performance.now()) {
         ctx.beginPath();
         ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
         ctx.strokeStyle = AUTO_AIM_POWERUP_COLOR + '80'; // Semi-transparent
         ctx.lineWidth = 3;
         ctx.stroke();
    }


    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Shield Visual
    const now = performance.now();
    if (player.shieldState === 'active') {
        const shieldDuration = calculateShieldDuration();
        const timeElapsed = now - player.shieldTimer;
        const shieldPercent = Math.max(0, 1 - (timeElapsed / shieldDuration));
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = lerpColor('#FFFFFF', SHIELD_COLOR, shieldPercent); // Fade color?
        ctx.lineWidth = 3 + shieldPercent * 2; // Pulse width?
        ctx.globalAlpha = 0.3 + shieldPercent * 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    } else if (player.shieldState === 'cooldown') {
         const cooldownDuration = calculateShieldCooldown();
         const timeElapsed = now - player.shieldTimer;
         const cooldownPercent = Math.min(1, timeElapsed / cooldownDuration);
         // Draw a small indicator for cooldown progress
         ctx.beginPath();
         ctx.arc(player.x, player.y, player.radius + 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
         ctx.strokeStyle = '#AAAAAA40'; // Faint grey cooldown indicator
         ctx.lineWidth = 2;
         ctx.stroke();
    }

     // Aiming Reticle (optional, for mouse) - subtle lines
     const dx = aimX - player.x;
     const dy = aimY - player.y;
     const dist = Math.sqrt(dx*dx + dy*dy);
     if (dist > player.radius) { // Only draw if aiming outside player
         const nx = dx / dist;
         const ny = dy / dist;
         ctx.beginPath();
         ctx.moveTo(player.x + nx * (player.radius + 2), player.y + ny * (player.radius + 2));
         ctx.lineTo(player.x + nx * (player.radius + 8), player.y + ny * (player.radius + 8));
         ctx.strokeStyle = '#FFFFFF30';
         ctx.lineWidth = 1;
         ctx.stroke();
     }

}


function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.currentColor || enemy.color; // Use currentColor if infecting
        ctx.beginPath();
        if (enemy.type === 'square' || enemy.isBossMinion) {
            ctx.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
        } else if (enemy.type === 'triangle') {
            const angleOffset = Math.PI / 2; // Point up
            ctx.moveTo(enemy.x + Math.cos(angleOffset) * enemy.radius, enemy.y + Math.sin(angleOffset) * enemy.radius);
            ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius);
            ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius);
            ctx.closePath();
        } else { // Circle or Boss (usually circle)
            ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        }
        ctx.fill();

        // Health Bar (only if damaged)
        if (enemy.health < enemy.maxHealth) {
            const barWidth = enemy.radius * 1.5;
            const barHeight = 5;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - enemy.radius - barHeight - 5; // Position above enemy
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);

            ctx.fillStyle = '#555'; // Background
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : (healthPercent > 0.2 ? '#FFEB3B' : '#F44336'); // Green/Yellow/Red
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }

        // Infection progress visual (maybe a growing circle?)
        if (enemy.infectionTimer !== null && !enemy.converted) {
             const infectionProgress = enemy.infectionTimer / NANO_BOT_INFECTION_TIME;
             ctx.beginPath();
             ctx.arc(enemy.x, enemy.y, enemy.radius * infectionProgress * 0.8, 0, Math.PI * 2);
             ctx.strokeStyle = NANO_BOT_COLOR + '90';
             ctx.lineWidth = 2;
             ctx.stroke();
        }
    });
}

function drawBullets() {
    // Player Bullets
    ctx.fillStyle = BULLET_COLOR;
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    // Converted Bullets
    ctx.fillStyle = CONVERTED_BULLET_COLOR;
    convertedBullets.forEach(bullet => {
         ctx.beginPath();
         ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
         ctx.fill();
    });
}

function drawNanoBots() {
    ctx.fillStyle = NANO_BOT_COLOR;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    nanoBots.forEach(bot => {
        // Simple triangle shape for nanobot
        const size = 6; // Size of the bot
        const angle = bot.target ? Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x) : (performance.now()/500); // Spin if no target

        ctx.save();
        ctx.translate(bot.x, bot.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size / 2, size / 2);
        ctx.lineTo(-size / 2, -size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // Add outline
        ctx.restore();
    });
}


function drawPowerups() {
    powerups.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Simple flashing effect
        const scale = 1.0 + Math.sin(performance.now() / 150) * 0.1;
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fill();
        // Maybe add icon later? 'S' for shield, '$' for cash etc.
        ctx.fillStyle = '#000000'; // Text color
        ctx.font = `bold ${p.radius}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
         let symbol = '?';
         if (p.type === 'cash') symbol = '$';
         else if (p.type === 'shieldBoost') symbol = 'S';
         else if (p.type === 'damageBoost') symbol = 'D';
         else if (p.type === 'rapidFire') symbol = 'F';
         else if (p.type === 'autoAim') symbol = '@'; // Or target symbol
        ctx.fillText(symbol, p.x, p.y + 1); // Slight offset for better centering

    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / PARTICLE_LIFESPAN); // Fade out
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.life / PARTICLE_LIFESPAN), 0, Math.PI * 2); // Shrink
        ctx.fill();
        ctx.globalAlpha = 1.0; // Reset alpha
    });
}

function drawWaveIntermission() {
     if (gameState === 'waveIntermission' && waveTimer > 0) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
         ctx.font = 'bold 48px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         const secondsLeft = Math.ceil(waveTimer / 1000);
         ctx.fillText(`Wave ${currentWave} starting in ${secondsLeft}...`, canvas.width / 2, canvas.height / 2);
     }
}


// --- Game Loop ---

function draw() {
    // Clear canvas (considering potential shake)
    // Clear a slightly larger area if shake is active? Or just clear normally.
    ctx.fillStyle = '#222'; // Background color
    ctx.fillRect(-shakeOffsetX, -shakeOffsetY, canvas.width + Math.abs(shakeOffsetX*2), canvas.height + Math.abs(shakeOffsetY*2));

    // Apply screen shake translation FOR THIS FRAME
    applyScreenShake();

    // Draw game elements in order (back to front)
    drawParticles();
    drawPowerups();
    drawEnemies();
    drawNanoBots();
    drawBullets(); // Includes player and converted bullets
    drawPlayer();

    // Draw UI elements on top (like intermission text)
    drawWaveIntermission();

}

function update(dt) {
    updateWaveState(dt); // Handle wave transitions, spawning timers
    updatePlayer(dt);
    updateEnemies(dt); // Includes boss, minions, converted enemies
    updateNanoBots(dt);
    updateBullets(dt); // Includes player and converted bullets
    updatePowerups(dt);
    updateParticles(dt);
    updateScreenShake(dt); // Decay shake effect

    // Check game over condition again after updates
    if (health <= 0 && gameState === 'playing') {
        gameOver();
    }
}

function gameLoop(timestamp) {
    if (gameState !== 'playing' && gameState !== 'waveIntermission') { // Only run updates if playing or in intermission
        animationFrameId = null; // Ensure loop stops if state changes unexpectedly
        return;
    }

    deltaTime = (timestamp - lastFrameTime) / 1000; // Delta time in seconds
    lastFrameTime = timestamp;

    // Clamp deltaTime to prevent large jumps if tabbed out
    deltaTime = Math.min(deltaTime, 0.1); // Max 100ms step

    if (gameState === 'playing' || gameState === 'waveIntermission') {
        update(deltaTime);
    }

    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Inicialização ---
function init() {
    console.log("Initializing Game...");
    resizeCanvas();
    loadGameData(); // Load cash and persistent upgrades

    // Setup Button Listeners
    startBtn.addEventListener('click', startGame);
    startShopBtn.addEventListener('click', openShopOverlay);
    closeShopOverlayBtn.addEventListener('click', closeShopOverlay);
    restartBtn.addEventListener('click', restartGame);
    pauseBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);

    // Initial UI Updates
    updateCashDisplay();
    updateHealthDisplay();
    updateWaveDisplay();
    updateEnemiesRemainingUI(); // Hide initially

    // Set initial game state display
    startScreen.classList.add('visible');
    gameOverElement.classList.remove('visible');
    pauseMenu.classList.remove('visible');
    shopOverlay.classList.remove('visible');
    pauseBtn.style.display = 'none';
    hideUpgradePanel();

    // Start centered
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    // Draw initial state (optional, if needed before game starts)
    // draw(); // Maybe draw player on start screen?
     console.log("Initialization Complete. Ready to start.");
}

// --- Executar ---
init();