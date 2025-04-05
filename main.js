// main.js - Lógica Principal do Jogo

// --- Canvas e Contexto ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Estado Global do Jogo ---
let gameData = {
    // Player related
    player: null,
    projectiles: [],
    // Enemy related
    enemies: [],
    enemySpawnTimer: 0,
    enemySpawnInterval: 1500, // ms
    // Wave related
    wave: 0,
    enemiesThisWave: 0,
    enemiesSpawnedThisWave: 0,
    enemiesDefeatedThisWave: 0,
    waveDelayTimer: 0,
    waveDelayDuration: 3000, // ms between waves
    // Game state
    cash: 1000,
    health: 100,
    baseHealth: 100,
    paused: false,
    running: false,
    gameOver: false,
    // Timing
    lastTime: 0,
    deltaTime: 0,
    // Input
    mousePos: { x: 0, y: 0 },
    // isShooting: false, // Não é mais usado para disparar
    shootCooldownTimer: 0, // Usado para controlar o tiro automático
    // Efeitos
    particles: [],
    damageNumbers: [],
    // Upgrades / Shop
    availableUpgrades: [],
    shopItems: [],
    // Configurações
    config: {
        playerRadius: 20,
        playerColor: '#00BFFF',
        playerShootRate: 5, // Este valor não é mais usado diretamente para delay, veja calculateFireRateDelay
        projectileSpeed: 750, // Aumentado
        projectileRadius: 5,
        projectileColor: '#FFFFFF',
        projectileDamage: 10, // Dano base
        enemyBaseSpeed: 30, // Velocidade base inimigo (pixels/segundo)
        enemyBaseHealth: 10,
        enemyBaseRadius: 25,
        enemyValue: 5,
        enemyDamage: 10,
        waveStartEnemyCount: 5,
        waveEnemyIncrement: 3,
    }
};

// --- Funções de Controle do Jogo ---

function initializeGame() {
    console.log("Initializing Game...");
    resizeCanvas();

    if (typeof Player !== 'undefined') {
        gameData.player = new Player(canvas.width / 2, canvas.height / 2, gameData.config.playerRadius, gameData.config.playerColor);
    } else {
        console.error("Classe Player não definida!");
        gameData.player = { x: canvas.width / 2, y: canvas.height / 2, radius: gameData.config.playerRadius, shootRate: 5, projectileDamage: 1, projectileSpeed: 500, projectileRadius: 5, projectileColor: '#FFF' }; // Placeholder
    }
    gameData.projectiles = [];
    gameData.enemies = [];
    gameData.particles = [];
    gameData.damageNumbers = [];
    gameData.enemySpawnTimer = 0;
    gameData.wave = 0;
    gameData.enemiesThisWave = 0;
    gameData.enemiesSpawnedThisWave = 0;
    gameData.enemiesDefeatedThisWave = 0;
    gameData.waveDelayTimer = gameData.waveDelayDuration;
    gameData.cash = 1000;
    gameData.baseHealth = 100;
    gameData.health = gameData.baseHealth;
    gameData.paused = false;
    gameData.running = false;
    gameData.gameOver = false;
    gameData.lastTime = performance.now();
    // gameData.isShooting = false; // Removido
    gameData.shootCooldownTimer = 0; // Inicia pronto para atirar

    initializeUpgradesAndShop();
    initializeUI();
    setupEventListeners();

    console.log("Game Initialized. Waiting for start.");
}

function startGame() {
    if (gameData.running) return;
    console.log("Starting Game...");
     if (!gameData.player) {
        console.error("Cannot start game without player!");
        initializeGame();
        if(!gameData.player) return;
    }

    gameData.baseHealth = 100;
    gameData.health = gameData.baseHealth;
    gameData.cash = 1000;
    gameData.wave = 0;
    gameData.enemiesDefeatedThisWave = 0;
    gameData.enemiesSpawnedThisWave = 0;
    gameData.waveDelayTimer = gameData.waveDelayDuration;
    gameData.enemies = [];
    gameData.projectiles = [];
    gameData.particles = [];
    gameData.damageNumbers = [];
    gameData.shootCooldownTimer = 0; // Reseta cooldown ao iniciar

    initializeUpgradesAndShop();

    updateHealthDisplay(gameData.health);
    updateCashDisplay(gameData.cash);
    updateWaveIndicator(gameData.wave);
    updateEnemiesRemainingDisplay(0);
    hideUpgradePanel();

    gameData.running = true;
    gameData.paused = false;
    gameData.gameOver = false;
    gameData.lastTime = performance.now();

    requestAnimationFrame(gameLoop);
    console.log("Game Loop Started.");
}

