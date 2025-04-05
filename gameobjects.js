class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;

        // Propriedades base (podem ser sobrescritas por upgrades)
        this.shootRateLevel = 0;
        this.projectileDamageLevel = 0;
        this.projectileSpeedLevel = 0;
        this.maxHealthLevel = 0;
        this.projectileSizeLevel = 0;
        this.projectilePierceLevel = 0; // Novo: Nível de perfuração
        this.shieldUnlockLevel = 0; // 0 = locked, 1 = unlocked
        this.shieldDurationLevel = 0;
        this.shieldCooldownLevel = 0;
        this.shieldExplodeLevel = 0; // Novo: Nível para desbloquear explosão
        this.nanobotUnlockLevel = 0; // 0 = locked, 1 = unlocked
        this.nanobotInfectLevel = 0; // Nível de velocidade de infecção
        this.autoAimLevel = 0; // Nível de precisão do auto-aim

        // Estado dinâmico
        this.lastBulletTime = 0;
        this.shieldState = 'inactive'; // 'inactive', 'active', 'cooldown'
        this.shieldTimer = 0; // Guarda o timestamp de início do estado atual
        this.currentAimAngle = 0; // Usado pelo auto-aim
        this.activePowerups = {}; // Guarda powerups ativos { type: endTime }
        this.damageMultiplier = 1.0; // Multiplicador de dano (afetado por powerups)
    }

    // Método draw é chamado por drawing.js que tem acesso direto ao 'player' global
}

class Projectile {
    constructor(x, y, radius, color, angle, speed, damage, hitsLeft = 1) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.damage = damage;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.hitsLeft = hitsLeft; // Quantos inimigos pode atingir
        this.hitEnemies = new Set(); // Guarda IDs dos inimigos já atingidos por este projétil
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    // Método draw é chamado por drawing.js
}

// Classe base para Powerups
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = POWERUP_RADIUS;
        this.creationTime = performance.now();
        this.attractionSpeed = POWERUP_ATTRACTION_SPEED; // Velocidade base de atração

        // Define cor e símbolo baseado no tipo
        switch (type) {
            case 'cash': this.color = POWERUP_CASH_COLOR; this.symbol = POWERUP_CASH_SYMBOL; break;
            case 'health': this.color = POWERUP_HEALTH_COLOR; this.symbol = POWERUP_HEALTH_SYMBOL; break;
            case 'shieldRecharge': this.color = POWERUP_SHIELD_RECHARGE_COLOR; this.symbol = POWERUP_SHIELD_RECHARGE_SYMBOL; break;
            case 'damageBoost': this.color = POWERUP_DAMAGE_BOOST_COLOR; this.symbol = POWERUP_DAMAGE_BOOST_SYMBOL; break;
            case 'fireRateBoost': this.color = POWERUP_FIRE_RATE_BOOST_COLOR; this.symbol = POWERUP_FIRE_RATE_BOOST_SYMBOL; break;
            case 'magnet': this.color = POWERUP_MAGNET_COLOR; this.symbol = POWERUP_MAGNET_SYMBOL; break;
            default: this.color = '#FFFFFF'; this.symbol = '?'; break;
        }
    }

    update(dt, playerX, playerY, isMagnetActive) {
        // Lógica de Atração (agora global)
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1) { // Evita divisão por zero e jitter no centro
            const currentSpeed = isMagnetActive ? this.attractionSpeed * POWERUP_MAGNET_SPEED_MULTIPLIER : this.attractionSpeed;
            this.x += (dx / dist) * currentSpeed * dt;
            this.y += (dy / dist) * currentSpeed * dt;
        }
    }

    // Método draw é chamado por drawing.js
}


