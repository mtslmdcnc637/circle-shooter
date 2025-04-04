
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
                            // Não precisa chamar triggerScreenShake aqui, o dano direto faz isso se necessário
                        }
                    }
                });
                 triggerScreenShake(10, 200); // Shake específico para explosão do escudo
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

    // Continuous shooting check - Delegado para uma função específica se necessário
    // if (gameState === 'playing') { shootBullet(); } // shootBullet é chamado pelo listener de mouse/touch ou timer
}


function updateBullets(dt) { // Handles player bullets and converted bullets
    const now = performance.now();
    const buffer = 30;
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    // --- Player Bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) { bullets.splice(i, 1); continue; } // Clean up null entries if any

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        // Remove if out of bounds
        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            bullets.splice(i, 1);
            continue;
        }

        // Bullet-Enemy Collision
        let bulletRemoved = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy || enemy.converted || enemy.health <= 0) continue; // Skip dead, converted, or null enemies

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                const damageDealt = bullet.damage;
                enemy.health -= damageDealt;
                createParticles(bullet.x, bullet.y, enemy.color, 3);
                createDamageNumber(enemy.x, enemy.y, damageDealt);

                bullet.hitsLeft--; // Decrement pierce count

                if (bullet.hitsLeft <= 0) {
                    bullets.splice(i, 1);
                    bulletRemoved = true; // Mark bullet for removal check
                }

                if (enemy.health <= 0) { // Enemy defeated
                    let cashGain = 5 + Math.floor(currentWave * 0.5);
                    if (enemy.type === 'splitter') cashGain *= 1.5;
                    else if (enemy.type === 'shooter') cashGain *= 1.1;
                    else if (enemy.type === 'triangle') cashGain *= 1.2;
                    else if (enemy.isBossMinion) cashGain *= 0.3;
                    else if (enemy.isBoss) cashGain *= 10;

                    cash += Math.max(1, Math.floor(cashGain));
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    if (!enemy.isBossMinion && Math.random() < POWERUP_DROP_CHANCE) {
                         spawnPowerup(enemy.x, enemy.y);
                    }
                     if (enemy.type === 'splitter') { // --- Splitter Logic ---
                         const childrenToSpawn = SPLITTER_CHILD_COUNT + (enemy.isBossMinion ? 1 : 0); // Boss minions split more?
                         for (let k = 0; k < childrenToSpawn; k++) {
                              const angleOffset = (k / childrenToSpawn) * Math.PI * 2 + Math.random()*0.5 - 0.25;
                              const spawnDist = enemy.radius * (0.5 + Math.random()*0.3);
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * spawnDist, y: enemy.y + Math.sin(angleOffset) * spawnDist };
                              spawnEnemy(false, null, 'circle', spawnPos, 0.4 + Math.random()*0.2); // Smaller, slightly varied children
                         }
                         // Don't add to enemiesToSpawnThisWave, they are bonus enemies
                         enemiesRemainingInWave += childrenToSpawn;
                    }

                    enemies.splice(j, 1);
                    enemiesRemainingInWave--;
                    if (enemy.isBoss) {
                        bossActive = false;
                        // Don't immediately go to intermission, let wave clear check handle it
                    }
                    updateCashDisplay();
                    updateEnemiesRemainingUI();
                    updateUpgradeUI(); // <<< ADICIONADO: Atualiza botões de upgrade quando ganha dinheiro
                    saveGameData();
                }
                // If bullet was removed, stop checking collisions for this bullet
                if (bulletRemoved) break;
            }
        } // End enemy loop
        // Continue to next bullet if this one was removed
        if (bulletRemoved) continue;
    } // End player bullet loop

     // --- Converted Bullets ---
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
         const bullet = convertedBullets[i];
         if (!bullet) { convertedBullets.splice(i, 1); continue; }

         bullet.x += bullet.vx * dt;
         bullet.y += bullet.vy * dt;

         // Remove if out of bounds
         if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
             convertedBullets.splice(i, 1);
             continue;
         }

         // Converted Bullet-Enemy Collision (Target non-converted enemies)
         let bulletRemoved = false;
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             // Target ONLY non-converted, living enemies
             if (!enemy || enemy.converted || enemy.health <= 0) continue;

             const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
             const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

             if (distSq < radiiSumSq) {
                 const damageDealt = bullet.damage; // Use converted bullet damage
                 enemy.health -= damageDealt;
                 createParticles(bullet.x, bullet.y, enemy.color, 2); // Less intense particles?
                 createDamageNumber(enemy.x, enemy.y, damageDealt);

                 // Converted bullets generally don't pierce unless upgraded
                 convertedBullets.splice(i, 1);
                 bulletRemoved = true;

                 if (enemy.health <= 0) { // Enemy defeated by converted ally
                     // Maybe less cash gain? Or none? Let's give some.
                     let cashGain = 2 + Math.floor(currentWave * 0.2);
                     cash += Math.max(1, Math.floor(cashGain));
                     createParticles(enemy.x, enemy.y, enemy.color, 10);

                     // Handle splitting if it was a splitter
                      if (enemy.type === 'splitter') {
                         const childrenToSpawn = SPLITTER_CHILD_COUNT;
                         for (let k = 0; k < childrenToSpawn; k++) {
                              const angleOffset = (k / childrenToSpawn) * Math.PI * 2 + Math.random()*0.5 - 0.25;
                              const spawnDist = enemy.radius * (0.5 + Math.random()*0.3);
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * spawnDist, y: enemy.y + Math.sin(angleOffset) * spawnDist };
                              spawnEnemy(false, null, 'circle', spawnPos, 0.4 + Math.random()*0.2);
                         }
                         enemiesRemainingInWave += childrenToSpawn;
                     }


                     enemies.splice(j, 1);
                     enemiesRemainingInWave--;
                      if (enemy.isBoss) { bossActive = false; } // Should be rare
                     updateCashDisplay();
                     updateEnemiesRemainingUI();
                     updateUpgradeUI(); // <<< ADICIONADO: Atualiza botões de upgrade
                     saveGameData();
                 }
                 // If bullet was removed, stop checking collisions for this bullet
                 if (bulletRemoved) break;
             }
         } // End enemy loop
         // Continue to next bullet if this one was removed
         if (bulletRemoved) continue;
     } // End converted bullet loop
}


