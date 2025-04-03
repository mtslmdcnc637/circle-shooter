// --- Seletores ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d'); // Add null check for context
const cashElement = document.getElementById('cashDisplay');
const healthElement = document.getElementById('health');
const waveIndicatorElement = document.getElementById('waveIndicator');
const enemiesRemainingElement = document.getElementById('enemiesRemaining');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const startShopBtn = document.getElementById('startShopBtn');
const gameOverElement = document.getElementById('gameOver');
const finalCashElement = document.getElementById('finalCash');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const pauseMenu = document.getElementById('pauseMenu');
const resumeBtn = document.getElementById('resumeBtn');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeItemsContainer = document.getElementById('upgradeItemsContainer');
const shopOverlay = document.getElementById('shopOverlay');
const shopCashOverlayElement = document.getElementById('shopCashOverlay');
const shopItemsContainerOverlay = document.getElementById('shopItemsContainerOverlay');
const closeShopOverlayBtn = document.getElementById('closeShopOverlayBtn');

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
const POWERUP_DROP_CHANCE = 0.10;
const POWERUP_DURATION = 7000;
const POWERUP_ATTRACTION_SPEED = 250; // Pixels per second
const POWERUP_ATTRACTION_START_DISTANCE = 150; // Pixels
const AUTO_AIM_POWERUP_COLOR = '#00BCD4'; // Cyan
const AUTO_AIM_DROP_CHANCE = 0.03; // Rarer

// Custos
const SHIELD_UNLOCK_COST = 150; const WEAPON_LEVEL_COST = 100; const DAMAGE_UP_COST = 120;
const FIRE_RATE_COST = 130; const BULLET_SPEED_COST = 90; const SHIELD_DURATION_COST = 110; const SHIELD_COOLDOWN_COST = 140;
const NANO_BOT_DEPLOY_COST = 50; // Cost to deploy ONE nanobot via UI/hotkey

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

// Chaves LocalStorage
const STORAGE_KEY_PREFIX = 'circleShooterNanoV2_';
const STORAGE_KEY_CASH = STORAGE_KEY_PREFIX + 'cash';
const STORAGE_KEY_SHIELD_UNLOCKED = STORAGE_KEY_PREFIX + 'shieldUnlocked';
const STORAGE_KEY_WEAPON_LEVEL = STORAGE_KEY_PREFIX + 'weaponLevel';
const STORAGE_KEY_DAMAGE_LEVEL = STORAGE_KEY_PREFIX + 'damageLevel'; // Explicitly store level
const STORAGE_KEY_FIRE_RATE_LEVEL = STORAGE_KEY_PREFIX + 'fireRateLevel';
const STORAGE_KEY_BULLET_SPEED_LEVEL = STORAGE_KEY_PREFIX + 'bulletSpeedLevel';
const STORAGE_KEY_SHIELD_DURATION_LEVEL = STORAGE_KEY_PREFIX + 'shieldDurationLevel';
const STORAGE_KEY_SHIELD_COOLDOWN_LEVEL = STORAGE_KEY_PREFIX + 'shieldCooldownLevel';

// --- Estado do Jogo ---
let cash = 0; let health = 100; let gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver', 'shoppingOverlay', 'waveIntermission'
let enemies = []; let bullets = []; let particles = []; let powerups = []; let nanoBots = []; let convertedBullets = [];
let bossActive = false;
let aimX = 0, aimY = 0;
let currentWave = 0; let enemiesRemainingInWave = 0; let enemiesToSpawnThisWave = 0; let enemiesSpawnedThisWave = 0;
let waveTimer = 0;
let lastEnemySpawnTime = 0;
let currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
let shakeIntensity = 0; let shakeDuration = 0;
let lastFrameTime = 0; let deltaTime = 0;
let animationFrameId = null;
let shakeOffsetX = 0; let shakeOffsetY = 0;

