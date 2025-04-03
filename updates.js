// --- Game State Update Functions ---

function updatePlayer(dt) {
    const now = performance.now();
    // Shield State Machine
    if (player.shieldState === 'active') {
        if (now - player.shieldTimer > calculateShieldDuration()) {
            player.shieldState = 'cooldown';
            player.shieldTimer = now;
            if (player.shieldExplodeUnlocked) { // Trigger Shield Explosion
                createParticles(player.x, player.y, SHIELD_COLOR, 30);
                enemies.forEach(enemy => {
                    if (enemy && !enemy.converted) {
                        const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                        if (distSq < SHIELD_EXPLOSION_RADIUS * SHIELD_EXPLOSION_RADIUS) {
                            const damageDealt = SHIELD_EXPLOSION_DAMAGE * player.damageMultiplier; // Scale with player damage? Optional.
                            enemy.health -= damageDealt;
                            createDamageNumber(enemy.x, enemy.y, damageDealt);
                        }
                    }
                });
            }
        }
    } else if (player.shieldState === 'cooldown') {
         if (now - player.shieldTimer > calculateShieldCooldown()) {
             player.shieldState = 'inactive';
             player.shieldTimer = now;
         }
    }

    // Powerup Timers Check
    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
             if (player.activePowerups[type] < now) { delete player.activePowerups[type]; }
        }
    }

    // Continuous shooting check
    if (gameState === 'playing') { shootBullet(); }
}

function updateBullets(dt) { // Handles player bullets
    const now = performance.now(); const buffer = 30;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) { bullets.splice(i, 1); continue; }

        // Bullet-Enemy Collision
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy || enemy.converted || enemy.health <= 0) continue; // Skip dead/converted

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                const damageDealt = bullet.damage;
                enemy.health -= damageDealt;
                createParticles(bullet.x, bullet.y, enemy.color, 3);
                createDamageNumber(enemy.x, enemy.y, damageDealt);

                bullet.hitsLeft--; // Decrement pierce count

                if (bullet.hitsLeft <= 0) { bullets.splice(i, 1); } // Remove bullet if out of hits

                if (enemy.health <= 0) { // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.type === 'splitter') cashGain *= 1.5; else if (enemy.type === 'shooter') cashGain *= 1.1; else if (enemy.type === 'triangle') cashGain *= 1.2; else if (enemy.isBossMinion) cashGain *= 0.3; else if (enemy.isBoss) cashGain *= 10;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(enemy.x, enemy.y);

                    if (enemy.type === 'splitter') { // --- Splitter Logic ---
                         for (let k = 0; k < SPLITTER_CHILD_COUNT; k++) {
                              const angleOffset = (k / SPLITTER_CHILD_COUNT) * Math.PI * 2;
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * enemy.radius * 0.5, y: enemy.y + Math.sin(angleOffset) * enemy.radius * 0.5 };
                              spawnEnemy(false, null, 'circle', spawnPos, 0.4);
                         }
                         enemiesToSpawnThisWave += SPLITTER_CHILD_COUNT; enemiesRemainingInWave += SPLITTER_CHILD_COUNT;
                    }

                    enemies.splice(j, 1); enemiesRemainingInWave--;
                    if (enemy.isBoss) { bossActive = false; waveTimer = WAVE_CLEAR_MSG_DURATION; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                }
                if (!bullets[i]) break; // Exit inner loop if bullet was removed
            }
        }
        if (!bullets[i]) continue; // Go to next bullet if this one was removed
    } // End player bullet loop

     // Update Converted Bullets
     for (let i = convertedBullets.length - 1; i >= 0; i--) { /* ... converted bullet logic ... */ } // No changes needed here for now
}

