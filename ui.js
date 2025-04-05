// ui.js - Gerenciamento da Interface do Usuário

// --- Elementos da UI ---
const cashDisplay = document.getElementById('cashDisplay');
const healthDisplay = document.getElementById('health');
const waveIndicator = document.getElementById('waveIndicator');
const enemiesRemainingDisplay = document.getElementById('enemiesRemaining');
const pauseBtn = document.getElementById('pauseBtn');
const inGameShopBtn = document.getElementById('inGameShopBtn');
const upgradePanel = document.getElementById('upgradePanel');
const upgradeItemsContainer = document.getElementById('upgradeItemsContainer');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const startShopBtn = document.getElementById('startShopBtn');
const gameOverScreen = document.getElementById('gameOver');
const finalCashDisplay = document.getElementById('finalCash');
const restartBtn = document.getElementById('restartBtn');
const pauseMenu = document.getElementById('pauseMenu');
const resumeBtn = document.getElementById('resumeBtn');
const shopOverlay = document.getElementById('shopOverlay');
const shopCloseButtonX = document.getElementById('shopCloseButtonX');
const shopCashOverlay = document.getElementById('shopCashOverlay');
const shopItemsContainerOverlay = document.getElementById('shopItemsContainerOverlay');
const closeShopOverlayBtn = document.getElementById('closeShopOverlayBtn');

// --- Estado da UI ---
let isShopOpen = false; // Usado por main.js para saber se atualiza a loja
let wasGamePausedByShop = false;

// --- Funções de Atualização da UI ---

function updateCashDisplay() {
    // Verifica se a variável global 'cash' existe antes de usar
    const currentCash = typeof cash !== 'undefined' ? cash : 0;
    if (cashDisplay) cashDisplay.textContent = `Cash: ${currentCash}`;
    if (shopCashOverlay) shopCashOverlay.textContent = `Cash: ${currentCash}`;
}

function updateHealthDisplay() {
    // Verifica se 'health' e 'baseHealth' globais existem
    const currentHealth = typeof health !== 'undefined' ? Math.max(0, Math.round(health)) : 100;
    const currentBaseHealth = typeof baseHealth !== 'undefined' ? baseHealth : 100;
    if (healthDisplay) {
        healthDisplay.textContent = `Health: ${currentHealth}`;
        // Muda cor baseado na vida
        if (currentHealth > currentBaseHealth * 0.6) healthDisplay.style.color = '#FFFFFF'; // Branco > 60%
        else if (currentHealth > currentBaseHealth * 0.3) healthDisplay.style.color = '#FFEB3B'; // Amarelo > 30%
        else healthDisplay.style.color = '#F44336'; // Vermelho <= 30%
    }
}


function updateWaveIndicator() {
     const waveNum = typeof currentWave !== 'undefined' ? currentWave : 0;
     if (waveIndicator) waveIndicator.textContent = `Wave: ${waveNum}`;
}

function updateEnemiesRemainingUI() {
    if (enemiesRemainingDisplay) {
        const waveNum = typeof currentWave !== 'undefined' ? currentWave : 0;
        const currentGameState = typeof gameState !== 'undefined' ? gameState : 'loading';
        const remainingCount = typeof enemiesRemainingInWave !== 'undefined' ? enemiesRemainingInWave : 0;
        const isBoss = typeof bossActive !== 'undefined' ? bossActive : false;

        // Mostra contagem se estiver jogando ou em intermission (exceto wave 0)
        if ((currentGameState === 'playing' || currentGameState === 'waveIntermission') && waveNum > 0) {
            const displayCount = Math.max(0, remainingCount);
            enemiesRemainingDisplay.textContent = isBoss ? "BOSS" : `Enemies: ${displayCount}`;
            enemiesRemainingDisplay.style.display = 'block';
        } else {
            // Esconde se não estiver jogando (start, game over, loading) ou na wave 0
            enemiesRemainingDisplay.style.display = 'none';
        }
    }
}


function showUpgradePanel() {
    if (upgradePanel) upgradePanel.classList.add('visible');
}

function hideUpgradePanel() {
    if (upgradePanel) upgradePanel.classList.remove('visible');
}

