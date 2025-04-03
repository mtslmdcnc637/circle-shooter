// --- Player Actions ---
function calculateShieldDuration() { return BASE_SHIELD_ACTIVE_DURATION + player.shieldDurationLevel * SHIELD_DURATION_INCREASE; }
function calculateShieldCooldown() { return Math.max(MIN_SHIELD_COOLDOWN, BASE_SHIELD_COOLDOWN_DURATION - player.shieldCooldownLevel * SHIELD_COOLDOWN_DECREASE); }

function activateShield() {
     // console.log("Attempting to activate shield..."); // Reduce log spam
     const now = performance.now();
     if (!player.shieldUnlocked || player.shieldState !== 'inactive') {
         // console.log(`Shield activate failed: Unlocked=${player.shieldUnlocked}, State=${player.shieldState}.`);
         return;
     }
     player.shieldState = 'active'; player.shieldTimer = now;
     // console.log("Shield ACTIVATED!"); // Reduce log spam
     // Logic for shield explosion on activation (if purchased) could go here, or on expiry in updatePlayer
}

function deployNanoBot() {
    nanoBots.push({ x: player.x, y: player.y, target: null, state: 'seeking', creationTime: performance.now() });
    // console.log("Deployed Nanobot (object created)."); // Reduce log spam
}

// --- Bullet Creation ---
function shootBullet() { // Player shooting
    const now = performance.now();
    const fireRatePowerupMult = player.activePowerups.rapidFire ? 0.5 : 1;
    const baseFireInterval = 500;
    const levelFireInterval = baseFireInterval / (1 + player.fireRateLevel * FIRE_RATE_INCREASE);
    const currentFireInterval = levelFireInterval * fireRatePowerupMult;

    if (now - player.lastBulletTime < currentFireInterval) return;
    player.lastBulletTime = now;

    const bulletSpeed = BASE_BULLET_SPEED * (1 + player.bulletSpeedLevel * BULLET_SPEED_INCREASE);
    const damagePowerupMult = player.activePowerups.damageBoost ? 2 : 1;
    const bulletDamage = BASE_BULLET_DAMAGE * player.damageMultiplier * damagePowerupMult;
    const finalBulletRadius = BULLET_RADIUS;
    const hitsLeft = player.bulletPierceUnlocked ? BULLET_PIERCE_MAX + 1 : 1; // 1 hit base, +1 if pierced

    let angle; let targetEnemy = null;
    const autoAimActive = player.activePowerups.autoAim && player.activePowerups.autoAim > now;

    if (autoAimActive) {
        let closestDistSq = Infinity;
        enemies.forEach(enemy => {
             if (enemy && !enemy.converted && !enemy.isBossMinion) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                if (distSq < closestDistSq) { closestDistSq = distSq; targetEnemy = enemy; }
            }
        });
    }

    if (targetEnemy) angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
    else { if (aimX === player.x && aimY === player.y) return; angle = Math.atan2(aimY - player.y, aimX - player.x); }

    const shots = player.weaponLevel + 1;
    const spreadAngle = degToRad(shots > 1 ? 15 : 0);

    for (let i = 0; i < shots; i++) {
        let shotAngle = angle;
        if (shots > 1) shotAngle = angle - spreadAngle / 2 + (i / (shots - 1)) * spreadAngle;
        const vx = Math.cos(shotAngle) * bulletSpeed;
        const vy = Math.sin(shotAngle) * bulletSpeed;
        bullets.push({
             x: player.x, y: player.y, vx: vx, vy: vy, radius: finalBulletRadius,
             color: BULLET_COLOR, damage: bulletDamage, creationTime: now,
             hitsLeft: hitsLeft // Add remaining hits for piercing
        });
    }
}