function pauseGame() {
    if (!gameData.running || gameData.paused || gameData.gameOver) return;
    gameData.paused = true;
    console.log("Game Paused.");
}

function resumeGame() {
    if (!gameData.running || !gameData.paused || gameData.gameOver) return;
    gameData.paused = false;
    gameData.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    console.log("Game Resumed.");
}

function triggerGameOver() {
    if (gameData.gameOver) return;
    gameData.gameOver = true;
    gameData.running = false;
    gameData.paused = true;
    console.log("Game Over!");
    showGameOverScreen(gameData.cash);
}

function nextWave() {
    gameData.wave++;
    gameData.enemiesThisWave = gameData.config.waveStartEnemyCount + (gameData.wave - 1) * gameData.config.waveEnemyIncrement;
    gameData.enemiesSpawnedThisWave = 0;
    gameData.enemiesDefeatedThisWave = 0;
    gameData.enemySpawnTimer = 0;
    gameData.enemySpawnInterval = Math.max(200, 1500 - gameData.wave * 50);
    gameData.waveDelayTimer = 0;

    console.log(`Starting Wave ${gameData.wave} with ${gameData.enemiesThisWave} enemies. Spawn Interval: ${gameData.enemySpawnInterval}ms`);
    updateWaveIndicator(gameData.wave);
    updateEnemiesRemainingDisplay(gameData.enemiesThisWave);

    updateAvailableUpgrades();
    populateUpgradePanel(gameData.availableUpgrades, gameData.cash, purchaseUpgrade);
}

// --- Funções de Lógica do Jogo (Chamadas no Loop) ---

function updateGame(dt) {
    updatePlayer(dt); // Controla o tiro automático
    updateProjectiles(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updateDamageNumbers(dt);
    handleEnemySpawning(dt);
    handleWaveLogic(dt);
    checkCollisions();

    if (gameData.health <= 0) {
        triggerGameOver();
    }
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha jogador
    if (gameData.player && typeof gameData.player.draw === 'function') {
         gameData.player.draw(ctx);
    } else if (gameData.player) { // Fallback
        ctx.fillStyle = gameData.config.playerColor; ctx.beginPath(); ctx.arc(gameData.player.x, gameData.player.y, gameData.player.radius, 0, Math.PI*2); ctx.fill();
    }

    // Desenha outros elementos
    gameData.particles.forEach(p => { if(typeof p.draw === 'function') p.draw(ctx); });
    gameData.projectiles.forEach(p => { if(typeof p.draw === 'function') p.draw(ctx); });
    gameData.enemies.forEach(e => { if(typeof e.draw === 'function') e.draw(ctx); });
    gameData.damageNumbers.forEach(dn => { if(typeof dn.draw === 'function') dn.draw(ctx); });
}

// --- Loop Principal do Jogo ---

function gameLoop(timestamp) {
    if (gameData.gameOver) return;
    if (gameData.paused) return;

    gameData.deltaTime = (timestamp - gameData.lastTime) / 1000;
    gameData.lastTime = timestamp;
    const maxDeltaTime = 0.1;
    const dtClamped = Math.min(gameData.deltaTime, maxDeltaTime);

    updateGame(dtClamped);
    drawGame();

    requestAnimationFrame(gameLoop);
}

// --- Funções Auxiliares e de Lógica Específica ---

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameData.player) {
        gameData.player.x = canvas.width / 2;
        gameData.player.y = canvas.height / 2;
    }
    // Redesenha imediatamente para evitar tela em branco durante resize
    if(ctx) drawGame(); // Chama drawGame diretamente
}

function setupEventListeners() {
    window.addEventListener('resize', resizeCanvas);

    // Listeners para MIRA (mousePos)
    canvas.addEventListener('mousemove', (event) => {
        // Não precisa verificar pause aqui, mira sempre atualiza
        const rect = canvas.getBoundingClientRect();
        gameData.mousePos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            gameData.mousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        }
    }, { passive: false });

    // Listeners para Iniciar Toque/Mira (atualiza posição inicial)
     canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
         if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            gameData.mousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        }
    }, { passive: false });

     canvas.addEventListener('mousedown', (event) => {
         // Atualiza posição da mira ao clicar, caso não tenha movido antes
         const rect = canvas.getBoundingClientRect();
         gameData.mousePos = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
     });


     // --- REMOVIDOS Listeners que setavam gameData.isShooting ---
     // canvas.addEventListener('mousedown', ...); // Parte do isShooting removida
     // canvas.addEventListener('mouseup', ...);
     // canvas.addEventListener('touchstart', ...); // Parte do isShooting removida
     // canvas.addEventListener('touchend', ...);

     // Impede o menu de contexto
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

