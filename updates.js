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
        if (player.activePowerups[type] < now) {
            delete player.activePowerups[type];
            console.log(`Powerup ${type} expired.`);
        }
    }

    // Continuous shooting check (can be tied to input state later)
    if (gameState === 'playing') {
        shootBullet();
    }
}

function updateBullets(dt) {
    const now = performance.now();
    const buffer = 20; // Off-screen buffer

    // --- Player Bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        if (bullet.x < -buffer || bullet.x > (canvas?.width || 600) + buffer || bullet.y < -buffer || bullet.y > (canvas?.height || 400) + buffer) {
            bullets.splice(i, 1); continue;
        }

        // Bullet-Enemy Collision
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (enemy.converted) continue; // Ignore converted enemies

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                enemy.health -= bullet.damage;
                createParticles(bullet.x, bullet.y, enemy.color, 3);
                bullets.splice(i, 1); // Remove bullet

                if (enemy.health <= 0) { // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.isBoss) cashGain *= 10; else if (enemy.isBossMinion) cashGain *= 0.3; else if (enemy.type === 'triangle') cashGain *= 1.2;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(enemy.x, enemy.y);

                    enemies.splice(j, 1); // Remove enemy
                    enemiesRemainingInWave--; // Decrement counter

                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED!"); waveTimer = 1500; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                }
                break; // Bullet hit one enemy, exit inner loop
            }
        } // End enemy loop
         // Check again if bullet still exists (it might have been removed by hitting an enemy)
         if (!bullets[i]) break; // Exit enemy loop if bullet is gone
    } // End player bullet loop

     // --- Converted Enemy Bullets ---
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
        const cBullet = convertedBullets[i];
        cBullet.x += cBullet.vx * dt; cBullet.y += cBullet.vy * dt;

        if (cBullet.x < -buffer || cBullet.x > (canvas?.width || 600) + buffer || cBullet.y < -buffer || cBullet.y > (canvas?.height || 400) + buffer) {
            convertedBullets.splice(i, 1); continue;
        }

         // Converted Bullet vs Non-Converted Enemy Collision
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if (enemy.converted || enemy.isBossMinion) continue; // Ignore converted/minions

             const distSq = distanceSquared(cBullet.x, cBullet.y, enemy.x, enemy.y);
             const radiiSumSq = (cBullet.radius + enemy.radius) * (cBullet.radius + enemy.radius);

             if (distSq < radiiSumSq) {
                 enemy.health -= cBullet.damage;
                 createParticles(cBullet.x, cBullet.y, CONVERTED_BULLET_COLOR, 3);
                 convertedBullets.splice(i, 1); // Remove bullet

                 if (enemy.health <= 0) { // Enemy defeated by converted
                    let cashGain = 2 + Math.floor(currentWave * 0.2);
                    if (enemy.isBoss) cashGain *= 5;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE * 0.3) spawnPowerup(enemy.x, enemy.y);

                    enemies.splice(j, 1); // Remove enemy
                    enemiesRemainingInWave--; // Decrement counter

                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED (by converted)!"); waveTimer = 1500; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                 }
                 break; // Bullet hit one enemy
             }
         } // End enemy loop
          // Check again if bullet still exists
          if (!convertedBullets[i]) break;
     } // End converted bullet loop
}


function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue; // Skip if enemy became undefined somehow
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
                    console.log("Removing stray enemy:", enemy.type);
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

function updatePowerups(dt) {
    const now = performance.now();
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) continue;

        // Attraction
        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        const attractionDistSq = POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE;
        if (distSqToPlayer < attractionDistSq) {
            const angle = Math.atan2(player.y - p.y, player.x - p.x);
            p.x += Math.cos(angle) * POWERUP_ATTRACTION_SPEED * dt; p.y += Math.sin(angle) * POWERUP_ATTRACTION_SPEED * dt;
        }

        // Pickup
        const collectionDistSq = (player.radius + p.radius) * (player.radius + p.radius);
        if (distSqToPlayer < collectionDistSq) {
            activatePowerup(p); powerups.splice(i, 1); continue;
        }

        // Despawn
        if (now - p.creationTime > 15000) {
            createParticles(p.x, p.y, p.color || '#FFFFFF', 5); powerups.splice(i, 1);
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
        if (currentWave > 1) { let bonus = 20 + currentWave * 5; cash += bonus; updateCashDisplay(); console.log(`Wave ${currentWave-1} clear! +${bonus} cash.`); }
        console.log(`Wave ${currentWave}: Spawning ${enemiesToSpawnThisWave}. Interval: ${currentEnemySpawnInterval.toFixed(0)}ms`);
    }
    updateWaveDisplay(); updateEnemiesRemainingUI(); saveGameData();
}

function updateWaveState(dt) {
    const now = performance.now();
    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0) { gameState = 'playing'; lastEnemySpawnTime = now; console.log("Intermission ended."); }
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
             if (!bossActive || (bossActive && enemies.every(e => !e.isBoss))) { // Ensure boss is actually gone if bossActive was true
                 console.log(`Wave ${currentWave} complete.`);
                 startNextWave();
             }
        }
    }
}