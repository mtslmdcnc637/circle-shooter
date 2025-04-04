//--- START OF FILE circle-shooter-main/gameobjects.js ---
// --- Game Object Creation and Management ---

// --- Player Related ---
function calculateFireRateDelay() {
    const baseDelay = 500; // Milliseconds between shots at level 0
    return baseDelay / (1 + player.fireRateLevel * FIRE_RATE_INCREASE);
}

function calculateBulletSpeed() {
    return BASE_BULLET_SPEED * (1 + player.bulletSpeedLevel * BULLET_SPEED_INCREASE);
}

function calculateBulletDamage() {
    // Apply damage powerup multiplier if active
    const now = performance.now();
    let damageMultiplier = player.damageMultiplier; // Base multiplier from upgrades
    if (player.activePowerups.damageBoost && player.activePowerups.damageBoost > now) {
        damageMultiplier *= 1.5; // Example: 50% boost from powerup
    }
    return BASE_BULLET_DAMAGE * damageMultiplier;
}

function calculateShieldDuration() {
    return BASE_SHIELD_ACTIVE_DURATION + (player.shieldDurationLevel * SHIELD_DURATION_INCREASE);
}

function calculateShieldCooldown() {
    return Math.max(MIN_SHIELD_COOLDOWN, BASE_SHIELD_COOLDOWN_DURATION - (player.shieldCooldownLevel * SHIELD_COOLDOWN_DECREASE));
}

function shootBullet() {
    const now = performance.now();
    const fireRateDelay = calculateFireRateDelay();

    // Rapid fire powerup check
    let actualFireRateDelay = fireRateDelay;
    if (player.activePowerups.rapidFire && player.activePowerups.rapidFire > now) {
        actualFireRateDelay *= 0.5; // Example: 50% faster firing with powerup
    }

    // Auto-aim powerup check
    let targetX = aimX; let targetY = aimY;
    if (player.activePowerups.autoAim && player.activePowerups.autoAim > now) {
        let closestEnemy = null; let minDistSq = Infinity;
        enemies.forEach(enemy => {
            if (enemy && !enemy.converted && enemy.health > 0) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                if (distSq < minDistSq && distSq < (canvas.width * 0.7)**2) { // Target enemies within 70% of screen width
                    minDistSq = distSq; closestEnemy = enemy;
                }
            }
        });
        if (closestEnemy) { targetX = closestEnemy.x; targetY = closestEnemy.y; }
    }

    if (now - player.lastBulletTime > actualFireRateDelay) {
        player.lastBulletTime = now;
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const angle = Math.atan2(dy, dx);
        const speed = calculateBulletSpeed();
        const damage = calculateBulletDamage(); // Uses function that includes powerup check
        const pierceCount = player.bulletPierceUnlocked ? BULLET_PIERCE_MAX : 0;

        const bulletsToShoot = 1 + player.weaponLevel; // Base + levels
        const spreadAngle = degToRad(5 + bulletsToShoot * 2.5); // Adjust spread angle

        for (let i = 0; i < bulletsToShoot; i++) {
            // Calculate angle for this bullet based on spread
            // Ensure division by zero doesn't happen if bulletsToShoot is 1
            const angleOffset = (bulletsToShoot > 1) ? (i - (bulletsToShoot - 1) / 2) * (spreadAngle / (bulletsToShoot - 1)) : 0;
            const currentAngle = angle + angleOffset;

            bullets.push({
                x: player.x + Math.cos(currentAngle) * (player.radius + BULLET_RADIUS + 2), // Spawn outside player
                y: player.y + Math.sin(currentAngle) * (player.radius + BULLET_RADIUS + 2),
                vx: Math.cos(currentAngle) * speed,
                vy: Math.sin(currentAngle) * speed,
                radius: BULLET_RADIUS,
                damage: damage,
                hitsLeft: 1 + pierceCount // 1 base hit + pierce count
            });
        }
        // Play sound effect?
        createParticles(player.x + Math.cos(angle)*(player.radius+5), player.y + Math.sin(angle)*(player.radius+5), BULLET_COLOR, 1, 0.5); // Muzzle flash particle
    }
}

function activateShield() {
    if (!player.shieldUnlocked || player.shieldState !== 'inactive') return;
    player.shieldState = 'active';
    player.shieldTimer = performance.now();
    // Play shield activation sound/effect
    createParticles(player.x, player.y, SHIELD_COLOR, 15, 1.5, 800); // Shield activation burst
}

