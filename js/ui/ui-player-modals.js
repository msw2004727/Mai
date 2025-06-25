// js/ui-player-modals.js
//這個檔案將負責處理與玩家、好友、新手指南相關的彈窗內容

function openSendMailModal(friendUid, friendNickname) {
    let attachedDnas = []; 
    const currentGold = gameState.playerData?.playerStats?.gold || 0;

    const mailFormHtml = `
        <div id="send-mail-container" class="send-mail-container">
            <p class="recipient-info">正在寫信給：<strong class="text-[var(--accent-color)]">${friendNickname}</strong></p>
            
            <div class="mail-input-group">
                <label for="mail-title-input">標題</label>
                <input type="text" id="mail-title-input" placeholder="輸入信件標題..." maxlength="30">
            </div>
            
            <div class="mail-input-group">
                <label for="mail-content-input">內容</label>
                <textarea id="mail-content-input" rows="4" placeholder="輸入信件內容..." maxlength="200"></textarea>
            </div>

            <div class="mail-attachment-section">
                <h5 class="attachment-title">🎁 附加禮物 (可選)</h5>
                
                <div class="attachment-grid">
                    <div class="attachment-gold-wrapper">
                        <label for="mail-gold-input">🪙</label>
                        <input type="number" id="mail-gold-input" min="0" max="${currentGold}" placeholder="輸入金額">
                    </div>
                    <div id="mail-fee-display" class="mail-fee-display">
                        <span>手續費 (1%): 0</span>
                        <span>總計: 0</span>
                    </div>

                    <button id="attach-dna-btn" class="button secondary">附加 DNA</button>
                    <button id="attach-item-btn" class="button secondary" disabled>附加物品</button>
                </div>

                <div id="attached-dna-preview" class="attached-dna-preview"></div>
                <p class="text-xs text-[var(--text-secondary)] mt-2">※ 寄送金幣將收取1%手續費，由怪獸保護協會託管，感謝您的愛心。</p>
            </div>
        </div>
    `;

    showConfirmationModal(
        '撰寫信件',
        mailFormHtml,
        async () => {
            const title = document.getElementById('mail-title-input').value.trim();
            const content = document.getElementById('mail-content-input').value.trim();
            const goldInput = document.getElementById('mail-gold-input').value;
            const attachedGold = parseInt(goldInput, 10) || 0;

            if (!title || !content) {
                showFeedbackModal('錯誤', '信件標題和內容不能為空。');
                return;
            }
            if (attachedGold < 0) {
                showFeedbackModal('錯誤', '附加金額不能為負數。');
                return;
            }

            const fee = Math.floor(attachedGold * 0.01);
            const totalCost = attachedGold + fee;

            if (totalCost > currentGold) {
                showFeedbackModal('錯誤', `金額不足！寄送 ${attachedGold.toLocaleString()} 🪙，含手續費 ${fee.toLocaleString()} 🪙，共需 ${totalCost.toLocaleString()} 🪙。`);
                return;
            }

            const payload = {};
            if (attachedGold > 0) payload.gold = attachedGold;
            
            if (attachedDnas.length > 0) {
                payload.items = attachedDnas.map(dna => ({ type: 'dna', data: dna }));
            }

            if (!title && !content && Object.keys(payload).length === 0) {
                 showFeedbackModal('錯誤', '不能發送一封完全空白的信件。');
                return;
            }

            showFeedbackModal('寄送中...', `正在將您的信件送往 ${friendNickname} 的信箱...`, true);
            try {
                const result = await sendMail(friendUid, title, content, payload);
                if (result && result.success) {
                    hideModal('feedback-modal');
                    showFeedbackModal('成功', '信件已成功寄出！');
                    await refreshPlayerData();
                } else {
                    throw new Error(result.error || '未知的錯誤');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('寄送失敗', `無法寄送信件：${error.message}`);
            }
        },
        { confirmButtonClass: 'primary', confirmButtonText: '寄出' }
    );
    
    const goldInputEl = document.getElementById('mail-gold-input');
    const feeDisplayEl = document.getElementById('mail-fee-display');

    if (goldInputEl && feeDisplayEl) {
        goldInputEl.addEventListener('input', () => {
            const amount = parseInt(goldInputEl.value, 10) || 0;
            if (amount > 0) {
                goldInputEl.style.color = 'gold';
            } else {
                goldInputEl.style.color = '';
            }
            const fee = Math.floor(amount * 0.01);
            const total = amount + fee;
            feeDisplayEl.innerHTML = `<span>手續費 (1%): ${fee.toLocaleString()}</span><span>總計: <strong style="color: var(--danger-color);">${total.toLocaleString()}</strong></span>`;
        });
    }

    const attachDnaBtn = document.getElementById('attach-dna-btn');
    const attachedDnaPreview = document.getElementById('attached-dna-preview');

    function renderAttachedDnaPreview() {
        attachedDnaPreview.innerHTML = '';
        if (attachedDnas.length > 0) {
            attachedDnaPreview.style.justifyContent = 'flex-start'; 
            attachedDnas.forEach(dna => {
                const dnaItemDiv = document.createElement('div');
                dnaItemDiv.className = 'dna-item occupied';
                dnaItemDiv.style.cursor = 'pointer';
                dnaItemDiv.title = '點擊以移除附件';
                dnaItemDiv.onclick = () => {
                    attachedDnas = attachedDnas.filter(d => d.id !== dna.id);
                    renderAttachedDnaPreview(); 
                };
                applyDnaItemStyle(dnaItemDiv, dna);
                attachedDnaPreview.appendChild(dnaItemDiv);
            });
        } else {
             attachedDnaPreview.style.justifyContent = 'center'; 
        }
    }

    attachDnaBtn.addEventListener('click', () => {
        const inventory = gameState.playerData.playerOwnedDNA.filter(Boolean); 
        if (inventory.length === 0) {
            showFeedbackModal('提示', '您的庫存中沒有可附加的DNA。');
            return;
        }

        let inventoryHtml = `<p class="text-center text-sm text-[var(--text-secondary)] mb-2">請選擇要附加的DNA (最多 ${5 - attachedDnas.length} 個)</p>`;
        inventoryHtml += '<div class="inventory-grid mail-inventory-selection" style="max-height: 300px; overflow-y: auto;">';
        inventory.forEach(dna => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dna-item occupied mail-attach-dna-item';
            itemDiv.dataset.dnaId = dna.id;
            
            if (attachedDnas.some(d => d.id === dna.id)) {
                itemDiv.classList.add('selected');
            }

            applyDnaItemStyle(itemDiv, dna);
            inventoryHtml += itemDiv.outerHTML;
        });
        inventoryHtml += '</div>';

        showFeedbackModal('選擇要附加的DNA', inventoryHtml, false, null, [{ text: '完成', class: 'primary' }]);

        document.querySelectorAll('.mail-attach-dna-item').forEach(item => {
            item.addEventListener('click', () => {
                const dnaId = item.dataset.dnaId;
                const dnaObject = inventory.find(d => d.id === dnaId);
                const isAlreadyAttached = attachedDnas.some(d => d.id === dnaId);

                if (isAlreadyAttached) {
                    attachedDnas = attachedDnas.filter(d => d.id !== dnaId);
                    item.classList.remove('selected');
                } else {
                    if (attachedDnas.length < 5) {
                        attachedDnas.push(dnaObject);
                        item.classList.add('selected');
                    } else {
                        showFeedbackModal('提示', '最多只能附加 5 個附件。');
                    }
                }
                renderAttachedDnaPreview(); 
            });
        });
    });
}

