// --- Seletores ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');
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
const nanobotCountElement = document.getElementById('nanobotCount'); // Example ID

// --- Constantes ---
const PLAYER_COLOR = '#4CAF50'; const PLAYER_RADIUS = 20;
const BULLET_COLOR = '#2196F3'; const BULLET_RADIUS = 5; const BASE_BULLET_SPEED = 400;
const BASE_BULLET_DAMAGE = 10; const BULLET_PIERCE_MAX = 1;

const ENEMY_CIRCLE_COLOR = '#F44336'; const ENEMY_SQUARE_COLOR = '#FF9800'; const ENEMY_TRIANGLE_COLOR = '#9C27B0';
const ENEMY_SHOOTER_COLOR = '#673AB7'; const ENEMY_SPLITTER_COLOR = '#00BCD4';
const BASE_ENEMY_RADIUS = 15; const BASE_ENEMY_HEALTH = 30; const BASE_ENEMY_SPEED = 40;
const ENEMY_SPEED_RANDOMNESS = 15;
const ENEMY_SHOOT_COOLDOWN = 2500; const ENEMY_BULLET_SPEED = 200; const ENEMY_BULLET_RADIUS = 4; const ENEMY_BULLET_DAMAGE = 8; const ENEMY_BULLET_COLOR = '#FF5722';
const SPLITTER_CHILD_COUNT = 2;

const SHIELD_COLOR = '#FFEB3B'; const BASE_SHIELD_ACTIVE_DURATION = 5000; const BASE_SHIELD_COOLDOWN_DURATION = 8000; const MAX_WEAPON_LEVEL = 3;
const SHIELD_EXPLOSION_RADIUS = 70; const SHIELD_EXPLOSION_DAMAGE = 15;

const BOSS_WAVE_INTERVAL = 5; const BOSS_COLOR = '#E91E63'; const BOSS_HEALTH_MULTIPLIER = 30; const BOSS_RADIUS_MULTIPLIER = 2.5; const BOSS_MINION_SPAWN_COOLDOWN = 6000; const BOSS_MINION_COUNT = 3;

const POWERUP_DROP_CHANCE = 0.10; const POWERUP_DURATION = 7000;
const POWERUP_ATTRACTION_SPEED = 250; const POWERUP_ATTRACTION_START_DISTANCE = 150;
const POWERUP_HEALTH_COLOR = '#4CAF50'; const POWERUP_MAGNET_COLOR = '#E91E63'; const POWERUP_FREEZE_COLOR = '#00E5FF';
const AUTO_AIM_POWERUP_COLOR = '#00BCD4'; const AUTO_AIM_DROP_CHANCE = 0.03;
const HEALTH_PACK_AMOUNT = 25; const MAGNET_DURATION = 5000;

// Custos
const SHIELD_UNLOCK_COST = 150; const WEAPON_LEVEL_COST = 100; const DAMAGE_UP_COST = 120;
const FIRE_RATE_COST = 130; const BULLET_SPEED_COST = 90; const SHIELD_DURATION_COST = 110; const SHIELD_COOLDOWN_COST = 140;
const NANO_BOT_DEPLOY_COST = 50;
const NANOBOT_SPEEDUP_COST = 180; const SHIELD_EXPLODE_COST = 200; const BULLET_PIERCE_COST = 250;

// Valores Upgrades
const DAMAGE_INCREASE_AMOUNT = 0.20; const FIRE_RATE_INCREASE = 0.15; const BULLET_SPEED_INCREASE = 0.10;
const SHIELD_DURATION_INCREASE = 1000; const SHIELD_COOLDOWN_DECREASE = 750; const MIN_SHIELD_COOLDOWN = 2000;
const NANOBOT_INFECTION_SPEED_MULTIPLIER = 1.5;

const NANO_BOT_SPEED = 300; const NANO_BOT_INFECTION_TIME = 2000; // Base time
const CONVERTED_DURATION = 10000; const CONVERTED_ENEMY_RADIUS_FACTOR = 0.7; const CONVERTED_SHOOT_COOLDOWN = 1500;
const CONVERTED_BULLET_SPEED = 250; const CONVERTED_BULLET_RADIUS = 4; const CONVERTED_BULLET_DAMAGE = 5;
const CONVERTED_BULLET_COLOR = '#76FF03'; const NANO_BOT_COLOR = '#00FF00';

const PARTICLE_COUNT = 5; const PARTICLE_SPEED = 150; const PARTICLE_LIFESPAN = 500; const PARTICLE_RADIUS = 2;
const DAMAGE_NUMBER_LIFESPAN = 800; const DAMAGE_NUMBER_SPEED = -30;

// Wave System
const BASE_ENEMIES_PER_WAVE = 5; const ENEMIES_PER_WAVE_INCREASE = 2; const WAVE_INTERMISSION_TIME = 3000;
const BASE_ENEMY_SPAWN_INTERVAL = 2000; const MIN_ENEMY_SPAWN_INTERVAL = 300; const SPAWN_INTERVAL_REDUCTION_PER_WAVE = 50;
const WAVE_CLEAR_MSG_DURATION = 1500;