function updateEnemyBullets(dt) {
    const buffer = 10;
    const canvasW = canvas?.width || 600; const canvasH = canvas?.height || 400;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet) { enemyBullets.splice(i,1); continue; } // Clean up nulls

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        // Remove if out of bounds
        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            enemyBullets.splice(i, 1);
            continue;
        }

        // Player collision check
        let hitPlayer = false;
        if (player.shieldState !== 'active') { // Only check collision if shield is NOT active
            const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
            // Use a slightly smaller hitbox for the player for leniency
            const playerHitboxRadius = player.radius * 0.8;
            const radiiSumSq = (bullet.radius + playerHitboxRadius) * (bullet.radius + playerHitboxRadius);

            if (distSq < radiiSumSq) {
                health -= bullet.damage;
                createParticles(player.x, player.y, '#FF0000', 5);
                updateHealthDisplay();
                triggerScreenShake(bullet.damage * 0.8, 150); // Use the defined function
                enemyBullets.splice(i, 1); // Remove bullet
                hitPlayer = true;
                if (health <= 0 && gameState !== 'gameOver') { // Check gameState to prevent multiple calls
                    gameOver();
                    return; // Stop processing immediately after game over
                }
            }
        } else { // Shield IS active - check collision with shield
             const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
             const shieldRadius = player.radius + 5; // Match visual shield radius
             const radiiSumSq = (bullet.radius + shieldRadius) * (bullet.radius + shieldRadius);
             if (distSq < radiiSumSq) {
                 // Hit the shield
                 createParticles(bullet.x, bullet.y, SHIELD_COLOR, 4); // Shield particle effect
                 triggerScreenShake(3, 50); // Small shake for shield hit
                 enemyBullets.splice(i, 1); // Remove bullet
                 // Optionally, shield could take damage or duration reduced here
                 hitPlayer = true; // Mark as hit (the shield)
             }
        }
         if (hitPlayer) continue; // Go to next bullet if this one hit something
    }
}