async function handleSendFriendRequest(recipientId, buttonElement) {
    if (!recipientId || !buttonElement) return;

    buttonElement.disabled = true;
    buttonElement.textContent = '處理中...';

    try {
        const result = await sendFriendRequest(recipientId);
        if (result && result.success) {
            buttonElement.textContent = '已發送';
            showFeedbackModal('成功', '好友請求已成功發送！');
        } else {
            throw new Error(result.error || '未知的錯誤');
        }
    } catch (error) {
        showFeedbackModal('發送失敗', `無法發送好友請求：${error.message}`);
        buttonElement.disabled = false;
        buttonElement.textContent = '發送請求';
    }
}

async function handleAddFriend(friendUid, friendNickname) {
    if (!friendUid || !friendNickname) {
        console.error("handleAddFriend: 無效的參數。");
        return;
    }

    if (friendUid === gameState.playerId) {
        showFeedbackModal('操作無效', '您不能將自己加為好友。');
        return;
    }

    if (!gameState.playerData.friends) {
        gameState.playerData.friends = [];
    }

    if (gameState.playerData.friends.some(f => f.uid === friendUid)) {
        showFeedbackModal('提示', `「${friendNickname}」已經是您的好友了。`);
        return;
    }

    gameState.playerData.friends.push({
        uid: friendUid,
        nickname: friendNickname
    });

    if (typeof renderFriendsList === 'function') {
        renderFriendsList();
    }
    const searchResultsContainer = DOMElements.friendsSearchResultsArea;
    if (searchResultsContainer) {
        const button = searchResultsContainer.querySelector(`button[onclick*="'${friendUid}'"]`);
        if (button) {
            button.textContent = '已加入';
            button.disabled = true;
        }
    }

    try {
        await savePlayerData(gameState.playerId, gameState.playerData);
        showFeedbackModal('成功', `已成功將「${friendNickname}」加入您的好友列表！`);
    } catch (error) {
        gameState.playerData.friends = gameState.playerData.friends.filter(f => f.uid !== friendUid);
        if(typeof renderFriendsList === 'function') renderFriendsList();
        if (searchResultsContainer) {
           const button = searchResultsContainer.querySelector(`button[onclick*="'${friendUid}'"]`);
            if (button) {
                button.textContent = '發送請求';
                button.disabled = false;
            }
        }
        showFeedbackModal('錯誤', `新增好友失敗：${error.message}`);
        console.error("新增好友後儲存玩家資料失敗:", error);
    }
}

