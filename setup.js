// --- Seletores ---
// REMOVIDOS - Devem ser declarados em ui.js e main.js

// --- Imagem do Inimigo ---
const enemyImage = new Image();
let enemyImageLoaded = false;
enemyImage.onload = () => {
    enemyImageLoaded = true;
    console.log("Enemy SVG loaded successfully.");
};
enemyImage.onerror = () => {
    console.error("Failed to load enemy SVG image.");
    enemyImageLoaded = false;
};
enemyImage.src = 'https://i.postimg.cc/0Qp2fFv2/gene-structure-svgrepo-com-removebg-preview.png'; // URL da sua imagem SVG

// --- Constantes Globais ---

// Player & Shield
const PLAYER_RADIUS = 20; // Definido aqui, usado por gameobjects e main
const PLAYER_COLOR = '#00BFFF'; // Definido aqui
const SHIELD_COLOR = '#FFEB3B'; // Amarelo para escudo
const BASE_SHIELD_DURATION = 4000; // ms (4 segundos)
const BASE_SHIELD_COOLDOWN = 10000; // ms (10 segundos)
const SHIELD_DURATION_INCREASE_PER_LEVEL = 750; // ms
const SHIELD_COOLDOWN_DECREASE_PER_LEVEL = 1000; // ms
const MIN_SHIELD_COOLDOWN = 3000; // ms
const SHIELD_EXPLOSION_RADIUS = 120; // Raio da explosão ao fim do escudo
const SHIELD_EXPLOSION_DAMAGE = 50; // Dano da explosão do escudo

// Bullets (Player)
const BULLET_COLOR = '#FFFFFF'; // Definido aqui
const BULLET_RADIUS = 5; // Definido aqui
const BASE_BULLET_DAMAGE = 10; // Dano base
const BASE_BULLET_SPEED = 750; // Velocidade base
const BASE_FIRE_RATE_DELAY = 1000; // ms entre tiros no nível 0
const FIRE_RATE_REDUCTION_FACTOR = 0.85; // 15% mais rápido por nível
const MIN_FIRE_RATE_DELAY = 100; // ms
const BULLET_SPEED_INCREASE_FACTOR = 0.15; // +15% por nível
const BULLET_DAMAGE_INCREASE_FACTOR = 0.30; // +30% por nível
const BULLET_SIZE_INCREASE_PER_LEVEL = 0.75; // Aumento no raio por nível
const BULLET_PIERCE_INCREASE_PER_LEVEL = 1; // +1 perfuração por nível

// Nanobots & Conversion
const NANO_BOT_COLOR = '#00FF00'; // Verde para nanobots
const NANO_BOT_RADIUS = 4;
const NANO_BOT_SPEED = 350; // pixels/sec
const BASE_NANO_BOT_INFECTION_TIME = 3000; // ms (3 segundos)
const NANO_BOT_INFECTION_SPEED_MULTIPLIER = 1.25; // 25% mais rápido por nível
const CONVERTED_DURATION = 10000; // ms (10 segundos)
const CONVERTED_ENEMY_RADIUS_FACTOR = 0.8; // Tamanho do convertido
const CONVERTED_SHOOT_COOLDOWN = 1200; // ms entre tiros do convertido
const CONVERTED_BULLET_SPEED = 300; // pixels/sec
const CONVERTED_BULLET_RADIUS = 4;
const CONVERTED_BULLET_DAMAGE_FACTOR = 0.5; // Metade do dano atual do jogador
const CONVERTED_BULLET_COLOR = '#76FF03'; // Verde claro

// Enemies
const ENEMY_CIRCLE_COLOR = '#F44336'; // Cor de fallback para círculo
const ENEMY_TRIANGLE_COLOR = '#9C27B0'; // Roxo para triângulo
const ENEMY_SHOOTER_COLOR = '#FF9800'; // Laranja para atirador
const ENEMY_SPLITTER_COLOR = '#03A9F4'; // Azul claro para splitter
const ENEMY_BOSS_COLOR = '#E91E63'; // Rosa para Boss
const BASE_ENEMY_RADIUS = 25;
const BASE_ENEMY_HEALTH = 15; // Vida base reduzida
const BASE_ENEMY_SPEED = 50; // Velocidade base aumentada
const BASE_ENEMY_DAMAGE = 10;
const ENEMY_HEALTH_SCALING = 0.15; // +15% por wave
const ENEMY_SPEED_SCALING = 0.08; // +8% por wave
const ENEMY_BULLET_COLOR = '#FF5722'; // Cor da bala inimiga
const ENEMY_BULLET_RADIUS = 4;
const ENEMY_BULLET_SPEED = 200;
const ENEMY_BULLET_DAMAGE = 5;
const ENEMY_SHOOTER_COOLDOWN = 2500; // ms
const SPLITTER_CHILD_COUNT = 3; // Quantos filhos um splitter cria

// Boss Specific
const BOSS_WAVE_INTERVAL = 5; // Boss a cada 5 waves
const BOSS_HEALTH_MULTIPLIER = 40; // Boss tem 40x vida base
const BOSS_RADIUS_MULTIPLIER = 2.5;
const BOSS_SPEED_MULTIPLIER = 0.6; // Boss é mais lento
const BOSS_MINION_SPAWN_COOLDOWN = 7000; // ms
const BOSS_MINION_COUNT = 3; // Quantos minions por vez