// Chaves LocalStorage
const STORAGE_KEY_PREFIX = 'circleShooterNanoV3_'; // Version 3
const STORAGE_KEY_CASH = STORAGE_KEY_PREFIX + 'cash';
const STORAGE_KEY_SHIELD_UNLOCKED = STORAGE_KEY_PREFIX + 'shieldUnlocked';
const STORAGE_KEY_WEAPON_LEVEL = STORAGE_KEY_PREFIX + 'weaponLevel';
const STORAGE_KEY_DAMAGE_LEVEL = STORAGE_KEY_PREFIX + 'damageLevel';
const STORAGE_KEY_FIRE_RATE_LEVEL = STORAGE_KEY_PREFIX + 'fireRateLevel';
const STORAGE_KEY_BULLET_SPEED_LEVEL = STORAGE_KEY_PREFIX + 'bulletSpeedLevel';
const STORAGE_KEY_SHIELD_DURATION_LEVEL = STORAGE_KEY_PREFIX + 'shieldDurationLevel';
const STORAGE_KEY_SHIELD_COOLDOWN_LEVEL = STORAGE_KEY_PREFIX + 'shieldCooldownLevel';
const STORAGE_KEY_NANOBOT_INFECT_LEVEL = STORAGE_KEY_PREFIX + 'nanobotInfectLevel';
const STORAGE_KEY_SHIELD_EXPLODE_UNLOCKED = STORAGE_KEY_PREFIX + 'shieldExplodeUnlocked';
const STORAGE_KEY_BULLET_PIERCE_UNLOCKED = STORAGE_KEY_PREFIX + 'bulletPierceUnlocked';

// --- Estado do Jogo (Global variables declared with let ONCE here) ---
let cash = 0; let health = 100; let gameState = 'start';
let enemies = []; let bullets = []; let particles = []; let powerups = []; let nanoBots = []; let convertedBullets = [];
let enemyBullets = []; let damageNumbers = [];
let bossActive = false; let aimX = 0; let aimY = 0; let currentWave = 0;
let enemiesRemainingInWave = 0; let enemiesToSpawnThisWave = 0; let enemiesSpawnedThisWave = 0;
let waveTimer = 0; let waveClearMessageTimer = 0;
let lastEnemySpawnTime = 0; let currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL;
let shakeIntensity = 0; let shakeDuration = 0; let lastFrameTime = 0; let deltaTime = 0;
let animationFrameId = null; let shakeOffsetX = 0; let shakeOffsetY = 0;

// --- Estado do Jogador ---
const player = {
    x: 0, y: 0, radius: PLAYER_RADIUS, color: PLAYER_COLOR,
    shieldUnlocked: false, weaponLevel: 0, damageMultiplier: 1, damageLevel: 0,
    fireRateLevel: 0, bulletSpeedLevel: 0, shieldDurationLevel: 0, shieldCooldownLevel: 0,
    nanobotInfectLevel: 0, shieldExplodeUnlocked: false, bulletPierceUnlocked: false,
    shieldActive: false, shieldState: 'inactive', shieldTimer: 0, lastBulletTime: 0,
    activePowerups: {},
};

