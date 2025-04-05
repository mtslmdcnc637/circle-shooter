// --- DEFINIÇÕES DAS CLASSES ---

class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        // Propriedades que serão gerenciadas por gameData e upgrades
        this.shootRate = 5; // Valor base inicial, será sobrescrito por gameData.config e upgrades
        this.projectileDamage = 10;
        this.projectileSpeed = 500; // Valor base inicial
        this.projectileRadius = 5;
        this.projectileColor = '#FFFFFF';
        this.lastBulletTime = 0; // Para o tiro automático inicial
        // Adicionar outras propriedades base se necessário
    }

    draw(ctx) {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Update não é usado atualmente, lógica em main.js
    // update(dt) { }
}

class Projectile {
    constructor(x, y, radius, color, angle, speed, damage) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.damage = damage;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(ctx) {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y, radius, health, speed, value) {
        this.x = x;
        this.y = y;
        this.baseRadius = radius; // Guarda o raio original para a pulsação
        this.radius = radius; // Raio atual (usado para colisão)
        this.maxHealth = health;
        this.health = health;
        this.speed = speed;
        this.value = value;
        this.color = '#FF0000'; // Cor de fallback
        this.damage = 10;
        this.type = 'basic';
        // Propriedades para pulsação (NOVAS)
        this.pulseTimer = Math.random() * Math.PI * 2; // Fase inicial aleatória
    }

    update(dt, playerX, playerY) {
        // --- Lógica de Movimento ---
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            const moveX = (dx / dist) * this.speed * dt;
            const moveY = (dy / dist) * this.speed * dt;

            if (dist > this.speed * dt) {
                 this.x += moveX;
                 this.y += moveY;
            } else { // Evita tremer sobre o jogador
                 this.x = playerX;
                 this.y = playerY;
            }
        }

        // --- Lógica de Pulsar (NOVA) ---
        // PULSE_SPEED precisa ser acessível globalmente (definido em setup.js)
        const speedConst = typeof PULSE_SPEED !== 'undefined' ? PULSE_SPEED : 4;
        this.pulseTimer += dt * speedConst;
        // Mantem o timer dentro do ciclo de 2*PI
        if (this.pulseTimer > Math.PI * 2) {
            this.pulseTimer -= Math.PI * 2;
        }

        // O raio de colisão pode continuar sendo o baseRadius ou variar um pouco?
        // Por simplicidade, vamos manter o raio de colisão como baseRadius.
        this.radius = this.baseRadius;

        // --- Outra Lógica ---
        // Ex: Atirar se for shooter, etc.
    }

    draw(ctx) {
        if (!ctx) return;

        // Calcula a escala atual baseada no timer de pulso
        // PULSE_AMOUNT precisa ser acessível (definido em setup.js)
        const amountConst = typeof PULSE_AMOUNT !== 'undefined' ? PULSE_AMOUNT : 0.05;
        const scale = 1.0 + Math.sin(this.pulseTimer) * amountConst;
        const currentDrawRadius = this.baseRadius * scale; // Raio visual atualizado

        // Tenta desenhar a imagem SVG
        if (typeof enemyImage !== 'undefined' && enemyImageLoaded) {
            const drawSize = currentDrawRadius * 2; // Tamanho baseado no raio visual
            const drawX = this.x - currentDrawRadius; // Centraliza a imagem
            const drawY = this.y - currentDrawRadius; // Centraliza a imagem

            // Desenha a imagem com a escala pulsante
            ctx.drawImage(enemyImage, drawX, drawY, drawSize, drawSize);

        } else {
            // Fallback: Desenha um círculo com o raio visual pulsante
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentDrawRadius, 0, Math.PI * 2);
            ctx.fill();
            if (typeof enemyImage === 'undefined') console.warn("Variável global 'enemyImage' não encontrada.");
            else if (!enemyImageLoaded) console.warn("'enemyImage' não carregada, desenhando círculo.");
        }

        // --- Barra de Vida --- (Desenha depois)
        if (this.health < this.maxHealth) {
            const barWidth = this.baseRadius * 1.5; // Largura baseada no raio base
            const barHeight = 5;
            const barX = this.x - barWidth / 2;
            // Posiciona acima do raio *máximo* da pulsação para não sobrepor
            const barY = this.y - (this.baseRadius * (1 + amountConst)) - barHeight - 5;

            ctx.fillStyle = '#555';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
}

