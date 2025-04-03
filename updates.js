// --- Game State Update Functions ---

function updatePlayer(dt) {
    // Shield State Machine
    const now = performance.now();
    if (player.shieldState === 'active') {
        if (now - player.shieldTimer > calculateShieldDuration()) {
            player.shieldState = 'cooldown'; player.shieldTimer = now;
        }
    } else if (player.shieldState === 'cooldown') {
         if (now - player.shieldTimer > calculateShieldCooldown()) {
             player.shieldState = 'inactive'; player.shieldTimer = now;
         }
    }

    // Powerup Timers Check
    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
             if (player.activePowerups[type] < now) {
                delete player.activePowerups[type];
                // console.log(`Powerup ${type} expired.`); // Optional log
            }
        }
    }

    // Continuous shooting check (can be tied to input state later)
    if (gameState === 'playing') {
        shootBullet();
    }
}

function updateBullets(dt) {
    const now = performance.now();
    // Increased buffer slightly for bullet removal
    const buffer = 30; // Pixels beyond edge before removing
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    // --- Player Bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        // Off-screen check with increased buffer
        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            bullets.splice(i, 1); continue;
        }

        // Bullet-Enemy Collision
        let bulletHit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy || enemy.converted) continue;

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                enemy.health -= bullet.damage;
                createParticles(bullet.x, bullet.y, enemy.color, 3);
                bullets.splice(i, 1);
                bulletHit = true;

                if (enemy.health <= 0) { // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.isBoss) cashGain *= 10; else if (enemy.isBossMinion) cashGain *= 0.3; else if (enemy.type === 'triangle') cashGain *= 1.2;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(enemy.x, enemy.y);

                    enemies.splice(j, 1);
                    enemiesRemainingInWave--;

                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED!"); waveTimer = 1500; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                }
                break; // Bullet hit one enemy
            }
        }
        if (bulletHit) continue; // Go to next bullet
    } // End player bullet loop

     // --- Converted Enemy Bullets ---
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
        const cBullet = convertedBullets[i];
        if (!cBullet) continue;
        cBullet.x += cBullet.vx * dt; cBullet.y += cBullet.vy * dt;

        // Off-screen check with increased buffer
        if (cBullet.x < -buffer || cBullet.x > canvasW + buffer || cBullet.y < -buffer || cBullet.y > canvasH + buffer) {
            convertedBullets.splice(i, 1); continue;
        }

         let cBulletHit = false;
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if (!enemy || enemy.converted || enemy.isBossMinion) continue;

             const distSq = distanceSquared(cBullet.x, cBullet.y, enemy.x, enemy.y);
             const radiiSumSq = (cBullet.radius + enemy.radius) * (cBullet.radius + enemy.radius);

             if (distSq < radiiSumSq) {
                 enemy.health -= cBullet.damage;
                 createParticles(cBullet.x, cBullet.y, CONVERTED_BULLET_COLOR, 3);
                 convertedBullets.splice(i, 1);
                 cBulletHit = true;

                 if (enemy.health <= 0) { // Enemy defeated by converted
                    let cashGain = 2 + Math.floor(currentWave * 0.2);
                    if (enemy.isBoss) cashGain *= 5;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE * 0.3) spawnPowerup(enemy.x, enemy.y);

                    enemies.splice(j, 1);
                    enemiesRemainingInWave--;

                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED (by converted)!"); waveTimer = 1500; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                 }
                 break; // Bullet hit one enemy
             }
         }
         if (cBulletHit) continue; // Go to next converted bullet
     } // End converted bullet loop
}