function shootConvertedBullet(sourceEnemy) {
    const now = performance.now();
    if (!sourceEnemy || now - sourceEnemy.lastConvertedShot < CONVERTED_SHOOT_COOLDOWN) return;
    let targetEnemy = null; let closestDistSq = Infinity;
    enemies.forEach(enemy => {
        if (enemy && !enemy.converted && enemy !== sourceEnemy && !enemy.isBossMinion) {
            const distSq = distanceSquared(sourceEnemy.x, sourceEnemy.y, enemy.x, enemy.y);
            if (distSq < closestDistSq) { closestDistSq = distSq; targetEnemy = enemy; }
        }
    });
    if (!targetEnemy) return;
    sourceEnemy.lastConvertedShot = now;
    const angle = Math.atan2(targetEnemy.y - sourceEnemy.y, targetEnemy.x - sourceEnemy.x);
    const vx = Math.cos(angle) * CONVERTED_BULLET_SPEED; const vy = Math.sin(angle) * CONVERTED_BULLET_SPEED;
    convertedBullets.push({ x: sourceEnemy.x, y: sourceEnemy.y, vx: vx, vy: vy, radius: CONVERTED_BULLET_RADIUS, color: CONVERTED_BULLET_COLOR, damage: CONVERTED_BULLET_DAMAGE, creationTime: now });
}

function shootEnemyBullet(enemy) { // Enemy shooting logic
    const now = performance.now();
    if (!enemy || now - (enemy.lastShotTime || 0) < ENEMY_SHOOT_COOLDOWN) return; // Check cooldown

    enemy.lastShotTime = now;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x); // Aim at player
    const vx = Math.cos(angle) * ENEMY_BULLET_SPEED;
    const vy = Math.sin(angle) * ENEMY_BULLET_SPEED;

    enemyBullets.push({
        x: enemy.x, y: enemy.y,
        vx: vx, vy: vy,
        radius: ENEMY_BULLET_RADIUS, color: ENEMY_BULLET_COLOR, damage: ENEMY_BULLET_DAMAGE,
        creationTime: now
    });
}