async function handleRemoveFriendClick(friendId, friendNickname) {
    if (!friendId || !friendNickname) return;

    showConfirmationModal(
        '確認移除好友',
        `您確定要從好友列表中移除「${friendNickname}」嗎？`,
        async () => {
            showFeedbackModal('處理中...', `正在移除好友 ${friendNickname}...`, true);
            try {
                const result = await removeFriend(friendId);
                if (result && result.success) {
                    await refreshPlayerData(); 
                    if(typeof renderFriendsList === 'function') {
                        renderFriendsList();
                    }
                    hideModal('feedback-modal');
                    showFeedbackModal('成功', `已成功移除好友「${friendNickname}」。`);
                } else {
                    throw new Error(result.error || '未知的錯誤');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('移除失敗', `無法移除好友：${error.message}`);
            }
        },
        { confirmButtonClass: 'danger', confirmButtonText: '確定移除' }
    );
}

function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        if (body) body.innerHTML = '<p>無法載入玩家資訊。</p>';
        return;
    }
    const stats = playerData.playerStats;
    const nickname = playerData.nickname || stats.nickname || "未知玩家";

    let titlesHtml = '<p>尚無稱號</p>';
    const ownedTitles = stats.titles || [];
    const equippedTitleId = stats.equipped_title_id || (ownedTitles.length > 0 ? ownedTitles[0].id : null);
    
    const isOwnProfile = (playerData.uid && playerData.uid === gameState.playerId) || (!playerData.uid && nickname === gameState.playerNickname);

    if (ownedTitles.length > 0) {
        const allTitlesConfig = gameConfigs.titles || []; 
        
        titlesHtml = ownedTitles.map(ownedTitle => {
            const titleDetails = allTitlesConfig.find(t => t.id === ownedTitle.id);

            if (!titleDetails) {
                return `
                    <div class="title-entry" style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                        <p style="color: var(--danger-color);">未知稱號 (ID: ${ownedTitle.id || 'N/A'})</p>
                    </div>
                `;
            }

            const isEquipped = titleDetails.id === equippedTitleId;
            
            let buttonHtml = ''; 
            if (isOwnProfile) {
                buttonHtml = isEquipped
                    ? `<span class="button success text-xs py-1 px-2" style="cursor: default; min-width: 80px; text-align: center;">✔️ 已裝備</span>`
                    : `<button class="button primary text-xs py-1 px-2 equip-title-btn" data-title-id="${titleDetails.id}" style="min-width: 80px;">裝備</button>`;
            } else {
                if (isEquipped) {
                    buttonHtml = `<span class="button success text-xs py-1 px-2" style="cursor: default; min-width: 80px; text-align: center;">✔️ 已裝備</span>`;
                }
            }


            let buffsHtml = '';
            if (titleDetails.buffs && Object.keys(titleDetails.buffs).length > 0) {
                const statDisplayName = {
                    hp: 'HP', mp: 'MP', attack: '攻擊', defense: '防禦', speed: '速度', crit: '爆擊率', evasion: '閃避率',
                    cultivation_item_find_chance: '修煉物品發現率', cultivation_exp_gain: '修煉經驗提升',
                    cultivation_time_reduction: '修煉時間縮短', score_gain_boost: '積分獲取提升',
                    elemental_damage_boost: '元素傷害提升', poison_damage_boost: '毒系傷害提升',
                    leech_skill_effect: '生命吸取效果', mp_regen_per_turn: 'MP每回合恢復',
                    dna_return_rate_on_disassemble: '分解DNA返還率', fire_resistance: '火系抗性',
                    water_resistance: '水系抗性', wood_resistance: '木系抗性', gold_resistance: '金系抗性',
                    earth_resistance: '土系抗性', light_resistance: '光系抗性', dark_resistance: '暗系抗性'
                };
                buffsHtml = '<div class="title-buffs" style="font-size: 0.85em; color: var(--success-color); margin-top: 5px;">效果：';
                buffsHtml += Object.entries(titleDetails.buffs).map(([stat, value]) => {
                    const name = statDisplayName[stat] || stat;
                    const displayValue = (value > 0 && value < 1) ? `+${value * 100}%` : `+${value}`;
                    return `${name} ${displayValue}`;
                }).join('，');
                buffsHtml += '</div>';
            }

            return `
                <div class="title-entry" style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${isEquipped ? 'gold' : 'var(--text-primary)'};">${titleDetails.name}</span>
                        ${buttonHtml}
                    </div>
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin: 0;">${titleDetails.description || ''}</p>
                    ${buffsHtml}
                </div>
            `;
        }).join('');
    }

    let achievementsHtml = '<p>尚無成就</p>';
    if (stats.achievements && stats.achievements.length > 0) {
        achievementsHtml = `<ul class="list-disc list-inside ml-1 text-sm">${stats.achievements.map(ach => `<li>${ach}</li>`).join('')}</ul>`;
    }
    
    const medalsHtml = stats.medals > 0 ? `${'🥇'.repeat(Math.min(stats.medals, 5))} (${stats.medals})` : '無';

    body.innerHTML = `
        <div class="text-center mb-4">
            <h4 class="text-2xl font-bold text-[var(--accent-color)]">${nickname}</h4>
        </div>
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基本統計</h5>
                <div class="details-item"><span class="details-label">等級/排名:</span> <span class="details-value">${stats.rank || 'N/A'}</span></div>
                <div class="details-item"><span class="details-label">總勝場:</span> <span class="details-value text-[var(--success-color)]">${stats.wins || 0}</span></div>
                <div class="details-item"><span class="details-label">總敗場:</span> <span class="details-value text-[var(--danger-color)]">${stats.losses || 0}</span></div>
                <div class="details-item"><span class="details-label">總積分:</span> <span class="details-value">${stats.score || 0}</span></div>
            </div>
            <div class="details-section">
                <h5 class="details-section-title">榮譽與稱號</h5>
                <div class="mb-2">
                    <div id="player-titles-list">${titlesHtml}</div>
                </div>
                <div class="mb-2">
                    <span class="details-label block mb-1">勳章:</span>
                    <span class="details-value medal-emoji">${medalsHtml}</span>
                </div>
                 <div>
                    <span class="details-label block mb-1">已達成成就:</span>
                    ${achievementsHtml}
                </div>
            </div>
        </div>
        <div id="player-monsters-section" class="details-section mt-3">
             <h5 class="details-section-title">持有怪獸 (共 ${playerData.farmedMonsters.length || 0} 隻)</h5>
             <div id="player-monsters-table-container"></div>
        </div>
        <p class="creation-time-centered mt-3">上次存檔時間: ${new Date(playerData.lastSave * 1000).toLocaleString()}</p>
    `;
    
    const monsters = playerData.farmedMonsters || [];
    const container = body.querySelector('#player-monsters-table-container');
    
    if (monsters.length > 0) {
        let sortConfig = { key: 'score', order: 'desc' }; 

        const renderPlayerMonstersTable = () => {
            monsters.sort((a, b) => {
                let valA, valB;
                if (sortConfig.key === 'win_rate') {
                    const resumeA = a.resume || { wins: 0, losses: 0 };
                    const totalA = resumeA.wins + resumeA.losses;
                    valA = totalA > 0 ? resumeA.wins / totalA : 0;
                    
                    const resumeB = b.resume || { wins: 0, losses: 0 };
                    const totalB = resumeB.wins + resumeB.losses;
                    valB = totalB > 0 ? resumeB.wins / totalB : 0;
                } else {
                    valA = a[sortConfig.key] || 0;
                    valB = b[sortConfig.key] || 0;
                }

                if (typeof valA === 'string') {
                    return sortConfig.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return sortConfig.order === 'asc' ? valA - valB : valB - valA;
            });

            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const monsterRowsHtml = monsters.map(m => {
                 const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
                 const resume = m.resume || { wins: 0, losses: 0 };
                 const totalGames = resume.wins + resume.losses;
                 const winRate = totalGames > 0 ? ((resume.wins / totalGames) * 100).toFixed(1) + '%' : 'N/A';
                 
                 const playerTitle = m.player_title_part;
                 const monsterAchievement = m.achievement_part;
                 const elementNickname = getMonsterDisplayName(m, gameState.gameConfigs);

                 let nameHtml;
                 if (playerTitle && monsterAchievement && elementNickname) {
                     nameHtml = `
                        <div style="display: flex; align-items: baseline; gap: 0.5em; white-space: nowrap;">
                            <span style="color: var(--rarity-legendary-text);">${playerTitle}</span>
                            <span style="color: var(--text-primary);">${monsterAchievement}</span>
                            <span class="text-rarity-${rarityKey}">${elementNickname}</span>
                        </div>
                     `;
                 } else {
                     nameHtml = `<span class="text-rarity-${rarityKey}">${m.nickname || '名稱錯誤'}</span>`;
                 }

                 return `
                    <div class="player-monster-row">
                        <div class="monster-name-cell">
                            <a href="#" class="player-info-monster-link" data-monster-id="${m.id}" data-owner-uid="${playerData.uid}" style="text-decoration: none;">
                                ${nameHtml}
                            </a>
                        </div>
                        <div class="monster-score-cell">${m.score || 0}</div>
                        <div class="monster-winrate-cell">${winRate}</div>
                    </div>
                 `;
            }).join('');
            
            container.innerHTML = `
                <div class="player-monsters-table">
                    <div class="player-monsters-header">
                        <div class="sortable-header" data-sort-key="nickname">怪獸</div>
                        <div class="sortable-header" data-sort-key="score">評價</div>
                        <div class="sortable-header" data-sort-key="win_rate">勝率</div>
                    </div>
                    <div class="player-monsters-body">
                        ${monsterRowsHtml}
                    </div>
                </div>
            `;
            
            container.querySelectorAll('.sortable-header').forEach(header => {
                header.classList.remove('asc', 'desc');
                if (header.dataset.sortKey === sortConfig.key) {
                    header.classList.add(sortConfig.order);
                }
            });
        };
        
        renderPlayerMonstersTable();

        container.addEventListener('click', (e) => {
            const header = e.target.closest('.sortable-header');
            if (!header) return;

            const newKey = header.dataset.sortKey;
            if (sortConfig.key === newKey) {
                sortConfig.order = sortConfig.order === 'desc' ? 'asc' : 'desc';
            } else {
                sortConfig.key = newKey;
                sortConfig.order = 'desc'; 
            }
            renderPlayerMonstersTable();
        });
    } else {
        container.innerHTML = '<p>尚無怪獸</p>';
    }
}