function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue;
        let enemyRemovedThisFrame = false;

        // --- Boss Logic ---
        if (enemy.isBoss) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt;
            if (now - enemy.lastMinionSpawnTime > BOSS_MINION_SPAWN_COOLDOWN) {
                 for(let m=0; m < BOSS_MINION_COUNT; m++) spawnEnemy(true, enemy); // Pass boss ref
                 enemy.lastMinionSpawnTime = now;
            }
        }
        // --- Converted Logic ---
        else if (enemy.converted) {
            if (now > enemy.conversionEndTime) { createParticles(enemy.x, enemy.y, '#AAAAAA', 10); enemies.splice(i, 1); enemyRemovedThisFrame = true; continue; }
            if (Math.random() < 0.02) enemy.wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * dt; enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * dt;
            enemy.x = Math.max(enemy.radius, Math.min(canvasW - enemy.radius, enemy.x)); enemy.y = Math.max(enemy.radius, Math.min(canvasH - enemy.radius, enemy.y));
            shootConvertedBullet(enemy);
        }
        // --- Regular & Minion Logic (Not Converted) ---
        else {
            if (enemy.infectionTimer !== null) { // Infection progress
                enemy.infectionTimer += dt * 1000;
                if (enemy.infectionTimer >= NANO_BOT_INFECTION_TIME) convertEnemy(enemy);
                else enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.4 + Math.sin(enemy.infectionTimer / NANO_BOT_INFECTION_TIME * Math.PI * 6) * 0.3);
            } else { // Regular movement
                enemy.currentColor = enemy.color;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt;
            }

            // Player Collision
            if (!player.shieldActive) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                const radiiSumSq = (player.radius * 0.8 + enemy.radius * 0.8) * (player.radius * 0.8 + enemy.radius * 0.8);
                if (distSq < radiiSumSq) {
                    let damage = enemy.isBossMinion ? 5 : (enemy.type === 'triangle' ? 15 : 10);
                    health -= damage; createParticles(player.x, player.y, '#FF0000', 5); updateHealthDisplay();
                    const knockbackAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(knockbackAngle) * 5; enemy.y += Math.sin(knockbackAngle) * 5;
                    triggerScreenShake(damage * 0.5, 150);
                    if (health <= 0) { gameOver(); return; } // Exit update loop if game over
                }
            }
        } // End regular/minion logic

        // Bounds Check (if not removed already)
        if (!enemyRemovedThisFrame) {
            const BORDER_BUFFER = enemy.radius + 100;
            if (enemy.x < -BORDER_BUFFER || enemy.x > canvasW + BORDER_BUFFER || enemy.y < -BORDER_BUFFER || enemy.y > canvasH + BORDER_BUFFER) {
                if (!enemy.isBoss) {
                    // console.log("Removing stray enemy:", enemy.type); // Reduce console spam
                    enemies.splice(i, 1);
                    if (!enemy.converted) enemiesRemainingInWave--; // Only count if not converted
                    updateEnemiesRemainingUI();
                    enemyRemovedThisFrame = true;
                }
            }
        }
    } // End enemy loop
}

function updateNanoBots(dt) {
    const now = performance.now();
    for (let i = nanoBots.length - 1; i >= 0; i--) {
        const bot = nanoBots[i];
        if (!bot) continue;
        let botRemoved = false;

        if (bot.state === 'seeking') {
            let closestDistSq = Infinity; let potentialTarget = null;
            enemies.forEach(enemy => {
                if (enemy && !enemy.converted && enemy.infectionTimer === null && !enemy.isBoss && !enemy.isBossMinion) {
                    const distSq = distanceSquared(bot.x, bot.y, enemy.x, enemy.y);
                    if (distSq < closestDistSq) { closestDistSq = distSq; potentialTarget = enemy; }
                }
            });
            if (potentialTarget) { bot.target = potentialTarget; bot.state = 'homing'; }
            else { // Wander or timeout
                const angle = (now / 500) + i;
                bot.x += Math.cos(angle) * NANO_BOT_SPEED * dt * 0.1; bot.y += Math.sin(angle) * NANO_BOT_SPEED * dt * 0.1;
                if (now - bot.creationTime > 8000) { createParticles(bot.x, bot.y, '#AAAAAA', 5); nanoBots.splice(i, 1); botRemoved = true; }
            }
        }

        if (bot.state === 'homing' && !botRemoved) {
            if (!bot.target || bot.target.health <= 0 || bot.target.converted || bot.target.infectionTimer !== null) {
                bot.target = null; bot.state = 'seeking'; continue; // Target lost
            }
            const angle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
            bot.x += Math.cos(angle) * NANO_BOT_SPEED * dt; bot.y += Math.sin(angle) * NANO_BOT_SPEED * dt;
            const botRadius = 5;
            const distSq = distanceSquared(bot.x, bot.y, bot.target.x, bot.target.y);
            const radiiSumSq = (botRadius + bot.target.radius * 0.8) * (botRadius + bot.target.radius * 0.8);
            if (distSq < radiiSumSq) { // Hit target
                bot.target.infectionTimer = 1; createParticles(bot.x, bot.y, NANO_BOT_COLOR, 8);
                nanoBots.splice(i, 1); botRemoved = true;
            }
        }
    } // End bot loop
}

