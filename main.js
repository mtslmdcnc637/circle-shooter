// main.js - Lógica Principal do Jogo

// --- Canvas e Contexto ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Estado Global do Jogo (agora usando variáveis globais para simplificar acesso) ---
let player = null;
let bullets = []; // Balas do jogador
let convertedBullets = []; // Balas de inimigos convertidos
let enemyBullets = []; // Balas de inimigos normais
let enemies = [];
let nanoBots = []; // Nanobots ativos
let powerups = [];
let particles = [];
let damageNumbers = [];

let cash = 0;
let health = 100;
let baseHealth = 100; // Para upgrades de vida máxima
let currentWave = 0;
let enemiesToSpawnThisWave = 0;
let enemiesSpawnedThisWave = 0;
// let enemiesDefeatedThisWave = 0; // Substituído por enemiesRemainingInWave
let enemiesRemainingInWave = 0; // Contagem mais precisa

let gameState = 'loading'; // 'loading', 'start', 'waveIntermission', 'playing', 'paused', 'gameOver', 'shopOverlay'
let waveTimer = 0; // Usado para intermission
let lastEnemySpawnTime = 0;
let currentEnemySpawnInterval = BASE_ENEMY_SPAWN_INTERVAL; // Valor inicial
let bossActive = false; // Flag para indicar se um boss está na tela

let lastTime = 0;
let deltaTime = 0;
let mousePos = { x: 0, y: 0 };
let animationFrameId = null; // Para controlar o loop

// --- Funções de Controle do Jogo ---

function initializeGame() {
    console.log("Initializing Game...");
    gameState = 'loading'; // Estado inicial
    cancelAnimationFrame(animationFrameId); // Garante que loop anterior pare
    animationFrameId = null;

    resizeCanvas(); // Ajusta tamanho antes de posicionar

    // Cria jogador usando a classe
    if (typeof Player !== 'undefined') {
        player = new Player(canvas.width / 2, canvas.height / 2, PLAYER_RADIUS, PLAYER_COLOR);
    } else {
        console.error("Classe Player não definida!");
        return; // Não continuar sem Player
    }

    // Zera arrays de estado
    bullets = [];
    convertedBullets = [];
    enemyBullets = [];
    enemies = [];
    nanoBots = [];
    powerups = [];
    particles = [];
    damageNumbers = [];

    // Reseta variáveis de jogo
    cash = 1000; // Cash inicial
    baseHealth = 100;
    health = baseHealth;
    currentWave = 0;
    enemiesToSpawnThisWave = 0;
    enemiesSpawnedThisWave = 0;
    enemiesRemainingInWave = 0;
    waveTimer = WAVE_INTERMISSION_TIME; // Inicia com tempo para primeira wave
    lastEnemySpawnTime = 0;
    bossActive = false;
    gameState = 'start'; // Pronto para ir para a tela inicial
    lastTime = performance.now();
    mousePos = { x: canvas.width / 2, y: canvas.height / 2 }; // Mira no centro

    // Zera estado do jogador (exceto upgrades persistentes se houver)
    player.shieldState = 'inactive';
    player.shieldTimer = 0;
    player.lastBulletTime = 0;
    player.activePowerups = {};
    player.currentAimAngle = -Math.PI / 2; // Mira para cima inicialmente

    // Zera/Reseta Upgrades (se não forem persistentes)
    initializeUpgrades();

    // Inicializa UI e Listeners
    // Chama as funções da UI através do window para garantir o escopo
    if (typeof window.initializeUI === 'function') {
        window.initializeUI(); // Mostra start screen, atualiza displays
    } else {
        console.error("initializeUI function not found!");
    }
    setupEventListeners();

    console.log("Game Initialized. State: 'start'");
}

