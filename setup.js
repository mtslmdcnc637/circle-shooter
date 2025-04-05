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
// URL ATUALIZADA ABAIXO:
enemyImage.src = 'https://i.postimg.cc/0Qp2fFv2/gene-structure-svgrepo-com-removebg-preview.png';


// --- Constantes ---
const PLAYER_COLOR = '#00BFFF'; // Cor do jogador atualizada em main.js config
const PLAYER_RADIUS = 20; // Raio do jogador atualizado em main.js config

const BULLET_COLOR = '#FFFFFF'; // Cor do projétil atualizada em main.js config
const BULLET_RADIUS = 5; // Raio do projétil atualizado em main.js config
// BASE_BULLET_SPEED definido em main.js config
// BASE_BULLET_DAMAGE definido em main.js config
const BULLET_PIERCE_MAX = 1; // Máximo de inimigos que um projétil perfurante pode atingir

// Constantes de Inimigos
const ENEMY_CIRCLE_COLOR = '#F44336'; // Cor de fallback
// BASE_ENEMY_RADIUS definido em main.js config
// BASE_ENEMY_HEALTH definido em main.js config
// BASE_ENEMY_SPEED definido em main.js config
// ENEMY_DAMAGE definido em main.js config

// Constantes de Efeitos
const PARTICLE_COUNT = 5;
const PARTICLE_SPEED = 150;
const PARTICLE_LIFESPAN = 500;
const PARTICLE_RADIUS = 2;
const DAMAGE_NUMBER_LIFESPAN = 800;
const DAMAGE_NUMBER_SPEED = -30; // Velocidade vertical (negativa para subir)

// Constantes de Pulsar Inimigo (NOVAS)
const PULSE_SPEED = 4; // Quão rápido o inimigo pulsa (radianos por segundo)
const PULSE_AMOUNT = 0.06; // Quão grande é a pulsação (0.05 = 5% de aumento/diminuição)

// --- Funções Utilitárias --- (Definidas aqui ou em gameobjects.js)
function degToRad(degrees) { return degrees * Math.PI / 180; }
function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
// function lerp(a, b, t) { return a + (b - a) * t; } // Se necessário
function lerpColor(colorA, colorB, t) {
    const hexToRgb = hex => hex?.match(/\w\w/g)?.map(x => parseInt(x, 16));
    const rgbToHex = rgb => '#' + rgb.map(x => { const h = Math.max(0, Math.min(255, Math.round(x))).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
    if (!colorA || !colorB) return '#FFFFFF';
    try { const rgbA = hexToRgb(colorA); const rgbB = hexToRgb(colorB); if (!rgbA || !rgbB || rgbA.length !== 3 || rgbB.length !== 3) return '#FFFFFF'; const rgb = rgbA.map((start, i) => start + (rgbB[i] - start) * t); return rgbToHex(rgb); }
    catch (e) { return '#FFFFFF'; }
}


// --- Configuração Inicial Canvas & Input ---
// As funções resizeCanvas e setupEventListeners agora estão em main.js
// pois dependem de 'canvas' e 'gameData' definidos lá.

console.log("Setup script finished processing.");