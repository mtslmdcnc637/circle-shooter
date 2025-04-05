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
let isShopOpen = false;
let wasGamePausedByShop = false;

// --- Funções de Atualização da UI ---

function updateCashDisplay(amount) {
    const displayAmount = amount ?? (typeof gameData !== 'undefined' ? gameData.cash : 0);
    if (cashDisplay) cashDisplay.textContent = `Cash: ${displayAmount}`;
    if (shopCashOverlay) shopCashOverlay.textContent = `Cash: ${displayAmount}`;
}

function updateHealthDisplay(amount) {
    const displayAmount = amount ?? (typeof gameData !== 'undefined' ? gameData.health : 100);
    if (healthDisplay) healthDisplay.textContent = `Health: ${Math.max(0, Math.round(displayAmount))}`; // Arredonda vida
}

function updateWaveIndicator(waveNumber) {
     const displayWave = waveNumber ?? (typeof gameData !== 'undefined' ? gameData.wave : 0);
    if (waveIndicator) waveIndicator.textContent = `Wave: ${displayWave}`;
}

function updateEnemiesRemainingDisplay(count) {
    if (enemiesRemainingDisplay) {
        // Garante que count seja um número >= 0
        const displayCount = Math.max(0, count || 0);
        if (displayCount > 0) {
            enemiesRemainingDisplay.textContent = `Enemies: ${displayCount}`;
            enemiesRemainingDisplay.style.display = 'block';
        } else {
            // Esconde se for 0 ou indefinido
             if (typeof gameData !== 'undefined' && gameData.wave > 0 && gameData.running) {
                 // Mostra "Enemies: 0" brevemente se a wave está ativa mas vazia
                 enemiesRemainingDisplay.textContent = `Enemies: 0`;
                 enemiesRemainingDisplay.style.display = 'block';
             } else {
                 enemiesRemainingDisplay.style.display = 'none';
             }
        }
    }
}


function showUpgradePanel() {
    if (upgradePanel) upgradePanel.classList.add('visible');
}

function hideUpgradePanel() {
    if (upgradePanel) upgradePanel.classList.remove('visible');
}