function startGame() {
    // Verifica se o jogo já está rodando ou se está na tela inicial
    if (gameState !== 'start') {
        console.warn("Attempted to start game from invalid state:", gameState);
        return;
    }
    console.log("Starting Game...");

    // Atualiza UI usando chamadas via window
    if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay(); else console.error("updateHealthDisplay not found");
    if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay(); else console.error("updateCashDisplay not found");
    if (typeof window.updateWaveIndicator === 'function') window.updateWaveIndicator(); else console.error("updateWaveIndicator not found");
    // Chamada para updateEnemiesRemainingDisplay AQUI
    if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); else console.error("updateEnemiesRemainingDisplay not found");
    if (typeof window.hideUpgradePanel === 'function') window.hideUpgradePanel(); else console.error("hideUpgradePanel not found");
    if (typeof window.hideStartScreen === 'function') window.hideStartScreen(); else console.error("hideStartScreen not found"); // Esconde tela inicial


    // Inicia a primeira wave
    gameState = 'waveIntermission'; // Começa na intermission da wave 1
    waveTimer = WAVE_INTERMISSION_TIME / 2; // Meio tempo para wave 1
    waveClearMessageTimer = 0; // Sem mensagem de clear no início
    lastTime = performance.now();

    // Garante que o loop não está rodando antes de iniciar
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game Loop Started.");
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    cancelAnimationFrame(animationFrameId); // Para o loop
    animationFrameId = null;
    console.log("Game Paused.");
    if (typeof window.showPauseMenu === 'function') window.showPauseMenu(); // Mostra menu de pausa
}

function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    lastTime = performance.now(); // Reseta timer para evitar salto no deltaTime
    if (!animationFrameId) { // Reinicia loop se não estiver rodando
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    console.log("Game Resumed.");
    if (typeof window.hidePauseMenu === 'function') window.hidePauseMenu(); // Esconde menu de pausa
}

function gameOver() {
    if (gameState === 'gameOver') return; // Evita chamadas múltiplas
    gameState = 'gameOver';
    cancelAnimationFrame(animationFrameId); // Para o loop
    animationFrameId = null;
    console.log("Game Over!");
    saveGameData(); // Salva pontuação final/cash
    if (typeof window.showGameOverScreen === 'function') window.showGameOverScreen(cash); // Mostra tela de game over com cash final
}

// --- Lógica de Ativação (Chamada por Input/UI) ---
function activateShield() {
     const now = performance.now();
     if (!player) return;
     // Só ativa se desbloqueado e inativo
     if (player.shieldUnlockLevel > 0 && player.shieldState === 'inactive') {
         player.shieldState = 'active';
         player.shieldTimer = now; // Marca início da ativação
         console.log("Shield Activated!");
     } else {
         console.log(`Shield not ready. State: ${player.shieldState}`);
         if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, "Shield Not Ready", "#AAAAAA");
     }
}

function deployNanoBot() {
    if (!player) return;
    if (player.nanobotUnlockLevel <= 0) {
        console.log("Nanobots not unlocked.");
        if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, "Locked!", "#FFAAAA");
        return;
    }
    // Custo para implantar (definido em setup.js)
    const DEPLOY_COST = 50; // Pode buscar de setup.js se preferir: typeof NANO_BOT_DEPLOY_COST !== 'undefined' ? NANO_BOT_DEPLOY_COST : 50;
    if (cash < DEPLOY_COST) {
        console.log("Not enough cash to deploy nanobot.");
        if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, `Need $${DEPLOY_COST}`, "#FFEB3B");
        return;
    }

    cash -= DEPLOY_COST;
    // Chama updateCashDisplay via window
    if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
    saveGameData(); // Salva cash após gastar

    nanoBots.push(new NanoBot(player.x, player.y)); // Cria e adiciona ao array global
    console.log("Deployed Nanobot!");
    if(typeof createParticles === 'function') createParticles(player.x, player.y, NANO_BOT_COLOR, 10); // Efeito visual
}

// --- Funções de Lógica do Jogo (Chamadas no Loop) ---

function updateGame(dt) {
    // Ordem de update pode importar
    // Atualiza estado da wave primeiro para decidir se spawna/termina
    updateWaveState(dt);

    // Atualiza entidades
    updatePlayer(dt);    // Escudo, powerups, mira
    updateEnemies(dt);   // Movimento, ataque, conversão
    updateNanoBots(dt);  // Busca, movimento
    updateBullets(dt);   // Movimento, colisão player/convertido
    updateEnemyBullets(dt); // Movimento, colisão inimigo
    updatePowerups(dt);  // Atração, expiração
    updateParticles(dt); // Animação
    updateDamageNumbers(dt); // Animação
    updateScreenShake(dt); // Decaimento

    // Tiro automático do jogador (após updates de estado)
    if (gameState === 'playing' && player) { // Só atira se jogando e com player
        player.lastBulletTime -= dt * 1000;
        if (player.lastBulletTime <= 0) {
            if(typeof shootBullet === 'function') shootBullet();
            player.lastBulletTime = calculateFireRateDelay(); // Usa função que considera upgrades/powerups
        }
    }

    // Verifica Game Over no final
    if (health <= 0 && gameState !== 'gameOver') {
        gameOver();
    }
}