class Enemy {
    constructor(x, y, radius, health, speed, value, type = 'circle', color = ENEMY_CIRCLE_COLOR, damage = BASE_ENEMY_DAMAGE) {
        this.id = performance.now() + Math.random(); // ID único para rastreamento (ex: perfuração)
        this.x = x;
        this.y = y;
        this.baseRadius = radius;
        this.radius = radius; // Raio atual para colisão e desenho base
        this.maxHealth = health;
        this.health = health;
        this.speed = speed;
        this.value = value; // Cash ao derrotar
        this.color = color; // Cor base
        this.currentColor = color; // Cor atual (afetada por infecção)
        this.damage = damage; // Dano ao colidir com player
        this.type = type; // 'circle', 'triangle', 'shooter', 'splitter', 'boss', 'bossMinion'

        // Estado
        this.pulseTimer = Math.random() * Math.PI * 2;
        this.converted = false;
        this.infectionTimer = null; // null, ou timestamp de início da infecção
        this.conversionEndTime = 0; // Timestamp de fim da conversão
        this.lastConvertedShot = 0; // Timestamp do último tiro quando convertido
        this.lastEnemyShot = 0; // Timestamp do último tiro (se for 'shooter')
        this.isBoss = (type === 'boss');
        this.isBossMinion = (type === 'bossMinion');
        this.parentBoss = null; // Referência ao boss que o criou (se for minion)
        this.lastMinionSpawnTime = 0; // Para bosses spawnarem minions

        // Específico do tipo
        if (type === 'shooter') {
            this.shootCooldown = ENEMY_SHOOTER_COOLDOWN * (0.8 + Math.random() * 0.4); // Variação no cooldown
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    // Update e Draw são chamados por updates.js e drawing.js que têm acesso direto
}

class NanoBot {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = NANO_BOT_RADIUS;
        this.color = NANO_BOT_COLOR;
        this.speed = NANO_BOT_SPEED;
        this.target = null; // Referência ao inimigo alvo
        this.state = 'seeking'; // 'seeking', 'homing'
        this.creationTime = performance.now();
    }

    // Update e Draw são chamados por updates.js e drawing.js
}

class Particle {
    constructor(x, y, vx, vy, radius, color, life) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.radius = radius; this.color = color;
        this.initialLife = life; this.life = life;
        this.alpha = 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt * 1000;
        this.alpha = Math.max(0, this.life / this.initialLife);
    }

    // Método draw é chamado por drawing.js
}

class DamageNumber {
    constructor(x, y, text, color, life = DAMAGE_NUMBER_LIFESPAN) {
        this.x = x + (Math.random() - 0.5) * 20; // Pequeno offset horizontal
        this.y = y - 10 + (Math.random() - 0.5) * 10; // Pequeno offset vertical
        this.text = text;
        this.color = color;
        this.initialLife = life;
        this.life = life;
        this.alpha = 1;
        this.vy = DAMAGE_NUMBER_SPEED * (0.8 + Math.random() * 0.4); // Velocidade de subida com variação
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt * 1000;
        this.alpha = Math.max(0, this.life / this.initialLife);
    }

    // Método draw é chamado por drawing.js
}


// --- FUNÇÕES DE APOIO (Cálculos relacionados a upgrades) ---

// Estas funções agora leem os níveis diretamente do objeto 'player' global
// que é atualizado quando um upgrade é comprado em main.js

function calculateFireRateDelay() {
    if (!player) return BASE_FIRE_RATE_DELAY;
    const level = player.fireRateLevel || 0;
    let delay = BASE_FIRE_RATE_DELAY * Math.pow(FIRE_RATE_REDUCTION_FACTOR, level);
    // Aplicar powerup se ativo
    if (player.activePowerups.fireRateBoost && player.activePowerups.fireRateBoost > performance.now()) {
        delay *= POWERUP_FIRE_RATE_BOOST_MULTIPLIER;
    }
    return Math.max(MIN_FIRE_RATE_DELAY, delay);
}

function calculateBulletSpeed() {
    if (!player) return BASE_BULLET_SPEED;
    const level = player.projectileSpeedLevel || 0;
    return BASE_BULLET_SPEED * (1 + level * BULLET_SPEED_INCREASE_FACTOR);
}

function calculateBulletDamage() {
    if (!player) return BASE_BULLET_DAMAGE;
    const level = player.projectileDamageLevel || 0;
    let damage = BASE_BULLET_DAMAGE * (1 + level * BULLET_DAMAGE_INCREASE_FACTOR);
    // Aplicar powerup se ativo
    if (player.activePowerups.damageBoost && player.activePowerups.damageBoost > performance.now()) {
        damage *= POWERUP_DAMAGE_BOOST_MULTIPLIER;
    }
     // Aplicar multiplicador base do jogador (se houver outros bônus futuros)
     damage *= (player.damageMultiplier || 1.0);
    return Math.max(1, Math.round(damage));
}

function calculateBulletRadius() {
    if (!player) return BULLET_RADIUS;
    const level = player.projectileSizeLevel || 0;
    return BULLET_RADIUS + level * BULLET_SIZE_INCREASE_PER_LEVEL;
}

