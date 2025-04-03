// --- Drawing Functions ---

function applyScreenShake() {
    if (!ctx) return;
    ctx.translate(-shakeOffsetX, -shakeOffsetY);
    if (shakeIntensity > 0 && shakeDuration > 0) {
        shakeOffsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
        ctx.translate(shakeOffsetX, shakeOffsetY);
    } else { shakeOffsetX = 0; shakeOffsetY = 0; }
}

function drawPlayer() {
    if (!ctx) return;
    const now = performance.now();

    // Powerup Effects
    if (player.activePowerups.autoAim && player.activePowerups.autoAim > now) {
         const effectProgress = (player.activePowerups.autoAim - now) / POWERUP_DURATION;
         ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(now / 100) * 2, 0, Math.PI * 2);
         ctx.strokeStyle = AUTO_AIM_POWERUP_COLOR + Math.max(20, Math.floor(effectProgress * 100)).toString(16).padStart(2, '0');
         ctx.lineWidth = 2 + effectProgress * 2; ctx.stroke();
    }
    ctx.fillStyle = player.activePowerups.damageBoost && player.activePowerups.damageBoost > now ? lerpColor(player.color, '#FF5722', 0.4 + Math.sin(now/150)*0.2) : player.color;

    // Player Circle
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();

    // Shield Visual
    if (player.shieldState === 'active') {
        // console.log(`Drawing shield: Active.`); // Reduce spam
        const shieldPercent = Math.max(0, 1 - ((now - player.shieldTimer) / calculateShieldDuration()));
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = lerpColor('#64B5F6', SHIELD_COLOR, shieldPercent); ctx.lineWidth = 2 + shieldPercent * 3;
        ctx.globalAlpha = 0.4 + shieldPercent * 0.5; ctx.stroke(); ctx.globalAlpha = 1.0;
    } else if (player.shieldState === 'cooldown') {
         const cooldownPercent = Math.min(1, (now - player.shieldTimer) / calculateShieldCooldown());
         ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
         ctx.strokeStyle = '#AAAAAA60'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Aiming Reticle
    const dxAim = aimX - player.x; const dyAim = aimY - player.y; const distAim = Math.sqrt(dxAim*dxAim + dyAim*dyAim);
    if (distAim > player.radius + 5) {
         const nxAim = dxAim / distAim; const nyAim = dyAim / distAim;
         ctx.beginPath(); ctx.moveTo(player.x + nxAim * (player.radius + 2), player.y + nyAim * (player.radius + 2));
         ctx.lineTo(player.x + nxAim * (player.radius + 10), player.y + nyAim * (player.radius + 10));
         ctx.strokeStyle = '#FFFFFF30'; ctx.lineWidth = 1; ctx.stroke();
     }
}

function drawEnemies() {
    if (!ctx) return;
    enemies.forEach(enemy => {
        if (!enemy) return;
        ctx.fillStyle = enemy.currentColor || enemy.color; ctx.beginPath();
        if (enemy.type === 'splitter') { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(performance.now()/3000); const sides = 8; ctx.moveTo(enemy.radius, 0); for (let i = 1; i <= sides; i++) ctx.lineTo(enemy.radius * Math.cos(i * 2 * Math.PI / sides), enemy.radius * Math.sin(i * 2 * Math.PI / sides)); ctx.closePath(); ctx.restore(); }
        else if (enemy.type === 'shooter') { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(Math.PI/4); ctx.rect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6); ctx.restore(); }
        else if (enemy.type === 'square' || enemy.isBossMinion) { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2); ctx.restore(); }
        else if (enemy.type === 'triangle') { ctx.save(); ctx.translate(enemy.x, enemy.y); const angleOffset = -Math.PI / 2; ctx.moveTo(Math.cos(angleOffset) * enemy.radius, Math.sin(angleOffset) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius); ctx.closePath(); ctx.restore(); }
        else { ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); }
        ctx.fill();
        // Health Bar
        if (enemy.health < enemy.maxHealth) { const barWidth = Math.max(20, enemy.radius * 1.5); const barHeight = 5; const barX = enemy.x - barWidth / 2; const barY = enemy.y - enemy.radius - barHeight - 5; const healthPercent = Math.max(0, enemy.health / enemy.maxHealth); ctx.fillStyle = '#555'; ctx.fillRect(barX, barY, barWidth, barHeight); ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : (healthPercent > 0.3 ? '#FFEB3B' : '#F44336'); ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barWidth, barHeight); }
        // Infection Progress
        if (enemy.infectionTimer !== null && !enemy.converted) { const infectionProgress = Math.min(1, enemy.infectionTimer / (NANO_BOT_INFECTION_TIME / Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, player.nanobotInfectLevel))); ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * infectionProgress); ctx.strokeStyle = NANO_BOT_COLOR + 'B0'; ctx.lineWidth = 3; ctx.stroke(); }
        // Converted Outline
        if (enemy.converted) { ctx.strokeStyle = CONVERTED_BULLET_COLOR + '80'; ctx.lineWidth = 2; ctx.beginPath(); if (enemy.type === 'square' || enemy.isBossMinion) { ctx.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2); } else if (enemy.type === 'triangle') { const angleOffset = -Math.PI / 2; ctx.moveTo(enemy.x + Math.cos(angleOffset) * enemy.radius, enemy.y + Math.sin(angleOffset) * enemy.radius); ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius); ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius); ctx.closePath(); } else { ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); } ctx.stroke(); }
    });
}