// --- Estado do Jogador ---
const player = {
    x: 0, y: 0, radius: PLAYER_RADIUS, color: PLAYER_COLOR,
    shieldUnlocked: false, weaponLevel: 0, damageMultiplier: 1, damageLevel: 0, // Store damage level
    fireRateLevel: 0, bulletSpeedLevel: 0, shieldDurationLevel: 0, shieldCooldownLevel: 0,
    shieldActive: false, shieldState: 'inactive', shieldTimer: 0,
    lastBulletTime: 0,
    activePowerups: {},
};

// --- Upgrade Definitions ---
// Added 'nanobot' entry. It's not level-based in the traditional sense.
const upgrades = [
    { id: 'shield', name: 'Unlock Shield', description: 'Deploy temporary shield (Space/S).', cost: SHIELD_UNLOCK_COST, levelKey: null, isPurchased: () => player.shieldUnlocked, action: () => { if (!player.shieldUnlocked) { player.shieldUnlocked = true; updateUpgradeUI(); updateShopOverlayUI(); saveGameData(); } } },
    { id: 'weaponLevel', name: 'Weapon Level', description: 'Increases bullets per shot.', cost: WEAPON_LEVEL_COST, levelKey: 'weaponLevel', maxLevel: MAX_WEAPON_LEVEL, action: (level) => { player.weaponLevel = level; } },
    { id: 'damage', name: 'Damage Up', description: `Increase bullet damage by ${DAMAGE_INCREASE_AMOUNT * 100}%.`, cost: DAMAGE_UP_COST, levelKey: 'damageLevel', maxLevel: 10, action: (level) => { player.damageLevel = level; player.damageMultiplier = 1 + (level * DAMAGE_INCREASE_AMOUNT); } },
    { id: 'fireRate', name: 'Fire Rate Up', description: `Increase fire rate by ${FIRE_RATE_INCREASE * 100}%.`, cost: FIRE_RATE_COST, levelKey: 'fireRateLevel', maxLevel: 10, action: (level) => { player.fireRateLevel = level; } },
    { id: 'bulletSpeed', name: 'Bullet Speed Up', description: `Increase bullet speed by ${BULLET_SPEED_INCREASE * 100}%.`, cost: BULLET_SPEED_COST, levelKey: 'bulletSpeedLevel', maxLevel: 10, action: (level) => { player.bulletSpeedLevel = level; } },
    { id: 'shieldDuration', name: 'Shield Duration', description: `Increase shield active time by ${SHIELD_DURATION_INCREASE / 1000}s.`, cost: SHIELD_DURATION_COST, levelKey: 'shieldDurationLevel', maxLevel: 5, requiresShield: true, action: (level) => { player.shieldDurationLevel = level; } },
    { id: 'shieldCooldown', name: 'Shield Cooldown', description: `Decrease shield cooldown by ${SHIELD_COOLDOWN_DECREASE / 1000}s.`, cost: SHIELD_COOLDOWN_COST, levelKey: 'shieldCooldownLevel', maxLevel: 8, requiresShield: true, action: (level) => { player.shieldCooldownLevel = level; } },
    // --- Added Nanobot Purchase Option ---
    { id: 'nanobot', name: 'Deploy Nanobot', description: `Launch a bot to convert an enemy (${NANO_BOT_DEPLOY_COST} Cash). Hotkey: B`, cost: NANO_BOT_DEPLOY_COST, levelKey: null, isPurchasable: true, // Special flag? Or just check cost
      action: () => buyNanoBotUpgrade() // Action calls a wrapper
    }
];

