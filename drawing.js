
// --- Drawing Functions ---

function applyScreenShake() {
    if (!ctx) return;
    // Aplica o offset ANTES de desenhar qualquer coisa
    ctx.translate(shakeOffsetX, shakeOffsetY);

    // Calcula o próximo offset para o *próximo* frame, se o shake estiver ativo
    if (shakeIntensity > 0 && shakeDuration > 0) {
        shakeOffsetX = (Math.random() - 0.5) * 2 * shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * 2 * shakeIntensity;
        // Não zera aqui, updateScreenShake controla a duração/intensidade
    } else {
        // Garante que o offset seja zero se não houver shake
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
}

function drawPlayer() { // (Mantenha sua função drawPlayer como estava antes)
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
    if (!ctx || !enemyImageLoaded) return; // Não desenha se a imagem não carregou

    enemies.forEach(enemy => {
        if (!enemy) return;

        const drawX = enemy.x - enemy.radius;
        const drawY = enemy.y - enemy.radius;
        const size = enemy.radius * 2;

        // Desenha a imagem SVG no lugar da forma geométrica
        ctx.globalAlpha = enemy.converted ? 0.7 : 1.0; // Deixa convertido um pouco transparente
        ctx.drawImage(enemyImage, drawX, drawY, size, size);
        ctx.globalAlpha = 1.0; // Restaura alpha

        // --- Desenha elementos ADICIONAIS sobre a imagem ---

        // Health Bar (desenhada sobre a imagem)
        if (enemy.health < enemy.maxHealth) {
            const barWidth = Math.max(20, size * 0.8); // Barra proporcional ao tamanho
            const barHeight = 5;
            const barX = enemy.x - barWidth / 2;
            const barY = drawY - barHeight - 5; // Acima da imagem
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
            ctx.fillStyle = '#555'; // Fundo da barra
            ctx.fillRect(barX, barY, barWidth, barHeight);
            // Cor da barra de vida
            ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : (healthPercent > 0.3 ? '#FFEB3B' : '#F44336');
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            // Contorno da barra
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Infection Progress (desenhado sobre a imagem)
        if (enemy.infectionTimer !== null && !enemy.converted) {
            const infectionRate = Math.pow(NANOBOT_INFECTION_SPEED_MULTIPLIER, player.nanobotInfectLevel);
            const infectionProgress = Math.min(1, enemy.infectionTimer / (NANO_BOT_INFECTION_TIME / infectionRate));
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * infectionProgress);
            ctx.strokeStyle = NANO_BOT_COLOR + 'B0'; // Cor do nanobot com alpha
            ctx.lineWidth = 3;
            ctx.stroke();
             // Poderia adicionar um leve brilho verde também
             // ctx.shadowColor = NANO_BOT_COLOR; ctx.shadowBlur = 5; ctx.stroke(); ctx.shadowBlur = 0;
        }

        // Converted Outline (desenhado sobre a imagem)
        if (enemy.converted) {
            ctx.strokeStyle = CONVERTED_BULLET_COLOR + 'A0'; // Cor do convertido com alpha
            ctx.lineWidth = 3; // Contorno mais grosso para destacar
            ctx.beginPath();
            // Desenha um círculo como contorno, independentemente da forma original
            ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// --- Mantenha o resto das suas funções de desenho como estavam ---
function drawBullets() {
    if (!ctx) return;
    // Player bullets
    ctx.fillStyle = BULLET_COLOR;
    bullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
    // Converted bullets
    ctx.fillStyle = CONVERTED_BULLET_COLOR;
    convertedBullets.forEach(b => { if(b) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); } });
}

function drawEnemyBullets() {
    if (!ctx) return;
    ctx.fillStyle = ENEMY_BULLET_COLOR;
    enemyBullets.forEach(bullet => { if (bullet) { ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); } });
}

function drawNanoBots() {
     if (!ctx) return;
     ctx.fillStyle = NANO_BOT_COLOR;
     nanoBots.forEach(bot => {
         if (bot) {
             ctx.beginPath();
             // Desenha nanobots como pequenos quadrados girando?
             ctx.save();
             ctx.translate(bot.x, bot.y);
             ctx.rotate(performance.now() / 500);
             ctx.fillRect(-bot.radius, -bot.radius, bot.radius * 2, bot.radius * 2);
             ctx.restore();
             // Ou como círculos simples:
             // ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
             // ctx.fill();
         }
     });
}
function drawPowerups() {
    if (!ctx || !canvas) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px sans-serif';
    powerups.forEach(p => {
        if (p) {
            // Desenha o círculo do powerup
            ctx.fillStyle = p.color + 'B0'; // Com alpha
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Desenha o contorno
            ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.stroke();
            // Desenha o símbolo interno
            ctx.fillStyle = '#FFFFFF'; ctx.fillText(p.symbol, p.x, p.y + 1); // Ajuste Y se necessário
        }
    });
}
function drawParticles() {
    if (!ctx) return;
    particles.forEach(p => {
        if (p) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha; // Usa o alpha calculado
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius), 0, Math.PI * 2); // Garante raio mínimo
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1.0; // Restaura alpha global
}

function drawDamageNumbers() {
    if (!ctx || !canvas) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; // Alinha pela base
    damageNumbers.forEach(dn => {
        if (!dn) return;
        const lifeLeft = Math.max(0, dn.life / DAMAGE_NUMBER_LIFESPAN);
        ctx.font = `bold ${12 + (1-lifeLeft)*4}px sans-serif`; // Fica menor ao sumir? Ou maior? Testar.
        ctx.fillStyle = dn.color ? dn.color + Math.max(20, Math.floor(dn.alpha * 255)).toString(16).padStart(2, '0') : `rgba(255, 255, 255, ${dn.alpha * 0.9})`; // Usa alpha calculado
        ctx.fillText(dn.text, dn.x, dn.y);
    });
}

function drawPowerupTimers() {
    if (!ctx || !canvas) return;
    const now = performance.now();
    const iconSize = 20; const padding = 5; const barHeight = 4;
    let drawY = canvas.height - iconSize - padding - barHeight - 10; // Posição Y base (parte inferior)
    let drawX = padding + 10; // Posição X inicial (canto inferior esquerdo)
    ctx.font = `bold ${iconSize * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Desenha os ícones ativos
    Object.keys(player.activePowerups).forEach(type => {
        const endTime = player.activePowerups[type];
        const timeLeft = endTime - now;
        if (timeLeft <= 0) return; // Pula se expirou

        let color = '#FFFFFF'; let symbol = '?'; let totalDuration = POWERUP_DURATION;
        switch(type) {
            case 'rapidFire': color = '#9C27B0'; symbol = 'F'; break;
            case 'damageBoost': color = '#FF5722'; symbol = 'D'; break;
            case 'autoAim': color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; break;
            case 'magnet': color = POWERUP_MAGNET_COLOR; symbol = 'M'; totalDuration = MAGNET_DURATION; break;
        }
        const remainingRatio = Math.max(0, timeLeft / totalDuration);

        // Desenha caixa de fundo para o ícone
        ctx.fillStyle = '#55555580'; ctx.fillRect(drawX, drawY, iconSize, iconSize);
        // Desenha o símbolo
        ctx.fillStyle = color; ctx.fillText(symbol, drawX + iconSize / 2, drawY + iconSize / 2 + 1);
        // Desenha barra de tempo (fundo)
        ctx.fillStyle = '#333'; ctx.fillRect(drawX, drawY + iconSize, iconSize, barHeight);
        // Desenha barra de tempo (preenchimento)
        ctx.fillStyle = color; ctx.fillRect(drawX, drawY + iconSize, iconSize * remainingRatio, barHeight);

        drawX += iconSize + padding; // Move para a próxima posição X
    });
}

function drawWaveIntermission() {
     if (!ctx || !canvas) return;
     if (gameState === 'waveIntermission' && waveTimer > 0) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
         ctx.font = 'bold 42px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
         ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
         const secondsLeft = Math.ceil(waveTimer / 1000);
         ctx.shadowColor = 'black'; ctx.shadowBlur = 5;
         ctx.fillText(`Wave ${currentWave} starting in ${secondsLeft}...`, canvas.width / 2, canvas.height / 3);
         ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
     }
}
function drawWaveClearMessage() {
     if (!ctx || !canvas || waveClearMessageTimer <= 0) return;
     const fadeDuration = WAVE_CLEAR_MSG_DURATION * 0.3; // Tempo para fade out
     const alpha = Math.min(1, waveClearMessageTimer / fadeDuration); // Fade out alpha
     ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`; // Verde com fade
     ctx.font = 'bold 50px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
     ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
     ctx.shadowColor = 'black'; ctx.shadowBlur = 6;
     ctx.fillText(`Wave ${currentWave -1} Cleared!`, canvas.width / 2, canvas.height / 2.5);
     ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
}

// --- Função Principal de Desenho ---
function draw() {
    if (!ctx || !canvas) { console.error("Tentando desenhar sem contexto ou canvas"); return; }

    // 1. Limpa o canvas (desenhando o fundo) - fora do save/restore/translate do shake
    ctx.fillStyle = '#222'; // Cor de fundo
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Salva o estado do contexto e aplica o shake
    ctx.save();
    applyScreenShake(); // Isso aplica ctx.translate()

    // 3. Desenha todos os elementos do jogo (a ordem importa para sobreposição)
    if (typeof drawParticles === 'function') drawParticles();
    if (typeof drawPowerups === 'function') drawPowerups();
    if (typeof drawEnemyBullets === 'function') drawEnemyBullets();
    if (typeof drawEnemies === 'function') drawEnemies(); // Agora desenha SVGs
    if (typeof drawNanoBots === 'function') drawNanoBots();
    if (typeof drawBullets === 'function') drawBullets(); // Balas do jogador/convertidos
    if (typeof drawPlayer === 'function') drawPlayer();
    if (typeof drawDamageNumbers === 'function') drawDamageNumbers();

    // 4. Desenha elementos de UI sobre o jogo (timers, mensagens)
    if (typeof drawWaveIntermission === 'function') drawWaveIntermission();
    if (typeof drawWaveClearMessage === 'function') drawWaveClearMessage();
    if (typeof drawPowerupTimers === 'function') drawPowerupTimers(); // Timers na parte inferior

    // 5. Desenha overlay de vida baixa (se aplicável)
    if (health < 30 && gameState === 'playing') { // Só mostra se jogando
        const pulse = Math.abs(Math.sin(performance.now() / 150));
        ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.15})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Cobre a tela toda
    }

    // 6. Restaura o estado do contexto (remove o translate do shake)
    ctx.restore();

    // 7. Desenha UI fixa que não deve ser afetada pelo shake (raro precisar disso)
    // Ex: ctx.fillStyle = 'white'; ctx.fillText("Debug Info", 10, canvas.height - 10);
}