// --- Funções de Update Principais ---

function updatePlayer(dt) {
     // Lógica de tiro AUTOMÁTICO
    gameData.shootCooldownTimer -= dt * 1000; // Decrementa cooldown

    // Atira se o cooldown acabou e o jogo está rodando
    if (gameData.shootCooldownTimer <= 0 && !gameData.paused && !gameData.gameOver) {
        if(typeof shootBullet === 'function') {
            shootBullet(); // Chama a função de disparo
        } else {
            console.error("Função shootBullet não definida!");
        }

        // Reseta o cooldown usando o valor calculado (que inclui upgrades)
        // calculateFireRateDelay deve estar definida em gameobjects.js
        if (typeof calculateFireRateDelay === 'function') {
             gameData.shootCooldownTimer = calculateFireRateDelay();
        } else {
             console.error("Função calculateFireRateDelay não definida! Usando fallback.");
             gameData.shootCooldownTimer = 1500; // Fallback para 1.5s
        }
    }
}


function updateProjectiles(dt) {
    for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
        const p = gameData.projectiles[i];
         if(typeof p.update === 'function') {
            p.update(dt);
            if (p.x + p.radius < 0 || p.x - p.radius > canvas.width || p.y + p.radius < 0 || p.y - p.radius > canvas.height) {
                gameData.projectiles.splice(i, 1);
            }
         } else {
             gameData.projectiles.splice(i, 1);
         }
    }
}

function handleEnemySpawning(dt) {
    if (gameData.wave > 0 && gameData.waveDelayTimer <= 0 && gameData.enemiesSpawnedThisWave < gameData.enemiesThisWave) {
        gameData.enemySpawnTimer -= dt * 1000;
        if (gameData.enemySpawnTimer <= 0) {
            if(typeof spawnEnemy === 'function') {
                spawnEnemy();
            } else {
                 console.error("Função spawnEnemy não definida!");
            }
            gameData.enemySpawnTimer = gameData.enemySpawnInterval;
        }
    }
}

function updateEnemies(dt) {
    if (!gameData.player) return;
    gameData.enemies.forEach(enemy => {
         if(typeof enemy.update === 'function') {
            enemy.update(dt, gameData.player.x, gameData.player.y);
         }
    });
}

function updateParticles(dt) {
     for (let i = gameData.particles.length - 1; i >= 0; i--) {
        const p = gameData.particles[i];
         if(typeof p.update === 'function') {
             p.update(dt);
             if (p.life <= 0) {
                 gameData.particles.splice(i, 1);
             }
         } else {
              gameData.particles.splice(i, 1); // Remove se não tiver update
         }
    }
}

function updateDamageNumbers(dt) {
     for (let i = gameData.damageNumbers.length - 1; i >= 0; i--) {
        const dn = gameData.damageNumbers[i];
         if(typeof dn.update === 'function') {
             dn.update(dt);
              if (dn.life <= 0) {
                 gameData.damageNumbers.splice(i, 1);
             }
         } else {
             gameData.damageNumbers.splice(i, 1); // Remove se não tiver update
         }
    }
}


function handleWaveLogic(dt) {
    if (gameData.waveDelayTimer > 0) {
        gameData.waveDelayTimer -= dt * 1000;
        if (gameData.waveDelayTimer <= 0) {
            nextWave();
        }
    }
    else if (gameData.wave > 0 && gameData.enemiesThisWave > 0 && gameData.enemies.length === 0 && gameData.enemiesSpawnedThisWave >= gameData.enemiesThisWave) {
        console.log(`Wave ${gameData.wave} cleared!`);
        gameData.waveDelayTimer = gameData.waveDelayDuration;
        updateEnemiesRemainingDisplay(0);
        updateAvailableUpgrades();
        populateUpgradePanel(gameData.availableUpgrades, gameData.cash, purchaseUpgrade);
    }
}