// --- Enemy Creation --- (Modified to include new types)
function spawnEnemy(isMinion = false, bossRef = null, forceType = null, position = null, healthFactor = 1) {
    if (bossActive && !isMinion) return;
    let spawnX, spawnY; const buffer = 50;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    if (position) { // Used by splitter children
        spawnX = position.x; spawnY = position.y;
    } else if (isMinion && bossRef) {
        const angle = Math.random() * Math.PI * 2; const spawnDist = bossRef.radius + BASE_ENEMY_RADIUS + 10;
        spawnX = bossRef.x + Math.cos(angle) * spawnDist; spawnY = bossRef.y + Math.sin(angle) * spawnDist;
    } else {
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: spawnX = Math.random() * canvasW; spawnY = -buffer; break; case 1: spawnX = canvasW + buffer; spawnY = Math.random() * canvasH; break;
            case 2: spawnX = Math.random() * canvasW; spawnY = canvasH + buffer; break; case 3: spawnX = -buffer; spawnY = Math.random() * canvasH; break;
            default: spawnX = -buffer; spawnY = Math.random() * canvasH;
        }
    }

    let type, color, healthMultiplier = 1, speedMultiplier = 1, radiusMultiplier = 1;
    const waveFactor = Math.pow(1.05, currentWave); const speedWaveFactor = Math.pow(1.01, currentWave);

    if (forceType) { type = forceType; } // For splitter children
    else if (isMinion) { type = 'square'; }
    else { // Regular enemy type selection
        const typeRoll = Math.random();
        if (currentWave > 8 && typeRoll > 0.85) type = 'splitter';
        else if (currentWave > 5 && typeRoll > 0.65) type = 'shooter';
        else if (currentWave > 10 && typeRoll > 0.5) type = 'triangle'; // Made triangles slightly rarer/later
        else if (currentWave > 2 && typeRoll > 0.2) type = 'square';
        else type = 'circle';
    }

    // Assign properties based on type
    switch (type) {
        case 'shooter': color = ENEMY_SHOOTER_COLOR; healthMultiplier = 0.9 * waveFactor; speedMultiplier = 0.7 * speedWaveFactor; radiusMultiplier = 1.0; break;
        case 'splitter': color = ENEMY_SPLITTER_COLOR; healthMultiplier = 1.2 * waveFactor; speedMultiplier = 0.8 * speedWaveFactor; radiusMultiplier = 1.1; break;
        case 'triangle': color = ENEMY_TRIANGLE_COLOR; healthMultiplier = 1.3 * waveFactor; speedMultiplier = 1.2 * speedWaveFactor; radiusMultiplier = 0.9; break;
        case 'square': color = ENEMY_SQUARE_COLOR; healthMultiplier = 1.1 * waveFactor; speedMultiplier = 0.9 * speedWaveFactor; radiusMultiplier = 1.1; break;
        case 'circle': default: color = ENEMY_CIRCLE_COLOR; healthMultiplier = 1.0 * waveFactor; speedMultiplier = 1.0 * speedWaveFactor; radiusMultiplier = 1.0; break;
    }
     if (isMinion) { // Minion overrides
        type = 'square'; color = ENEMY_SQUARE_COLOR; healthMultiplier = 0.6 * waveFactor; speedMultiplier = 1.3 * speedWaveFactor; radiusMultiplier = 0.8;
     }


    const speedVariance = (Math.random() - 0.5) * 2 * ENEMY_SPEED_RANDOMNESS;
    const enemySpeed = Math.max(25, (BASE_ENEMY_SPEED + speedVariance) * speedMultiplier);
    // Apply health factor for splitter children
    const finalHealth = Math.max(10, BASE_ENEMY_HEALTH * healthMultiplier * healthFactor);

    enemies.push({
        x: spawnX, y: spawnY, radius: BASE_ENEMY_RADIUS * radiusMultiplier, color: color, type: type,
        maxHealth: finalHealth, health: finalHealth, speed: enemySpeed, targetX: player.x, targetY: player.y,
        creationTime: performance.now(), converted: false, infectionTimer: null, conversionEndTime: 0, lastConvertedShot: 0,
        lastShotTime: 0, // For shooter enemies
        isBossMinion: isMinion, isBoss: false, currentColor: color, wanderAngle: Math.random() * Math.PI * 2,
    });
}
function spawnBoss() {
    bossActive = true; enemiesRemainingInWave = 1; updateEnemiesRemainingUI();
    const radius = BASE_ENEMY_RADIUS * BOSS_RADIUS_MULTIPLIER;
    const bossWaveNum = Math.floor(currentWave / BOSS_WAVE_INTERVAL);
    const health = BASE_ENEMY_HEALTH * BOSS_HEALTH_MULTIPLIER * Math.pow(1.2, bossWaveNum);
    const speed = BASE_ENEMY_SPEED * 0.6;
    const edge = Math.floor(Math.random() * 4); let spawnX, spawnY; const buffer = radius * 1.5;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;
    switch (edge) {
        case 0: spawnX = canvasW / 2; spawnY = -buffer; break; case 1: spawnX = canvasW + buffer; spawnY = canvasH / 2; break;
        case 2: spawnX = canvasW / 2; spawnY = canvasH + buffer; break; case 3: spawnX = -buffer; spawnY = canvasH / 2; break;
        default: spawnX = -buffer; spawnY = canvasH / 2;
    }
    enemies.push({
        x: spawnX, y: spawnY, radius: radius, color: BOSS_COLOR, type: 'boss', maxHealth: health, health: health, speed: speed,
        targetX: player.x, targetY: player.y, creationTime: performance.now(), isBoss: true, lastMinionSpawnTime: performance.now(),
        converted: false, infectionTimer: null, conversionEndTime: 0, lastConvertedShot: 0, lastShotTime: 0,
        isBossMinion: false, currentColor: BOSS_COLOR, wanderAngle: 0,
    });
}

