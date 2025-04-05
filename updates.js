// --- Game State Update Functions ---

function updatePlayer(dt) {
    const now = performance.now();
    if (!player) return; // Safety check

    // --- Shield State Machine ---
    if (player.shieldState === 'active') {
        if (now - player.shieldTimer > calculateShieldDuration()) {
            player.shieldState = 'cooldown';
            player.shieldTimer = now; // Marca início do cooldown
            // Trigger Shield Explosion se desbloqueado
            if (player.shieldExplodeLevel > 0) {
                if (typeof createParticles === 'function') createParticles(player.x, player.y, SHIELD_COLOR, 30, 1.5, 700);
                enemies.forEach(enemy => {
                    if (enemy && !enemy.converted && enemy.health > 0) {
                        const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                        if (distSq < SHIELD_EXPLOSION_RADIUS * SHIELD_EXPLOSION_RADIUS) {
                            const damageDealt = SHIELD_EXPLOSION_DAMAGE;
                            enemy.takeDamage(damageDealt);
                            if (typeof createDamageNumber === 'function') createDamageNumber(enemy.x, enemy.y, damageDealt);
                            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                            enemy.x += Math.cos(angle) * 20;
                            enemy.y += Math.sin(angle) * 20;
                        }
                    }
                });
                if (typeof triggerScreenShake === 'function') triggerScreenShake(12, 250);
            }
        }
    } else if (player.shieldState === 'cooldown') {
        if (now - player.shieldTimer > calculateShieldCooldown()) {
            player.shieldState = 'inactive';
        }
    }

    // --- Powerup Timers Check ---
    let needsDamageRecalc = false;
    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
             if (player.activePowerups[type] < now) {
                 if (type === 'damageBoost' || type === 'fireRateBoost') {
                     needsDamageRecalc = true;
                 }
                 delete player.activePowerups[type];
             }
        }
    }

    // --- Auto-Aim Logic ---
    const autoAimLerp = calculateAutoAimLerpFactor();
    if (autoAimLerp > 0) {
        let targetAngle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
        let nearestEnemy = null;
        let minDistSq = Infinity;
        enemies.forEach(enemy => {
            if (enemy && !enemy.converted && enemy.health > 0) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearestEnemy = enemy;
                }
            }
        });
        if (nearestEnemy) {
            targetAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
        }
        player.currentAimAngle = lerpAngle(player.currentAimAngle, targetAngle, autoAimLerp * 60 * dt);
    } else {
        player.currentAimAngle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    }
}