function drawBullets() { // Player/Converted bullets
    if (!ctx) return;
    ctx.fillStyle = BULLET_COLOR; bullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
    ctx.fillStyle = CONVERTED_BULLET_COLOR; convertedBullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
}

function drawEnemyBullets() {
    if (!ctx) return;
    ctx.fillStyle = ENEMY_BULLET_COLOR;
    enemyBullets.forEach(bullet => { if (bullet) { ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); } });
}

function drawNanoBots() { /* ... nanobot drawing ... */ }
function drawPowerups() { /* ... powerup drawing ... */ }
function drawParticles() { /* ... particle drawing ... */ }

function drawDamageNumbers() {
    if (!ctx) return;
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    damageNumbers.forEach(dn => { if (!dn) return; const lifeLeft = Math.max(0, dn.life / DAMAGE_NUMBER_LIFESPAN); ctx.fillStyle = `rgba(255, 255, 255, ${lifeLeft * 0.8})`; ctx.fillText(dn.text, dn.x, dn.y); });
}

function drawPowerupTimers() {
    if (!ctx) return; const now = performance.now(); const iconSize = 20; const padding = 5; const barHeight = 4;
    let drawY = canvas?.height - iconSize - padding - barHeight || 400; let drawX = padding;
    ctx.font = `bold ${iconSize * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const type in player.activePowerups) {
        if (Object.prototype.hasOwnProperty.call(player.activePowerups, type)) {
            const endTime = player.activePowerups[type]; const timeLeft = endTime - now;
            if (timeLeft <= 0) continue;
            let color = '#FFFFFF'; let symbol = '?'; let totalDuration = POWERUP_DURATION;
            switch(type) {
                case 'rapidFire': color = '#9C27B0'; symbol = 'F'; break; case 'damageBoost': color = '#FF5722'; symbol = 'D'; break;
                case 'autoAim': color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; break; case 'magnet': color = POWERUP_MAGNET_COLOR; symbol = 'M'; totalDuration = MAGNET_DURATION; break;
            }
            const remainingRatio = Math.max(0, timeLeft / totalDuration);
            ctx.fillStyle = '#55555580'; ctx.fillRect(drawX, drawY, iconSize, iconSize); // BG Box
            ctx.fillStyle = color; ctx.fillText(symbol, drawX + iconSize / 2, drawY + iconSize / 2 + 1); // Icon
            ctx.fillStyle = '#333'; ctx.fillRect(drawX, drawY + iconSize, iconSize, barHeight); // Bar BG
            ctx.fillStyle = color; ctx.fillRect(drawX, drawY + iconSize, iconSize * remainingRatio, barHeight); // Bar FG
            drawX += iconSize + padding;
        }
    }
}

function drawWaveIntermission() {
     if (!ctx) return;
     if (gameState === 'waveIntermission' && waveTimer > 0) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.font = 'bold 42px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
         ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const secondsLeft = Math.ceil(waveTimer / 1000);
         ctx.shadowColor = 'black'; ctx.shadowBlur = 5;
         ctx.fillText(`Wave ${currentWave} starting in ${secondsLeft}...`, (canvas?.width || 600) / 2, (canvas?.height || 400) / 3);
         ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
     }
}
function drawWaveClearMessage() {
     if (!ctx || waveClearMessageTimer <= 0) return;
     const alpha = Math.min(1, waveClearMessageTimer / (WAVE_CLEAR_MSG_DURATION * 0.5)); // Fade out alpha
     ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
     ctx.font = 'bold 50px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
     ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
     ctx.shadowColor = 'black'; ctx.shadowBlur = 6;
     ctx.fillText(`Wave ${currentWave -1} Cleared!`, (canvas?.width || 600) / 2, (canvas?.height || 400) / 2.5);
     ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

function draw() {
    if (!ctx || !canvas) return;
    ctx.save(); ctx.translate(-shakeOffsetX, -shakeOffsetY); ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    applyScreenShake();

    // Draw order matters for layering
    if (typeof drawParticles === 'function') drawParticles();
    if (typeof drawPowerups === 'function') drawPowerups();
    if (typeof drawEnemyBullets === 'function') drawEnemyBullets();
    if (typeof drawEnemies === 'function') drawEnemies();
    if (typeof drawNanoBots === 'function') drawNanoBots();
    if (typeof drawBullets === 'function') drawBullets();
    if (typeof drawPlayer === 'function') drawPlayer();
    if (typeof drawDamageNumbers === 'function') drawDamageNumbers();

    if (typeof drawWaveIntermission === 'function') drawWaveIntermission();
    if (typeof drawWaveClearMessage === 'function') drawWaveClearMessage();
    if (typeof drawPowerupTimers === 'function') drawPowerupTimers();

    // Low health pulse overlay
    if (health < 30) { const pulse = Math.abs(Math.sin(performance.now() / 150)); ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.15})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}