function updateEnemyBullets(dt) {
    const buffer = 10;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) { enemyBullets.splice(i, 1); continue; }

        if (!player.shieldActive) { // Player collision
            const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
            const radiiSumSq = (bullet.radius + player.radius * 0.8) * (bullet.radius + player.radius * 0.8);
            if (distSq < radiiSumSq) {
                health -= bullet.damage;
                createParticles(player.x, player.y, '#FF0000', 5);
                updateHealthDisplay(); triggerScreenShake(bullet.damage * 0.8, 150);
                enemyBullets.splice(i, 1); // Remove bullet
                if (health <= 0) { gameOver(); return; } // Stop processing
            }
        }
    }
}

function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;
    const infectionRateMultiplier = Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, player.nanobotInfectLevel);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue;
        let enemyRemovedThisFrame = false;

        if (enemy.isBoss) { /* Boss movement & minion spawn */
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt;
            if (now - enemy.lastMinionSpawnTime > BOSS_MINION_SPAWN_COOLDOWN) {
                 for(let m=0; m < BOSS_MINION_COUNT; m++) spawnEnemy(true, enemy);
                 enemy.lastMinionSpawnTime = now;
            }
        } else if (enemy.converted) { /* Converted logic */
            if (now > enemy.conversionEndTime) { createParticles(enemy.x, enemy.y, '#AAAAAA', 10); enemies.splice(i, 1); enemyRemovedThisFrame = true; continue; }
            if (Math.random() < 0.02) enemy.wanderAngle = Math.random() * Math.PI * 2;
            enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * dt; enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * dt;
            enemy.x = Math.max(enemy.radius, Math.min(canvasW - enemy.radius, enemy.x)); enemy.y = Math.max(enemy.radius, Math.min(canvasH - enemy.radius, enemy.y));
            shootConvertedBullet(enemy);
        } else { // Regular & Minion Logic
            if (enemy.infectionTimer !== null) {
                enemy.infectionTimer += dt * 1000 * infectionRateMultiplier;
                if (enemy.infectionTimer >= NANO_BOT_INFECTION_TIME) convertEnemy(enemy);
                else enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.4 + Math.sin(enemy.infectionTimer / (NANO_BOT_INFECTION_TIME / infectionRateMultiplier) * Math.PI * 6) * 0.3);
            } else {
                enemy.currentColor = enemy.color;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt;
            }
            // Shooting for 'shooter' type
            if (enemy.type === 'shooter' && enemy.infectionTimer === null) { shootEnemyBullet(enemy); }
            // Player Collision
            if (!player.shieldActive) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                const radiiSumSq = (player.radius * 0.8 + enemy.radius * 0.8) * (player.radius * 0.8 + enemy.radius * 0.8);
                if (distSq < radiiSumSq) {
                    let damage = enemy.isBossMinion ? 5 : (enemy.type === 'triangle' ? 15 : (enemy.type === 'shooter' ? 8 : 10)); // Adjust damage per type
                    health -= damage; createParticles(player.x, player.y, '#FF0000', 5); updateHealthDisplay();
                    const knockbackAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(knockbackAngle) * 5; enemy.y += Math.sin(knockbackAngle) * 5;
                    triggerScreenShake(damage * 0.5, 150);
                    if (health <= 0) { gameOver(); return; }
                }
            }
        }
        // Bounds Check
        if (!enemyRemovedThisFrame) { /* ... bounds check logic ... */ }
    }
}

function updateNanoBots(dt) { /* ... nanobot logic ... */ } // No changes needed