function drawGame() {
    // A função draw() agora está em drawing.js
    if (typeof draw === 'function') {
        draw();
    } else {
        // Fallback
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'red';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Error: Drawing function not found.", canvas.width/2, canvas.height/2);
    }
}

// --- Loop Principal do Jogo ---

function gameLoop(timestamp) {
    // Calcula deltaTime primeiro
    deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    // Limita deltaTime
    const dtClamped = Math.min(deltaTime, 0.1);


    // Verifica estado ANTES de processar
    if (gameState === 'gameOver' || gameState === 'start') {
        animationFrameId = null;
        return;
    }
    if (gameState === 'paused' || gameState === 'shopOverlay') {
        // Desenha o estado pausado/loja
        drawGame(); // Renderiza enquanto pausado/na loja
        animationFrameId = requestAnimationFrame(gameLoop); // Continua chamando o loop para checar mudança de estado
        return;
    }

    // Se chegou aqui, gameState é 'playing' ou 'waveIntermission'

    // Tenta atualizar e desenhar
    try {
        // Roda updates apenas se 'playing' (intermission só precisa de timer e draw)
        if (gameState === 'playing') {
             updateGame(dtClamped);
        } else if (gameState === 'waveIntermission') {
             // Atualiza apenas o necessário para intermission
             updateWaveState(dtClamped);
             updateParticles(dtClamped); // Atualiza partículas existentes
             updateDamageNumbers(dtClamped); // Números continuam subindo
             updateScreenShake(dtClamped); // Shake decai?
        }
        drawGame(); // Sempre desenha
    } catch (error) {
        console.error("Error during game loop:", error);
        gameState = 'paused'; // Pausa o jogo em caso de erro
        if(ctx) {
            // Tenta desenhar erro sobre o último frame válido
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'red';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("An error occurred. Game paused.", canvas.width / 2, canvas.height / 2 - 10);
             ctx.fillText("Check console (F12) for details.", canvas.width / 2, canvas.height / 2 + 10);
        }
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
    }


    // Solicita próximo frame se não pausado/game over
    if (gameState === 'playing' || gameState === 'waveIntermission') {
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
         animationFrameId = null; // Garante que parou
    }
}

// --- Funções Auxiliares e de Lógica Específica ---

function resizeCanvas() {
    const aspectRatio = 16 / 9;
    let w = window.innerWidth;
    let h = window.innerHeight;

    canvas.width = w;
    canvas.height = h;

    if (player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
    // Redesenha imediatamente para evitar tela em branco
    if (ctx && gameState !== 'loading' && gameState !== 'start') {
        drawGame();
    }
}

// Handler separado para keydown para poder remover o listener corretamente
function handleKeyDown(e) {
    // Pausar/Resumir/Fechar Loja com ESC ou P
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (gameState === 'shopOverlay') {
            if (typeof window.hideShopOverlay === 'function') window.hideShopOverlay();
        } else if (gameState === 'playing') {
            pauseGame();
        } else if (gameState === 'paused') {
            resumeGame();
        }
    }

    // Atalhos apenas se estiver jogando
    if (gameState === 'playing') {
        // Ativar Escudo (Espaço ou S)
        if (e.key === ' ' || e.key.toLowerCase() === 's') {
            e.preventDefault();
            activateShield();
        }
        // Implantar Nanobot (B)
        if (e.key.toLowerCase() === 'b') {
            deployNanoBot();
        }
    }
}