function calculateBulletPierceCount() {
    if (!player) return 1; // Padrão é 1 hit
    const level = player.projectilePierceLevel || 0;
    return 1 + level * BULLET_PIERCE_INCREASE_PER_LEVEL;
}

function calculateShieldDuration() {
    if (!player) return BASE_SHIELD_DURATION;
    const level = player.shieldDurationLevel || 0;
    return BASE_SHIELD_DURATION + level * SHIELD_DURATION_INCREASE_PER_LEVEL;
}

function calculateShieldCooldown() {
    if (!player) return BASE_SHIELD_COOLDOWN;
    const level = player.shieldCooldownLevel || 0;
    return Math.max(MIN_SHIELD_COOLDOWN, BASE_SHIELD_COOLDOWN - level * SHIELD_COOLDOWN_DECREASE_PER_LEVEL);
}

function calculateNanobotInfectionTime() {
    if (!player) return BASE_NANO_BOT_INFECTION_TIME;
    const level = player.nanobotInfectLevel || 0;
    // Multiplicador aumenta a *velocidade*, então dividimos o tempo base
    const speedMultiplier = Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, level);
    return BASE_NANO_BOT_INFECTION_TIME / speedMultiplier;
}

function calculateAutoAimLerpFactor() {
    if (!player || player.autoAimLevel <= 0) return 0; // Sem auto-aim se nível 0
    const level = player.autoAimLevel || 0;
    const factor = AUTO_AIM_BASE_LERP_FACTOR + (level - 1) * AUTO_AIM_LERP_INCREASE_PER_LEVEL;
    return Math.min(1.0, factor); // Limita a 1.0 (ajuste instantâneo)
}


// --- FUNÇÕES DE CRIAÇÃO (Spawners) ---

function shootBullet() {
    if (!player) return;

    const targetX = mousePos.x; // Usa mousePos global
    const targetY = mousePos.y;

    let angle = player.currentAimAngle; // Usa o ângulo atualizado pelo auto-aim

    // Se auto-aim não estiver ativo/forte o suficiente, calcula baseado no mouse
    // (A lógica de atualização do currentAimAngle em updates.js fará o ajuste)
    // Se autoAimLevel for 0, currentAimAngle será sempre o ângulo do mouse

    const speed = calculateBulletSpeed();
    const damage = calculateBulletDamage();
    const radius = calculateBulletRadius();
    const hitsLeft = calculateBulletPierceCount();
    const color = BULLET_COLOR;

    // Cria projétil usando a classe
    const newProjectile = new Projectile(
        player.x + Math.cos(angle) * (player.radius + radius + 2), // Posição inicial fora do player
        player.y + Math.sin(angle) * (player.radius + radius + 2),
        radius,
        color,
        angle,
        speed,
        damage,
        hitsLeft // Passa a contagem de perfurações
    );
    bullets.push(newProjectile); // Adiciona ao array global 'bullets'

    // Efeito visual (partículas) - Pequeno flash no cano
    createParticles(
        player.x + Math.cos(angle) * (player.radius + 5),
        player.y + Math.sin(angle) * (player.radius + 5),
        color, 1, 0.5, 150 // Poucas partículas, curtas
    );
}

function shootConvertedBullet(sourceEnemy) {
    if (!sourceEnemy || !sourceEnemy.converted) return;

    // Encontra alvo (inimigo não convertido mais próximo)
    let targetEnemy = null;
    let closestDistSq = Infinity;
    enemies.forEach(enemy => {
        if (enemy && !enemy.converted && enemy.health > 0) {
            const distSq = distanceSquared(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                targetEnemy = enemy;
            }
        }
    });

    if (!targetEnemy) return; // Sem alvo válido

    const angle = Math.atan2(targetEnemy.y - sourceEnemy.y, targetEnemy.x - sourceEnemy.x);
    const damage = calculateBulletDamage() * CONVERTED_BULLET_DAMAGE_FACTOR; // Dano baseado no do player

    const newBullet = new Projectile(
        sourceEnemy.x + Math.cos(angle) * (sourceEnemy.radius + CONVERTED_BULLET_RADIUS + 2),
        sourceEnemy.y + Math.sin(angle) * (sourceEnemy.radius + CONVERTED_BULLET_RADIUS + 2),
        CONVERTED_BULLET_RADIUS,
        CONVERTED_BULLET_COLOR,
        angle,
        CONVERTED_BULLET_SPEED,
        damage,
        1 // Convertidos não perfuram por padrão
    );
    convertedBullets.push(newBullet); // Adiciona ao array global 'convertedBullets'
    sourceEnemy.lastConvertedShot = performance.now(); // Atualiza cooldown do tiro
}

