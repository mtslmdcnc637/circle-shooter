// --- Game State Update Functions ---

function updatePlayer(dt) {
    const now = performance.now();
    // Shield State Machine
    if (player.shieldState === 'active') {
        if (now - player.shieldTimer > calculateShieldDuration()) {
            player.shieldState = 'cooldown';
            player.shieldTimer = now;
            // Trigger Shield Explosion if unlocked
            if (player.shieldExplodeUnlocked) {
                createParticles(player.x, player.y, SHIELD_COLOR, 30); // Visual effect
                // Damage nearby enemies
                enemies.forEach(enemy => {
                    if (enemy && !enemy.converted) {
                        const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                        if (distSq < SHIELD_EXPLOSION_RADIUS * SHIELD_EXPLOSION_RADIUS) {
                            enemy.health -= SHIELD_EXPLOSION_DAMAGE;
                            createDamageNumber(enemy.x, enemy.y, SHIELD_EXPLOSION_DAMAGE); // Show damage number
                            // Check for kills from explosion immediately? Or let next bullet update handle it. Let next update handle.
                        }
                    }
                });
            }
        }
    } else if (player.shieldState === 'cooldown') {
         if (now - player.shieldTimer > calculateShieldCooldown()) {
             player.shieldState = 'inactive';
             player.shieldTimer = now; // Reset timer base? Not strictly necessary
         }
    }

    // Powerup Timers Check
    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
             if (player.activePowerups[type] < now) {
                delete player.activePowerups[type];
            }
        }
    }

    // Continuous shooting check
    if (gameState === 'playing') {
        shootBullet();
    }
}