// --- Enemy Related ---
function spawnEnemy(isBossMinion = false, bossRef = null, type = null, position = null, sizeMultiplier = 1) {
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    let enemyType = type;
    let spawnPos = position;

    // Determine spawn position if not provided
    if (!spawnPos) {
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const buffer = 50;
        switch (edge) {
            case 0: spawnPos = { x: Math.random() * canvasW, y: -buffer }; break; // Top edge
            case 1: spawnPos = { x: canvasW + buffer, y: Math.random() * canvasH }; break; // Right edge
            case 2: spawnPos = { x: Math.random() * canvasW, y: canvasH + buffer }; break; // Bottom edge
            case 3: spawnPos = { x: -buffer, y: Math.random() * canvasH }; break; // Left edge
        }
    }

    // Determine enemy type if not provided
    if (!enemyType) {
        const rand = Math.random();
        if (currentWave > 15 && rand < 0.15 + (currentWave-15)*0.01) enemyType = 'splitter'; // Chance increases
        else if (currentWave > 10 && rand < 0.30 + (currentWave-10)*0.01) enemyType = 'shooter'; // Chance increases
        else if (currentWave > 5 && rand < 0.55 + (currentWave-5)*0.01) enemyType = 'triangle'; // Chance increases
        else if (rand < 0.75) enemyType = 'square';
        else enemyType = 'circle';
    }

    // Base stats
    let color = ENEMY_CIRCLE_COLOR;
    let radius = BASE_ENEMY_RADIUS;
    let health = BASE_ENEMY_HEALTH;
    let speed = BASE_ENEMY_SPEED;
    let shootCooldown = ENEMY_SHOOT_COOLDOWN;

    // Modify stats based on type
    switch (enemyType) {
        case 'square':
            color = ENEMY_SQUARE_COLOR;
            health *= 1.3; speed *= 0.9; break;
        case 'triangle':
            color = ENEMY_TRIANGLE_COLOR;
            health *= 0.8; speed *= 1.4; break;
        case 'shooter':
            color = ENEMY_SHOOTER_COLOR;
            health *= 0.9; speed *= 0.8; shootCooldown = ENEMY_SHOOT_COOLDOWN * Math.max(0.3, (0.8 - Math.min(0.5, currentWave * 0.015))); break; // Shoots faster on later waves, cap cooldown reduction
        case 'splitter':
            color = ENEMY_SPLITTER_COLOR;
            health *= 1.5; speed *= 0.7; break;
        case 'circle': // Default
            break;
    }

    // Apply wave scaling
    const waveMultiplier = 1 + (currentWave - 1) * 0.08; // Increase health slightly per wave
    const speedWaveMultiplier = 1 + (currentWave - 1) * 0.04; // Increase speed slightly per wave
    health = Math.floor(health * waveMultiplier);
    speed = speed * speedWaveMultiplier + (Math.random() * ENEMY_SPEED_RANDOMNESS - ENEMY_SPEED_RANDOMNESS / 2);
    speed = Math.max(20, speed); // Ensure minimum speed

     // Apply size multiplier (used for splitter children, potentially others)
     radius *= sizeMultiplier;
     health = Math.max(10, Math.floor(health * sizeMultiplier)); // Smaller enemies have less health
     speed *= (1 + (1-sizeMultiplier)*0.5); // Smaller enemies might be faster

    // Apply boss minion modifications
    if (isBossMinion) {
        health = Math.max(15, Math.floor(BASE_ENEMY_HEALTH * 0.5 * waveMultiplier)); // Minions are weaker
        radius *= 0.7;
        speed *= 1.1; // Slightly faster?
        color = lerpColor(color, BOSS_COLOR, 0.3);
    }

    enemies.push({
        x: spawnPos.x, y: spawnPos.y,
        radius: radius, color: color, currentColor: color,
        health: health, maxHealth: health,
        speed: speed, type: enemyType,
        isBossMinion: isBossMinion, bossRef: bossRef, // Link to boss if minion
        isBoss: false, // Set separately for the actual boss
        converted: false, infectionTimer: null, conversionEndTime: 0, wanderAngle: Math.random() * Math.PI * 2,
        lastShotTime: performance.now() + Math.random() * shootCooldown, // Stagger initial shots
        shootCooldown: shootCooldown, // For shooter type
        lastMinionSpawnTime: 0 // For Boss type
    });

    // Don't increment enemiesRemainingInWave here, do it in updateWaveState or startNextWave
    updateEnemiesRemainingUI(); // Update count display
}