function updateBullets(dt) {
    const now = performance.now();
    const buffer = 50;
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    // --- Player Bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet) { bullets.splice(i, 1); continue; }

        bullet.update(dt);

        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            bullets.splice(i, 1);
            continue;
        }

        let bulletRemoved = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy || enemy.converted || enemy.health <= 0 || bullet.hitEnemies.has(enemy.id)) continue;

            const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
            const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

            if (distSq < radiiSumSq) {
                const damageDealt = bullet.damage;
                enemy.takeDamage(damageDealt);
                if (typeof createParticles === 'function') createParticles(bullet.x, bullet.y, enemy.color, 3);
                if (typeof createDamageNumber === 'function') createDamageNumber(enemy.x, enemy.y, damageDealt);

                bullet.hitsLeft--;
                bullet.hitEnemies.add(enemy.id);

                if (bullet.hitsLeft <= 0) {
                    bullets.splice(i, 1);
                    bulletRemoved = true;
                }

                if (enemy.health <= 0) {
                    let cashGain = enemy.value || (5 + Math.floor(currentWave * 0.5));
                    if (enemy.isBossMinion) cashGain *= 0.3;
                    else if (enemy.isBoss) cashGain *= 10;

                    cash += Math.max(1, Math.floor(cashGain));
                    if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, enemy.color, 15, 1.2);

                    if (!enemy.isBossMinion && !enemy.isBoss && typeof spawnPowerup === 'function' && Math.random() < POWERUP_DROP_CHANCE) {
                         spawnPowerup(enemy.x, enemy.y);
                    }

                    if (enemy.type === 'splitter') {
                         const childrenToSpawn = SPLITTER_CHILD_COUNT + (enemy.isBossMinion ? 1 : 0);
                         enemiesRemainingInWave += childrenToSpawn;
                         if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                         for (let k = 0; k < childrenToSpawn; k++) {
                              const angleOffset = (k / childrenToSpawn) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                              const spawnDist = enemy.radius * (0.6 + Math.random() * 0.4);
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * spawnDist, y: enemy.y + Math.sin(angleOffset) * spawnDist };
                              if(typeof spawnEnemy === 'function') spawnEnemy(enemy.isBossMinion, enemy.parentBoss, 'circle', spawnPos, 0.5 + Math.random()*0.2);
                         }
                    }

                    enemies.splice(j, 1);
                    enemiesRemainingInWave--;

                    if (enemy.isBoss) {
                        bossActive = false;
                    }
                    if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay(); // <-- Chamada via window
                    if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                    if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel(); // <-- Chamada via window (atualiza botões)
                }
                if (bulletRemoved) break;
            }
        }
        if (bulletRemoved) continue;
    }

     // --- Converted Bullets ---
     for (let i = convertedBullets.length - 1; i >= 0; i--) {
         const bullet = convertedBullets[i];
         if (!bullet) { convertedBullets.splice(i, 1); continue; }

         bullet.update(dt);

         if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
             convertedBullets.splice(i, 1);
             continue;
         }

         let bulletRemoved = false;
         for (let j = enemies.length - 1; j >= 0; j--) {
             const enemy = enemies[j];
             if (!enemy || enemy.converted || enemy.health <= 0) continue;

             const distSq = distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y);
             const radiiSumSq = (bullet.radius + enemy.radius) * (bullet.radius + enemy.radius);

             if (distSq < radiiSumSq) {
                 const damageDealt = bullet.damage;
                 enemy.takeDamage(damageDealt);
                 if (typeof createParticles === 'function') createParticles(bullet.x, bullet.y, enemy.color, 2);
                 if (typeof createDamageNumber === 'function') createDamageNumber(enemy.x, enemy.y, damageDealt);

                 convertedBullets.splice(i, 1);
                 bulletRemoved = true;

                 if (enemy.health <= 0) {
                     let cashGain = Math.max(1, Math.floor((enemy.value || 5) * 0.4));
                     cash += cashGain;
                     if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, enemy.color, 10);

                      if (enemy.type === 'splitter') {
                         const childrenToSpawn = SPLITTER_CHILD_COUNT;
                          enemiesRemainingInWave += childrenToSpawn;
                          if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                         for (let k = 0; k < childrenToSpawn; k++) {
                              const angleOffset = (k / childrenToSpawn) * Math.PI * 2 + (Math.random()-0.5)*0.5;
                              const spawnDist = enemy.radius * (0.6 + Math.random()*0.4);
                              const spawnPos = { x: enemy.x + Math.cos(angleOffset) * spawnDist, y: enemy.y + Math.sin(angleOffset) * spawnDist };
                              if(typeof spawnEnemy === 'function') spawnEnemy(false, null, 'circle', spawnPos, 0.5 + Math.random()*0.2);
                         }
                     }

                     enemies.splice(j, 1);
                     enemiesRemainingInWave--;
                      if (enemy.isBoss) { bossActive = false; }
                     if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay(); // <-- Chamada via window
                     if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                     if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel(); // <-- Chamada via window
                 }
                 if (bulletRemoved) break;
             }
         }
         if (bulletRemoved) continue;
     }
}