function updateBullets(dt) { // Handles player bullets
    const now = performance.now();
    const buffer = 30;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            bullets.splice(i, 1); continue;
        }

        // Bullet-Enemy Collision
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy || enemy.converted) continue; // Skip dead or converted

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                const damageDealt = bullet.damage; // Store damage before potentially modifying bullet
                enemy.health -= damageDealt;
                createParticles(bullet.x, bullet.y, enemy.color, 3);
                createDamageNumber(enemy.x, enemy.y, damageDealt); // Create damage number

                bullet.hitsLeft--; // Decrement hits for piercing

                if (bullet.hitsLeft <= 0) {
                    bullets.splice(i, 1); // Remove bullet if out of hits
                }

                if (enemy.health <= 0) { // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.isBoss) cashGain *= 10; else if (enemy.isBossMinion) cashGain *= 0.3; else if (enemy.type === 'triangle') cashGain *= 1.2; else if (enemy.type === 'splitter') cashGain *= 1.5; else if (enemy.type === 'shooter') cashGain *= 1.1;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) spawnPowerup(enemy.x, enemy.y);

                    // --- Splitter Logic ---
                    if (enemy.type === 'splitter') {
                         for (let k = 0; k < SPLITTER_CHILD_COUNT; k++) {
                              // Spawn smaller circle enemies near the splitter's death position
                              const angleOffset = (k / SPLITTER_CHILD_COUNT) * Math.PI * 2;
                              const spawnPos = {
                                   x: enemy.x + Math.cos(angleOffset) * (enemy.radius * 0.5),
                                   y: enemy.y + Math.sin(angleOffset) * (enemy.radius * 0.5)
                              };
                              spawnEnemy(false, null, 'circle', spawnPos, 0.4); // force type 'circle', smaller health
                         }
                         // Add the newly spawned enemies to the count for the wave
                         enemiesToSpawnThisWave += SPLITTER_CHILD_COUNT;
                         enemiesRemainingInWave += SPLITTER_CHILD_COUNT;
                    }
                    // --- End Splitter Logic ---

                    enemies.splice(j, 1); // Remove original enemy
                    enemiesRemainingInWave--;

                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED!"); waveTimer = WAVE_CLEAR_MSG_DURATION; gameState = 'waveIntermission'; } // Use wave clear timer
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                }
                // If bullet was removed, exit the inner loop
                if (!bullets[i]) break;
            } // End collision check
        } // End enemy loop
        // If bullet was removed, continue to next bullet in outer loop
        if (!bullets[i]) continue;
    } // End player bullet loop

     // Update Converted Bullets (no piercing for them)
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
        const cBullet = convertedBullets[i];
        if (!cBullet) continue;
        cBullet.x += cBullet.vx * dt; cBullet.y += cBullet.vy * dt;
        if (cBullet.x < -buffer || cBullet.x > canvasW + buffer || cBullet.y < -buffer || cBullet.y > canvasH + buffer) { convertedBullets.splice(i, 1); continue; }

        let cBulletHit = false;
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if (!enemy || enemy.converted || enemy.isBossMinion) continue;
             const distSq = distanceSquared(cBullet.x, cBullet.y, enemy.x, enemy.y);
             const radiiSumSq = (cBullet.radius + enemy.radius) * (cBullet.radius + enemy.radius);
             if (distSq < radiiSumSq) {
                 const damageDealt = cBullet.damage;
                 enemy.health -= damageDealt;
                 createParticles(cBullet.x, cBullet.y, CONVERTED_BULLET_COLOR, 3);
                 createDamageNumber(enemy.x, enemy.y, damageDealt); // Also show damage for converted
                 convertedBullets.splice(i, 1);
                 cBulletHit = true;

                 if (enemy.health <= 0) { // Enemy defeated by converted
                    let cashGain = 2 + Math.floor(currentWave * 0.2); if (enemy.isBoss) cashGain *= 5;
                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 10);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE * 0.3) spawnPowerup(enemy.x, enemy.y);
                    if (enemy.type === 'splitter') { // Splitter killed by converted
                         for (let k = 0; k < SPLITTER_CHILD_COUNT; k++) {
                              const angleOffset = (k / SPLITTER_CHILD_COUNT) * Math.PI * 2;
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * (enemy.radius * 0.5), y: enemy.y + Math.sin(angleOffset) * (enemy.radius * 0.5) };
                              spawnEnemy(false, null, 'circle', spawnPos, 0.4);
                         }
                         enemiesToSpawnThisWave += SPLITTER_CHILD_COUNT; enemiesRemainingInWave += SPLITTER_CHILD_COUNT;
                    }
                    enemies.splice(j, 1); enemiesRemainingInWave--;
                    if (enemy.isBoss) { bossActive = false; console.log("BOSS DEFEATED (by converted)!"); waveTimer = WAVE_CLEAR_MSG_DURATION; gameState = 'waveIntermission'; }
                    updateCashDisplay(); updateEnemiesRemainingUI(); saveGameData();
                 }
                 break; // Bullet hit one enemy
             }
         }
         if (cBulletHit) continue; // Go to next converted bullet
     } // End converted bullet loop
}

function updateEnemyBullets(dt) {
    const buffer = 10; // Smaller buffer for enemy bullets?
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet) continue;
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;

        // Remove if off-screen
        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            enemyBullets.splice(i, 1); continue;
        }

        // Collision with Player
        if (!player.shieldActive) { // Check if player shield is down
            const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
            const radiiSumSq = (bullet.radius + player.radius * 0.8) * (bullet.radius + player.radius * 0.8); // Player smaller hitbox

            if (distSq < radiiSumSq) {
                health -= bullet.damage;
                createParticles(player.x, player.y, '#FF0000', 5); // Player hit effect
                updateHealthDisplay();
                triggerScreenShake(bullet.damage * 0.8, 150); // Shake on hit
                enemyBullets.splice(i, 1); // Remove bullet

                if (health <= 0) {
                    gameOver(); return; // Stop processing if game over
                }
                // Don't 'continue' here, bullet is gone, loop proceeds
            }
        }
    }
}


