// --- Drawing Functions ---

function applyScreenShake() { /* ... screen shake apply logic ... */ }
function drawPlayer() { /* ... player drawing logic ... */ }

// --- Modified drawEnemies --- (Optional: slightly different visuals)
function drawEnemies() {
    if (!ctx) return;
    enemies.forEach(enemy => {
        if (!enemy) return;
        ctx.fillStyle = enemy.currentColor || enemy.color;
        ctx.beginPath();
        // --- Draw Shape ---
        if (enemy.type === 'splitter') { // Draw splitter as maybe a cyan octagon?
             ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(performance.now()/3000); // Slow rotation
             const sides = 8;
             ctx.moveTo(enemy.radius, 0);
             for (let i = 1; i <= sides; i++) ctx.lineTo(enemy.radius * Math.cos(i * 2 * Math.PI / sides), enemy.radius * Math.sin(i * 2 * Math.PI / sides));
             ctx.closePath(); ctx.restore();
        } else if (enemy.type === 'shooter') { // Draw shooter as maybe purple diamond?
            ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(Math.PI/4); // Rotate 45 deg
            ctx.rect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
            ctx.restore();
        } else if (enemy.type === 'square' || enemy.isBossMinion) { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2); ctx.restore(); }
        else if (enemy.type === 'triangle') { ctx.save(); ctx.translate(enemy.x, enemy.y); const angleOffset = -Math.PI / 2; ctx.moveTo(Math.cos(angleOffset) * enemy.radius, Math.sin(angleOffset) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius); ctx.closePath(); ctx.restore(); }
        else { ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); } // Circle or Boss
        ctx.fill();

        // --- Health Bar --- (same as before)
        if (enemy.health < enemy.maxHealth) { /* ... health bar logic ... */ }
        // --- Infection Progress --- (same as before)
        if (enemy.infectionTimer !== null && !enemy.converted) { /* ... infection drawing ... */ }
        // --- Converted Outline --- (same as before)
        if (enemy.converted) { /* ... converted outline drawing ... */ }
    });
}

function drawBullets() { /* ... player and converted bullet drawing ... */ }

// --- New Function: drawEnemyBullets ---
function drawEnemyBullets() {
    if (!ctx) return;
    ctx.fillStyle = ENEMY_BULLET_COLOR;
    enemyBullets.forEach(bullet => {
        if (!bullet) return;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawNanoBots() { /* ... nanobot drawing ... */ }
function drawPowerups() { /* ... powerup drawing ... */ }
function drawParticles() { /* ... particle drawing ... */ }

// --- New Function: drawDamageNumbers ---
function drawDamageNumbers() {
    if (!ctx) return;
    const now = performance.now();
    ctx.font = 'bold 14px sans-serif'; // Font for damage numbers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    damageNumbers.forEach(dn => {
        if (!dn) return;
        const lifeLeft = Math.max(0, dn.life / DAMAGE_NUMBER_LIFESPAN); // 1 down to 0
        ctx.fillStyle = `rgba(255, 255, 255, ${lifeLeft * 0.8})`; // White, fading out
        ctx.fillText(dn.text, dn.x, dn.y);
    });
}

// --- New Function: drawPowerupTimers ---
function drawPowerupTimers() {
    if (!ctx) return;
    const now = performance.now();
    const iconSize = 20; // Size of the icon square
    const padding = 5;
    const barHeight = 4;
    let drawY = canvas?.height - iconSize - padding - barHeight || 400; // Start near bottom
    let drawX = padding;

    ctx.font = `bold ${iconSize * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
            const endTime = player.activePowerups[type];
            const timeLeft = endTime - now;
            if (timeLeft <= 0) continue; // Skip expired (should be removed by update)

            let color = '#FFFFFF'; let symbol = '?'; let totalDuration = POWERUP_DURATION;
            switch(type) {
                case 'rapidFire': color = '#9C27B0'; symbol = 'F'; break;
                case 'damageBoost': color = '#FF5722'; symbol = 'D'; break;
                case 'autoAim': color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; break;
                case 'magnet': color = POWERUP_MAGNET_COLOR; symbol = 'M'; totalDuration = MAGNET_DURATION; break;
                // Add other powerups here
            }

            const remainingRatio = Math.max(0, timeLeft / totalDuration);

            // Draw background box
            ctx.fillStyle = '#55555580'; // Semi-transparent grey bg
            ctx.fillRect(drawX, drawY, iconSize, iconSize);

            // Draw icon/symbol
            ctx.fillStyle = color;
            ctx.fillText(symbol, drawX + iconSize / 2, drawY + iconSize / 2 + 1);

             // Draw timer bar below icon
             ctx.fillStyle = '#333'; // Bar background
             ctx.fillRect(drawX, drawY + iconSize, iconSize, barHeight);
             ctx.fillStyle = color; // Bar foreground
             ctx.fillRect(drawX, drawY + iconSize, iconSize * remainingRatio, barHeight);


            drawX += iconSize + padding; // Move right for next icon
        }
    }
}


function drawWaveIntermission() { /* ... intermission drawing ... */ }
function drawWaveClearMessage() {
     if (!ctx || waveClearMessageTimer <= 0) return;
     ctx.fillStyle = `rgba(76, 175, 80, ${Math.min(1, waveClearMessageTimer / (WAVE_CLEAR_MSG_DURATION * 0.5))})`; // Fade out
     ctx.font = 'bold 50px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
     ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
     ctx.shadowColor = 'black'; ctx.shadowBlur = 6;
     ctx.fillText(`Wave ${currentWave -1} Cleared!`, (canvas?.width || 600) / 2, (canvas?.height || 400) / 2.5);
     ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// --- Modified Main Draw Function ---
function draw() {
    if (!ctx || !canvas) return;

    // Clear canvas with anti-shake
    ctx.save(); ctx.translate(-shakeOffsetX, -shakeOffsetY);
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply current frame shake
    applyScreenShake();

    // Draw game elements
    if (typeof drawParticles === 'function') drawParticles();
    if (typeof drawPowerups === 'function') drawPowerups();
    if (typeof drawEnemyBullets === 'function') drawEnemyBullets(); // Draw enemy bullets behind player/player bullets
    if (typeof drawEnemies === 'function') drawEnemies();
    if (typeof drawNanoBots === 'function') drawNanoBots();
    if (typeof drawBullets === 'function') drawBullets(); // Player/converted bullets
    if (typeof drawPlayer === 'function') drawPlayer();
    if (typeof drawDamageNumbers === 'function') drawDamageNumbers(); // Draw damage numbers on top

    // Draw UI overlays / messages
    if (typeof drawWaveIntermission === 'function') drawWaveIntermission();
    if (typeof drawWaveClearMessage === 'function') drawWaveClearMessage();
    if (typeof drawPowerupTimers === 'function') drawPowerupTimers(); // Draw powerup timers UI

    // Low health visual feedback (screen edge pulse)
    if (health < 30) {
         const pulse = Math.abs(Math.sin(performance.now() / 150)); // 0 to 1 pulse
         ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.15})`; // Semi-transparent red pulse
         ctx.fillRect(0, 0, canvas.width, canvas.height); // Cover whole screen
    }
}