function updateEnemyBullets(dt) {
    const buffer = 10;
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet) { enemyBullets.splice(i,1); continue; }

        bullet.update(dt);

        if (bullet.x < -buffer || bullet.x > canvasW + buffer || bullet.y < -buffer || bullet.y > canvasH + buffer) {
            enemyBullets.splice(i, 1);
            continue;
        }

        let hitPlayerOrShield = false;
        if (player && player.shieldState === 'active') { // Check shield first
             const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
             const shieldRadius = player.radius + 5;
             const radiiSumSq = (bullet.radius + shieldRadius) * (bullet.radius + shieldRadius);
             if (distSq < radiiSumSq) {
                 if (typeof createParticles === 'function') createParticles(bullet.x, bullet.y, SHIELD_COLOR, 4);
                 if (typeof triggerScreenShake === 'function') triggerScreenShake(3, 50);
                 enemyBullets.splice(i, 1);
                 hitPlayerOrShield = true;
             }
        }

        if (!hitPlayerOrShield && player) { // Check player collision if shield wasn't hit/active
            const distSq = distanceSquared(bullet.x, bullet.y, player.x, player.y);
            const playerHitboxRadius = player.radius * 0.9;
            const radiiSumSq = (bullet.radius + playerHitboxRadius) * (bullet.radius + playerHitboxRadius);

            if (distSq < radiiSumSq) {
                health -= bullet.damage;
                if (typeof createParticles === 'function') createParticles(player.x, player.y, '#FF5555', 5);
                // Chama updateHealthDisplay via window
                if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay();
                if (typeof triggerScreenShake === 'function') triggerScreenShake(bullet.damage * 0.8, 150);
                enemyBullets.splice(i, 1);
                hitPlayerOrShield = true;
                const currentGameState = typeof gameState !== 'undefined' ? gameState : 'playing';
                if (health <= 0 && currentGameState !== 'gameOver') {
                    if (typeof gameOver === 'function') gameOver();
                    return;
                }
            }
        }
        if (hitPlayerOrShield) continue;
    }
}


