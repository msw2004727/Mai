// js/ui-farm.js
// 這個檔案專門處理「怪獸農場」頁籤的UI渲染與相關更新。

/**
 * 處理點擊怪獸卡片上的「治療」按鈕。
 * @param {string} monsterId - 要治療的怪獸 ID。
 */
async function handleHealClick(monsterId) {
    if (!monsterId) return;
    
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) return;

    // 檢查怪獸是否真的需要治療
    const needsHealing = (monster.hp < monster.initial_max_hp) || 
                         (monster.mp < monster.initial_max_mp) ||
                         (monster.healthConditions && monster.healthConditions.length > 0);

    if (!needsHealing) {
        showFeedbackModal('無需治療', `「${getMonsterDisplayName(monster, gameState.gameConfigs)}」的狀態極好，不需要治療！`);
        return;
    }

    const HEAL_COST = 10;
    const currentGold = gameState.playerData?.playerStats?.gold || 0;

    // 檢查金幣是否足夠
    if (currentGold < HEAL_COST) {
        showFeedbackModal('金幣不足', `治療需要花費 ${HEAL_COST} 🪙，您目前沒有足夠的金幣。`);
        return;
    }

    // 修改確認視窗的提示文字
    const monsterDisplayName = getMonsterDisplayName(monster, gameState.gameConfigs);
    showConfirmationModal(
        '治療怪獸',
        `您確定要花費 <strong style="color:gold;">${HEAL_COST} 🪙</strong> 來完全治癒「${monsterDisplayName}」嗎？`,
        async () => {
            showFeedbackModal('治療中...', '正在施展治癒魔法...', true);
            try {
                const result = await healMonster(monsterId, 'full_restore');
                if (result) {
                    await refreshPlayerData();
                    // 治療成功後，不僅要更新農場，也要更新醫療站的列表
                    if(typeof renderMedicalStation === 'function') renderMedicalStation();
                    showFeedbackModal('成功', '怪獸已完全恢復！');
                } else {
                    hideModal('feedback-modal');
                    showFeedbackModal('治療失敗', '後端驗證失敗，可能是金幣數量不同步。');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('錯誤', `治療失敗: ${error.message}`);
            }
        },
        { confirmButtonClass: 'success', confirmButtonText: '確定治療' }
    );
}


function updateAllTimers() {
    const timerElements = document.querySelectorAll('.training-timer');
    timerElements.forEach(timerEl => {
        const startTime = parseInt(timerEl.dataset.startTime, 10);
        const duration = parseInt(timerEl.dataset.duration, 10);
        if (!startTime || !duration) return;

        const now = Date.now();
        const elapsedTime = Math.floor((now - startTime) / 1000);
        const totalDuration = Math.floor(duration / 1000);
        const displayTime = Math.min(elapsedTime, totalDuration);

        const statusTextEl = timerEl.previousElementSibling;

        if (displayTime >= totalDuration) {
            if (statusTextEl) {
                statusTextEl.textContent = '已完成';
                statusTextEl.style.color = 'var(--success-color)';
                statusTextEl.style.fontWeight = 'bold';
            }
            timerEl.style.display = 'none';
        } else {
            timerEl.textContent = `(${displayTime} / ${totalDuration}s)`;
        }
    });
}

function showMonsterInfoFromFarm(monsterId) {
    if (!monsterId) return;
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (monster) {
        if (typeof updateMonsterInfoModal === 'function') {
            updateMonsterInfoModal(monster, gameState.gameConfigs, gameState.playerData);
            showModal('monster-info-modal');
        } else {
            console.error("updateMonsterInfoModal function is not defined.");
        }
    } else {
        console.error(`Monster with ID ${monsterId} not found in farm.`);
        showFeedbackModal('錯誤', '找不到該怪獸的資料。');
    }
}