function checkCollisions() {
    if (!gameData.player) return;

    // Projéteis vs Inimigos
    for (let i = gameData.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameData.projectiles[i];
        let projectileRemoved = false;
        for (let j = gameData.enemies.length - 1; j >= 0; j--) {
            if (projectileRemoved) break;
            const enemy = gameData.enemies[j];
            // Usa o raio base do inimigo para colisão (não o raio visual pulsante)
            const collisionRadiusEnemy = enemy.baseRadius || enemy.radius;
            const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (dist < projectile.radius + collisionRadiusEnemy) {
                if (typeof enemy.takeDamage === 'function') {
                    enemy.takeDamage(projectile.damage);
                    // Cria número de dano
                    createDamageNumber(enemy.x, enemy.y, Math.round(projectile.damage).toString(), '#FFFFFF');
                } else {
                     console.warn("Enemy sem método takeDamage");
                     enemy.health -= projectile.damage; // Fallback
                }

                gameData.projectiles.splice(i, 1);
                projectileRemoved = true;

                if (enemy.health <= 0) {
                    gameData.cash += enemy.value || 0;
                    updateCashDisplay(gameData.cash);
                    gameData.enemies.splice(j, 1);
                    gameData.enemiesDefeatedThisWave++;
                    updateEnemiesRemainingDisplay(Math.max(0, gameData.enemiesThisWave - gameData.enemiesDefeatedThisWave));
                    updateAvailableUpgrades();
                    populateUpgradePanel(gameData.availableUpgrades, gameData.cash, purchaseUpgrade);
                    // Criar partículas de morte
                    createParticles(enemy.x, enemy.y, '#FF8888', 10, 1.2);
                }
            }
        }
    }

    // Inimigos vs Jogador
    for (let i = gameData.enemies.length - 1; i >= 0; i--) {
        const enemy = gameData.enemies[i];
        const collisionRadiusEnemy = enemy.baseRadius || enemy.radius;
        const dist = Math.hypot(gameData.player.x - enemy.x, gameData.player.y - enemy.y);

        if (dist < gameData.player.radius + collisionRadiusEnemy) {
            gameData.health -= enemy.damage || gameData.config.enemyDamage;
            updateHealthDisplay(gameData.health);
             // Cria número de dano no jogador
             createDamageNumber(player.x, player.y, Math.round(enemy.damage || gameData.config.enemyDamage).toString(), '#FF0000');

            // Remove inimigo após colidir
            createParticles(enemy.x, enemy.y, '#FFAA00', 8, 1.0); // Partículas de colisão
            gameData.enemies.splice(i, 1);
            gameData.enemiesDefeatedThisWave++;
             updateEnemiesRemainingDisplay(Math.max(0, gameData.enemiesThisWave - gameData.enemiesDefeatedThisWave));

             if (gameData.health <= 0) {
                 triggerGameOver();
                 return;
             }
        }
    }
}


// --- Gerenciamento de Upgrades e Loja ---

function initializeUpgradesAndShop() {
    // Zera os níveis antes de definir os itens
    if(gameData.player) {
        gameData.player.shootRateLevel = 0; // Assume que existe essa propriedade ou a adiciona
        gameData.player.projectileDamageLevel = 0;
        gameData.player.projectileSpeedLevel = 0;
        gameData.player.maxHealthLevel = 0;
        gameData.player.projectileSizeLevel = 0;
         // Reseta os valores base do jogador para garantir consistência
         gameData.player.shootRate = gameData.config.playerShootRate;
         gameData.player.projectileDamage = gameData.config.projectileDamage;
         gameData.player.projectileSpeed = gameData.config.projectileSpeed;
         gameData.player.projectileRadius = gameData.config.projectileRadius;
         // Vida já é resetada em initializeGame
    }


    gameData.shopItems = [
        // IDs devem ser únicos. baseCost é o custo para ir do nível 0 para o 1.
        { id: 'shootRate', name: 'Cadência de Tiro', description: 'Atira mais rápido.', level: 0, maxLevel: 5, baseCost: 60, costIncreaseFactor: 1.7, effect: (p, lvl) => { /* Efeito aplicado por calculateFireRateDelay */ }, purchased: false },
        { id: 'projDmg', name: 'Dano do Projétil', description: 'Projéteis causam mais dano.', level: 0, maxLevel: 5, baseCost: 75, costIncreaseFactor: 1.8, effect: (p, lvl) => { /* Efeito aplicado por calculateBulletDamage */ }, purchased: false },
        { id: 'projSpd', name: 'Velocidade do Projétil', description: 'Projéteis mais rápidos.', level: 0, maxLevel: 4, baseCost: 50, costIncreaseFactor: 1.6, effect: (p, lvl) => { /* Efeito aplicado por calculateBulletSpeed */ }, purchased: false },
        { id: 'maxHp', name: 'Vida Máxima', description: 'Aumenta sua vida máxima (+25).', level: 0, maxLevel: 4, baseCost: 100, costIncreaseFactor: 2.0, effect: (p, lvl) => { gameData.baseHealth = 100 + lvl * 25; gameData.health += 25; updateHealthDisplay(gameData.health); }, purchased: false }, // Efeito direto
        { id: 'projSize', name: 'Tamanho do Projétil', description: 'Projéteis maiores (+1px raio).', level: 0, maxLevel: 3, baseCost: 70, costIncreaseFactor: 1.7, effect: (p, lvl) => { p.projectileRadius = gameData.config.projectileRadius + lvl * 1; }, purchased: false }, // Efeito direto
    ];

     // Aplica efeitos iniciais (nível 0) e reseta níveis
     gameData.shopItems.forEach(item => {
         item.level = 0;
         item.purchased = false;
         // Aplica efeito inicial se houver um efeito direto na definição
         if (item.effect && gameData.player) {
             item.effect(gameData.player, 0);
         }
     });

    updateAvailableUpgrades();
}

