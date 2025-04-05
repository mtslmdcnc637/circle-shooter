function applyScreenShake() {
    if (!ctx) return;
    // Salva o estado ANTES de aplicar o translate do shake atual
    // ctx.save(); // Não precisa mais save/restore aqui, é feito em draw()

    // Aplica o offset calculado em updateScreenShake
    ctx.translate(shakeOffsetX, shakeOffsetY);

    // Calcula o próximo offset para o *próximo* frame, se o shake estiver ativo
    // Este cálculo agora está em updateScreenShake para manter a lógica junta.
    // Apenas aplicamos o translate aqui.
}

function drawPlayer() {
    if (!ctx || !player) return;
    const now = performance.now();

    // --- Efeitos Visuais (Powerups, etc.) ---
    // Auto-Aim Indicator (se nível > 0)
    if (player.autoAimLevel > 0) {
         const indicatorRadius = player.radius + 8 + Math.sin(now / 150) * 1.5;
         const accuracyFactor = calculateAutoAimLerpFactor(); // Pega a precisão atual
         // Cor fica mais forte/opaca com níveis maiores?
         const alphaHex = Math.max(20, Math.floor(accuracyFactor * 150)).toString(16).padStart(2, '0');
         ctx.beginPath();
         ctx.arc(player.x, player.y, indicatorRadius, 0, Math.PI * 2);
         ctx.strokeStyle = PLAYER_COLOR + alphaHex; // Usa cor do player com alpha
         ctx.lineWidth = 1.5 + accuracyFactor * 1.5;
         ctx.stroke();
    }
    // Damage Boost Color Lerp
    let currentPlayerColor = player.color;
    if (player.activePowerups.damageBoost && player.activePowerups.damageBoost > now) {
        currentPlayerColor = lerpColor(player.color, POWERUP_DAMAGE_BOOST_COLOR, 0.4 + Math.sin(now / 150) * 0.2);
    }
    // Fire Rate Boost Effect (e.g., small trail?) - Opcional
    // if (player.activePowerups.fireRateBoost && player.activePowerups.fireRateBoost > now) { ... }


    // --- Player Circle ---
    ctx.fillStyle = currentPlayerColor;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();


    // --- Shield Visual ---
    if (player.shieldState === 'active') {
        const shieldPercent = Math.max(0, 1 - ((now - player.shieldTimer) / calculateShieldDuration()));
        const shieldPulse = 1 + Math.sin(now / 100) * 0.05; // Leve pulsação
        ctx.beginPath();
        ctx.arc(player.x, player.y, (player.radius + 5) * shieldPulse, 0, Math.PI * 2);
        // Cor muda de amarelo vivo para branco/amarelo pálido conforme acaba
        ctx.strokeStyle = lerpColor('#FFFF8D', SHIELD_COLOR, shieldPercent);
        ctx.lineWidth = (2 + shieldPercent * 3); // Fica mais fino ao acabar
        ctx.globalAlpha = 0.5 + shieldPercent * 0.4; // Fade out
        ctx.stroke();
        // Brilho externo opcional
        // ctx.shadowColor = SHIELD_COLOR; ctx.shadowBlur = 10 * shieldPercent; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0; // Restaura alpha
    } else if (player.shieldState === 'cooldown') {
         const cooldownPercent = Math.min(1, (now - player.shieldTimer) / calculateShieldCooldown());
         // Desenha arco de cooldown
         ctx.beginPath();
         ctx.arc(player.x, player.y, player.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
         ctx.strokeStyle = '#AAAAAA60'; // Cinza semi-transparente
         ctx.lineWidth = 2;
         ctx.stroke();
    }

    // --- Aiming Reticle (sutil) ---
    const dxAim = mousePos.x - player.x;
    const dyAim = mousePos.y - player.y;
    const distAim = Math.sqrt(dxAim*dxAim + dyAim*dyAim);
    if (distAim > player.radius + 5) {
         const nxAim = dxAim / distAim; const nyAim = dyAim / distAim;
         ctx.beginPath();
         ctx.moveTo(player.x + nxAim * (player.radius + 2), player.y + nyAim * (player.radius + 2));
         ctx.lineTo(player.x + nxAim * (player.radius + 10), player.y + nyAim * (player.radius + 10));
         // Usa o ângulo de mira atual (afetado por auto-aim) para a linha
         // const currentAngle = player.currentAimAngle;
         // ctx.moveTo(player.x + Math.cos(currentAngle) * (player.radius + 2), player.y + Math.sin(currentAngle) * (player.radius + 2));
         // ctx.lineTo(player.x + Math.cos(currentAngle) * (player.radius + 10), player.y + Math.sin(currentAngle) * (player.radius + 10));

         ctx.strokeStyle = '#FFFFFF30'; // Branco bem transparente
         ctx.lineWidth = 1;
         ctx.stroke();
     }
}

function drawEnemies() {
    if (!ctx) return;

    enemies.forEach(enemy => {
        if (!enemy) return;

        const scale = 1.0 + Math.sin(enemy.pulseTimer) * PULSE_AMOUNT;
        const currentDrawRadius = enemy.radius * scale; // Raio visual para desenho
        const drawX = enemy.x - currentDrawRadius;
        const drawY = enemy.y - currentDrawRadius;
        const drawSize = currentDrawRadius * 2;

        // Guarda estado para aplicar efeitos (alpha, sombra)
        ctx.save();

        // Define alpha se convertido
        if (enemy.converted) {
            ctx.globalAlpha = 0.75;
        }

        // Tenta desenhar a imagem SVG
        if (enemyImageLoaded) {
            // Aplica rotação leve baseada no tempo? (opcional)
            // const rotation = (performance.now() / 3000) * (enemy.id % 2 === 0 ? 1 : -1); // Gira devagar
            // ctx.translate(enemy.x, enemy.y);
            // ctx.rotate(rotation);
            // ctx.drawImage(enemyImage, -currentDrawRadius, -currentDrawRadius, drawSize, drawSize);
            // ctx.rotate(-rotation); // Desfaz rotação
            // ctx.translate(-enemy.x, -enemy.y);
             ctx.drawImage(enemyImage, drawX, drawY, drawSize, drawSize); // Desenho simples sem rotação
        } else {
            // Fallback: Desenha círculo com cor e raio visual
            ctx.fillStyle = enemy.currentColor || enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, currentDrawRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Restaura estado (remove alpha/transformações)
        ctx.restore();


        // --- Desenha elementos ADICIONAIS sobre a imagem/forma ---

        // Health Bar
        if (enemy.health < enemy.maxHealth) {
            const barWidth = Math.max(20, enemy.radius * 1.6); // Barra um pouco maior que o raio base
            const barHeight = 5;
            const barX = enemy.x - barWidth / 2;
            // Posiciona acima do raio visual máximo
            const barY = enemy.y - (enemy.radius * (1 + PULSE_AMOUNT)) - barHeight - 5;
            const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
            ctx.fillStyle = '#444'; // Fundo escuro
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : (healthPercent > 0.3 ? '#FFEB3B' : '#F44336');
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            ctx.strokeStyle = '#111'; ctx.lineWidth = 0.5; // Contorno fino
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Infection Progress (desenha como um arco sobre o inimigo)
        if (enemy.infectionTimer !== null && !enemy.converted) {
            const infectionTime = calculateNanobotInfectionTime();
            const elapsedInfectionTime = performance.now() - enemy.infectionTimer;
            const infectionProgress = Math.min(1, elapsedInfectionTime / infectionTime);
            ctx.beginPath();
            // Desenha arco de progresso
            ctx.arc(enemy.x, enemy.y, enemy.radius * 0.9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * infectionProgress);
            ctx.strokeStyle = NANO_BOT_COLOR + 'E0'; // Verde forte com alpha
            ctx.lineWidth = 3;
            // Adiciona sombra para destacar
            ctx.shadowColor = NANO_BOT_COLOR; ctx.shadowBlur = 5;
            ctx.stroke();
            ctx.shadowBlur = 0; // Limpa sombra
        }

        // Converted Outline (contorno verde claro)
        if (enemy.converted) {
            ctx.strokeStyle = CONVERTED_BULLET_COLOR + 'B0'; // Cor do convertido com alpha
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2); // Contorno ligeiramente fora
            // Efeito de brilho opcional
            // ctx.shadowColor = CONVERTED_BULLET_COLOR; ctx.shadowBlur = 8;
            ctx.stroke();
            // ctx.shadowBlur = 0;
        }
    });
}

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
     ctx.strokeStyle = '#FFFFFF'; // Contorno branco
     ctx.lineWidth = 1;
     nanoBots.forEach(bot => {
         if (bot) {
             // Desenha como um pequeno losango/quadrado rotacionado
             ctx.save();
             ctx.translate(bot.x, bot.y);
             ctx.rotate(performance.now() / 300); // Rotação constante
             const size = bot.radius * 1.5; // Tamanho visual
             ctx.beginPath();
             ctx.moveTo(0, -size); // Top
             ctx.lineTo(size, 0);  // Right
             ctx.lineTo(0, size);  // Bottom
             ctx.lineTo(-size, 0); // Left
             ctx.closePath();
             ctx.fill();
             ctx.stroke(); // Adiciona contorno
             ctx.restore();
         }
     });
}

function drawPowerups() {
    if (!ctx || !canvas) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px sans-serif';
    powerups.forEach(p => {
        if (p) {
            const pulseScale = 1.0 + Math.sin(performance.now() / 150 + p.creationTime) * 0.1; // Pulsação leve
            const drawRadius = p.radius * pulseScale;
            // Desenha o círculo do powerup com gradiente radial?
            const gradient = ctx.createRadialGradient(p.x, p.y, drawRadius * 0.2, p.x, p.y, drawRadius);
            gradient.addColorStop(0, p.color + 'FF'); // Centro opaco
            gradient.addColorStop(0.7, p.color + 'B0'); // Meio transparente
            gradient.addColorStop(1, p.color + '50'); // Borda mais transparente
            ctx.fillStyle = gradient;
            ctx.beginPath(); ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2); ctx.fill();
            // Desenha o contorno
            ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.stroke();
            // Desenha o símbolo interno
            ctx.fillStyle = '#FFFFFF'; // Símbolo branco
            ctx.shadowColor = 'black'; ctx.shadowBlur = 3; // Sombra no texto
            ctx.fillText(p.symbol, p.x, p.y + 1); // Ajuste Y se necessário
            ctx.shadowBlur = 0; // Limpa sombra
        }
    });
}
function drawParticles() {
    if (!ctx) return;
    particles.forEach(p => {
        if (p && p.alpha > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha; // Usa o alpha calculado
            ctx.beginPath();
            // Partícula diminui de tamanho ao longo da vida
            ctx.arc(p.x, p.y, Math.max(0.1, p.radius * (p.life / p.initialLife)), 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1.0; // Restaura alpha global
}

function drawDamageNumbers() {
    if (!ctx || !canvas) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; // Centraliza melhor verticalmente
    damageNumbers.forEach(dn => {
        if (!dn || dn.alpha <= 0) return;
        const lifeRatio = dn.life / dn.initialLife;
        // Tamanho aumenta e depois diminui? Ou só sobe e some?
        // Tamanho fixo, mas com alpha
        const fontSize = 14;
        ctx.font = `bold ${fontSize}px sans-serif`;
        // Cor com alpha baseado na vida restante
        const alphaHex = Math.max(20, Math.floor(dn.alpha * 255)).toString(16).padStart(2, '0');
        ctx.fillStyle = dn.color ? dn.color + alphaHex : `rgba(255, 255, 255, ${dn.alpha})`;
        // Sombra para legibilidade
        ctx.shadowColor = 'black'; ctx.shadowBlur = 2;
        ctx.fillText(dn.text, dn.x, dn.y);
        ctx.shadowBlur = 0; // Limpa sombra
    });
}

function drawPowerupTimers() {
    if (!ctx || !canvas || !player) return;
    const now = performance.now();
    const iconSize = 24; const padding = 6; const barHeight = 5;
    // Posição: Canto inferior esquerdo
    let drawY = canvas.height - iconSize - padding - barHeight - 10;
    let drawX = padding + 10;
    ctx.font = `bold ${iconSize * 0.7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    Object.keys(player.activePowerups).forEach(type => {
        const endTime = player.activePowerups[type];
        const timeLeft = endTime - now;
        if (timeLeft <= 0) return;

        let color = '#FFFFFF'; let symbol = '?'; let totalDuration = POWERUP_FIRE_RATE_BOOST_DURATION; // Usar duração específica
        switch(type) {
            case 'fireRateBoost':
                color = POWERUP_FIRE_RATE_BOOST_COLOR; symbol = POWERUP_FIRE_RATE_BOOST_SYMBOL; totalDuration = POWERUP_FIRE_RATE_BOOST_DURATION; break;
            case 'damageBoost':
                color = POWERUP_DAMAGE_BOOST_COLOR; symbol = POWERUP_DAMAGE_BOOST_SYMBOL; totalDuration = POWERUP_DAMAGE_BOOST_DURATION; break;
            // case 'autoAim': // Auto-aim não é um powerup de tempo, é um upgrade
            //     color = AUTO_AIM_POWERUP_COLOR; symbol = '@'; totalDuration = POWERUP_DURATION; break;
            case 'magnet':
                color = POWERUP_MAGNET_COLOR; symbol = POWERUP_MAGNET_SYMBOL; totalDuration = POWERUP_MAGNET_DURATION; break;
            // Adicionar outros powerups de tempo aqui...
            default: return; // Pula tipos desconhecidos
        }
        const remainingRatio = Math.max(0, timeLeft / totalDuration);

        // Fundo semi-transparente para o ícone
        ctx.fillStyle = '#333333A0'; ctx.fillRect(drawX, drawY, iconSize, iconSize);
        // Desenha o símbolo
        ctx.fillStyle = color; ctx.fillText(symbol, drawX + iconSize / 2, drawY + iconSize / 2 + 1);
        // Desenha barra de tempo (fundo)
        ctx.fillStyle = '#555'; ctx.fillRect(drawX, drawY + iconSize, iconSize, barHeight);
        // Desenha barra de tempo (preenchimento)
        ctx.fillStyle = color; ctx.fillRect(drawX, drawY + iconSize, iconSize * remainingRatio, barHeight);
        // Contorno
        ctx.strokeStyle = '#222'; ctx.lineWidth=0.5; ctx.strokeRect(drawX, drawY + iconSize, iconSize, barHeight);
        ctx.strokeRect(drawX, drawY, iconSize, iconSize);


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
     const fadeDuration = WAVE_CLEAR_MSG_DURATION * 0.4; // Fade out mais longo
     const alpha = Math.min(1, waveClearMessageTimer / fadeDuration);
     // Cor verde com fade e sombra
     ctx.fillStyle = `rgba(76, 175, 80, ${alpha * 0.9})`; // Um pouco transparente mesmo no início
     ctx.font = 'bold 50px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
     ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
     ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8; ctx.shadowOffsetX=2; ctx.shadowOffsetY=2;
     ctx.fillText(`Wave ${currentWave -1} Cleared!`, canvas.width / 2, canvas.height / 2.5);
     // Limpa sombra para não afetar outros desenhos
     ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
}

// --- Função Principal de Desenho ---
function draw() {
    if (!ctx || !canvas) { console.error("Tentando desenhar sem contexto ou canvas"); return; }

    // 1. Limpa o canvas (fundo) - Fora do save/restore do shake
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Salva o estado e aplica o shake
    ctx.save();
    applyScreenShake(); // Aplica translate(shakeOffsetX, shakeOffsetY)

    // 3. Desenha elementos do jogo (ordem importa)
    if (typeof drawParticles === 'function') drawParticles();
    if (typeof drawPowerups === 'function') drawPowerups();
    if (typeof drawEnemyBullets === 'function') drawEnemyBullets();
    if (typeof drawEnemies === 'function') drawEnemies(); // Desenha SVGs/formas inimigas
    if (typeof drawNanoBots === 'function') drawNanoBots();
    if (typeof drawBullets === 'function') drawBullets(); // Balas jogador/convertido
    if (typeof drawPlayer === 'function') drawPlayer(); // Inclui escudo/efeitos
    if (typeof drawDamageNumbers === 'function') drawDamageNumbers();

    // 4. Desenha elementos de UI sobre o jogo (mensagens de wave)
    if (typeof drawWaveIntermission === 'function') drawWaveIntermission();
    if (typeof drawWaveClearMessage === 'function') drawWaveClearMessage();

    // 5. Desenha overlay de vida baixa (se aplicável)
    if (health < 30 && gameState === 'playing') {
        const pulse = Math.abs(Math.sin(performance.now() / 180)); // Pulso mais lento
        ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.12})`; // Vermelho mais sutil
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 6. Restaura o estado do contexto (remove o translate do shake)
    ctx.restore();

    // 7. Desenha UI fixa que NÃO deve ser afetada pelo shake (timers de powerup)
    if (typeof drawPowerupTimers === 'function') drawPowerupTimers();

}