function updateEnemies(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    const infectionTime = calculateNanobotInfectionTime(); // Get current infection time

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) { enemies.splice(i, 1); continue; }

        let enemyRemovedThisFrame = false;

        // --- Boss Logic ---
        if (enemy.isBoss) {
            if (!player) continue; // Skip if no player
            const targetX = player.x; const targetY = player.y;
            const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
            const distanceToTarget = Math.sqrt(distanceSquared(enemy.x, enemy.y, targetX, targetY));
            const desiredDistance = 250 + Math.sin(now / 1800) * 60;

            if (distanceToTarget > desiredDistance + 15) {
                enemy.x += Math.cos(angle) * enemy.speed * dt;
                enemy.y += Math.sin(angle) * enemy.speed * dt;
            } else if (distanceToTarget < desiredDistance - 15) {
                enemy.x -= Math.cos(angle) * enemy.speed * dt * 0.6;
                enemy.y -= Math.sin(angle) * enemy.speed * dt * 0.6;
            } else {
                const strafeAngle = angle + Math.PI / 2;
                enemy.x += Math.cos(strafeAngle) * enemy.speed * dt * 0.4 * Math.cos(now / 800);
                enemy.y += Math.sin(strafeAngle) * enemy.speed * dt * 0.4 * Math.cos(now / 800);
            }

            const spawnCooldown = BOSS_MINION_SPAWN_COOLDOWN * Math.max(0.4, (enemy.health / enemy.maxHealth));
            if (now - enemy.lastMinionSpawnTime > spawnCooldown) {
                 const spawnCount = BOSS_MINION_COUNT + (currentWave > BOSS_WAVE_INTERVAL ? 1 : 0);
                 enemiesRemainingInWave += spawnCount;
                 if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                 for(let m=0; m < spawnCount; m++) {
                     if(typeof spawnEnemy === 'function') spawnEnemy(true, enemy);
                 }
                 enemy.lastMinionSpawnTime = now;
            }
             if (now - enemy.lastEnemyShot > (ENEMY_SHOOTER_COOLDOWN * 0.5)) {
                if(typeof shootEnemyBullet === 'function') shootEnemyBullet(enemy, 3);
             }

        }
        // --- Converted Logic ---
        else if (enemy.converted) {
            if (now > enemy.conversionEndTime) {
                if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, '#AAAAAA', 10);
                enemies.splice(i, 1);
                enemiesRemainingInWave--;
                if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay(); // <-- Chamada via window
                enemyRemovedThisFrame = true;
                continue;
            }
            if (!enemy.wanderAngle || Math.random() < 0.02) {
                 enemy.wanderAngle = Math.random() * Math.PI * 2;
            }
            enemy.x += Math.cos(enemy.wanderAngle) * enemy.speed * dt * 0.5;
            enemy.y += Math.sin(enemy.wanderAngle) * enemy.speed * dt * 0.5;

            enemy.x = Math.max(enemy.radius, Math.min(canvasW - enemy.radius, enemy.x));
            enemy.y = Math.max(enemy.radius, Math.min(canvasH - enemy.radius, enemy.y));

            if (now - enemy.lastConvertedShot > CONVERTED_SHOOT_COOLDOWN) {
                if(typeof shootConvertedBullet === 'function') shootConvertedBullet(enemy);
            }

        }
        // --- Regular & Minion Logic ---
        else {
             if (!player) continue; // Skip if no player
            // Infection Progress
            if (enemy.infectionTimer !== null) {
                const elapsedInfectionTime = now - enemy.infectionTimer;
                if (elapsedInfectionTime >= infectionTime) {
                    enemy.converted = true;
                    enemy.infectionTimer = null;
                    enemy.conversionEndTime = now + CONVERTED_DURATION;
                    enemy.currentColor = CONVERTED_BULLET_COLOR;
                    enemy.radius = enemy.baseRadius * CONVERTED_ENEMY_RADIUS_FACTOR;
                    enemy.lastConvertedShot = now;
                    if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, NANO_BOT_COLOR, 15);
                } else {
                    const infectProgress = elapsedInfectionTime / infectionTime;
                    enemy.currentColor = lerpColor(enemy.color, NANO_BOT_COLOR, 0.4 + Math.sin(infectProgress * Math.PI * 6) * 0.3);
                }
            } else {
                enemy.currentColor = enemy.color;
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.x += Math.cos(angle) * enemy.speed * dt;
                enemy.y += Math.sin(angle) * enemy.speed * dt;
            }

            if (enemy.type === 'shooter' && !enemy.converted && enemy.infectionTimer === null) {
                if (now - enemy.lastEnemyShot > enemy.shootCooldown) {
                    if(typeof shootEnemyBullet === 'function') shootEnemyBullet(enemy);
                }
            }

            // --- Player Collision ---
            if (!enemy.converted && enemy.infectionTimer === null) {
                const distSq = distanceSquared(player.x, player.y, enemy.x, enemy.y);
                const radiiSumSq = (player.radius + enemy.radius) * (player.radius + enemy.radius);

                if (distSq < radiiSumSq) {
                    if (player.shieldState === 'active') {
                        if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, SHIELD_COLOR, 8);
                        if (typeof triggerScreenShake === 'function') triggerScreenShake(5, 80);
                        const knockbackAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                        enemy.x += Math.cos(knockbackAngle) * 15;
                        enemy.y += Math.sin(knockbackAngle) * 15;
                    } else {
                        health -= enemy.damage;
                        if (typeof createParticles === 'function') createParticles(player.x, player.y, '#FF5555', 8);
                        // Chama updateHealthDisplay via window
                        if (typeof window.updateHealthDisplay === 'function') window.updateHealthDisplay();
                        if (typeof triggerScreenShake === 'function') triggerScreenShake(enemy.damage * 0.6, 150);

                        if (typeof createParticles === 'function') createParticles(enemy.x, enemy.y, enemy.color, 10);
                        enemies.splice(i, 1);
                        enemiesRemainingInWave--;
                         // Chama updateEnemiesRemainingDisplay via window
                        if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay();
                        enemyRemovedThisFrame = true;

                        const currentGameState = typeof gameState !== 'undefined' ? gameState : 'playing';
                        if (health <= 0 && currentGameState !== 'gameOver') {
                            if (typeof gameOver === 'function') gameOver();
                            return;
                        }
                    }
                }
            }
        }

        // Bounds Check
        if (!enemyRemovedThisFrame && !enemy.converted) {
            const margin = enemy.radius + 10;
            enemy.x = Math.max(-margin, Math.min(canvasW + margin, enemy.x));
            enemy.y = Math.max(-margin, Math.min(canvasH + margin, enemy.y));
        }
    }
}