function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    const infectionRateMultiplier = Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, player.nanobotInfectLevel);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) { enemies.splice(i, 1); continue; } // Clean up null entries

        let enemyRemovedThisFrame = false;

        if (enemy.isBoss) { // --- Boss Logic ---
            const targetX = player.x; const targetY = player.y;
            const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
            const distanceToTarget = Math.sqrt(distanceSquared(enemy.x, enemy.y, targetX, targetY));
            const desiredDistance = 200 + Math.sin(now/2000)*50; // Keep some distance, move slightly

            if(distanceToTarget > desiredDistance + 10) { // Move closer if too far
                enemy.x += Math.cos(angle) * enemy.speed * dt;
                enemy.y += Math.sin(angle) * enemy.speed * dt;
            } else if (distanceToTarget < desiredDistance - 10) { // Move away if too close
                enemy.x -= Math.cos(angle) * enemy.speed * dt * 0.5; // Slower retreat
                enemy.y -= Math.sin(angle) * enemy.speed * dt * 0.5;
            } else { // Strafe slightly
                const strafeAngle = angle + Math.PI / 2;
                 enemy.x += Math.cos(strafeAngle) * enemy.speed * dt * 0.3 * Math.cos(now/700);
                 enemy.y += Math.sin(strafeAngle) * enemy.speed * dt * 0.3 * Math.cos(now/700);
            }

            // Boss Minion Spawning
            if (now - enemy.lastMinionSpawnTime > BOSS_MINION_SPAWN_COOLDOWN * (enemy.health / enemy.maxHealth)) { // Spawn faster when low health
                 const spawnCount = BOSS_MINION_COUNT + (currentWave > BOSS_WAVE_INTERVAL ? 1 : 0); // More minions on later boss waves
                 for(let m=0; m < spawnCount; m++) {
                     spawnEnemy(true, enemy); // Spawn a boss minion linked to this boss
                 }
                 enemy.lastMinionSpawnTime = now;
                 enemiesRemainingInWave += spawnCount; // Add to remaining count
                 updateEnemiesRemainingUI();
            }
             // Boss Shooting (Example: Shoots like a 'shooter' enemy but maybe faster/more bullets)
             if (enemy.infectionTimer === null) { // Bosses likely shouldn't be converted easily
                shootEnemyBullet(enemy, 3); // Example: shoot 3 bullets at once
             }

        } else if (enemy.converted) { // --- Converted Logic ---
            if (now > enemy.conversionEndTime) {
                createParticles(enemy.x, enemy.y, '#AAAAAA', 10);
                enemies.splice(i, 1);
                enemyRemovedThisFrame = true;
                continue; // Skip rest of logic for this enemy
            }
            // Simple wander or target nearest non-converted? Let's do simple wander.
            if (Math.random() < 0.02) { // Occasionally change direction
                 enemy.wanderAngle = Math.random() * Math.PI * 2;
            }
            enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * dt * 0.8; // Slightly slower when converted?
            enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * dt * 0.8;

            // Keep within bounds
            enemy.x = Math.max(enemy.radius, Math.min(canvasW - enemy.radius, enemy.x));
            enemy.y = Math.max(enemy.radius, Math.min(canvasH - enemy.radius, enemy.y));

            // Shoot converted bullets
            shootConvertedBullet(enemy);

        } else { // --- Regular & Minion Logic ---
            // Infection Progress
            if (enemy.infectionTimer !== null) {
                enemy.infectionTimer += dt * 1000 * infectionRateMultiplier;
                if (enemy.infectionTimer >= NANO_BOT_INFECTION_TIME) {
                    convertEnemy(enemy);
                    // Don't remove from list yet, just change state
                } else {
                    // Pulsating green effect while infecting
                    const infectProgress = enemy.infectionTimer / (NANO_BOT_INFECTION_TIME / infectionRateMultiplier);
                    enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.4 + Math.sin(infectProgress * Math.PI * 6) * 0.3);
                }
            } else { // Not being infected - standard behavior
                enemy.currentColor = enemy.color; // Reset color if infection was somehow interrupted
                // Basic chase player
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt;
                enemy.y += Math.sin(angle) * enemy.speed * dt;
            }

            // Shooting for 'shooter' type (only if not being infected)
            if (enemy.type === 'shooter' && enemy.infectionTimer === null) {
                shootEnemyBullet(enemy);
            }

            // Player Collision (only if not being infected and shield down)
            if (enemy.infectionTimer === null && player.shieldState !== 'active') {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                const playerHitboxRadius = player.radius * 0.8;
                const enemyHitboxRadius = enemy.radius * 0.8;
                const radiiSumSq = (playerHitboxRadius + enemyHitboxRadius) * (playerHitboxRadius + enemyHitboxRadius);

                if (distSq < radiiSumSq) {
                    let damage = enemy.isBossMinion ? 5 : (enemy.type === 'triangle' ? 15 : (enemy.type === 'shooter' ? 8 : 10)); // Base damage
                    damage = Math.max(1, Math.floor(damage * (1 + currentWave * 0.02))); // Scale damage slightly with waves?

                    health -= damage;
                    createParticles(player.x, player.y, '#FF0000', 5);
                    updateHealthDisplay();

                    // Simple knockback for the enemy
                    const knockbackAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(knockbackAngle) * 5;
                    enemy.y += Math.sin(knockbackAngle) * 5;

                    triggerScreenShake(damage * 0.5, 150); // Use the defined function

                    if (health <= 0 && gameState !== 'gameOver') { // Check gameState
                        gameOver();
                        return; // Stop processing
                    }
                }
            }
        } // End regular/minion logic

        // Bounds Check (apply to all non-removed enemies)
        if (!enemyRemovedThisFrame) {
            enemy.x = Math.max(enemy.radius, Math.min(canvasW - enemy.radius, enemy.x));
            enemy.y = Math.max(enemy.radius, Math.min(canvasH - enemy.radius, enemy.y));
        }
    } // End enemy loop
}