// --- Modified updatePowerups ---
function updatePowerups(dt) {
    const now = performance.now();
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) continue;

        // --- Attraction Logic ---
        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        const attractionDistSq = POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE;
        let currentAttractionSpeed = POWERUP_ATTRACTION_SPEED * 0.3; // Base attraction speed (slower)

        // Increase speed significantly if player is close
        if (distSqToPlayer < attractionDistSq) {
            currentAttractionSpeed = POWERUP_ATTRACTION_SPEED * 1.5; // Faster when close
        }

        // Always move towards player
        const angle = Math.atan2(player.y - p.y, player.x - p.x);
        p.x += Math.cos(angle) * currentAttractionSpeed * dt;
        p.y += Math.sin(angle) * currentAttractionSpeed * dt;
        // --- End Attraction Logic ---


        // Pickup Check (use distance squared for efficiency)
        const collectionDist = player.radius + p.radius;
        if (distSqToPlayer < collectionDist * collectionDist) {
            activatePowerup(p);
            powerups.splice(i, 1); // Remove powerup from game
            continue; // Skip despawn check for this removed powerup
        }

        // Despawn after time
        if (now - p.creationTime > 15000) { // 15 seconds lifespan
            createParticles(p.x, p.y, p.color || '#FFFFFF', 5); // Fade out effect
            powerups.splice(i, 1);
        }
    }
}


function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.99; p.vy *= 0.99; // Friction
        p.life -= dt * 1000;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function updateScreenShake(dt) {
     if (shakeDuration > 0) {
         shakeDuration -= dt * 1000;
         if (shakeDuration <= 0) { shakeDuration = 0; shakeIntensity = 0; shakeOffsetX = 0; shakeOffsetY = 0; }
     } else { shakeIntensity = 0; shakeOffsetX = 0; shakeOffsetY = 0; }
}
function triggerScreenShake(intensity, durationMs) {
    shakeIntensity = Math.max(shakeIntensity, intensity); shakeDuration = Math.max(shakeDuration, durationMs);
}

// --- Wave Management Update ---
function startNextWave() {
    currentWave++; bossActive = false; console.log(`Preparing Wave ${currentWave}...`);
    if (currentWave > 0 && currentWave % BOSS_WAVE_INTERVAL === 0) { // Boss Wave
        gameState = 'playing'; enemiesToSpawnThisWave = 1; enemiesSpawnedThisWave = 0; enemiesRemainingInWave = 1;
        spawnBoss(); waveTimer = 0; lastEnemySpawnTime = performance.now(); console.log(`--- BOSS WAVE ${currentWave} STARTED ---`);
    } else { // Regular Wave
        gameState = 'waveIntermission'; waveTimer = WAVE_INTERMISSION_TIME;
        enemiesToSpawnThisWave = BASE_ENEMIES_PER_WAVE + Math.floor((currentWave -1) * ENEMIES_PER_WAVE_INCREASE);
        enemiesRemainingInWave = enemiesToSpawnThisWave; enemiesSpawnedThisWave = 0;
        currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - ((currentWave -1) * SPAWN_INTERVAL_REDUCTION_PER_WAVE));
        lastEnemySpawnTime = 0;
        if (currentWave > 1) { let bonus = 20 + currentWave * 5; cash += bonus; updateCashDisplay(); /* console.log(`Wave ${currentWave-1} clear! +${bonus} cash.`); */ } // Reduce log spam
        // console.log(`Wave ${currentWave}: Spawning ${enemiesToSpawnThisWave}. Interval: ${currentEnemySpawnInterval.toFixed(0)}ms`); // Reduce log spam
    }
    updateWaveDisplay(); updateEnemiesRemainingUI(); saveGameData();
}

function updateWaveState(dt) {
    const now = performance.now();
    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0) { gameState = 'playing'; lastEnemySpawnTime = now; /* console.log("Intermission ended."); */ } // Reduce log spam
        return; // No spawning/completion checks during intermission
    }

    if (gameState === 'playing') {
        // Spawn regular enemies
        if (!bossActive && enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
            if (now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                 spawnEnemy(); enemiesSpawnedThisWave++; lastEnemySpawnTime = now;
            }
        }
        // Check wave completion
        if (enemiesRemainingInWave <= 0 && (enemiesSpawnedThisWave >= enemiesToSpawnThisWave)) {
             if (!bossActive || (bossActive && enemies.every(e => e && !e.isBoss))) { // Ensure boss is actually gone
                 // console.log(`Wave ${currentWave} complete.`); // Reduce log spam
                 startNextWave();
             }
        }
    }
}