function populateUpgradePanel(availableUpgrades, currentCash, purchaseCallback) {
    if (!upgradeItemsContainer) return;
    upgradeItemsContainer.innerHTML = '';

    const upgradesToShow = availableUpgrades || [];
    const cashValue = currentCash ?? (typeof gameData !== 'undefined' ? gameData.cash : 0);

    if (upgradesToShow.length === 0) {
        hideUpgradePanel();
        return;
    }

    upgradesToShow.forEach(upgrade => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('upgradeItem');
        if (upgrade.level === upgrade.maxLevel) {
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

        if (upgrade.description) {
            const detailsSpan = document.createElement('span');
            detailsSpan.classList.add('details');
            detailsSpan.textContent = upgrade.description;
            infoDiv.appendChild(detailsSpan);
        }

        itemDiv.appendChild(infoDiv);

        const costSpan = document.createElement('span');
        costSpan.classList.add('cost');
        const buyButton = document.createElement('button');
        buyButton.pointerEvents = 'auto';

        if (upgrade.level === upgrade.maxLevel) {
            costSpan.textContent = "MAX";
            buyButton.textContent = 'Maxed';
            buyButton.disabled = true;
        } else {
            // Calcula custo aqui também para garantir que está atualizado
            const calculatedCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(upgrade) : (upgrade.cost || Infinity);
            costSpan.textContent = `($${calculatedCost})`;
            buyButton.textContent = 'Buy';
            buyButton.disabled = cashValue < calculatedCost;
            buyButton.onclick = () => {
                 const latestCash = typeof gameData !== 'undefined' ? gameData.cash : 0;
                 // Recalcula custo no momento do clique
                 const clickCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(upgrade) : Infinity;
                if (latestCash >= clickCost) {
                    if (typeof purchaseCallback === 'function') {
                        purchaseCallback(upgrade.id);
                    } else {
                         console.error("purchaseCallback não é uma função!");
                    }
                } else {
                     console.log("Clicou em comprar, mas cash insuficiente agora.");
                     // Desabilitar botão visualmente? Ou apenas não fazer nada.
                     buyButton.disabled = true; // Desabilita temporariamente
                     setTimeout(() => { // Reabilita após um tempo se o cash ainda for baixo
                         const currentCashAgain = typeof gameData !== 'undefined' ? gameData.cash : 0;
                         if(buyButton) buyButton.disabled = currentCashAgain < clickCost;
                     }, 500);
                }
            };
        }

        itemDiv.appendChild(costSpan);
        itemDiv.appendChild(buyButton);
        upgradeItemsContainer.appendChild(itemDiv);
    });

    // Verifica estado do jogo usando funções globais
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

function showGameOverScreen(finalCash) {
    hideAllOverlays();
    if (finalCashDisplay) finalCashDisplay.textContent = `Final Cash: ${finalCash}`;
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

function showShopOverlay(shopItems, currentCash, purchaseCallback) {
    if (!shopOverlay) return;
     const itemsToShow = shopItems || [];
     const cashValue = currentCash ?? (typeof gameData !== 'undefined' ? gameData.cash : 0);
     const purchaseFn = purchaseCallback || window.purchaseUpgrade; // Usa global se não passado

     if (typeof purchaseFn !== 'function') {
         console.error("purchaseCallback inválido na loja!");
         return;
     }

    updateShopItems(itemsToShow, cashValue, purchaseFn);
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
        if(typeof window.resumeGame === 'function') window.resumeGame();
    }
    wasGamePausedByShop = false;
}

function updateShopItems(shopItems, currentCash, purchaseCallback) {
    if (!shopItemsContainerOverlay) return;
    shopItemsContainerOverlay.innerHTML = '';

    const itemsToShow = shopItems || [];
    const cashValue = currentCash ?? (typeof gameData !== 'undefined' ? gameData.cash : 0);

    itemsToShow.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('shopItemOverlay');
         if (item.level === item.maxLevel) {
            itemDiv.classList.add('maxed');
        }

        const descriptionDiv = document.createElement('div');
        descriptionDiv.classList.add('description');
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = item.name;
         if (item.maxLevel > 1) {
             nameSpan.textContent += ` (${item.level}/${item.maxLevel})`;
        }
        descriptionDiv.appendChild(nameSpan);
        const detailsSpan = document.createElement('span');
        detailsSpan.classList.add('details');
        detailsSpan.textContent = item.description;
        descriptionDiv.appendChild(detailsSpan);

        itemDiv.appendChild(descriptionDiv);

        const costSpan = document.createElement('span');
        costSpan.classList.add('cost');

        const buyButton = document.createElement('button');
        buyButton.pointerEvents = 'auto';

        if (item.level === item.maxLevel) {
            costSpan.textContent = "MAX";
            buyButton.textContent = 'Maxed';
            buyButton.disabled = true;
        } else {
            // Calcula custo aqui também
            const calculatedCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(item) : (item.cost || Infinity);
            costSpan.textContent = `$${calculatedCost}`;
            buyButton.textContent = 'Buy';
            buyButton.disabled = cashValue < calculatedCost;
            buyButton.onclick = (e) => {
                e.stopPropagation();
                 const latestCash = typeof gameData !== 'undefined' ? gameData.cash : 0;
                 const clickCost = typeof calculateUpgradeCost === 'function' ? calculateUpgradeCost(item) : Infinity;
                if (latestCash >= clickCost) {
                     if (typeof purchaseCallback === 'function') {
                        purchaseCallback(item.id);
                    } else {
                         console.error("purchaseCallback não é uma função!");
                    }
                } else {
                     console.log("Clicou em comprar (loja), mas cash insuficiente agora.");
                     buyButton.disabled = true;
                     setTimeout(() => {
                          const currentCashAgain = typeof gameData !== 'undefined' ? gameData.cash : 0;
                         if(buyButton) buyButton.disabled = currentCashAgain < clickCost;
                     }, 500);
                }
            };
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

if (startBtn) {
    startBtn.addEventListener('click', () => {
        hideStartScreen();
        if (typeof window.startGame === 'function') window.startGame();
    });
}

if (startShopBtn) {
    startShopBtn.addEventListener('click', () => {
        const currentShopItems = typeof window.getShopItemsDefinition === 'function' ? window.getShopItemsDefinition() : [];
        const currentCash = typeof gameData !== 'undefined' ? gameData.cash : 0;
        const purchaseFn = typeof window.purchaseUpgrade === 'function' ? window.purchaseUpgrade : null;
        if(purchaseFn) {
            showShopOverlay(currentShopItems, currentCash, purchaseFn);
        } else {
            console.error("Função purchaseUpgrade não encontrada para o botão da loja inicial.");
        }
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
        const running = typeof window.isGameRunning === 'function' && window.isGameRunning();
        const paused = typeof window.isGamePaused === 'function' && window.isGamePaused();
        if (running && !paused) {
            if(typeof window.pauseGame === 'function') window.pauseGame();
            showPauseMenu();
        }
    });
}

if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        hidePauseMenu();
        if(typeof window.resumeGame === 'function') window.resumeGame();
    });
}

