// js/ui/ui-battle-modals.js
//這個檔案將負責處理與怪獸自身相關的彈窗，如詳細資訊、戰鬥日誌、養成結果等

function showBattleLogModal(battleResult, playerMonsterData, opponentMonsterData, customFooterActions = null) {
    if (!DOMElements.battleLogArea || !DOMElements.battleLogModal) {
        console.error("Battle log modal elements not found in DOMElements.");
        return;
    }

    DOMElements.battleLogArea.innerHTML = ''; 

    const battleReportContent = battleResult.ai_battle_report_content;

    if (!battleReportContent) {
        DOMElements.battleLogArea.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">戰報資料結構錯誤，無法顯示。</p>';
        showModal('battle-log-modal');
        return;
    }
    
    if (!playerMonsterData || !opponentMonsterData) {
        DOMElements.battleLogArea.innerHTML = '<p>遺失戰鬥怪獸資料，無法呈現戰報。</p>';
        showModal('battle-log-modal');
        return;
    }

    // --- 核心修改處 START ---
    // 移除此處多餘的變數宣告，將在需要時直接呼叫共用函式
    // const playerDisplayName = getMonsterDisplayName(playerMonsterData, gameState.gameConfigs);
    // const opponentDisplayName = getMonsterDisplayName(opponentMonsterData, gameState.gameConfigs);
    // --- 核心修改處 END ---

    function formatBasicText(text) {
        if (!text) return '';
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    
    const rarityColors = {
        '普通': 'var(--rarity-common-text)', '稀有': 'var(--rarity-rare-text)',
        '菁英': 'var(--rarity-elite-text)', '傳奇': 'var(--rarity-legendary-text)',
        '神話': 'var(--rarity-mythical-text)'
    };

    function applyDynamicStylingToBattleReport(text, playerMon, opponentMon) {
        if (!text) return '(內容為空)';
        let styledText = text;

        // --- 核心修改處 START ---
        // 移除舊的、重複的 replaceName 函式與其呼叫
        
        // 使用新的、統一的邏輯
        if (playerMon && playerMon.nickname) {
            const playerStyledName = getMonsterDisplayName(playerMon, gameState.gameConfigs);
            const searchRegex = new RegExp(playerMon.nickname.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
            styledText = styledText.replace(searchRegex, playerStyledName);
        }
        if (opponentMon && opponentMon.nickname) {
            const opponentStyledName = getMonsterDisplayName(opponentMon, gameState.gameConfigs);
            const searchRegex = new RegExp(opponentMon.nickname.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
            styledText = styledText.replace(searchRegex, opponentStyledName);
        }
        // --- 核心修改處 END ---
        
        const allSkills = [];
        if (playerMon && playerMon.skills) allSkills.push(...playerMon.skills);
        if (opponentMon && opponentMon.skills) allSkills.push(...opponentMon.skills);
        const uniqueSkillNames = new Set(allSkills.map(s => s.name));
        
        uniqueSkillNames.forEach(skillName => {
            const skillInfo = allSkills.find(s => s.name === skillName);
            if (skillInfo) {
                const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
                const skillRarityKey = skillInfo.rarity ? (rarityMap[skillInfo.rarity] || 'common') : 'common';
                const skillColorClass = `text-rarity-${skillRarityKey}`;
                
                const skillLevel = skillInfo.level || 1;
                const levelTag = `<span class="text-xs opacity-75 mr-1">Lv${skillLevel}</span>`;
                
                const regex = new RegExp(`(?![^<]*>)(?<!<a[^>]*?>)(?<!<span[^>]*?>|<strong>)\\*\\*(${skillName})\\*\\*(?!<\\/a>|<\\/span>|<\\/strong>)`, 'g');
                const replacement = `<a href="#" class="skill-name-link ${skillColorClass}" data-skill-name="${skillName}" style="text-decoration: none;">${levelTag}<strong>$1</strong></a>`;
                
                styledText = styledText.replace(regex, replacement);
            }
        });

        styledText = styledText.replace(/<damage>(.*?)<\/damage>/g, '<span class="battle-damage-value">-$1</span>');
        styledText = styledText.replace(/<heal>(.*?)<\/heal>/g, '<span class="battle-heal-value">+$1</span>');

        return styledText;
    }

    const reportContainer = document.createElement('div');
    reportContainer.classList.add('battle-report-container');

    const battleHeaderBanner = document.createElement('div');
    battleHeaderBanner.classList.add('battle-header-banner');
    const bannerUrl = gameState.assetPaths?.images?.modals?.battleLogHeader || '';
    battleHeaderBanner.innerHTML = `<img src="${bannerUrl}" alt="戰鬥記錄橫幅">`;
    const modalContent = DOMElements.battleLogModal.querySelector('.modal-content');
    if (modalContent) {
        const existingBanner = modalContent.querySelector('.battle-header-banner');
        if (existingBanner) existingBanner.remove();
        modalContent.insertBefore(battleHeaderBanner, modalContent.firstChild);
    }

    const renderMonsterStats = (monster, isPlayer) => {
        if (!monster) return '<div>對手資料錯誤</div>';
        
        // --- 核心修改處 START ---
        // 在函式內部直接呼叫共用函式，確保每次都拿到正確的HTML
        const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
        // --- 核心修改處 END ---

        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        const personalityName = monster.personality?.name?.replace('的', '') || '未知';
        const winRate = monster.resume && (monster.resume.wins + monster.resume.losses > 0)
            ? ((monster.resume.wins / (monster.resume.wins + monster.resume.losses)) * 100).toFixed(1)
            : 'N/A';
        const prefix = isPlayer ? '⚔️ ' : '🛡️ ';
        
        const nicknameSpan = `<div class="monster-name-container"><span class="monster-name">${prefix}${displayName}</span></div>`;

        return `
            <div class="monster-stats-card text-rarity-${rarityKey}">
                ${nicknameSpan}
                <p class="monster-personality">個性: ${personalityName}</p>
                <div class="stats-grid">
                    <span>HP: ${monster.initial_max_hp}</span>
                    <span>攻擊: ${monster.attack}</span>
                    <span>防禦: ${monster.defense}</span>
                    <span>速度: ${monster.speed}</span>
                    <span>爆擊: ${monster.crit}%</span>
                    <span>勝率: ${winRate}%</span>
                </div>
            </div>
        `;
    };

    reportContainer.innerHTML += `
        <div class="report-section battle-intro-section">
            <h4 class="report-section-title">戰鬥對陣</h4>
            <div class="monster-vs-container">
                <div class="player-side-card">${renderMonsterStats(playerMonsterData, true)}</div>
                <div class="opponent-side-card">${renderMonsterStats(opponentMonsterData, false)}</div>
            </div>
        </div>
    `;

    const battleDescriptionContentDiv = document.createElement('div');
    battleDescriptionContentDiv.classList.add('battle-description-content');

    const createStatusBar = (label, value, max, color) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        return `
            <div class="status-bar-container">
                <span class="status-bar-label">${label}</span>
                <div class="status-bar-background">
                    <div class="status-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
                <span class="status-bar-value">${value} / ${max}</span>
            </div>
        `;
    };
    
    const rawLog = battleResult.raw_full_log || [];
    const battleTurns = [];
    let currentTurn = null;

    rawLog.forEach(line => {
        if (line.startsWith('--- 回合')) {
            if (currentTurn) battleTurns.push(currentTurn);
            currentTurn = { header: line, playerStatus: {}, opponentStatus: {}, actions: [] };
        } else if (line.startsWith('PlayerHP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.playerStatus.hp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('PlayerMP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.playerStatus.mp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('OpponentHP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.opponentStatus.hp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('OpponentMP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.opponentStatus.mp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('PlayerStatus:')) {
            if (currentTurn) currentTurn.playerStatus.statusText = line.substring('PlayerStatus:'.length).trim();
        } else if (line.startsWith('OpponentStatus:')) {
            if (currentTurn) currentTurn.opponentStatus.statusText = line.substring('OpponentStatus:'.length).trim();
        } else if (line.startsWith('- ')) {
            if (currentTurn) currentTurn.actions.push(line.substring(2));
        } else if (!line.startsWith('--- 戰鬥結束 ---') && !line.startsWith('PlayerName:') && !line.startsWith('OpponentName:')) {
            if (currentTurn) currentTurn.actions.push(line);
        }
    });
    if (currentTurn) battleTurns.push(currentTurn);

    const createStatusTagsHTML = (statusText) => {
        if (!statusText || statusText === '良好') {
            return `<span class="monster-status-tag" style="color: var(--success-color); border: 1px solid var(--success-color);">良好</span>`;
        }
        const statuses = statusText.split(',');
        return statuses.map(status => {
            let statusColor = 'var(--danger-color)';
            switch(status.trim()) {
                case '中毒': case '強力中毒': statusColor = 'var(--element-poison-text)'; break;
                case '燒傷': statusColor = 'var(--element-fire-text)'; break;
                case '麻痺': statusColor = 'var(--rarity-legendary-text)'; break;
                case '冰凍': statusColor = 'var(--element-water-text)'; break;
                case '混亂': statusColor = 'var(--element-mix-text)'; break;
            }
            return `<span class="monster-status-tag" style="color: ${statusColor}; border: 1px solid ${statusColor};">${status}</span>`;
        }).join(' ');
    };


    battleTurns.forEach(turn => {
        const turnHeaderDiv = document.createElement('div');
        turnHeaderDiv.className = 'turn-divider-line';
        turnHeaderDiv.textContent = turn.header;
        battleDescriptionContentDiv.appendChild(turnHeaderDiv);

        const statusBlockDiv = document.createElement('div');
        statusBlockDiv.className = 'turn-status-block';

        let statusHtml = '';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const playerRarityKey = playerMonsterData.rarity ? (rarityMap[playerMonsterData.rarity] || 'common') : 'common';
        const opponentRarityKey = opponentMonsterData.rarity ? (rarityMap[opponentMonsterData.rarity] || 'common') : 'common';
        
        // --- 核心修改處 START ---
        // 呼叫共用函式來獲取顯示名稱
        const playerDisplayNameForTurn = getMonsterDisplayName(playerMonsterData, gameState.gameConfigs);
        const opponentDisplayNameForTurn = getMonsterDisplayName(opponentMonsterData, gameState.gameConfigs);
        // --- 核心修改處 END ---

        if (turn.playerStatus.hp && turn.playerStatus.mp) {
            const playerStatusTags = createStatusTagsHTML(turn.playerStatus.statusText);
            statusHtml += `
                <div class="font-bold text-rarity-${playerRarityKey} monster-name-container">
                    <span>⚔️ ${playerDisplayNameForTurn}</span>
                    <div class="status-tags-wrapper">${playerStatusTags}</div>
                </div>
                ${createStatusBar('HP', turn.playerStatus.hp.current, turn.playerStatus.hp.max, 'var(--success-color)')}
                ${createStatusBar('MP', turn.playerStatus.mp.current, turn.playerStatus.mp.max, 'var(--accent-color)')}
            `;
        }
        if (turn.opponentStatus.hp && turn.opponentStatus.mp) {
            const opponentStatusTags = createStatusTagsHTML(turn.opponentStatus.statusText);
            statusHtml += `
                <div class="font-bold mt-2 text-rarity-${opponentRarityKey} monster-name-container">
                    <span>🛡️ ${opponentDisplayNameForTurn}</span>
                    <div class="status-tags-wrapper">${opponentStatusTags}</div>
                </div>
                ${createStatusBar('HP', turn.opponentStatus.hp.current, turn.opponentStatus.hp.max, 'var(--success-color)')}
                ${createStatusBar('MP', turn.opponentStatus.mp.current, turn.opponentStatus.mp.max, 'var(--accent-color)')}
             `;
        }
        statusBlockDiv.innerHTML = statusHtml;
        battleDescriptionContentDiv.appendChild(statusBlockDiv);

        turn.actions.forEach(action => {
            const p = document.createElement('p');
            p.innerHTML = applyDynamicStylingToBattleReport(action, playerMonsterData, opponentMonsterData);
            battleDescriptionContentDiv.appendChild(p);
        });
    });

    const descriptionSection = document.createElement('div');
    descriptionSection.className = 'report-section battle-description-section';
    descriptionSection.innerHTML = `<h4 class="report-section-title">精彩交戰</h4>`;
    descriptionSection.appendChild(battleDescriptionContentDiv);
    reportContainer.appendChild(descriptionSection);
    
    let resultBannerHtml = '';
    if (battleResult.winner_id === playerMonsterData.id) {
        resultBannerHtml = `<h1 class="battle-result-win">勝</h1>`;
    } else if (battleResult.winner_id === '平手') {
        resultBannerHtml = `<h1 class="battle-result-draw">合</h1>`;
    } else {
        resultBannerHtml = `<h1 class="battle-result-loss">敗</h1>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-result-banner">
            ${resultBannerHtml}
        </div>
        <div class="report-section battle-summary-section">
            <h4 class="report-section-title">戰報總結</h4>
            <p class="battle-summary-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.battle_summary, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    const highlights = battleResult.battle_highlights || [];
    if (highlights.length > 0) {
        let highlightsHtml = highlights.map((item, index) => 
            `<li class="highlight-item" ${index >= 3 ? 'style="display:none;"' : ''}>${item}</li>`
        ).join('');
        
        let showMoreBtnHtml = '';
        if (highlights.length > 3) {
            showMoreBtnHtml = `<button id="toggle-highlights-btn" class="button secondary text-xs w-full mt-2">顯示更多...</button>`;
        }

        reportContainer.innerHTML += `
            <div class="report-section battle-highlights-section">
                <h4 class="report-section-title">戰鬥亮點</h4>
                <ul id="battle-highlights-list">${highlightsHtml}</ul>
                ${showMoreBtnHtml}
            </div>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-outcome-section">
            <h4 class="report-section-title">戰鬥結果細項</h4>
            <p class="loot-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.loot_info, playerMonsterData, opponentMonsterData))}</p>
            <p class="growth-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.growth_info, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    DOMElements.battleLogArea.appendChild(reportContainer);

    const toggleBtn = DOMElements.battleLogArea.querySelector('#toggle-highlights-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const list = DOMElements.battleLogArea.querySelector('#battle-highlights-list');
            const isExpanded = toggleBtn.textContent === '收合列表';
            list.querySelectorAll('.highlight-item').forEach((item, index) => {
                if (index >= 3) {
                    item.style.display = isExpanded ? 'none' : 'list-item';
                }
            });
            toggleBtn.textContent = isExpanded ? `顯示更多...` : '收合列表';
        });
    }

    const footer = DOMElements.battleLogModal.querySelector('.modal-footer');
    if (footer) {
        footer.innerHTML = ''; 
        if (customFooterActions && customFooterActions.length > 0) {
            customFooterActions.forEach(btnConfig => {
                const button = document.createElement('button');
                button.textContent = btnConfig.text;
                button.className = `button ${btnConfig.class || 'secondary'}`;
                button.onclick = () => {
                    hideModal('battle-log-modal'); 
                    if (btnConfig.onClick) btnConfig.onClick();
                };
                footer.appendChild(button);
            });
        } else {
            const defaultButton = document.createElement('button');
            defaultButton.id = 'close-battle-log-btn';
            defaultButton.className = 'button secondary';
            defaultButton.textContent = '關閉';
            defaultButton.onclick = () => {
                hideModal('battle-log-modal');
                refreshPlayerData();
            };
            footer.appendChild(defaultButton);
        }
    }

    DOMElements.battleLogArea.scrollTop = 0;
    showModal('battle-log-modal');
}