async function viewPlayerInfo(playerId) {
    if (!playerId) return;

    showFeedbackModal('載入中...', `正在獲取玩家資訊...`, true);

    try {
        const playerData = await getPlayerData(playerId);
        if (playerData) {
            playerData.uid = playerId;
            updateGameState({ viewedPlayerData: playerData });
            updatePlayerInfoModal(playerData, gameState.gameConfigs);
            hideModal('feedback-modal');
            showModal('player-info-modal');
        } else {
            throw new Error('找不到該玩家的資料。');
        }
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('錯誤', `無法載入玩家資訊：${error.message}`);
    }
}

function updateNewbieGuideModal(guideEntries, searchTerm = '') {
    const container = DOMElements.newbieGuideContentArea;
    if (!container) return;
    container.innerHTML = '';

    const filteredEntries = guideEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)]">找不到符合 "${searchTerm}" 的指南內容。</p>`;
        return;
    }

    filteredEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('mb-4', 'pb-3', 'border-b', 'border-[var(--border-color)]');
        entryDiv.innerHTML = `
            <h5 class="text-lg font-semibold text-[var(--accent-color)] mb-1">${entry.title}</h5>
            <p class="text-sm leading-relaxed">${entry.content.replace(/\n/g, '<br>')}</p>
        `;
        container.appendChild(entryDiv);
    });
}