// Powerups
const POWERUP_DROP_CHANCE = 0.12; // Chance base de dropar powerup
const POWERUP_LIFESPAN = 12000; // ms (12 segundos)
const POWERUP_ATTRACTION_SPEED = 350; // Velocidade de atração
// const POWERUP_ATTRACTION_START_DISTANCE = 150; // REMOVIDO - Atração global
const POWERUP_RADIUS = 10;
// Powerup Types & Colors
const POWERUP_CASH_COLOR = '#FFEB3B'; const POWERUP_CASH_SYMBOL = '$';
const POWERUP_HEALTH_COLOR = '#F44336'; const POWERUP_HEALTH_SYMBOL = '+';
const POWERUP_SHIELD_RECHARGE_COLOR = '#03A9F4'; const POWERUP_SHIELD_RECHARGE_SYMBOL = 'S';
const POWERUP_DAMAGE_BOOST_COLOR = '#FF9800'; const POWERUP_DAMAGE_BOOST_SYMBOL = 'D'; const POWERUP_DAMAGE_BOOST_DURATION = 7000; const POWERUP_DAMAGE_BOOST_MULTIPLIER = 1.8;
const POWERUP_FIRE_RATE_BOOST_COLOR = '#9C27B0'; const POWERUP_FIRE_RATE_BOOST_SYMBOL = 'F'; const POWERUP_FIRE_RATE_BOOST_DURATION = 7000; const POWERUP_FIRE_RATE_BOOST_MULTIPLIER = 0.5; // Reduz delay pela metade
const POWERUP_MAGNET_COLOR = '#00BCD4'; const POWERUP_MAGNET_SYMBOL = 'M'; const POWERUP_MAGNET_DURATION = 8000; const POWERUP_MAGNET_SPEED_MULTIPLIER = 2.5; // Ímã aumenta velocidade de atração

// Auto Aim
const AUTO_AIM_MAX_LEVEL = 5;
const AUTO_AIM_BASE_LERP_FACTOR = 0.02; // Quão rápido a mira ajusta (2% por frame no nível 1)
const AUTO_AIM_LERP_INCREASE_PER_LEVEL = 0.02; // Aumento por nível

// Effects
const PARTICLE_COUNT = 5;
const PARTICLE_SPEED = 150;
const PARTICLE_LIFESPAN = 500;
const PARTICLE_RADIUS = 2;
const DAMAGE_NUMBER_LIFESPAN = 800;
const DAMAGE_NUMBER_SPEED = -40; // Sobe mais rápido
const PULSE_SPEED = 4; // Radianos por segundo para pulsação do inimigo
const PULSE_AMOUNT = 0.05; // 5% de variação no tamanho visual

// Wave System
const BASE_ENEMIES_PER_WAVE = 5;
const ENEMIES_PER_WAVE_INCREASE = 2;
const WAVE_INTERMISSION_TIME = 4000; // ms (4 segundos)
const BASE_ENEMY_SPAWN_INTERVAL = 1800; // ms
const MIN_ENEMY_SPAWN_INTERVAL = 250; // ms
const SPAWN_INTERVAL_REDUCTION_PER_WAVE = 60; // ms
const WAVE_CLEAR_MSG_DURATION = 2500; // ms

// --- Variáveis Globais de Estado (Inicializadas em main.js) ---
// let cash, health, currentWave, gameState, etc. -> movidos para gameData em main.js
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeOffsetX = 0; // Usado por drawing.js
let shakeOffsetY = 0; // Usado por drawing.js
let waveClearMessageTimer = 0; // Usado por updates.js e drawing.js

// --- Funções Utilitárias --- (Podem ficar aqui ou em outro arquivo util.js)
function degToRad(degrees) { return degrees * Math.PI / 180; }
function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
function lerp(a, b, t) { return a + (b - a) * t; } // Interpolação linear
function lerpAngle(a, b, t) { // Interpolação de ângulo (considera a volta)
    const delta = b - a;
    const shortestAngle = Math.atan2(Math.sin(delta), Math.cos(delta));
    return a + lerp(0, shortestAngle, t);
}
function lerpColor(colorA, colorB, t) {
    const hexToRgb = hex => hex?.match(/\w\w/g)?.map(x => parseInt(x, 16));
    const rgbToHex = rgb => '#' + rgb.map(x => { const h = Math.max(0, Math.min(255, Math.round(x))).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    if (!colorA || !colorB) return '#FFFFFF'; // Cor padrão em caso de erro
    try {
        const rgbA = hexToRgb(colorA); const rgbB = hexToRgb(colorB);
        if (!rgbA || !rgbB || rgbA.length !== 3 || rgbB.length !== 3) return '#FFFFFF';
        const rgb = rgbA.map((start, i) => start + (rgbB[i] - start) * t);
        return rgbToHex(rgb);
    } catch (e) {
        console.error("Erro lerpColor:", e, colorA, colorB);
        return '#FFFFFF'; // Retorna branco em caso de exceção
    }
}


// --- Configuração Inicial Canvas & Input ---
// As funções resizeCanvas e setupEventListeners agora estão em main.js

console.log("Setup script finished processing.");