// Função chamada por main.js para popular o painel in-game
function populateUpgradePanel(availableUpgradesList, currentCashValue, purchaseCallbackFn) {
    if (!upgradeItemsContainer) return;
    upgradeItemsContainer.innerHTML = '';

    const upgradesToShow = availableUpgradesList || [];
    const cashValue = currentCashValue ?? (typeof cash !== 'undefined' ? cash : 0);
    const purchaseFn = purchaseCallbackFn || window.purchaseUpgrade;

    if (typeof purchaseFn !== 'function') {
        console.error("purchaseCallback inválido no painel de upgrade!");
    }

    if (upgradesToShow.length === 0 && (typeof gameState !== 'undefined' && gameState !== 'start' && gameState !== 'gameOver')) {
         // Não esconde se estiver na tela inicial ou game over, pode haver upgrades compráveis
         // hideUpgradePanel(); // Comentado - decide mostrar/esconder no final
         // return;
    }


    upgradesToShow.forEach(upgrade => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('upgradeItem');
        const isMaxed = upgrade.level >= upgrade.maxLevel;
        if (isMaxed) {
            itemDiv.classList.add('maxed');
        }

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('info');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = upgrade.name;
        if (upgrade.maxLevel > 1) {
             nameSpan.textContent += ` (${upgrade.level}/${upgrade.maxLevel})`;
        }
        infoDiv.appendChild(nameSpan);

        // Mostra descrição - Calcula valor dinâmico se for 'nanoInfect'
        let descriptionText = upgrade.description;
        if (upgrade.id === 'nanoInfect' && typeof NANO_BOT_INFECTION_SPEED_MULTIPLIER !== 'undefined') {
             descriptionText = `Nanobots convertem ${((NANO_BOT_INFECTION_SPEED_MULTIPLIER - 1) * 100).toFixed(0)}% mais rápido. Req: Nanobots.`;
        }
         if (upgrade.id === 'shootRate' && typeof FIRE_RATE_REDUCTION_FACTOR !== 'undefined') {
             descriptionText = `Aumenta a velocidade de disparo (${(1 / FIRE_RATE_REDUCTION_FACTOR * 100 - 100).toFixed(0)}%).`;
        }
        // Adicionar mais cálculos dinâmicos aqui se necessário...

        if (descriptionText) {
            const detailsSpan = document.createElement('span');
            detailsSpan.classList.add('details');
            detailsSpan.textContent = descriptionText;
            infoDiv.appendChild(detailsSpan);
        }

        itemDiv.appendChild(infoDiv);

        const costSpan = document.createElement('span');
        costSpan.classList.add('cost');
        const buyButton = document.createElement('button');
        buyButton.style.pointerEvents = 'auto';

        if (isMaxed) {
            costSpan.textContent = "MAX";
            buyButton.textContent = 'Maxed';
            buyButton.disabled = true;
        } else {
            const calculatedCost = upgrade.cost !== undefined ? upgrade.cost : Infinity;
            costSpan.textContent = `($${calculatedCost})`;
            buyButton.textContent = 'Buy';
            buyButton.disabled = cashValue < calculatedCost || typeof purchaseFn !== 'function';

            if (typeof purchaseFn === 'function') {
                buyButton.onclick = () => {
                    const latestCash = typeof cash !== 'undefined' ? cash : 0;
                    const clickCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(upgrade) : Infinity;

                    if (latestCash >= clickCost) {
                        purchaseFn(upgrade.id);
                    } else {
                        console.log("Clicou em comprar (painel), mas cash insuficiente agora.");
                        buyButton.disabled = true;
                        itemDiv.style.transition = 'outline 0.1s ease-out';
                        itemDiv.style.outline = '2px solid red';
                        setTimeout(() => {
                             itemDiv.style.outline = 'none';
                             const currentCashAgain = typeof cash !== 'undefined' ? cash : 0;
                             if(buyButton) buyButton.disabled = currentCashAgain < clickCost;
                        }, 400);
                    }
                };
            }
        }

        itemDiv.appendChild(costSpan);
        itemDiv.appendChild(buyButton);
        upgradeItemsContainer.appendChild(itemDiv);
    });

    // Mostra/Esconde painel baseado no estado do jogo e se há upgrades
    const running = typeof window.isGameRunning === 'function' && window.isGameRunning();
    const paused = typeof window.isGamePaused === 'function' && window.isGamePaused();
    if (upgradesToShow.length > 0 && running && !paused) {
         showUpgradePanel();
    } else {
         hideUpgradePanel();
    }
}


function showStartScreen() {
    hideAllOverlays();
    if (startScreen) startScreen.classList.add('visible');
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (inGameShopBtn) inGameShopBtn.style.display = 'none';
    hideUpgradePanel();
}

function hideStartScreen() {
    if (startScreen) startScreen.classList.remove('visible');
    if (pauseBtn) pauseBtn.style.display = 'block';
    if (inGameShopBtn) inGameShopBtn.style.display = 'block';
}

function showGameOverScreen(finalCashValue) {
    hideAllOverlays();
    if (finalCashDisplay) finalCashDisplay.textContent = `Final Cash: ${finalCashValue}`;
    if (gameOverScreen) gameOverScreen.classList.add('visible');
    if (pauseBtn) pauseBtn.style.display = 'none';
    if (inGameShopBtn) inGameShopBtn.style.display = 'none';
    hideUpgradePanel();
}