function setupEventListeners() {
    // --- Define os handlers PRIMEIRO ---
    const updateMousePos = (event) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.clientX !== undefined) {
            clientX = event.clientX;
            clientY = event.clientY;
        } else { return; }
        mousePos.x = clientX - rect.left;
        mousePos.y = clientY - rect.top;
    };
    const handleTouchMove = (e) => { e.preventDefault(); updateMousePos(e); };
    const handleTouchStart = (e) => { e.preventDefault(); updateMousePos(e); };
    const preventContextMenu = (e) => e.preventDefault();

    // Remove listeners antigos para evitar duplicação
    window.removeEventListener('resize', resizeCanvas);
    canvas.removeEventListener('mousemove', updateMousePos);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('mousedown', updateMousePos);
    window.removeEventListener('keydown', handleKeyDown); // Usa o handler nomeado
    canvas.removeEventListener('contextmenu', preventContextMenu); // Usa o handler nomeado

    // Adiciona novos listeners
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', updateMousePos);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('mousedown', updateMousePos);
    window.addEventListener('keydown', handleKeyDown); // Usa o handler nomeado
    canvas.addEventListener('contextmenu', preventContextMenu); // Usa o handler nomeado
}


// --- Gerenciamento de Upgrades ---

let shopItems = []; // Array que guarda a definição e estado dos upgrades

function initializeUpgrades() {
    // Zera os níveis no objeto 'player'
    if (player) {
        player.shootRateLevel = 0;
        player.projectileDamageLevel = 0;
        player.projectileSpeedLevel = 0;
        player.maxHealthLevel = 0;
        player.projectileSizeLevel = 0;
        player.projectilePierceLevel = 0;
        player.shieldUnlockLevel = 0;
        player.shieldDurationLevel = 0;
        player.shieldCooldownLevel = 0;
        player.shieldExplodeLevel = 0;
        player.nanobotUnlockLevel = 0;
        player.nanobotInfectLevel = 0;
        player.autoAimLevel = 0;
    }

    // Define a estrutura dos upgrades disponíveis na loja
    shopItems = [
        // ID, Nome, Descrição, Nível Inicial, Nível Máx, Custo Base, Fator Custo, Chave do Player (para nível), Efeito (opcional, direto)
        { id: 'shootRate', name: 'Cadência de Tiro', description: `Aumenta a velocidade de disparo.`, level: 0, maxLevel: 8, baseCost: 60, costIncreaseFactor: 1.7, playerKey: 'shootRateLevel' }, // Descrição genérica
        { id: 'projDmg', name: 'Dano do Projétil', description: `Aumenta o dano base do projétil.`, level: 0, maxLevel: 10, baseCost: 75, costIncreaseFactor: 1.8, playerKey: 'projectileDamageLevel' }, // Descrição genérica
        { id: 'projSpd', name: 'Velocidade do Projétil', description: `Aumenta a velocidade do projétil.`, level: 0, maxLevel: 5, baseCost: 50, costIncreaseFactor: 1.6, playerKey: 'projectileSpeedLevel' }, // Descrição genérica
        { id: 'projSize', name: 'Tamanho do Projétil', description: `Aumenta o raio do projétil.`, level: 0, maxLevel: 4, baseCost: 70, costIncreaseFactor: 1.7, playerKey: 'projectileSizeLevel' }, // Descrição genérica
        { id: 'projPierce', name: 'Perfuração', description: `Projéteis atingem mais inimigos.`, level: 0, maxLevel: 5, baseCost: 120, costIncreaseFactor: 2.0, playerKey: 'projectilePierceLevel' }, // Descrição genérica
        { id: 'maxHp', name: 'Vida Máxima', description: 'Aumenta vida máxima (+25). Cura 25.', level: 0, maxLevel: 5, baseCost: 100, costIncreaseFactor: 2.0, playerKey: 'maxHealthLevel', effect: () => { if(!player) return; baseHealth = 100 + player.maxHealthLevel * 25; health = Math.min(baseHealth, health + 25); if(typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay(); } }, // Efeito direto com verificação
        // --- Shield ---
        { id: 'shieldUnlock', name: 'Desbloquear Escudo', description: 'Ative (Espaço/S) um escudo protetor.', level: 0, maxLevel: 1, baseCost: 150, costIncreaseFactor: 1, playerKey: 'shieldUnlockLevel'},
        { id: 'shieldDuration', name: 'Duração do Escudo', description: `Aumenta duração do escudo. Req: Escudo.`, level: 0, maxLevel: 5, baseCost: 80, costIncreaseFactor: 1.6, playerKey: 'shieldDurationLevel', requires: 'shieldUnlockLevel'}, // Descrição genérica
        { id: 'shieldCooldown', name: 'Recarga do Escudo', description: `Diminui recarga do escudo. Req: Escudo.`, level: 0, maxLevel: 7, baseCost: 90, costIncreaseFactor: 1.7, playerKey: 'shieldCooldownLevel', requires: 'shieldUnlockLevel'}, // Descrição genérica
        { id: 'shieldExplode', name: 'Explosão de Escudo', description: 'Escudo explode ao acabar. Req: Escudo.', level: 0, maxLevel: 1, baseCost: 250, costIncreaseFactor: 1, playerKey: 'shieldExplodeLevel', requires: 'shieldUnlockLevel'},
        // --- Nanobots ---
        { id: 'nanoUnlock', name: 'Desbloquear Nanobots', description: 'Implante (B) nanobots para converter inimigos.', level: 0, maxLevel: 1, baseCost: 200, costIncreaseFactor: 1, playerKey: 'nanobotUnlockLevel'},
        // Descrição corrigida para não usar a constante aqui
        { id: 'nanoInfect', name: 'Velocidade de Infecção', description: `Nanobots convertem inimigos mais rápido. Req: Nanobots.`, level: 0, maxLevel: 5, baseCost: 100, costIncreaseFactor: 1.8, playerKey: 'nanobotInfectLevel', requires: 'nanobotUnlockLevel'},
        // --- Auto Aim ---
        { id: 'autoAim', name: 'Assistência de Mira', description: 'Melhora a precisão automática da mira.', level: 0, maxLevel: AUTO_AIM_MAX_LEVEL, baseCost: 130, costIncreaseFactor: 1.9, playerKey: 'autoAimLevel'},
    ];

    // Aplica efeitos iniciais (nível 0) se houver
    shopItems.forEach(item => {
        if (item.effect && player) {
            // Garante que o nível no player é 0 antes de chamar o efeito inicial
            if(item.playerKey) player[item.playerKey] = 0;
            item.effect(); // Chama efeito com nível 0 implícito
        }
        // Garante que o nível no shopItem também começa em 0
        item.level = 0;
    });

    updateAvailableUpgrades(); // Atualiza a lista de upgrades visíveis
}

function calculateUpgradeCost(upgrade) {
    if (!upgrade || upgrade.level >= upgrade.maxLevel) {
        return Infinity; // Sem custo se maximizado
    }
    // Custo = Base * (Fator ^ Nível Atual)
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costIncreaseFactor, upgrade.level));
}