function spawnBoss() {
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    const radius = BASE_ENEMY_RADIUS * BOSS_RADIUS_MULTIPLIER;
    const health = BASE_ENEMY_HEALTH * BOSS_HEALTH_MULTIPLIER * (1 + (currentWave/BOSS_WAVE_INTERVAL - 1) * 0.5); // Scale boss health by how many boss waves seen
    const speed = BASE_ENEMY_SPEED * 0.5; // Bosses are typically slower

    bossActive = true; // Set global flag

    enemies.push({
        x: canvasW / 2, y: -radius * 2, // Spawn off-screen top
        radius: radius, color: BOSS_COLOR, currentColor: BOSS_COLOR,
        health: health, maxHealth: health,
        speed: speed, type: 'boss', // Special type
        isBossMinion: false, bossRef: null,
        isBoss: true, // The actual boss flag
        converted: false, infectionTimer: null, conversionEndTime: 0, wanderAngle: 0,
        lastShotTime: performance.now(), shootCooldown: ENEMY_SHOOT_COOLDOWN * 0.4, // Boss shoots faster?
        lastMinionSpawnTime: performance.now() // Start cooldown for minion spawn
    });
     updateEnemiesRemainingUI();
}

function shootEnemyBullet(enemy, count = 1, spreadDeg = 10) {
    const now = performance.now();
    if (!enemy || enemy.converted || enemy.health <= 0) return;
    if (enemy.type !== 'shooter' && enemy.type !== 'boss') return;

    if (now - enemy.lastShotTime > enemy.shootCooldown) {
        enemy.lastShotTime = now;
        const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const bulletSpeed = ENEMY_BULLET_SPEED * (enemy.isBoss ? 1.2 : 1);
        const bulletRadius = ENEMY_BULLET_RADIUS * (enemy.isBoss ? 1.1 : 1);
        const bulletDamage = ENEMY_BULLET_DAMAGE * (enemy.isBoss ? 1.5 : 1) * (1 + currentWave * 0.015); // Scale damage
        const spreadRad = degToRad(spreadDeg);

        for(let i=0; i<count; i++) {
            const angleOffset = (count > 1) ? (i - (count - 1) / 2) * (spreadRad / (count - 1)) : 0;
            const currentAngle = angleToPlayer + angleOffset;
            enemyBullets.push({
                x: enemy.x + Math.cos(currentAngle) * (enemy.radius + bulletRadius),
                y: enemy.y + Math.sin(currentAngle) * (enemy.radius + bulletRadius),
                vx: Math.cos(currentAngle) * bulletSpeed,
                vy: Math.sin(currentAngle) * bulletSpeed,
                radius: bulletRadius,
                damage: Math.floor(bulletDamage)
            });
        }
    }
}

function shootConvertedBullet(enemy) {
    const now = performance.now();
    if (!enemy || !enemy.converted || enemy.health <= 0) return;

    // Find nearest non-converted enemy target
    let nearestEnemy = null;
    let minDistSq = Infinity;
    enemies.forEach(target => {
        if (target && !target.converted && target.health > 0 && !target.isBossMinion) { // Don't target boss minions? Or maybe do?
            const distSq = distanceSquared(enemy.x, enemy.y, target.x, target.y);
            if (distSq < minDistSq && distSq < (canvas.width * 0.5)**2) { // Range limit
                minDistSq = distSq;
                nearestEnemy = target;
            }
        }
    });

    if (nearestEnemy && now - enemy.lastShotTime > CONVERTED_SHOOT_COOLDOWN) {
        enemy.lastShotTime = now;
        const angleToTarget = Math.atan2(nearestEnemy.y - enemy.y, nearestEnemy.x - enemy.x);
        convertedBullets.push({
            x: enemy.x + Math.cos(angleToTarget) * (enemy.radius + CONVERTED_BULLET_RADIUS),
            y: enemy.y + Math.sin(angleToTarget) * (enemy.radius + CONVERTED_BULLET_RADIUS),
            vx: Math.cos(angleToTarget) * CONVERTED_BULLET_SPEED,
            vy: Math.sin(angleToTarget) * CONVERTED_BULLET_SPEED,
            radius: CONVERTED_BULLET_RADIUS,
            damage: CONVERTED_BULLET_DAMAGE * player.damageMultiplier // Scale with player damage upgrades?
        });
    }
}