function hideGameOverScreen() {
    if (gameOverScreen) gameOverScreen.classList.remove('visible');
}

function showPauseMenu() {
    if (pauseMenu) pauseMenu.classList.add('visible');
}

function hidePauseMenu() {
    if (pauseMenu) pauseMenu.classList.remove('visible');
}

// Mostra o overlay da loja (chamado pelos botões Loja)
function showShopOverlay() {
    if (!shopOverlay) return;

    const currentShopItems = typeof window.getShopItemsDefinition === 'function' ? window.getShopItemsDefinition() : [];
    const currentCashValue = typeof cash !== 'undefined' ? cash : 0;
    const purchaseFn = typeof window.purchaseUpgrade === 'function' ? window.purchaseUpgrade : null;

    if (!purchaseFn) {
         console.error("Função purchaseUpgrade não encontrada para a loja!");
         return;
    }

    updateShopItems(currentShopItems, currentCashValue, purchaseFn); // Popula a loja
    shopOverlay.classList.add('visible');
    isShopOpen = true;

    const running = typeof window.isGameRunning === 'function' && window.isGameRunning();
    const paused = typeof window.isGamePaused === 'function' && window.isGamePaused();
    if (running && !paused) {
        if(typeof window.pauseGame === 'function') window.pauseGame();
        wasGamePausedByShop = true;
    } else {
        wasGamePausedByShop = false;
    }
}

function hideShopOverlay() {
    if (!shopOverlay) return;
    shopOverlay.classList.remove('visible');
    isShopOpen = false;

    if (wasGamePausedByShop) {
        const gameOver = typeof window.isGameOver === 'function' && window.isGameOver();
        if(!gameOver && typeof window.resumeGame === 'function') {
            window.resumeGame();
        }
    }
    wasGamePausedByShop = false;
}

// Popula a lista de itens dentro do overlay da loja
function updateShopItems(shopItemsList, currentCashValue, purchaseCallbackFn) {
    if (!shopItemsContainerOverlay) return;
    shopItemsContainerOverlay.innerHTML = '';

    const itemsToShow = shopItemsList || [];
    const cashValue = currentCashValue ?? (typeof cash !== 'undefined' ? cash : 0);

    itemsToShow.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('shopItemOverlay');
        const isMaxed = item.level >= item.maxLevel;
        const meetsReq = item.meetsRequirement !== false;

         if (isMaxed) {
            itemDiv.classList.add('maxed');
        }
        if (!meetsReq) {
             itemDiv.classList.add('locked');
             itemDiv.style.opacity = '0.6';
        }

        const descriptionDiv = document.createElement('div');
        descriptionDiv.classList.add('description');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = item.name;
         if (item.maxLevel > 1) {
             nameSpan.textContent += ` (${item.level}/${item.maxLevel})`;
        }
         if (!meetsReq) {
             nameSpan.textContent += ` [Locked]`;
         }
        descriptionDiv.appendChild(nameSpan);
        const detailsSpan = document.createElement('span');
        detailsSpan.classList.add('details');
        // Calcula descrição dinâmica aqui também
        let descriptionText = item.description;
        if (item.id === 'nanoInfect' && typeof NANO_BOT_INFECTION_SPEED_MULTIPLIER !== 'undefined') {
             descriptionText = `Nanobots convertem ${((NANO_BOT_INFECTION_SPEED_MULTIPLIER - 1) * 100).toFixed(0)}% mais rápido. Req: Nanobots.`;
        }
         if (item.id === 'shootRate' && typeof FIRE_RATE_REDUCTION_FACTOR !== 'undefined') {
             descriptionText = `Aumenta a velocidade de disparo (${(1 / FIRE_RATE_REDUCTION_FACTOR * 100 - 100).toFixed(0)}%).`;
        }
        // Adicionar mais cálculos aqui...
        detailsSpan.textContent = descriptionText;
        descriptionDiv.appendChild(detailsSpan);

        itemDiv.appendChild(descriptionDiv);

        const costSpan = document.createElement('span');
        costSpan.classList.add('cost');

        const buyButton = document.createElement('button');
        buyButton.style.pointerEvents = 'auto';

        if (!meetsReq) {
            costSpan.textContent = "Req Locked";
            buyButton.textContent = 'Locked';
            buyButton.disabled = true;
        } else if (isMaxed) {
            costSpan.textContent = "MAX";
            buyButton.textContent = 'Maxed';
            buyButton.disabled = true;
        } else {
            const calculatedCost = item.cost !== undefined ? item.cost : Infinity;
            costSpan.textContent = `$${calculatedCost}`;
            buyButton.textContent = 'Buy';
            buyButton.disabled = cashValue < calculatedCost || typeof purchaseCallbackFn !== 'function';

            if (typeof purchaseCallbackFn === 'function') {
                buyButton.onclick = (e) => {
                    e.stopPropagation();
                    const latestCash = typeof cash !== 'undefined' ? cash : 0;
                    const clickCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(item) : Infinity;

                    if (latestCash >= clickCost) {
                        purchaseCallbackFn(item.id);
                    } else {
                        console.log("Clicou em comprar (loja), mas cash insuficiente agora.");
                        buyButton.disabled = true;
                        itemDiv.style.transition = 'outline 0.1s ease-out';
                        itemDiv.style.outline = '2px solid red';
                        setTimeout(() => {
                            itemDiv.style.outline = 'none';
                            const currentCashAgain = typeof cash !== 'undefined' ? cash : 0;
                            if(buyButton) buyButton.disabled = currentCashAgain < clickCost;
                        }, 400);
                    }
                };
            }
        }

        itemDiv.appendChild(costSpan);
        itemDiv.appendChild(buyButton);
        shopItemsContainerOverlay.appendChild(itemDiv);
    });
}