if (inGameShopBtn) {
    inGameShopBtn.addEventListener('click', () => {
         const gameOver = typeof window.isGameOver === 'function' && window.isGameOver();
        if (!isShopOpen && !gameOver) {
            const currentShopItems = typeof window.getShopItemsDefinition === 'function' ? window.getShopItemsDefinition() : [];
            const currentCash = typeof gameData !== 'undefined' ? gameData.cash : 0;
             const purchaseFn = typeof window.purchaseUpgrade === 'function' ? window.purchaseUpgrade : null;
             if(purchaseFn){
                showShopOverlay(currentShopItems, currentCash, purchaseFn);
             } else {
                 console.error("Função purchaseUpgrade não encontrada para o botão da loja in-game.");
             }
        }
    });
}

if (closeShopOverlayBtn) {
    closeShopOverlayBtn.addEventListener('click', hideShopOverlay);
}
if (shopCloseButtonX) {
    shopCloseButtonX.addEventListener('click', hideShopOverlay);
}

if (shopOverlay) {
    shopOverlay.addEventListener('click', (event) => {
        if (event.target === shopOverlay) {
            hideShopOverlay();
        }
    });
}

if (shopItemsContainerOverlay) {
    shopItemsContainerOverlay.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        hideGameOverScreen();
        if (typeof window.initializeGame === 'function') {
            window.initializeGame();
        } else {
            showStartScreen();
            console.warn("Função initializeGame não encontrada globalmente para restart.");
        }
    });
}

function initializeUI() {
    showStartScreen();
    const initialCash = typeof gameData !== 'undefined' ? gameData.cash : 0;
    const initialHealth = typeof gameData !== 'undefined' ? gameData.health : 100;
    const initialWave = typeof gameData !== 'undefined' ? gameData.wave : 0;
    updateCashDisplay(initialCash);
    updateHealthDisplay(initialHealth);
    updateWaveIndicator(initialWave);
    updateEnemiesRemainingDisplay(0);
    hideUpgradePanel();
}

// --- Variáveis e Funções Globais Esperadas ---
// Define calculateUpgradeCost globalmente para que possa ser usada aqui e em main.js
// (Alternativa: passar a função como argumento)
var calculateUpgradeCost = typeof calculateUpgradeCost !== 'undefined' ? calculateUpgradeCost : (upgrade) => {
     // Fallback simples se não definida em main.js/gameobjects.js
     if (!upgrade || upgrade.level >= upgrade.maxLevel) return Infinity;
     return Math.floor((upgrade.baseCost || 100) * Math.pow((upgrade.costIncreaseFactor || 1.5), upgrade.level));
};
window.isShopOpen = isShopOpen; // Expõe para main.js se necessário