function updateFriendsSearchResults(players) {
    const container = DOMElements.friendsSearchResultsArea;
    if (!container) return;

    if (!players || players.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-2">找不到符合條件的玩家。</p>`;
        return;
    }

    container.innerHTML = players.map(player => {
        const isFriend = gameState.playerData.friends?.some(f => f.uid === player.uid);
        const isSelf = player.uid === gameState.playerId;
        let buttonHtml;

        if (isSelf) {
            buttonHtml = `<button class="button secondary text-xs" disabled>這是您</button>`;
        } else if (isFriend) {
            buttonHtml = `<button class="button secondary text-xs" disabled>已是好友</button>`;
        } else {
            buttonHtml = `<button class="button primary text-xs send-friend-request-btn" data-recipient-id="${player.uid}" data-recipient-nickname="${player.nickname}">發送請求</button>`;
        }

        return `
            <div class="friend-item">
                <span class="friend-name">${player.nickname}</span>
                <div class="friend-actions">
                    <button class="button secondary text-xs" onclick="viewPlayerInfo('${player.uid}')">查看資訊</button>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join('');
}

async function renderFriendsList() {
    const container = DOMElements.friendsListDisplayArea;
    if (!container) return;

    const friends = gameState.playerData?.friends || [];

    if (friends.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4">好友列表空空如也，快去搜尋並新增好友吧！</p>`;
        return;
    }

    const friendIds = friends.map(f => f.uid);
    let friendStatuses = {};
    try {
        const response = await getFriendsStatuses(friendIds);
        if (response.success) {
            friendStatuses = response.statuses;
        }
    } catch (error) {
        console.error("無法獲取好友狀態:", error);
    }
    
    container.innerHTML = `
        <div class="friends-list-grid">
            ${friends.map(friend => {
                const displayName = friend.nickname;
                
                const lastSeen = friendStatuses[friend.uid];
                const nowInSeconds = Date.now() / 1000;
                const isOnline = lastSeen && (nowInSeconds - lastSeen < 300); 

                return `
                <div class="friend-item-card">
                    <div class="friend-info">
                        <span class="online-status ${isOnline ? 'online' : 'offline'}"></span>
                        <a href="#" class="friend-name-link" data-friend-uid="${friend.uid}">
                            ${displayName}
                        </a>
                    </div>
                    <div class="friend-actions">
                        <button class="button secondary text-xs send-mail-btn" title="寄信" data-friend-uid="${friend.uid}" data-friend-nickname="${displayName}">✉️</button>
                        <button class="button secondary text-xs remove-friend-btn" title="移除好友" data-friend-uid="${friend.uid}" data-friend-nickname="${displayName}">❌</button>
                    </div>
                </div>
            `
            }).join('')}
        </div>
    `;
}

function initializePlayerModalEventHandlers() {
    const friendsListContainer = document.getElementById('friends-list-display-area');
    if (friendsListContainer) {
        friendsListContainer.addEventListener('click', (event) => {
            const target = event.target;
            const friendCard = target.closest('.friend-item-card');

            if (!friendCard) return;

            const nameLink = target.closest('.friend-name-link');
            const sendBtn = target.closest('.send-mail-btn');
            const removeBtn = target.closest('.remove-friend-btn');

            if (nameLink) {
                event.preventDefault();
                viewPlayerInfo(nameLink.dataset.friendUid);
            } else if (sendBtn) {
                openSendMailModal(sendBtn.dataset.friendUid, sendBtn.dataset.friendNickname);
            } else if (removeBtn) {
                handleRemoveFriendClick(removeBtn.dataset.friendUid, removeBtn.dataset.friendNickname);
            }
        });
    }

    const searchResultsContainer = document.getElementById('friends-search-results-area');
    if (searchResultsContainer) {
        searchResultsContainer.addEventListener('click', (event) => {
            const requestBtn = event.target.closest('.send-friend-request-btn');
            if (requestBtn) {
                handleSendFriendRequest(requestBtn.dataset.recipientId, requestBtn);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initializePlayerModalEventHandlers);