// Retorna a definição completa dos itens da loja (usado pela UI)
function getShopItemsDefinition() {
     shopItems.forEach(item => {
        // Atualiza o nível atual baseado no jogador
        if (player && item.playerKey && player[item.playerKey] !== undefined) {
            item.level = player[item.playerKey];
        } else {
            item.level = 0; // Garante que o nível é 0 se não encontrado no player
        }
        // Calcula e adiciona o custo atual ao item
        item.cost = calculateUpgradeCost(item);
        // Verifica se requisitos são atendidos
        item.meetsRequirement = true; // Assume true por padrão
        if (item.requires && player) {
             const requiredLevel = player[item.requires] || 0;
             if (requiredLevel <= 0) {
                 item.meetsRequirement = false;
             }
        } else if (item.requires && !player) { // Se não tem player, não atende requisito
             item.meetsRequirement = false;
        }
     });
    // Retorna apenas os itens que atendem aos requisitos
    return shopItems.filter(item => item.meetsRequirement);
}


function purchaseUpgrade(upgradeId) {
    const upgrade = shopItems.find(item => item.id === upgradeId);
    if (!upgrade || !player) { console.warn("Upgrade ou Player não encontrado:", upgradeId); return; }
    if (upgrade.level >= upgrade.maxLevel) { console.log("Upgrade já maximizado:", upgradeId); return; }

    // Verifica requisitos novamente
    if (upgrade.requires) {
        const requiredLevel = player[upgrade.requires] || 0;
        if (requiredLevel <= 0) {
            console.log(`Requisito não atendido para ${upgrade.name}`);
            if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, "Req. Locked!", "#FFAAAA");
            return;
        }
    }

    const currentCost = calculateUpgradeCost(upgrade);

    if (cash >= currentCost) {
        cash -= currentCost;
        // Atualiza o nível no objeto 'player'
        if (upgrade.playerKey) {
             // Inicializa se não existir
            if (player[upgrade.playerKey] === undefined) player[upgrade.playerKey] = 0;
            player[upgrade.playerKey]++;
            upgrade.level = player[upgrade.playerKey]; // Sincroniza nível no shopItem
        } else {
             console.warn("Upgrade sem playerKey:", upgradeId);
             upgrade.level++; // Incrementa nível no shopItem mesmo assim?
        }

        console.log(`Upgrade ${upgrade.name} comprado! Nível: ${upgrade.level}/${upgrade.maxLevel}. Custo: ${currentCost}`);

        // Aplica o efeito direto do upgrade (se houver)
        if (upgrade.effect) {
            upgrade.effect();
        }

        // Atualiza UI e salva
        if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
        updateAvailableUpgrades(); // Recalcula quais upgrades mostrar no painel
        if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel(availableUpgrades, cash, purchaseUpgrade); // Atualiza o painel in-game

        // Atualiza a loja se estiver aberta
        if (window.isShopOpen) { // window.isShopOpen é de ui.js
             const currentShopItems = getShopItemsDefinition();
             if (typeof window.updateShopItems === 'function') window.updateShopItems(currentShopItems, cash, purchaseUpgrade); // updateShopItems é de ui.js
        }
        saveGameData(); // Salva progresso após compra

    } else {
        console.log(`Cash insuficiente para ${upgrade.name}. Precisa: ${currentCost}, Tem: ${cash}`);
        if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, "Not Enough Cash!", "#FFEB3B");
    }
}