function hideAllOverlays() {
    if (startScreen) startScreen.classList.remove('visible');
    if (gameOverScreen) gameOverScreen.classList.remove('visible');
    if (pauseMenu) pauseMenu.classList.remove('visible');
    if (shopOverlay) shopOverlay.classList.remove('visible');
    isShopOpen = false;
    wasGamePausedByShop = false;
}

// --- Event Listeners da UI ---
// (Removendo e readicionando para garantir que não haja duplicatas se initializeUI for chamada novamente)

function setupButtonListeners() {
    // Remove listeners antigos primeiro
    startBtn?.removeEventListener('click', handleStartClick);
    startShopBtn?.removeEventListener('click', handleStartShopClick);
    pauseBtn?.removeEventListener('click', handlePauseClick);
    resumeBtn?.removeEventListener('click', handleResumeClick);
    inGameShopBtn?.removeEventListener('click', handleInGameShopClick);
    closeShopOverlayBtn?.removeEventListener('click', handleCloseShopClick);
    shopCloseButtonX?.removeEventListener('click', handleCloseShopClick);
    shopOverlay?.removeEventListener('click', handleShopOverlayClick);
    restartBtn?.removeEventListener('click', handleRestartClick);

    // Adiciona novos listeners
    startBtn?.addEventListener('click', handleStartClick);
    startShopBtn?.addEventListener('click', handleStartShopClick);
    pauseBtn?.addEventListener('click', handlePauseClick);
    resumeBtn?.addEventListener('click', handleResumeClick);
    inGameShopBtn?.addEventListener('click', handleInGameShopClick);
    closeShopOverlayBtn?.addEventListener('click', handleCloseShopClick);
    shopCloseButtonX?.addEventListener('click', handleCloseShopClick);
    shopOverlay?.addEventListener('click', handleShopOverlayClick);
    restartBtn?.addEventListener('click', handleRestartClick);
}

// Handlers para os botões
function handleStartClick() {
    hideStartScreen();
    if (typeof window.startGame === 'function') window.startGame();
}
function handleStartShopClick() {
    showShopOverlay();
}
function handlePauseClick() {
    if (typeof window.isGameRunning === 'function' && window.isGameRunning() &&
        typeof window.isGamePaused === 'function' && !window.isGamePaused()) {
        if(typeof window.pauseGame === 'function') window.pauseGame();
         showPauseMenu();
    }
}
function handleResumeClick() {
    hidePauseMenu();
    if(typeof window.resumeGame === 'function') window.resumeGame();
}
function handleInGameShopClick() {
     const gameOver = typeof window.isGameOver === 'function' && window.isGameOver();
    if (!isShopOpen && !gameOver) {
        showShopOverlay();
    }
}
function handleCloseShopClick() {
    hideShopOverlay();
}
function handleShopOverlayClick(event) {
    if (event.target === shopOverlay) {
        hideShopOverlay();
    }
}
function handleRestartClick() {
    hideGameOverScreen();
    if (typeof window.initializeGame === 'function') {
        window.initializeGame();
    } else {
        showStartScreen();
        console.warn("Função initializeGame não encontrada globalmente para restart.");
    }
}


// Inicializa o estado visual da UI e configura listeners
function initializeUI() {
    showStartScreen();
    updateCashDisplay();
    updateHealthDisplay();
    updateWaveIndicator();
    updateEnemiesRemainingUI();
    hideUpgradePanel();
    setupButtonListeners(); // Configura os listeners dos botões
}

// --- Variáveis e Funções Globais Esperadas ---
// calculateUpgradeCost (definido em main.js)
// Funções de controle de jogo (startGame, pauseGame, etc. definidas em main.js)
// Variáveis de estado globais (cash, health, currentWave, gameState etc. definidas em main.js)

// Expõe isShopOpen para main.js
window.isShopOpen = isShopOpen;