function updateNanoBots(dt) {
    const now = performance.now();
    const canvasW = canvas?.width || 600;
    const canvasH = canvas?.height || 400;
    const buffer = 10;

    for (let i = nanoBots.length - 1; i >= 0; i--) {
        const bot = nanoBots[i];
        if (!bot) { nanoBots.splice(i, 1); continue; }

        if (bot.target && (bot.target.health <= 0 || bot.target.converted || bot.target.infectionTimer !== null)) {
            bot.target = null;
            bot.state = 'seeking';
        }

        if (!bot.target) {
            bot.state = 'seeking';
            let bestTarget = null;
            let maxHp = -Infinity;
            enemies.forEach(enemy => {
                if (enemy && !enemy.converted && enemy.infectionTimer === null && enemy.health > 0 && !enemy.isBoss) {
                     if(enemy.health > maxHp) {
                         maxHp = enemy.health;
                         bestTarget = enemy;
                     }
                }
            });
            bot.target = bestTarget;
        }

        if (bot.target) {
            bot.state = 'homing';
            const targetEnemy = bot.target;
            const angle = Math.atan2(targetEnemy.y - bot.y, targetEnemy.x - bot.x);
            bot.x += Math.cos(angle) * bot.speed * dt;
            bot.y += Math.sin(angle) * bot.speed * dt;

            const distSq = distanceSquared(bot.x, bot.y, targetEnemy.x, targetEnemy.y);
            const radiiSumSq = (bot.radius + targetEnemy.radius) * (bot.radius + targetEnemy.radius);
            if (distSq < radiiSumSq) {
                targetEnemy.infectionTimer = now;
                if (typeof createParticles === 'function') createParticles(bot.x, bot.y, NANO_BOT_COLOR, 8);
                nanoBots.splice(i, 1);
                continue;
            }
        } else {
            if (now - bot.creationTime > 8000) {
                 if (typeof createParticles === 'function') createParticles(bot.x, bot.y, '#888888', 5);
                 nanoBots.splice(i, 1);
                 continue;
            }
        }

        if (bot.x < -buffer || bot.x > canvasW + buffer || bot.y < -buffer || bot.y > canvasH + buffer) {
            nanoBots.splice(i, 1);
        }
    }
}


function updatePowerups(dt) {
    const now = performance.now();
    if (!player) return; // Precisa do player para atração
    const isMagnetPowerupActive = player.activePowerups.magnet && player.activePowerups.magnet > now;

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p) { powerups.splice(i, 1); continue; }

        p.update(dt, player.x, player.y, isMagnetPowerupActive); // Chama update do powerup

        const collectionDist = player.radius + p.radius;
        const distSqToPlayer = distanceSquared(p.x, p.y, player.x, player.y);
        if (distSqToPlayer < collectionDist * collectionDist) {
            if (typeof activatePowerup === 'function') activatePowerup(p.type);
            powerups.splice(i, 1);
            continue;
        }

        if (now - p.creationTime > POWERUP_LIFESPAN) {
            if (typeof createParticles === 'function') createParticles(p.x, p.y, p.color || '#FFFFFF', 5);
            powerups.splice(i, 1);
        }
    }
}


function updateParticles(dt) {
     for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
         if (!p) { particles.splice(i, 1); continue; }
         p.update(dt);
         if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        if (!dn) { damageNumbers.splice(i, 1); continue; }
        dn.update(dt);
        if (dn.life <= 0) {
            damageNumbers.splice(i, 1);
        }
    }
}

// --- Screen Shake Logic ---

function triggerScreenShake(intensity, duration) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDuration = Math.max(shakeDuration, duration);
}