let availableUpgrades = []; // Array para upgrades do painel in-game
function updateAvailableUpgrades() {
    if (!player) { // Se não houver jogador, não há upgrades disponíveis
        availableUpgrades = [];
        return;
    }
    // Filtra upgrades que não estão maximizados e atendem requisitos
    availableUpgrades = shopItems.filter(item => {
        const currentLevel = player[item.playerKey] || 0;
        if (currentLevel >= item.maxLevel) return false; // Exclui maximizados
        if (item.requires) { // Verifica requisitos
            const requiredLevel = player[item.requires] || 0;
            if (requiredLevel <= 0) return false; // Exclui se requisito não atendido
        }
        return true; // Inclui o upgrade
    }).map(item => {
        // Atualiza o custo para exibição
        item.cost = calculateUpgradeCost(item);
        // Garante que o nível está sincronizado com o player
        item.level = player[item.playerKey] || 0;
        return item;
    });
    // Ordena por custo (opcional)
    // availableUpgrades.sort((a, b) => a.cost - b.cost);
}

// Função para ser chamada pela UI para atualizar o painel
function populateUpgradePanel() {
    // Chama a função global da UI para popular o painel
    if(typeof window.populateUpgradePanel === 'function') {
        window.populateUpgradePanel(availableUpgrades, cash, purchaseUpgrade);
    }
}


// --- Persistência (LocalStorage) ---
const SAVE_KEY = "circleShooter_saveData_v3"; // Mudar versão se estrutura mudar

function saveGameData() {
    if (!player) return; // Não salva sem player
    try {
        const dataToSave = {
            cash: cash,
            wave: currentWave,
            baseHealth: baseHealth,
            health: health,
            // Salva níveis dos upgrades do jogador
            levels: {}
        };
        // Popula os níveis dinamicamente a partir das keys em shopItems
        shopItems.forEach(item => {
            if (item.playerKey && player[item.playerKey] !== undefined) {
                dataToSave.levels[item.playerKey] = player[item.playerKey];
            }
        });

        localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
        // console.log("Game data saved.");
    } catch (error) {
        console.error("Error saving game data:", error);
    }
}