function renderMonsterFarm() {
    const listContainer = DOMElements.farmedMonstersList;
    if (!listContainer) {
        console.error("renderMonsterFarm Error: Farm container (#farmed-monsters-list) not found.");
        return;
    }

    const farmContentContainer = document.getElementById('monster-farm-content');
    if (!farmContentContainer) return;

    const oldTitleContainer = farmContentContainer.querySelector('.panel-title-container');
    if (oldTitleContainer) oldTitleContainer.remove();

    const titleContainer = document.createElement('div');
    titleContainer.className = 'panel-title-container';
    titleContainer.style.cssText = 'border-bottom: none; margin-bottom: 15px;';

    const titleHtml = `<h2 class="panel-title dna-panel-title">🏡 怪獸農場</h2>`;

    const sortConfig = gameState.farmSortConfig || { key: 'score', order: 'desc' };
    const sortOptions = {
        'score': '評價', 'hp': 'HP', 'mp': 'MP', 'speed': '速度', 'status': '狀態'
    };
    const currentSortText = sortOptions[sortConfig.key] || '評價';

    // 將提示文字和排序按鈕包在一個容器中，以便對齊
    const rightSideControlsHtml = `
        <div class="farm-title-controls" style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="panel-title-hint dna-panel-hint">※最多收納10隻怪獸</span>
            <div class="farm-sort-container">
                <button id="farm-sort-btn" class="button secondary text-xs">
                    排序: ${currentSortText} <span class="sort-arrow">${sortConfig.order === 'desc' ? '▼' : '▲'}</span>
                </button>
                <div id="farm-sort-dropdown" class="dropdown-menu">
                    <a href="#" class="dropdown-item" data-sort-key="score">評價</a>
                    <a href="#" class="dropdown-item" data-sort-key="hp">HP</a>
                    <a href="#" class="dropdown-item" data-sort-key="mp">MP</a>
                    <a href="#" class="dropdown-item" data-sort-key="speed">速度</a>
                    <a href="#" class="dropdown-item" data-sort-key="status">狀態</a>
                </div>
            </div>
        </div>
    `;

    titleContainer.innerHTML = titleHtml + rightSideControlsHtml;
    
    farmContentContainer.prepend(titleContainer);

    listContainer.innerHTML = '';
    listContainer.className = 'farm-card-grid';

    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您的農場空空如也，快去組合新的怪獸吧！</p>`;
        listContainer.className = ''; 
        return;
    }

    const statusPriority = { 'deployed': 1, 'expedition': 2, 'training': 3, 'injured': 4, 'idle': 5 };

    monsters.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'status') {
            const getStatus = (m) => {
                if (gameState.playerData.selectedMonsterId === m.id) return 'deployed';
                if (gameState.playerData.adventure_progress?.is_active && gameState.playerData.adventure_progress.expedition_team.some(member => member.monster_id === m.id)) return 'expedition';
                if (m.farmStatus?.isTraining) return 'training';
                if (m.hp < m.initial_max_hp * 0.25) return 'injured';
                return 'idle';
            };
            valA = statusPriority[getStatus(a)];
            valB = statusPriority[getStatus(b)];
            return valA - valB;
        } else if (sortConfig.key === 'hp' || sortConfig.key === 'mp') {
            valA = a[sortConfig.key];
            valB = b[sortConfig.key];
        } else {
            valA = a[sortConfig.key] || 0;
            valB = b[sortConfig.key] || 0;
        }

        if (typeof valA === 'string') {
            return sortConfig.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortConfig.order === 'asc' ? valA - valB : valB - valA;
        }
    });

    monsters.forEach((monster) => {
        const monsterCard = document.createElement('div');
        monsterCard.className = 'monster-card';
        
        const isDeployed = gameState.playerData.selectedMonsterId === monster.id;
        if (isDeployed) {
            monsterCard.classList.add('deployed');
        }

        const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';

        let headInfo = { type: '無', rarity: '普通' }; 
        const constituentIds = monster.constituent_dna_ids || [];
        
        if (constituentIds.length > 0) {
            const headDnaId = constituentIds[0];
            const allDnaTemplates = gameState.gameConfigs?.dna_fragments || [];
            const headDnaTemplate = allDnaTemplates.find(dna => dna.id === headDnaId);

            if (headDnaTemplate) {
                headInfo.type = headDnaTemplate.type || '無';
                headInfo.rarity = headDnaTemplate.rarity || '普通';
            }
        }

        const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
        let avatarHtml = `<div class="monster-card-avatar" style="${imagePath ? `background-image: url('${imagePath}')` : ''}"></div>`;

        const adventureProgress = gameState.playerData?.adventure_progress;
        const isOnExpedition = adventureProgress?.is_active && adventureProgress.expedition_team.some(member => member.monster_id === monster.id);
        const isTraining = monster.farmStatus?.isTraining;
        const isInjured = monster.hp < monster.initial_max_hp * 0.25;

        let statusHtml = '';
        let deployButtonHtml = '';
        let actionsHTML = '';

        if (isDeployed) {
            statusHtml = `<div class="monster-card-status" style="color: white; font-weight: bold;">出戰中</div>`;
            if (isInjured) {
                statusHtml = `<div class="monster-card-status" style="color: var(--danger-color);">瀕死</div>`;
            }
            deployButtonHtml = `<button class="monster-card-deploy-btn deployed" disabled>⚔️</button>`;
            actionsHTML = `
                <button class="button danger text-xs" disabled>放生</button>
                <button class="button action text-xs" onclick="handleHealClick('${monster.id}')">治療</button>
                <button class="button primary text-xs" disabled>修煉</button>
            `;
        } else if (isInjured) {
            statusHtml = `<div class="monster-card-status" style="color: var(--danger-color);">瀕死</div>`;
            deployButtonHtml = `<button class="monster-card-deploy-btn" disabled style="color: var(--text-secondary);">傷</button>`;
            actionsHTML = `
                <button class="button danger text-xs" onclick="handleReleaseMonsterClick(event, '${monster.id}')">放生</button>
                <button class="button action text-xs" onclick="handleHealClick('${monster.id}')">治療</button>
                <button class="button primary text-xs" onclick="handleCultivateMonsterClick(event, '${monster.id}')">修煉</button>
            `;
        } else if (isOnExpedition) {
            statusHtml = `<div class="monster-card-status" style="color: var(--status-expedition); font-weight: bold;">遠征中</div>`;
            deployButtonHtml = `<button class="monster-card-deploy-btn" disabled style="color: var(--text-secondary);">遠</button>`;
            actionsHTML = `
                <button class="button danger text-xs" disabled>放生</button>
                <button class="button action text-xs" onclick="handleHealClick('${monster.id}')" disabled>治療</button>
                <button class="button primary text-xs" disabled>修煉</button>
            `;
        } else if (isTraining) {
            const startTime = monster.farmStatus.trainingStartTime || Date.now();
            const duration = monster.farmStatus.trainingDuration || 3600000;
            statusHtml = `
                <div class="monster-card-status">
                    <div style="color: var(--accent-color);">修煉中</div>
                    <div class="training-timer text-xs" data-start-time="${startTime}" data-duration="${duration}"></div>
                </div>
            `;
            const recallBtnText = (Date.now() - startTime >= duration) ? '領取' : '召回';
            const recallBtnClass = (Date.now() - startTime >= duration) ? 'success' : 'warning';
            actionsHTML = `
                <button class="button danger text-xs" disabled>放生</button>
                <button class="button action text-xs" onclick="handleHealClick('${monster.id}')">治療</button>
                <button class="button ${recallBtnClass} text-xs" onclick="handleEndCultivationClick(event, '${monster.id}', ${startTime}, ${duration})">${recallBtnText}</button>
            `;
            deployButtonHtml = `<button class="monster-card-deploy-btn" disabled style="color: var(--text-secondary);">修</button>`;
        } else {
            statusHtml = `<div class="monster-card-status">閒置中</div>`;
            deployButtonHtml = `<button class="monster-card-deploy-btn" onclick="handleDeployMonsterClick('${monster.id}')">出戰</button>`;
            actionsHTML = `
                <button class="button danger text-xs" onclick="handleReleaseMonsterClick(event, '${monster.id}')">放生</button>
                <button class="button action text-xs" onclick="handleHealClick('${monster.id}')">治療</button>
                <button class="button primary text-xs" onclick="handleCultivateMonsterClick(event, '${monster.id}')">修煉</button>
            `;
        }
        
        // --- 核心修改處 START ---
        monsterCard.innerHTML = `
            <div class="monster-card-name text-rarity-${rarityKey}">${displayName}</div>
            ${avatarHtml}
            ${deployButtonHtml}
            ${statusHtml} 
            <div class="monster-card-actions">
                ${actionsHTML}
            </div>
        `;
        listContainer.appendChild(monsterCard);
        
        // 使用 addEventListener 綁定事件
        const avatarElement = monsterCard.querySelector('.monster-card-avatar');
        if (avatarElement) {
            avatarElement.addEventListener('click', () => {
                showMonsterInfoFromFarm(monster.id);
            });
        }
        // --- 核心修改處 END ---
    });

    const sortBtn = document.getElementById('farm-sort-btn');
    const sortDropdown = document.getElementById('farm-sort-dropdown');

    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('show');
        });

        sortDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('.dropdown-item');
            if (target) {
                const newSortKey = target.dataset.sortKey;
                const currentSortKey = gameState.farmSortConfig.key;
                let newSortOrder = 'desc';

                if (currentSortKey === newSortKey) {
                    newSortOrder = gameState.farmSortConfig.order === 'desc' ? 'asc' : 'desc';
                }

                gameState.farmSortConfig = {
                    key: newSortKey,
                    order: newSortOrder
                };
                
                renderMonsterFarm();
            }
        });

        document.addEventListener('click', (e) => {
            if (!sortBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
                sortDropdown.classList.remove('show');
            }
        });
    }
}