function shootEnemyBullet(sourceEnemy, numBullets = 1) {
    if (!sourceEnemy || sourceEnemy.converted || !player) return; // Não atira se convertido ou sem player

    const angleToPlayer = Math.atan2(player.y - sourceEnemy.y, player.x - sourceEnemy.x);
    const spread = degToRad(15); // Pequeno spread se atirar múltiplos

    for (let i = 0; i < numBullets; i++) {
        let angle = angleToPlayer;
        if (numBullets > 1) {
            angle += (i - (numBullets - 1) / 2) * (spread / (numBullets - 1 || 1));
        }

        const newBullet = new Projectile(
            sourceEnemy.x + Math.cos(angle) * (sourceEnemy.radius + ENEMY_BULLET_RADIUS + 2),
            sourceEnemy.y + Math.sin(angle) * (sourceEnemy.radius + ENEMY_BULLET_RADIUS + 2),
            ENEMY_BULLET_RADIUS,
            ENEMY_BULLET_COLOR,
            angle,
            ENEMY_BULLET_SPEED,
            ENEMY_BULLET_DAMAGE, // Dano fixo para balas inimigas
            1
        );
        enemyBullets.push(newBullet); // Adiciona ao array global 'enemyBullets'
    }
    sourceEnemy.lastEnemyShot = performance.now(); // Atualiza cooldown do tiro
}


function spawnEnemy(isBossMinion = false, parentBossRef = null, forceType = null, position = null, sizeMultiplier = 1.0) {
    if (!canvas) return;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    let spawnPos = position; // Usa posição fornecida se houver

    if (!spawnPos) { // Calcula posição na borda se não fornecida
        const edge = Math.floor(Math.random() * 4);
        const buffer = 50;
        switch (edge) {
            case 0: spawnPos = { x: Math.random() * canvasW, y: -buffer }; break;
            case 1: spawnPos = { x: canvasW + buffer, y: Math.random() * canvasH }; break;
            case 2: spawnPos = { x: Math.random() * canvasW, y: canvasH + buffer }; break;
            default: spawnPos = { x: -buffer, y: Math.random() * canvasH }; break;
        }
    }

    // Determina tipo
    let type = forceType;
    if (!type) {
        const typeRoll = Math.random();
        if (currentWave > 8 && typeRoll < 0.20) type = 'splitter';
        else if (currentWave > 5 && typeRoll < 0.45) type = 'shooter';
        else if (currentWave > 2 && typeRoll < 0.70) type = 'triangle';
        else type = 'circle';
    }

    // Propriedades base e scaling
    const wave = currentWave || 0;
    const healthMultiplier = 1 + wave * ENEMY_HEALTH_SCALING;
    const speedMultiplier = 1 + wave * ENEMY_SPEED_SCALING;

    let radius = BASE_ENEMY_RADIUS * sizeMultiplier;
    let health = BASE_ENEMY_HEALTH * healthMultiplier;
    let speed = BASE_ENEMY_SPEED * speedMultiplier;
    let value = 5 + Math.floor(wave / 2); // Valor base
    let color = ENEMY_CIRCLE_COLOR;
    let damage = BASE_ENEMY_DAMAGE;

    // Ajustes por tipo
    switch (type) {
        case 'triangle':
            color = ENEMY_TRIANGLE_COLOR;
            speed *= 1.4; health *= 0.8; radius *= 0.9; damage *= 1.2; value += 2;
            break;
        case 'shooter':
            color = ENEMY_SHOOTER_COLOR;
            speed *= 0.7; health *= 1.1; radius *= 1.1; value += 3;
            // Atira balas (lógica em updates.js)
            break;
        case 'splitter':
            color = ENEMY_SPLITTER_COLOR;
            speed *= 0.9; health *= 1.3; radius *= 1.2; value += 5;
            // Divide ao morrer (lógica em updates.js)
            break;
         case 'bossMinion': // Tipo específico para minions
             // Herdará propriedades base, mas sobrescrevemos algumas
             health = BASE_ENEMY_HEALTH * 0.6 * healthMultiplier; // Mais fraco
             speed = BASE_ENEMY_SPEED * 1.2 * speedMultiplier; // Mais rápido
             radius = BASE_ENEMY_RADIUS * 0.7;
             value = 1; // Vale pouco
             color = ENEMY_SHOOTER_COLOR; // Aparência de atirador?
             type = 'bossMinion'; // Garante o tipo correto
             break;
    }

    if (isBossMinion) { // Ajustes finais se for minion
        health *= 0.5; // Minions são mais fracos
        value = Math.max(1, Math.floor(value * 0.3)); // Valem menos
        type = 'bossMinion'; // Garante tipo
        color = ENEMY_SHOOTER_COLOR; // Cor específica para minion?
        radius *= 0.8;
    }


    const newEnemy = new Enemy(
        spawnPos.x, spawnPos.y,
        radius, health, speed, value, type, color, damage
    );

    if (isBossMinion && parentBossRef) {
         newEnemy.isBossMinion = true;
         newEnemy.parentBoss = parentBossRef; // Guarda referência
    }

    enemies.push(newEnemy); // Adiciona ao array global 'enemies'
    // Não incrementa enemiesSpawnedThisWave aqui, isso é feito em updateWaveState
}


