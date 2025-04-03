// --- Drawing Functions ---

function applyScreenShake() {
    // Counteract previous frame's shake, apply new shake for this frame
    if (!ctx) return;
    ctx.translate(-shakeOffsetX, -shakeOffsetY); // Reset previous
    if (shakeIntensity > 0 && shakeDuration > 0) {
        shakeOffsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
        ctx.translate(shakeOffsetX, shakeOffsetY); // Apply new
    } else {
        shakeOffsetX = 0; shakeOffsetY = 0; // Ensure zero if not shaking
    }
}

function drawPlayer() {
    if (!ctx) return;
    const now = performance.now();

    // --- Powerup Effects ---
    if (player.activePowerups.autoAim && player.activePowerups.autoAim > now) {
         const effectProgress = (player.activePowerups.autoAim - now) / POWERUP_DURATION;
         ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 8 + Math.sin(now / 100) * 2, 0, Math.PI * 2);
         ctx.strokeStyle = AUTO_AIM_POWERUP_COLOR + Math.max(20, Math.floor(effectProgress * 100)).toString(16).padStart(2, '0'); // Ensure 2 hex digits
         ctx.lineWidth = 2 + effectProgress * 2; ctx.stroke();
    }
    ctx.fillStyle = player.activePowerups.damageBoost && player.activePowerups.damageBoost > now ? lerpColor(player.color, '#FF5722', 0.4 + Math.sin(now/150)*0.2) : player.color;

    // --- Player Circle ---
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();

    // --- Shield Visual ---
    if (player.shieldState === 'active') {
        const shieldPercent = Math.max(0, 1 - ((now - player.shieldTimer) / calculateShieldDuration()));
        ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = lerpColor('#64B5F6', SHIELD_COLOR, shieldPercent); ctx.lineWidth = 2 + shieldPercent * 3;
        ctx.globalAlpha = 0.4 + shieldPercent * 0.5; ctx.stroke(); ctx.globalAlpha = 1.0;
    } else if (player.shieldState === 'cooldown') {
         const cooldownPercent = Math.min(1, (now - player.shieldTimer) / calculateShieldCooldown());
         ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
         ctx.strokeStyle = '#AAAAAA60'; ctx.lineWidth = 2; ctx.stroke();
    }

    // --- Aiming Reticle ---
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
        ctx.fillStyle = enemy.currentColor || enemy.color;
        ctx.beginPath();
        // --- Draw Shape ---
        if (enemy.type === 'square' || enemy.isBossMinion) { ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2); ctx.restore(); }
        else if (enemy.type === 'triangle') { ctx.save(); ctx.translate(enemy.x, enemy.y); const angleOffset = -Math.PI / 2; ctx.moveTo(Math.cos(angleOffset) * enemy.radius, Math.sin(angleOffset) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius); ctx.lineTo(Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius); ctx.closePath(); ctx.restore(); }
        else { ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); } // Circle or Boss
        ctx.fill();

        // --- Health Bar ---
        if (enemy.health < enemy.maxHealth) {
            const barWidth = Math.max(20, enemy.radius * 1.5); const barHeight = 5; const barX = enemy.x - barWidth / 2; const barY = enemy.y - enemy.radius - barHeight - 5;
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
            ctx.fillStyle = '#555'; ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : (healthPercent > 0.3 ? '#FFEB3B' : '#F44336'); ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
        // --- Infection Progress ---
        if (enemy.infectionTimer !== null && !enemy.converted) {
             const infectionProgress = enemy.infectionTimer / NANO_BOT_INFECTION_TIME;
             ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * infectionProgress);
             ctx.strokeStyle = NANO_BOT_COLOR + 'B0'; ctx.lineWidth = 3; ctx.stroke();
        }
        // --- Converted Outline ---
        if (enemy.converted) {
             ctx.strokeStyle = CONVERTED_BULLET_COLOR + '80'; ctx.lineWidth = 2;
             // Redraw shape path for stroke
            ctx.beginPath();
            if (enemy.type === 'square' || enemy.isBossMinion) { ctx.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2); }
            else if (enemy.type === 'triangle') { const angleOffset = -Math.PI / 2; ctx.moveTo(enemy.x + Math.cos(angleOffset) * enemy.radius, enemy.y + Math.sin(angleOffset) * enemy.radius); ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 2 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 2 / 3) * enemy.radius); ctx.lineTo(enemy.x + Math.cos(angleOffset + Math.PI * 4 / 3) * enemy.radius, enemy.y + Math.sin(angleOffset + Math.PI * 4 / 3) * enemy.radius); ctx.closePath(); }
            else { ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); }
             ctx.stroke();
        }
    });
}

function drawBullets() {
    if (!ctx) return;
    // Player Bullets
    ctx.fillStyle = BULLET_COLOR;
    bullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
    // Converted Bullets
    ctx.fillStyle = CONVERTED_BULLET_COLOR;
    convertedBullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
}

function drawNanoBots() {
    if (!ctx) return;
    ctx.fillStyle = NANO_BOT_COLOR; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;
    nanoBots.forEach(bot => {
        if (!bot) return;
        const size = 6; let angle = 0;
        if (bot.state === 'homing' && bot.target) angle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
        else angle = (performance.now() / 300); // Spin if seeking/wandering
        ctx.save(); ctx.translate(bot.x, bot.y); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(size * 0.8, 0); ctx.lineTo(-size * 0.5, size * 0.5); ctx.lineTo(-size * 0.5, -size * 0.5); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.restore();
    });
}

function drawPowerups() {
    if (!ctx) return;
    powerups.forEach(p => {
        if (!p) return;
        ctx.fillStyle = p.color || '#FFFFFF'; // Fallback color
        ctx.beginPath();
        const scale = 1.0 + Math.sin(performance.now() / 150) * 0.1;
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.font = `bold ${p.radius * 1.2}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.symbol || '?', p.x, p.y + 1); // Use symbol from powerup object
    });
}

function drawParticles() {
    if (!ctx) return;
    particles.forEach(p => {
        if (!p) return;
        ctx.globalAlpha = Math.max(0, p.life / PARTICLE_LIFESPAN);
        ctx.fillStyle = p.color || '#FFFFFF';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * (p.life / PARTICLE_LIFESPAN), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Reset alpha
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

function draw() {
    if (!ctx || !canvas) return; // Exit if context or canvas is not available

    // Clear canvas with anti-shake
    ctx.save();
    ctx.translate(-shakeOffsetX, -shakeOffsetY);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply current frame shake
    applyScreenShake();

    // Draw elements (with null checks just in case)
    if (typeof drawParticles === 'function') drawParticles();
    if (typeof drawPowerups === 'function') drawPowerups();
    if (typeof drawEnemies === 'function') drawEnemies();
    if (typeof drawNanoBots === 'function') drawNanoBots();
    if (typeof drawBullets === 'function') drawBullets();
    if (typeof drawPlayer === 'function') drawPlayer();
    if (typeof drawWaveIntermission === 'function') drawWaveIntermission();
}