function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;
    const infectionRateMultiplier = Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, player.nanobotInfectLevel); // Calculate multiplier once

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue;
        let enemyRemovedThisFrame = false;

        // --- Boss Logic ---
        if (enemy.isBoss) { /* ... boss movement and minion spawning ... */ }
        // --- Converted Logic ---
        else if (enemy.converted) { /* ... converted movement, shooting, expiration ... */ }
        // --- Regular & Minion Logic (Not Converted) ---
        else {
            if (enemy.infectionTimer !== null) { // Infection progress
                enemy.infectionTimer += dt * 1000 * infectionRateMultiplier; // Apply speed multiplier
                if (enemy.infectionTimer >= NANO_BOT_INFECTION_TIME) convertEnemy(enemy);
                else enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.4 + Math.sin(enemy.infectionTimer / (NANO_BOT_INFECTION_TIME / infectionRateMultiplier) * Math.PI * 6) * 0.3); // Adjust pulse for speed
            } else { // Regular movement
                enemy.currentColor = enemy.color;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt; enemy.y += Math.sin(angle) * enemy.speed * dt;
            }

            // --- Enemy Shooting (Shooter type only) ---
            if (enemy.type === 'shooter' && enemy.infectionTimer === null) { // Don't shoot while infected
                 shootEnemyBullet(enemy);
            }
            // --- End Enemy Shooting ---

            // Player Collision (same as before)
            if (!player.shieldActive) { /* ... player collision logic ... */ }
        }

        // Bounds Check (same as before)
        if (!enemyRemovedThisFrame) { /* ... bounds check logic ... */ }
    } // End enemy loop
}

function updateNanoBots(dt) {
    const now = performance.now();
    for (let i = nanoBots.length - 1; i >= 0; i--) {
        const bot = nanoBots[i];
        if (!bot) continue;
        let botRemoved = false;

        if (bot.state === 'seeking') { /* ... seeking logic ... */ }
        if (bot.state === 'homing' && !botRemoved) { /* ... homing logic ... */ }
    }
    // Update nanobot count display (simple version) - could be less frequent
    updateEnemiesRemainingUI();
}

function updatePowerups(dt) {
    const now = performance.now();
    const magnetActive = player.activePowerups.magnet && player.activePowerups.magnet > now;
    const magnetAttractionDistSq = magnetActive ? 1000*1000 : POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE; // Huge range if magnet active

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) continue;

        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        let shouldAttract = false;
        let currentAttractionSpeed = 0;

        // Attraction Logic
        if (p.type === 'cash' || p.type === 'health') { // Only attract cash and health? Or all? Let's attract all for now.
             if (magnetActive || distSqToPlayer < magnetAttractionDistSq) {
                  shouldAttract = true;
                  // Speed based on magnet or proximity
                  currentAttractionSpeed = magnetActive ? POWERUP_ATTRACTION_SPEED * 1.8 : // Faster magnet pull
                                           (distSqToPlayer < POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE ? POWERUP_ATTRACTION_SPEED * 1.5 : POWERUP_ATTRACTION_SPEED * 0.4); // Normal proximity pull (fast/slow)
             }
        } // Add conditions for other types if they shouldn't be attracted

        if (shouldAttract) {
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


function updateParticles(dt) { /* ... particle update logic ... */ }

function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        if (!dn) continue;
        dn.y += DAMAGE_NUMBER_SPEED * dt; // Move upwards
        dn.life -= dt * 1000;
        if (dn.life <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

function updateScreenShake(dt) { /* ... screen shake logic ... */ }

// --- Wave Management Update ---
function startNextWave() {
    // ... (logic to determine boss or regular wave) ...
    if (!bossActive && currentWave > 1) { // Only show clear message for non-boss waves after wave 1
         waveClearMessageTimer = WAVE_CLEAR_MSG_DURATION;
    }
    // ... (rest of startNextWave logic: update counters, spawn boss/set intermission) ...
    updateWaveDisplay(); updateEnemiesRemainingUI(); saveGameData();
}

function updateWaveState(dt) {
    const now = performance.now();
    // Wave Clear message timer
    if (waveClearMessageTimer > 0) waveClearMessageTimer -= dt * 1000;

    if (gameState === 'waveIntermission') { /* ... intermission logic ... */ }
    else if (gameState === 'playing') { /* ... spawning and wave completion checks ... */ }
}