function spawnBoss() {
    bossActive = true; // Flag global
    const wave = currentWave || 0;
    const health = BASE_ENEMY_HEALTH * BOSS_HEALTH_MULTIPLIER * (1 + wave * ENEMY_HEALTH_SCALING);
    const radius = BASE_ENEMY_RADIUS * BOSS_RADIUS_MULTIPLIER;
    const speed = BASE_ENEMY_SPEED * BOSS_SPEED_MULTIPLIER * (1 + wave * ENEMY_SPEED_SCALING * 0.5); // Boss escala velocidade mais devagar
    const value = (5 + Math.floor(wave / 2)) * 15; // Boss vale muito mais
    const damage = BASE_ENEMY_DAMAGE * 2.5; // Dano de colisão do boss

    // Spawn fora da tela
    const edge = Math.floor(Math.random() * 4);
    let spawnX, spawnY;
    const buffer = radius * 1.5;
    switch (edge) {
        case 0: spawnX = canvas.width / 2; spawnY = -buffer; break;
        case 1: spawnX = canvas.width + buffer; spawnY = canvas.height / 2; break;
        case 2: spawnX = canvas.width / 2; spawnY = canvas.height + buffer; break;
        default: spawnX = -buffer; spawnY = canvas.height / 2; break;
    }

    const boss = new Enemy(
        spawnX, spawnY, radius, health, speed, value, 'boss', ENEMY_BOSS_COLOR, damage
    );
    boss.lastMinionSpawnTime = performance.now(); // Define timer inicial para minions

    enemies.push(boss);
}

function spawnPowerup(x, y) {
    const rand = Math.random();
    let type = 'cash'; // Default

    // Determina tipo (ajuste as chances conforme necessário)
    // Ordem: Mais raros primeiro
    if (rand < 0.15) { type = 'health'; }
    else if (player.shieldUnlockLevel > 0 && rand < 0.30) { type = 'shieldRecharge'; }
    else if (rand < 0.45) { type = 'damageBoost'; }
    else if (rand < 0.60) { type = 'fireRateBoost'; }
    else if (rand < 0.70) { type = 'magnet'; }
    else { type = 'cash'; } // Mais comum

    powerups.push(new Powerup(x, y, type)); // Adiciona ao array global 'powerups'
}

// --- Funções de Efeitos ---

function createParticles(x, y, color = '#FFFFFF', count = 5, speedMultiplier = 1, lifespan = PARTICLE_LIFESPAN) {
     if (typeof Particle === 'undefined') return;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = PARTICLE_SPEED * speedMultiplier * (0.5 + Math.random() * 0.8);
        const life = lifespan * (0.7 + Math.random() * 0.6);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const radius = PARTICLE_RADIUS * (0.8 + Math.random() * 0.4);

        particles.push(new Particle(x, y, vx, vy, radius, color, life)); // Adiciona ao array global
    }
}

function createDamageNumber(x, y, text, color = '#FFFFFF') {
    if (typeof DamageNumber === 'undefined') return;
    damageNumbers.push(new DamageNumber(x, y, text.toString(), color)); // Adiciona ao array global
}