// --- Upgrade Definitions ---
const upgrades = [
    { id: 'shield', name: 'Unlock Shield', description: 'Deploy temporary shield (Space/S).', cost: SHIELD_UNLOCK_COST, levelKey: null, isPurchased: () => player.shieldUnlocked, action: () => { if (!player.shieldUnlocked) { player.shieldUnlocked = true; } } },
    { id: 'weaponLevel', name: 'Weapon Level', description: 'Increases bullets per shot.', cost: WEAPON_LEVEL_COST, levelKey: 'weaponLevel', maxLevel: MAX_WEAPON_LEVEL, action: (level) => { player.weaponLevel = level; } },
    { id: 'damage', name: 'Damage Up', description: `Increase bullet damage by ${DAMAGE_INCREASE_AMOUNT * 100}%.`, cost: DAMAGE_UP_COST, levelKey: 'damageLevel', maxLevel: 10, action: (level) => { player.damageLevel = level; player.damageMultiplier = 1 + (level * DAMAGE_INCREASE_AMOUNT); } },
    { id: 'fireRate', name: 'Fire Rate Up', description: `Increase fire rate by ${FIRE_RATE_INCREASE * 100}%.`, cost: FIRE_RATE_COST, levelKey: 'fireRateLevel', maxLevel: 10, action: (level) => { player.fireRateLevel = level; } },
    { id: 'bulletSpeed', name: 'Bullet Speed Up', description: `Increase bullet speed by ${BULLET_SPEED_INCREASE * 100}%.`, cost: BULLET_SPEED_COST, levelKey: 'bulletSpeedLevel', maxLevel: 10, action: (level) => { player.bulletSpeedLevel = level; } },
    { id: 'nanobotInfect', name: 'Faster Infection', description: `Nanobots infect enemies ${NANOBOT_INFECTION_SPEED_MULTIPLIER * 100 - 100}% faster.`, cost: NANOBOT_SPEEDUP_COST, levelKey: 'nanobotInfectLevel', maxLevel: 3, action: (level) => { player.nanobotInfectLevel = level; } },
    { id: 'bulletPierce', name: 'Piercing Shots', description: `Bullets pierce 1 enemy.`, cost: BULLET_PIERCE_COST, levelKey: null, isPurchased: () => player.bulletPierceUnlocked, action: () => { if (!player.bulletPierceUnlocked) player.bulletPierceUnlocked = true; } },
    { id: 'shieldDuration', name: 'Shield Duration', description: `Increase shield active time by ${SHIELD_DURATION_INCREASE / 1000}s.`, cost: SHIELD_DURATION_COST, levelKey: 'shieldDurationLevel', maxLevel: 5, requiresShield: true, action: (level) => { player.shieldDurationLevel = level; } },
    { id: 'shieldCooldown', name: 'Shield Cooldown', description: `Decrease shield cooldown by ${SHIELD_COOLDOWN_DECREASE / 1000}s.`, cost: SHIELD_COOLDOWN_COST, levelKey: 'shieldCooldownLevel', maxLevel: 8, requiresShield: true, action: (level) => { player.shieldCooldownLevel = level; } },
    { id: 'shieldExplode', name: 'Shield Explosion', description: `Shield explodes on expiry/break.`, cost: SHIELD_EXPLODE_COST, levelKey: null, requiresShield: true, isPurchased: () => player.shieldExplodeUnlocked, action: () => { if(!player.shieldExplodeUnlocked) player.shieldExplodeUnlocked = true; } },
    { id: 'nanobot', name: 'Deploy Nanobot', description: `Launch a bot to convert an enemy (${NANO_BOT_DEPLOY_COST} Cash). Hotkey: B`, cost: NANO_BOT_DEPLOY_COST, levelKey: null, isPurchasable: true, action: () => buyNanoBotUpgrade() }
];
// console.log("Upgrades array defined:", upgrades.length); // Verify length


// --- Funções Utilitárias ---
function degToRad(degrees) { return degrees * Math.PI / 180; }
function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(colorA, colorB, t) {
    const hexToRgb = hex => hex?.match(/\w\w/g)?.map(x => parseInt(x, 16));
    const rgbToHex = rgb => '#' + rgb.map(x => { const h = Math.max(0, Math.min(255, Math.round(x))).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    if (!colorA || !colorB) return '#FFFFFF';
    try {
        const rgbA = hexToRgb(colorA); const rgbB = hexToRgb(colorB);
        if (!rgbA || !rgbB || rgbA.length !== 3 || rgbB.length !== 3) return '#FFFFFF';
        const rgb = rgbA.map((start, i) => start + (rgbB[i] - start) * t);
        return rgbToHex(rgb);
    } catch (e) { /* console.error("Color lerp error:", e, colorA, colorB); */ return '#FFFFFF'; } // Reduce console spam
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
        player.nanobotInfectLevel = parseInt(localStorage.getItem(STORAGE_KEY_NANOBOT_INFECT_LEVEL) || '0');
        player.shieldExplodeUnlocked = localStorage.getItem(STORAGE_KEY_SHIELD_EXPLODE_UNLOCKED) === 'true';
        player.bulletPierceUnlocked = localStorage.getItem(STORAGE_KEY_BULLET_PIERCE_UNLOCKED) === 'true';
        player.damageMultiplier = 1 + (player.damageLevel * DAMAGE_INCREASE_AMOUNT);
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
        localStorage.setItem(STORAGE_KEY_NANOBOT_INFECT_LEVEL, player.nanobotInfectLevel.toString());
        localStorage.setItem(STORAGE_KEY_SHIELD_EXPLODE_UNLOCKED, player.shieldExplodeUnlocked.toString());
        localStorage.setItem(STORAGE_KEY_BULLET_PIERCE_UNLOCKED, player.bulletPierceUnlocked.toString());
    } catch (e) { console.error("Error saving game data:", e); }
}

// --- Configuração Inicial Canvas & Input ---
function resizeCanvas() {
    const maxWidth = 1400; const maxHeight = 900;
    const width = Math.min(window.innerWidth - 10, maxWidth);
    const height = Math.min(window.innerHeight - 10, maxHeight);
    if (canvas) { canvas.width = width; canvas.height = height; }
    else { console.error("Canvas element not found during resize!"); }
    if (gameState === 'start' || gameState === 'gameOver' || !player.x || !player.y) {
        player.x = canvas?.width / 2 || 300; player.y = canvas?.height / 2 || 200;
    }
    aimX = canvas?.width / 2 || 300; aimY = canvas?.height / 2 || 200;
}

function updateAimPosition(event) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); let clientX, clientY;
    if (event.touches && event.touches.length > 0) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
    else if (event.clientX !== undefined) { clientX = event.clientX; clientY = event.clientY; }
    else return;
    aimX = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    aimY = Math.max(0, Math.min(canvas.height, clientY - rect.top));
}