function updatePowerups(dt) {
    const now = performance.now();
    const magnetActive = player.activePowerups.magnet && player.activePowerups.magnet > now;
    const baseAttractionDistSq = POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE;
    // Magnet affects ALL powerup types now
    const magnetAttractionDistSq = magnetActive ? 1000*1000 : baseAttractionDistSq;

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) continue;
        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        let shouldAttract = magnetActive || distSqToPlayer < magnetAttractionDistSq;
        let currentAttractionSpeed = 0;

        if (shouldAttract) {
             currentAttractionSpeed = magnetActive ? POWERUP_ATTRACTION_SPEED * 1.8 :
                                      (distSqToPlayer < baseAttractionDistSq ? POWERUP_ATTRACTION_SPEED * 1.5 : POWERUP_ATTRACTION_SPEED * 0.5); // Slightly faster far pull

            const angle = Math.atan2(player.y - p.y, player.x - p.x);
            p.x += Math.cos(angle) * currentAttractionSpeed * dt;
            p.y += Math.sin(angle) * currentAttractionSpeed * dt;
        }
        // Pickup Check
        const collectionDist = player.radius + p.radius;
        if (distSqToPlayer < collectionDist * collectionDist) { activatePowerup(p); powerups.splice(i, 1); continue; }
        // Despawn
        if (now - p.creationTime > 15000) { createParticles(p.x, p.y, p.color || '#FFFFFF', 5); powerups.splice(i, 1); }
    }
}

function updateParticles(dt) { /* ... particle logic ... */ }

function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        if (!dn) continue;
        dn.y += DAMAGE_NUMBER_SPEED * dt; dn.life -= dt * 1000;
        if (dn.life <= 0) { damageNumbers.splice(i, 1); }
    }
}

function updateScreenShake(dt) { /* ... screen shake logic ... */ }

// --- Wave Management Update ---
function startNextWave() {
    currentWave++; bossActive = false;
    if (currentWave > 1) { waveClearMessageTimer = WAVE_CLEAR_MSG_DURATION; } // Show "Wave Cleared"
    // console.log(`Preparing Wave ${currentWave}...`); // Reduce spam

    if (currentWave > 0 && currentWave % BOSS_WAVE_INTERVAL === 0) { // Boss Wave
        gameState = 'playing'; enemiesToSpawnThisWave = 1; enemiesSpawnedThisWave = 0; enemiesRemainingInWave = 1;
        spawnBoss(); waveTimer = 0; lastEnemySpawnTime = performance.now(); console.log(`--- BOSS WAVE ${currentWave} STARTED ---`);
    } else { // Regular Wave
        gameState = 'waveIntermission'; waveTimer = WAVE_INTERMISSION_TIME;
        enemiesToSpawnThisWave = BASE_ENEMIES_PER_WAVE + Math.floor((currentWave -1) * ENEMIES_PER_WAVE_INCREASE);
        enemiesRemainingInWave = enemiesToSpawnThisWave; enemiesSpawnedThisWave = 0;
        currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - ((currentWave -1) * SPAWN_INTERVAL_REDUCTION_PER_WAVE));
        lastEnemySpawnTime = 0;
        if (currentWave > 1) { let bonus = 20 + currentWave * 5; cash += bonus; updateCashDisplay(); }
        // console.log(`Wave ${currentWave}: Spawning ${enemiesToSpawnThisWave}. Interval: ${currentEnemySpawnInterval.toFixed(0)}ms`);
    }
    updateWaveDisplay(); updateEnemiesRemainingUI(); saveGameData();
}

function updateWaveState(dt) {
    const now = performance.now();
    if (waveClearMessageTimer > 0) waveClearMessageTimer -= dt * 1000; // Update wave clear message timer

    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0 && waveClearMessageTimer <= 0) { // Wait for message to fade too? Optional.
             gameState = 'playing'; lastEnemySpawnTime = now;
        } return;
    }

    if (gameState === 'playing') {
        if (!bossActive && enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
            if (now - lastEnemySpawnTime > currentEnemySpawnInterval) { spawnEnemy(); enemiesSpawnedThisWave++; lastEnemySpawnTime = now; }
        }
        if (enemiesRemainingInWave <= 0 && (enemiesSpawnedThisWave >= enemiesToSpawnThisWave)) {
             if (!bossActive || (bossActive && enemies.every(e => e && !e.isBoss))) { startNextWave(); }
        }
    }
}