function updateNanoBots(dt) {
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    const buffer = 10;

    for (let i = nanoBots.length - 1; i >= 0; i--) {
        const bot = nanoBots[i];
        if (!bot) { nanoBots.splice(i, 1); continue; }

        // Find nearest non-converted, non-infected enemy
        let nearestEnemy = null;
        let minDistSq = Infinity;

        enemies.forEach(enemy => {
            if (enemy && !enemy.converted && enemy.infectionTimer === null && enemy.health > 0) {
                const distSq = distanceSquared(bot.x, bot.y, enemy.x, enemy.y);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearestEnemy = enemy;
                }
            }
        });

        if (nearestEnemy) {
            // Move towards nearest target
            const angle = Math.atan2(nearestEnemy.y - bot.y, nearestEnemy.x - bot.x);
            bot.x += Math.cos(angle) * NANO_BOT_SPEED * dt;
            bot.y += Math.sin(angle) * NANO_BOT_SPEED * dt;

            // Check for collision / start infection
            const radiiSumSq = (bot.radius + nearestEnemy.radius) * (bot.radius + nearestEnemy.radius);
            if (minDistSq < radiiSumSq) {
                nearestEnemy.infectionTimer = 0; // Start infection process
                createParticles(bot.x, bot.y, NANO_BOT_COLOR, 8); // Infection start effect
                nanoBots.splice(i, 1); // Nanobot is consumed
                updateEnemiesRemainingUI(); // Update bot count display
                continue; // Go to next bot
            }
        } else {
            // No valid targets, maybe wander or self-destruct? Let's make it disappear.
             createParticles(bot.x, bot.y, '#888888', 5); // Fizzle effect
             nanoBots.splice(i, 1);
             updateEnemiesRemainingUI();
             continue;
        }

         // Remove if out of bounds (shouldn't happen if targeting)
        if (bot.x < -buffer || bot.x > canvasW + buffer || bot.y < -buffer || bot.y > canvasH + buffer) {
            nanoBots.splice(i, 1);
            updateEnemiesRemainingUI();
        }
    }
     // Update bot count in UI if needed (handled by updateEnemiesRemainingUI)
}