function loadGameData() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("Loading saved data:", parsedData);

            // Carrega estado básico
            cash = parsedData.cash || 0;
            currentWave = parsedData.wave || 0; // Carrega wave salva
            baseHealth = parsedData.baseHealth || 100;
            health = parsedData.health !== undefined ? parsedData.health : baseHealth; // Carrega vida salva ou usa baseHealth

            // Carrega níveis de upgrade para o objeto player
            if (player && parsedData.levels) {
                 shopItems.forEach(item => {
                     if(item.playerKey && parsedData.levels[item.playerKey] !== undefined) {
                         player[item.playerKey] = parsedData.levels[item.playerKey];
                         item.level = player[item.playerKey]; // Sincroniza nível no shopItem
                         // Aplica efeito direto se houver, para garantir estado
                         if(item.effect) item.effect();
                     } else if (item.playerKey) {
                         // Garante que nível no player seja 0 se não estava no save
                         player[item.playerKey] = 0;
                         item.level = 0;
                     }
                 });
            } else if (player) {
                 // Se não havia 'levels' no save, zera os níveis no player
                 shopItems.forEach(item => {
                     if(item.playerKey) player[item.playerKey] = 0;
                     item.level = 0;
                 });
            }

            console.log("Game data loaded.");
            // Atualiza UI com dados carregados (chama funções globais)
            if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
            if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay();
            if (typeof window.updateWaveIndicator === 'function') window.updateWaveIndicator();
            updateAvailableUpgrades(); // Recalcula upgrades disponíveis
            if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel(availableUpgrades, cash, purchaseUpgrade); // Atualiza painel in-game
            return true; // Indica que carregou com sucesso
        }
    } catch (error) {
        console.error("Error loading game data:", error);
        // localStorage.removeItem(SAVE_KEY); // Opcional: Limpar save corrompido
    }
    return false; // Indica que não carregou save
}


// --- Ativação de Powerups ---
function activatePowerup(type) {
    if (!player) return;
    const now = performance.now();
    console.log("Activating powerup:", type);

    switch (type) {
        case 'cash':
            const amount = 50 + Math.floor(currentWave * 2.5);
            cash += amount;
            if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
            if (typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, `+${amount}$`, POWERUP_CASH_COLOR);
            saveGameData(); // Salva cash
            break;
        case 'health':
            const healAmount = 20;
            health = Math.min(baseHealth, health + healAmount);
            if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay();
            if (typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, `+${healAmount} HP`, POWERUP_HEALTH_COLOR);
            break;
        case 'shieldRecharge':
            if (player.shieldUnlockLevel > 0) {
                player.shieldState = 'inactive'; // Permite ativar imediatamente
                player.shieldTimer = 0; // Reseta timer de cooldown
                if (typeof createParticles === 'function') createParticles(player.x, player.y, POWERUP_SHIELD_RECHARGE_COLOR, 15);
                if(typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius, "Shield Ready!", POWERUP_SHIELD_RECHARGE_COLOR);
            }
            break;
        case 'damageBoost':
            player.activePowerups.damageBoost = now + POWERUP_DAMAGE_BOOST_DURATION;
            break;
        case 'fireRateBoost':
            player.activePowerups.fireRateBoost = now + POWERUP_FIRE_RATE_BOOST_DURATION;
            break;
        case 'magnet':
            player.activePowerups.magnet = now + POWERUP_MAGNET_DURATION;
            break;
        default:
            console.warn("Unknown powerup type:", type);
            break;
    }
}


// --- Inicialização do Jogo ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing...");
    // Verifica se as dependências (classes, canvas) existem
    if (typeof Player !== 'undefined' && typeof Enemy !== 'undefined' && canvas && ctx) {
        initializeGame(); // Inicializa tudo (cria player, upgrades, UI)
        // Tenta carregar dados salvos APÓS inicializar upgrades
        if (!loadGameData()) {
             console.log("No saved data found or error loading. Starting fresh.");
             // Garante que UI reflita estado inicial se não carregou save
             if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
             if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay();
             if (typeof window.updateWaveIndicator === 'function') window.updateWaveIndicator();
        }
        // UI é inicializada dentro de initializeGame() -> initializeUI()
    } else {
        console.error("Initialization failed: Dependencies missing (Player/Enemy class, canvas, or ctx). Check script order and HTML IDs.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Error Loading Game Assets. Check Console (F12).</h1>';
    }
});


// --- Expor funções globais necessárias para ui.js ---
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.isGamePaused = () => gameState === 'paused';
window.isGameRunning = () => gameState === 'playing' || gameState === 'waveIntermission';
window.isGameOver = () => gameState === 'gameOver';
window.getShopItemsDefinition = getShopItemsDefinition;
window.purchaseUpgrade = purchaseUpgrade;
window.initializeGame = initializeGame;