// --- Powerup Creation & Activation --- (Added Health Pack, Magnet)
function spawnPowerup(x, y) {
    const rand = Math.random(); let type = 'cash'; let color = '#FFEB3B'; let symbol = '$';
    // Order by rarity
    if (rand < AUTO_AIM_DROP_CHANCE) { type = 'autoAim'; color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; }
    else if (rand < AUTO_AIM_DROP_CHANCE + 0.04) { type = 'magnet'; color = POWERUP_MAGNET_COLOR; symbol = 'M'; } // Magnet
    else if (rand < AUTO_AIM_DROP_CHANCE + 0.09) { type = 'health'; color = POWERUP_HEALTH_COLOR; symbol = '+'; } // Health Pack
    else if (rand < AUTO_AIM_DROP_CHANCE + 0.13) { type = 'shieldBoost'; color = '#03A9F4'; symbol = 'S'; }
    else if (rand < AUTO_AIM_DROP_CHANCE + 0.18) { type = 'damageBoost'; color = '#FF5722'; symbol = 'D'; }
    else if (rand < AUTO_AIM_DROP_CHANCE + 0.25) { type = 'rapidFire'; color = '#9C27B0'; symbol = 'F'; }
    else { type = 'cash'; color = '#FFEB3B'; symbol = '$'; } // Default cash
    powerups.push({ x: x, y: y, radius: 10, color: color, type: type, symbol: symbol, creationTime: performance.now() });
}
function activatePowerup(powerup) {
    if (!powerup) return;
    const now = performance.now(); const duration = POWERUP_DURATION; const type = powerup.type;
    switch (type) {
        case 'cash': const amount = Math.floor(5 + currentWave * 1.5 + Math.random() * 5); cash += amount; updateCashDisplay(); saveGameData(); break;
        case 'rapidFire': player.activePowerups.rapidFire = now + duration; break;
        case 'shieldBoost': if (player.shieldUnlocked) { player.shieldState = 'active'; player.shieldTimer = now; /* console.log("Shield activated by Powerup"); */ } break;
        case 'damageBoost': player.activePowerups.damageBoost = now + duration; break;
        case 'autoAim': player.activePowerups.autoAim = now + duration; break;
        case 'health': health = Math.min(100, health + HEALTH_PACK_AMOUNT); updateHealthDisplay(); break; // Heal player, cap at 100
        case 'magnet': player.activePowerups.magnet = now + MAGNET_DURATION; break; // Activate magnet timer
    }
    createParticles(player.x, player.y, powerup.color || '#FFFFFF', 10);
}

// --- Enemy Conversion ---
function convertEnemy(enemy) {
    if (!enemy || enemy.converted || enemy.isBoss || enemy.isBossMinion) return;
    enemy.converted = true; enemy.infectionTimer = null; enemy.conversionEndTime = performance.now() + CONVERTED_DURATION;
    enemy.color = CONVERTED_BULLET_COLOR; enemy.currentColor = CONVERTED_BULLET_COLOR;
    enemy.radius *= CONVERTED_ENEMY_RADIUS_FACTOR; enemy.speed *= 0.4; enemy.lastConvertedShot = performance.now();
    createParticles(enemy.x, enemy.y, CONVERTED_BULLET_COLOR, 15);
}

// --- Particle Creation ---
function createParticles(x, y, color, count = PARTICLE_COUNT) {
    if (!color) color = '#FFFFFF';
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = Math.random() * PARTICLE_SPEED + PARTICLE_SPEED * 0.5;
        particles.push({
            x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: Math.random() * PARTICLE_RADIUS + 1,
            color: color, life: PARTICLE_LIFESPAN * (Math.random() * 0.5 + 0.75), creationTime: performance.now()
        });
    }
}

// --- Damage Number Creation ---
function createDamageNumber(x, y, amount) {
    damageNumbers.push({
        x: x + (Math.random() - 0.5) * 10, // Slight horizontal jitter
        y: y,
        text: Math.round(amount).toString(),
        life: DAMAGE_NUMBER_LIFESPAN,
        creationTime: performance.now()
    });
}