// --- Funções Utilitárias ---
function degToRad(degrees) { return degrees * Math.PI / 180; }
function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(colorA, colorB, t) {
    const hexToRgb = hex => hex?.match(/\w\w/g)?.map(x => parseInt(x, 16)); // Safer parsing
    const rgbToHex = rgb => '#' + rgb.map(x => { const hex = x.toString(16); return hex.length === 1 ? '0' + hex : hex; }).join('');
    if (!colorA || !colorB) return '#FFFFFF';
    try {
        const rgbA = hexToRgb(colorA); const rgbB = hexToRgb(colorB);
        if (!rgbA || !rgbB || rgbA.length !== 3 || rgbB.length !== 3) return '#FFFFFF';
        const rgb = rgbA.map((start, i) => Math.round(start + (rgbB[i] - start) * t));
        return rgbToHex(rgb);
    } catch (e) { console.error("Color lerp error:", e, colorA, colorB); return '#FFFFFF'; }
}

// --- Funções de Persistência ---
function loadGameData() {
    try {
        cash = parseInt(localStorage.getItem(STORAGE_KEY_CASH) || '0');
        player.shieldUnlocked = localStorage.getItem(STORAGE_KEY_SHIELD_UNLOCKED) === 'true';
        player.weaponLevel = parseInt(localStorage.getItem(STORAGE_KEY_WEAPON_LEVEL) || '0');
        player.damageLevel = parseInt(localStorage.getItem(STORAGE_KEY_DAMAGE_LEVEL) || '0');
        player.fireRateLevel = parseInt(localStorage.getItem(STORAGE_KEY_FIRE_RATE_LEVEL) || '0');
        player.bulletSpeedLevel = parseInt(localStorage.getItem(STORAGE_KEY_BULLET_SPEED_LEVEL) || '0');
        player.shieldDurationLevel = parseInt(localStorage.getItem(STORAGE_KEY_SHIELD_DURATION_LEVEL) || '0');
        player.shieldCooldownLevel = parseInt(localStorage.getItem(STORAGE_KEY_SHIELD_COOLDOWN_LEVEL) || '0');
        player.damageMultiplier = 1 + (player.damageLevel * DAMAGE_INCREASE_AMOUNT); // Recalculate multiplier
        updateCashDisplay();
    } catch (e) { console.error("Error loading game data:", e); }
}
function saveGameData() {
    try {
        localStorage.setItem(STORAGE_KEY_CASH, cash.toString());
        localStorage.setItem(STORAGE_KEY_SHIELD_UNLOCKED, player.shieldUnlocked.toString());
        localStorage.setItem(STORAGE_KEY_WEAPON_LEVEL, player.weaponLevel.toString());
        localStorage.setItem(STORAGE_KEY_DAMAGE_LEVEL, player.damageLevel.toString());
        localStorage.setItem(STORAGE_KEY_FIRE_RATE_LEVEL, player.fireRateLevel.toString());
        localStorage.setItem(STORAGE_KEY_BULLET_SPEED_LEVEL, player.bulletSpeedLevel.toString());
        localStorage.setItem(STORAGE_KEY_SHIELD_DURATION_LEVEL, player.shieldDurationLevel.toString());
        localStorage.setItem(STORAGE_KEY_SHIELD_COOLDOWN_LEVEL, player.shieldCooldownLevel.toString());
    } catch (e) { console.error("Error saving game data:", e); }
}

// --- Configuração Inicial Canvas ---
function resizeCanvas() {
    const aspectRatio = 16 / 9;
    let w = window.innerWidth - 20; let h = window.innerHeight - 20;
    if (w / h > aspectRatio) { w = h * aspectRatio; } else { h = w / aspectRatio; }
    const maxWidth = 1400; const maxHeight = 787;
    w = Math.min(w, maxWidth); h = Math.min(h, maxHeight);
    if (canvas) { canvas.width = Math.floor(w); canvas.height = Math.floor(h); }
    if (gameState === 'start' || gameState === 'gameOver' || !player.x || !player.y) {
        player.x = canvas?.width / 2 || 300; player.y = canvas?.height / 2 || 200;
    }
    aimX = canvas?.width / 2 || 300; aimY = canvas?.height / 2 || 200;
}