function calculateUpgradeCost(upgrade) {
    if (!upgrade || upgrade.level >= upgrade.maxLevel) {
        return Infinity;
    }
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costIncreaseFactor, upgrade.level));
}


function getShopItemsDefinition() {
     gameData.shopItems.forEach(item => {
        item.cost = calculateUpgradeCost(item);
     });
    return gameData.shopItems;
}

function purchaseUpgrade(upgradeId) {
    const upgrade = gameData.shopItems.find(item => item.id === upgradeId);
    if (!upgrade || !gameData.player || upgrade.level >= upgrade.maxLevel) {
        console.warn(`Tentativa de comprar upgrade inválido ou maximizado: ${upgradeId}`);
        return;
    }

    const currentCost = calculateUpgradeCost(upgrade);

    if (gameData.cash >= currentCost) {
        gameData.cash -= currentCost;
        upgrade.level++;
        upgrade.purchased = true;

        console.log(`Upgrade ${upgrade.name} comprado! Nível: ${upgrade.level}/${upgrade.maxLevel}. Custo: ${currentCost}`);

        // Aplica o efeito direto do upgrade (se houver)
        if (upgrade.effect) {
            upgrade.effect(gameData.player, upgrade.level);
        }

        // Atualiza propriedades no objeto player que podem ser usadas pelos cálculos
        // (Ex: Se o upgrade fosse 'shootRateLevel', atualizaria gameData.player.shootRateLevel)
        // Isso depende de como você estrutura os upgrades. No exemplo atual,
        // os cálculos (calculateFireRateDelay etc.) leem o nível diretamente do shopItems.

        updateCashDisplay(gameData.cash);
        upgrade.cost = calculateUpgradeCost(upgrade); // Recalcula custo para próximo nível

        updateAvailableUpgrades();
        populateUpgradePanel(gameData.availableUpgrades, gameData.cash, purchaseUpgrade);

        if (isShopOpen) { // isShopOpen é global de ui.js
             const currentShopItems = getShopItemsDefinition();
             updateShopItems(currentShopItems, gameData.cash, purchaseUpgrade);
        }

    } else {
        console.log(`Cash insuficiente para ${upgrade.name}. Precisa: ${currentCost}, Tem: ${gameData.cash}`);
        // Mostrar mensagem na UI?
    }
}


function updateAvailableUpgrades() {
    // Mostra todos os upgrades não maximizados no painel in-game
    gameData.availableUpgrades = gameData.shopItems
        .filter(item => item.level < item.maxLevel)
         .map(item => {
             item.cost = calculateUpgradeCost(item);
             return item;
         });
        // .sort((a, b) => a.cost - b.cost); // Opcional: Ordena
}


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se as classes e o canvas existem
    if (typeof Player !== 'undefined' && typeof Projectile !== 'undefined' && typeof Enemy !== 'undefined' && canvas && ctx) {
        initializeGame();
    } else {
        console.error("Erro na inicialização: Classes essenciais, canvas ou contexto não encontrados. Verifique a ordem dos scripts e IDs HTML.");
        // Tenta mostrar uma mensagem de erro na tela
        const body = document.body;
        if(body) body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Erro ao carregar o jogo. Verifique o console (F12).</h1>';
    }
});


// --- Expor funções globais necessárias para ui.js ---
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.isGamePaused = () => gameData.paused;
window.isGameRunning = () => gameData.running;
window.isGameOver = () => gameData.gameOver;
window.getShopItemsDefinition = getShopItemsDefinition;
window.purchaseUpgrade = purchaseUpgrade;
window.initializeGame = initializeGame; // Para o botão Restart