// --- Classe para Partículas (Exemplo) ---
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

    draw(ctx) {
        if (!ctx || this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- Classe para Números de Dano (Exemplo) ---
class DamageNumber {
    constructor(x, y, text, color, life) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y - 10 + (Math.random() - 0.5) * 10;
        this.text = text;
        this.color = color;
        this.initialLife = life;
        this.life = life;
        this.alpha = 1;
        // DAMAGE_NUMBER_SPEED precisa estar acessível (setup.js)
        this.vy = typeof DAMAGE_NUMBER_SPEED !== 'undefined' ? DAMAGE_NUMBER_SPEED : -30;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt * 1000;
        this.alpha = Math.max(0, this.life / this.initialLife);
    }

    draw(ctx) {
        if (!ctx || this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}


// --- FUNÇÕES DE APOIO (Refatoradas para usar gameData e Classes) ---

function calculateFireRateDelay() {
    if (typeof gameData === 'undefined' || !gameData.player || !gameData.shopItems) return 1500; // Valor padrão

    const upgrade = gameData.shopItems.find(item => item.id === 'shootRate');
    const level = upgrade ? upgrade.level : 0;

    // BASE_DELAY MODIFICADO PARA 1.5 SEGUNDOS
    const baseDelay = 1000; // Milliseconds entre tiros no nível 0
    // Fator de redução (exemplo: 15% mais rápido por nível)
    // Ajuste este fator se necessário para balancear o upgrade
    const reductionFactor = 0.85; // 1.0 - 0.15

    // Calcula o delay: base * (fator ^ nivel)
    // Nível 0: 1500 * (0.85^0) = 1500ms
    // Nível 1: 1500 * (0.85^1) = 1275ms
    // Nível 2: 1500 * (0.85^2) = 1083ms etc.
    const calculatedDelay = baseDelay * Math.pow(reductionFactor, level);

    // Define um limite mínimo para o delay (ex: 100ms)
    return Math.max(100, calculatedDelay);
}

function calculateBulletSpeed() {
    if (typeof gameData === 'undefined' || !gameData.player || !gameData.shopItems) return gameData.config.projectileSpeed || 500;

    const upgrade = gameData.shopItems.find(item => item.id === 'projSpd');
    const level = upgrade ? upgrade.level : 0;
    const baseSpeed = gameData.config.projectileSpeed || 500;
    // Exemplo: +20% por nível
    const increaseFactor = 0.20;

    return baseSpeed * (1 + level * increaseFactor);
}

function calculateBulletDamage() {
     if (typeof gameData === 'undefined' || !gameData.player || !gameData.shopItems) return gameData.config.projectileDamage || 1;

    const upgrade = gameData.shopItems.find(item => item.id === 'projDmg');
    const level = upgrade ? upgrade.level : 0;
    const baseDamage = gameData.config.projectileDamage || 1;
     // Exemplo: +50% por nível
    const increaseFactor = 0.50;

    let finalDamage = baseDamage * (1 + level * increaseFactor);

    // Aplicar powerups se houver
    // if (gameData.player.activePowerups...) { ... }

    return Math.max(1, Math.round(finalDamage)); // Garante dano mínimo 1
}

function shootBullet() {
    if (typeof gameData === 'undefined' || !gameData.player) return;

    const playerRef = gameData.player;
    const targetX = gameData.mousePos.x;
    const targetY = gameData.mousePos.y;

    const dx = targetX - playerRef.x;
    const dy = targetY - playerRef.y;
    if (dx === 0 && dy === 0) return;

    const angle = Math.atan2(dy, dx);
    const speed = calculateBulletSpeed();
    const damage = calculateBulletDamage();
    const radius = (playerRef.projectileRadius || gameData.config.projectileRadius);
    const color = (playerRef.projectileColor || gameData.config.projectileColor);

    // Criar projétil usando a classe
    const newProjectile = new Projectile(
        playerRef.x + Math.cos(angle) * (playerRef.radius + radius + 2),
        playerRef.y + Math.sin(angle) * (playerRef.radius + radius + 2),
        radius,
        color,
        angle,
        speed,
        damage
    );
    gameData.projectiles.push(newProjectile);

    // Efeito visual (partículas)
    createParticles(playerRef.x + Math.cos(angle)*(playerRef.radius+5), playerRef.y + Math.sin(angle)*(playerRef.radius+5), color, 1, 0.5);
}


function spawnEnemy() {
    if (typeof gameData === 'undefined' || !canvas) return; // Precisa de gameData e canvas

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    let spawnPos;
    const edge = Math.floor(Math.random() * 4);
    const buffer = 50;

    switch (edge) {
        case 0: spawnPos = { x: Math.random() * canvasW, y: -buffer }; break;
        case 1: spawnPos = { x: canvasW + buffer, y: Math.random() * canvasH }; break;
        case 2: spawnPos = { x: Math.random() * canvasW, y: canvasH + buffer }; break;
        default: spawnPos = { x: -buffer, y: Math.random() * canvasH }; break;
    }

    // Usa valores base da config em main.js
    const baseRadius = gameData.config.enemyBaseRadius || 15;
    const baseHealth = gameData.config.enemyBaseHealth || 10;
    const baseSpeed = gameData.config.enemyBaseSpeed || 40; // Velocidade base (pixels/segundo)
    const baseValue = gameData.config.enemyValue || 5;

    // Aplica scaling da wave
    const wave = gameData.wave || 0;
    const healthMultiplier = 1 + wave * 0.15; // Aumenta 15% por wave (depois da wave 0)
    const speedMultiplier = 1 + wave * 0.08; // Aumenta 8% por wave

    const radius = baseRadius; // Raio não escala por padrão
    const health = Math.ceil(baseHealth * healthMultiplier);
    const speed = baseSpeed * speedMultiplier;
    const value = baseValue; // Valor não escala por padrão

    // Cria instância da classe Enemy
    const newEnemy = new Enemy(
        spawnPos.x, spawnPos.y,
        radius, health, speed, value
    );
    // Definir tipo, cor, etc. baseado em regras (se houver)
    // newEnemy.type = ...
    // newEnemy.color = ...

    gameData.enemies.push(newEnemy);
    gameData.enemiesSpawnedThisWave++; // Incrementa aqui ao spawnar

    // Atualiza UI (se a função existir)
    updateEnemiesRemainingUI();
}

// --- Funções de Efeitos ---

function createParticles(x, y, color = '#FFFFFF', count = 5, speedMultiplier = 1, lifespan = 500) {
     if (typeof gameData === 'undefined' || typeof Particle === 'undefined') return;
     const particleSpeedConst = typeof PARTICLE_SPEED !== 'undefined' ? PARTICLE_SPEED : 150;
     const particleRadiusConst = typeof PARTICLE_RADIUS !== 'undefined' ? PARTICLE_RADIUS : 2;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = particleSpeedConst * speedMultiplier * (0.5 + Math.random() * 0.8);
        const life = lifespan * (0.7 + Math.random() * 0.6);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const radius = particleRadiusConst * (0.8 + Math.random() * 0.4);

        gameData.particles.push(new Particle(x, y, vx, vy, radius, color, life));
    }
}

function createDamageNumber(x, y, text, color = '#FFFFFF') {
    if (typeof gameData === 'undefined' || typeof DamageNumber === 'undefined') return;
    const lifespanConst = typeof DAMAGE_NUMBER_LIFESPAN !== 'undefined' ? DAMAGE_NUMBER_LIFESPAN : 800;

    gameData.damageNumbers.push(new DamageNumber(x, y, text, color, lifespanConst));
}


// --- Funções Utilitárias (Manter ou mover para setup.js) ---
// function degToRad(degrees) { return degrees * Math.PI / 180; }
// function distanceSquared(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return dx * dx + dy * dy; }
// function lerpColor(colorA, colorB, t) { ... }

// --- Funções de UI (Placeholders, UI real em ui.js) ---
function updateEnemiesRemainingUI() {
    if (typeof window.updateEnemiesRemainingDisplay === 'function' && typeof gameData !== 'undefined') {
        const remaining = Math.max(0, (gameData.enemiesThisWave || 0) - (gameData.enemiesDefeatedThisWave || 0));
         // Ou contar inimigos vivos: const remaining = gameData.enemies.length;
        window.updateEnemiesRemainingDisplay(remaining);
    }
}