function convertEnemy(enemy) {
    if (!enemy || enemy.converted) return;
    enemy.converted = true;
    enemy.infectionTimer = null; // Stop infection progress
    enemy.conversionEndTime = performance.now() + CONVERTED_DURATION;
    enemy.color = CONVERTED_BULLET_COLOR; // Change base color
    enemy.currentColor = CONVERTED_BULLET_COLOR;
    // enemy.speed *= 0.8; // Optionally slow down converted enemies
    enemy.radius *= CONVERTED_ENEMY_RADIUS_FACTOR; // Optionally shrink converted enemies
    enemy.lastShotTime = performance.now(); // Reset shot timer
    createParticles(enemy.x, enemy.y, CONVERTED_BULLET_COLOR, 12, 1.2, 600); // Conversion effect
}

function deployNanoBot() {
    if (cash < NANO_BOT_DEPLOY_COST) {
        displayCannotAfford('nanobot');
        return;
    }
    // Check limit?
    // if(nanoBots.length >= MAX_NANOBOTS) { console.log("Max nanobots reached"); return; }

    cash -= NANO_BOT_DEPLOY_COST;
    updateCashDisplay();
    updateUpgradeUI(); // Update button state
    saveGameData();

    nanoBots.push({
        x: player.x,
        y: player.y,
        radius: 5,
        color: NANO_BOT_COLOR
        // Target finding logic is in updateNanoBots
    });
    updateEnemiesRemainingUI(); // Update bot count display
}


// --- Powerup Related ---
function spawnPowerup(x, y) {
    const typeRoll = Math.random();
    let type = 'health'; // Default?
    let color = POWERUP_HEALTH_COLOR;
    let symbol = '+';

    // More complex weighting needed here
    if (typeRoll < 0.30) { type = 'health'; color = POWERUP_HEALTH_COLOR; symbol = '+'; }
    else if (typeRoll < 0.55) { type = 'rapidFire'; color = '#9C27B0'; symbol = 'F'; }
    else if (typeRoll < 0.75) { type = 'damageBoost'; color = '#FF5722'; symbol = 'D'; }
    else if (typeRoll < 0.90) { type = 'magnet'; color = POWERUP_MAGNET_COLOR; symbol = 'M'; }
    else { type = 'autoAim'; color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; } // AutoAim is rarer


    powerups.push({
        x: x, y: y,
        radius: 10,
        type: type,
        color: color,
        symbol: symbol,
        creationTime: performance.now()
    });
}

function activatePowerup(powerup) {
    const now = performance.now();
    let duration = POWERUP_DURATION;
    let message = "";

    switch (powerup.type) {
        case 'health':
            health = Math.min(100, health + HEALTH_PACK_AMOUNT);
            updateHealthDisplay();
            createDamageNumber(player.x, player.y, `+${HEALTH_PACK_AMOUNT} HP`, POWERUP_HEALTH_COLOR);
            message = "+Health!";
            break;
        case 'rapidFire':
            player.activePowerups.rapidFire = now + duration;
            message = "Rapid Fire!";
            break;
        case 'damageBoost':
            player.activePowerups.damageBoost = now + duration;
            message = "Damage Up!";
            break;
        case 'autoAim':
            player.activePowerups.autoAim = now + duration;
             message = "Auto Aim!";
            break;
        case 'magnet':
             duration = MAGNET_DURATION; // Magnet has specific duration
             player.activePowerups.magnet = now + duration;
             message = "Magnet!";
            break;
        default:
            console.warn("Unknown powerup type:", powerup.type);
            return;
    }

    // Display powerup message briefly?
    // createGameMessage(message, powerup.color); // Need a function for this
    createParticles(player.x, player.y, powerup.color, 15, 1.5, 700); // Pickup effect
}


// --- Effects Related ---
function createParticles(x, y, color = '#FFFFFF', count = PARTICLE_COUNT, speedMultiplier = 1, lifespan = PARTICLE_LIFESPAN) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = PARTICLE_SPEED * speedMultiplier * (0.5 + Math.random() * 0.8); // Vary speed
        const life = lifespan * (0.7 + Math.random() * 0.6); // Vary lifespan
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: PARTICLE_RADIUS * (0.8 + Math.random() * 0.4), // Vary size
            color: color,
            life: life,
            initialLife: life, // Store initial life for alpha calculation
            alpha: 1
        });
    }
}

function createDamageNumber(x, y, text, color = '#FFFFFF') {
    damageNumbers.push({
        x: x + (Math.random() - 0.5) * 20, // Slightly random horizontal position
        y: y - 10 + (Math.random() - 0.5) * 10, // Slightly random vertical position
        text: text,
        color: color, // Allow custom color (e.g., for cash bonus)
        life: DAMAGE_NUMBER_LIFESPAN
    });
}