function updatePowerups(dt) {
    const now = performance.now();
    const magnetActive = player.activePowerups.magnet && player.activePowerups.magnet > now;
    const baseAttractionDistSq = POWERUP_ATTRACTION_START_DISTANCE * POWERUP_ATTRACTION_START_DISTANCE;
    // Magnet affects ALL powerup types now
    const magnetAttractionDistSq = magnetActive ? (canvas.width * canvas.width) : baseAttractionDistSq; // Magnet pulls from everywhere

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) { powerups.splice(i, 1); continue; } // Clean up nulls

        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        let shouldAttract = magnetActive || distSqToPlayer < magnetAttractionDistSq;

        if (shouldAttract) {
             let currentAttractionSpeed = POWERUP_ATTRACTION_SPEED;
             if(magnetActive){
                 // Scale speed based on distance for magnet? Closer = faster?
                 const pullRatio = Math.min(1, 1 - Math.sqrt(distSqToPlayer) / (canvas.width * 0.6)); // Faster when closer
                 currentAttractionSpeed = POWERUP_ATTRACTION_SPEED * (1 + pullRatio * 2); // Significantly faster pull with magnet
             } else if (distSqToPlayer < baseAttractionDistSq) {
                 // Normal attraction within range
                 currentAttractionSpeed = POWERUP_ATTRACTION_SPEED * 1.5;
             } // Else: no attraction if not magnet and out of range

            const angle = Math.atan2(player.y - p.y, player.x - p.x);
            p.x += Math.cos(angle) * currentAttractionSpeed * dt;
            p.y += Math.sin(angle) * currentAttractionSpeed * dt;
        }

        // Pickup Check
        const collectionDist = player.radius + p.radius;
        if (distSqToPlayer < collectionDist * collectionDist) {
            activatePowerup(p);
            powerups.splice(i, 1);
            continue; // Go to next powerup
        }

        // Despawn Timer
        if (now - p.creationTime > POWERUP_LIFESPAN) { // Use a constant for lifespan
            createParticles(p.x, p.y, p.color || '#FFFFFF', 5); // Fizzle effect
            powerups.splice(i, 1);
        }
    }
}