function updateScreenShake(dt) {
    if (shakeDuration > 0) {
        shakeDuration -= dt * 1000;
        if (shakeDuration <= 0) {
            shakeIntensity = 0;
            shakeOffsetX = 0;
            shakeOffsetY = 0;
            shakeDuration = 0;
        } else {
             // Calcula offset aqui, será usado por applyScreenShake em drawing.js
             shakeOffsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
             shakeOffsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
        }
    } else {
        shakeIntensity = 0;
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
}


// --- Wave Management Update ---
function startNextWave() {
    currentWave++;
    bossActive = false;

    if (currentWave > 1) {
        waveClearMessageTimer = WAVE_CLEAR_MSG_DURATION;
        let bonus = 20 + currentWave * 5;
        cash += bonus;
        // Chama funções da UI via window
        if (typeof window.updateCashDisplay === 'function') window.updateCashDisplay();
        if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel();
        if (typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - player.radius - 20, `+${bonus} Cash!`, '#FFEB3B');
    }
    console.log(`Starting Wave ${currentWave}...`);

    if (currentWave > 0 && currentWave % BOSS_WAVE_INTERVAL === 0) {
        gameState = 'playing';
        enemiesToSpawnThisWave = 1;
        enemiesSpawnedThisWave = 0;
        enemiesRemainingInWave = 1;
        if(typeof spawnBoss === 'function') spawnBoss();
        waveTimer = 0;
        lastEnemySpawnTime = performance.now();
        console.log(`--- BOSS WAVE ${currentWave} STARTED ---`);
    } else {
        gameState = 'waveIntermission';
        waveTimer = WAVE_INTERMISSION_TIME;
        enemiesToSpawnThisWave = BASE_ENEMIES_PER_WAVE + Math.floor((currentWave -1) * ENEMIES_PER_WAVE_INCREASE);
        enemiesRemainingInWave = enemiesToSpawnThisWave;
        enemiesSpawnedThisWave = 0;
        currentEnemySpawnInterval = Math.max(MIN_ENEMY_SPAWN_INTERVAL, BASE_ENEMY_SPAWN_INTERVAL - ((currentWave -1) * SPAWN_INTERVAL_REDUCTION_PER_WAVE));
        lastEnemySpawnTime = 0;
        console.log(`Wave ${currentWave}: Intermission. Spawning ${enemiesToSpawnThisWave} enemies. Interval: ${currentEnemySpawnInterval.toFixed(0)}ms`);
    }

    // Chama funções da UI via window
    if (typeof window.updateWaveIndicator === 'function') window.updateWaveIndicator();
    if (typeof window.updateEnemiesRemainingDisplay === 'function') window.updateEnemiesRemainingDisplay();
    if (typeof window.updateAvailableUpgrades === 'function') window.updateAvailableUpgrades();
    if (typeof window.populateUpgradePanel === 'function') window.populateUpgradePanel();
    if (typeof saveGameData === 'function') saveGameData();
}


function updateWaveState(dt) {
    const now = performance.now();

    if (waveClearMessageTimer > 0) {
        waveClearMessageTimer -= dt * 1000;
    }

    if (gameState === 'waveIntermission') {
        waveTimer -= dt * 1000;
        if (waveTimer <= 0 && waveClearMessageTimer <= 0) {
             gameState = 'playing';
             lastEnemySpawnTime = now;
             console.log(`Wave ${currentWave} playing...`);
        }
        return;
    }

    if (gameState === 'playing') {
        if (!bossActive) {
            if (enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
                if (now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                    if(typeof spawnEnemy === 'function') spawnEnemy();
                    enemiesSpawnedThisWave++;
                    lastEnemySpawnTime = now;
                }
            }
        }

        // Verifica se inimigos restantes (incluindo minions/filhos) chegou a zero
        if (enemiesRemainingInWave <= 0) {
             console.log(`Wave ${currentWave} clear condition met (enemies remaining <= 0). Starting next wave.`);
             startNextWave();
        }
    }
}