function updateParticles(dt) {
     for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
         if (!p) { particles.splice(i, 1); continue; } // Clean up nulls

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 1000;
        p.alpha = Math.max(0, p.life / p.initialLife); // Fade out based on remaining life

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        if (!dn) { damageNumbers.splice(i, 1); continue; } // Clean up nulls

        dn.y += DAMAGE_NUMBER_SPEED * dt; // Move upwards
        dn.life -= dt * 1000;

        if (dn.life <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

// --- Screen Shake Logic ---

// <<< DEFINIÇÃO ADICIONADA >>>
function triggerScreenShake(intensity, duration) {
    // Use Math.max to ensure the stronger/longer shake takes precedence if called rapidly
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDuration = Math.max(shakeDuration, duration);
}

function updateScreenShake(dt) {
    if (shakeDuration > 0) {
        shakeDuration -= dt * 1000;
        if (shakeDuration <= 0) {
            shakeIntensity = 0;
            // Reset offsets immediately when duration ends
            shakeOffsetX = 0;
            shakeOffsetY = 0;
        }
    } else {
        // Ensure intensity is 0 if duration is 0 (might happen if set directly)
        shakeIntensity = 0;
    }
    // Offsets are calculated during drawing in applyScreenShake
}


// --- Wave Management Update ---
function startNextWave() {
    currentWave++;
    bossActive = false; // Reset boss flag

    if (currentWave > 1) {
        waveClearMessageTimer = WAVE_CLEAR_MSG_DURATION; // Show "Wave Cleared" message
    }
    console.log(`Starting Wave ${currentWave}...`);

    // Determine if it's a boss wave
    if (currentWave > 0 && currentWave % BOSS_WAVE_INTERVAL === 0) {
        gameState = 'playing'; // Boss waves start immediately
        enemiesToSpawnThisWave = 1; // Only the boss initially
        enemiesSpawnedThisWave = 0;
        enemiesRemainingInWave = 1; // Just the boss counts initially
        spawnBoss(); // Function to create the boss
        waveTimer = 0; // No intermission timer for boss waves
        lastEnemySpawnTime = performance.now(); // Reset spawn timer
        console.log(`--- BOSS WAVE ${currentWave} STARTED ---`);
    } else { // Regular Wave
        gameState = 'waveIntermission'; // Start with intermission
        waveTimer = WAVE_INTERMISSION_TIME; // Set intermission timer

        // Calculate enemies for this wave
        enemiesToSpawnThisWave = BASE_ENEMIES_PER_WAVE + Math.floor((currentWave -1) * ENEMIES_PER_WAVE_INCREASE);
        enemiesRemainingInWave = enemiesToSpawnThisWave; // Initial count matches total to spawn
        enemiesSpawnedThisWave = 0; // Reset spawned count

        // Calculate spawn interval for this wave
        currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - ((currentWave -1) * SPAWN_INTERVAL_REDUCTION_PER_WAVE));
        lastEnemySpawnTime = 0; // Reset spawn timer

        // Give cash bonus for completing previous wave
        if (currentWave > 1) {
            let bonus = 20 + currentWave * 5;
            cash += bonus;
            updateCashDisplay();
            updateUpgradeUI(); // <<< ADICIONADO: Atualiza botões ao ganhar bônus
            createDamageNumber(player.x, player.y - player.radius - 20, `+${bonus} Cash!`, '#FFEB3B'); // Show bonus text
        }
        console.log(`Wave ${currentWave}: Intermission. Spawning ${enemiesToSpawnThisWave} enemies. Interval: ${currentEnemySpawnInterval.toFixed(0)}ms`);
    }

    // Update UI displays
    updateWaveDisplay();
    updateEnemiesRemainingUI();
    saveGameData(); // Save progress at the start of each wave
}


function updateWaveState(dt) {
    const now = performance.now();

    // Update wave clear message timer regardless of state
    if (waveClearMessageTimer > 0) {
        waveClearMessageTimer -= dt * 1000;
    }

    // Handle Wave Intermission state
    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0 && waveClearMessageTimer <= 0) { // Wait for message to fade too
             gameState = 'playing'; // Transition to playing state
             lastEnemySpawnTime = now; // Set initial spawn time for the wave
             console.log(`Wave ${currentWave} playing...`);
        }
        return; // Don't process enemy spawning during intermission
    }

    // Handle Playing state (spawning enemies)
    if (gameState === 'playing') {
        // Spawn regular enemies if not a boss wave or if boss allows minions
        if (!bossActive || (bossActive /* && condition for boss minions? Handled in boss update */ )) {
            // Check if more enemies need to be spawned for this wave
            if (enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
                // Check if it's time to spawn the next enemy
                if (now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                    spawnEnemy(); // Spawn a standard enemy
                    enemiesSpawnedThisWave++;
                    lastEnemySpawnTime = now; // Reset timer for the next spawn
                    // console.log(`Spawned enemy ${enemiesSpawnedThisWave}/${enemiesToSpawnThisWave}`);
                }
            }
        }

        // Check for wave clear condition
        // Wave is clear if all intended enemies are spawned AND remaining count is 0
        // AND (it wasn't a boss wave OR the boss is defeated)
        if (enemiesRemainingInWave <= 0 && (enemiesSpawnedThisWave >= enemiesToSpawnThisWave)) {
             // Check if boss is active and defeated (implicitly handled by enemiesRemainingInWave going to 0 if boss is the last one)
             // Need to ensure boss minions are also cleared if they add to the count?
             // Let's simplify: if remaining is 0, the wave is done.
             console.log(`Wave ${currentWave} clear condition met. Starting next wave.`);
             startNextWave(); // Proceed to the next wave
        }
    }
}
