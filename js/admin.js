let currentEditIndex = -1;
let currentRecordEditIndex = -1;
let currentVocabularyEditId = null;
let currentVocabularyId = null; // 当前选中的词库ID
let mergeSourceVocabularyId = null; // 合并操作的源词库ID
let lastCheckedWordIndex = -1; // 单词批量选择的最后索引（支持Shift选择）

/**
 * 安全地将字符串中的特殊HTML字符进行转义，防止XSS。
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
    return str.replace(/[&<>"'`]/g, function (char) {
        const escapeChars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#96;',
        };
        return escapeChars[char] || char;
    });
}

/**
 * 创建确认提示框的工具函数
 * @param {string} message - 要显示的确认消息
 * @param {Function} onConfirm - 用户点击确认时执行的回调函数
 */
const createConfirmTip = (message, onConfirm) => {
    // 移除已存在的提示框，确保同时只有一个提示框
    const existingTip = document.querySelector('.confirm-tip');
    if (existingTip) {
        existingTip.remove();
    }

    // 创建提示框DOM元素
    const tip = document.createElement('div');
    tip.className = 'confirm-tip';
    tip.innerHTML = `
        <p>${message}</p>
        <div class="confirm-tip-buttons">
            <button class="confirm-tip-cancel">取消</button>
            <button class="confirm-tip-confirm">确认</button>
        </div>
    `;

    // 将提示框添加到页面
    document.body.appendChild(tip);

    // 获取按钮元素
    const confirmBtn = tip.querySelector('.confirm-tip-confirm');
    const cancelBtn = tip.querySelector('.confirm-tip-cancel');

    // 移除提示框的统一方法
    const removeTip = () => {
        tip.remove();
        document.removeEventListener('click', handleOutsideClick, true);
    };

    // 处理点击提示框外部区域关闭提示框
    const handleOutsideClick = (event) => {
        if (!tip.contains(event.target)) {
            removeTip();
        }
    };

    // 绑定确认按钮事件
    confirmBtn.onclick = () => {
        onConfirm();
        removeTip();
    };

    // 绑定取消按钮事件
    cancelBtn.onclick = removeTip;

    // 延迟添加外部点击监听器，确保创建提示的点击事件不会立即触发关闭
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick, true);
    }, 0);

    return tip;
};


// 模式管理
const getSupportedModes = () => {
    return JSON.parse(localStorage.getItem('supportedModes') || '[]');
}

const getActiveModes = () => {
    return getSupportedModes().filter(mode => mode.active);
}

const getModeById = (modeId) => {
    return getSupportedModes().find(mode => mode.id === modeId) || null;
}

const generateModeSelectorsHTML = (elementId, includeAll = true, defaultToFirst = false) => {
    const activeModes = getActiveModes();
    const select = document.getElementById(elementId);
    if (!select) return;

    const currentValue = select.value;
    let options = includeAll ? `<option value="all">所有模式</option>` : '';
    activeModes.forEach(mode => {
        options += `<option value="${mode.id}">${mode.name}</option>`;
    });
    select.innerHTML = options;

    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    } else if (defaultToFirst && activeModes.length > 0) {
        select.value = activeModes[0].id;
    } else if (includeAll) {
        select.value = 'all';
    }
}

// 数据加载
const loadData = () => {
    return {
        wordBank: JSON.parse(localStorage.getItem('wordBank') || '[]'),
        practiceRecords: JSON.parse(localStorage.getItem('practiceRecords') || '[]')
    };
}

// 带滑动面板的分段式标签页
let currentTab = 'words';
const setupTabs = () => {
    const group = document.querySelector('.segmented-tabs');
    const indicator = group?.querySelector('.seg-indicator');
    const labels = Array.from(group?.querySelectorAll('label') || []);
    const panels = document.getElementById('tabPanels');

    const moveIndicator = (tab) => {
        const label = labels.find(l => l.dataset.tab === tab);
        if (!label || !indicator) return;
        const rect = label.getBoundingClientRect();
        const parentRect = group.getBoundingClientRect();
        indicator.style.width = `${rect.width}px`;
        const offset = rect.left - parentRect.left;
        indicator.style.transform = `translateX(${offset}px)`;
    };

    const updateAria = (tab) => {
        labels.forEach(l => l.setAttribute('aria-selected', l.dataset.tab === tab ? 'true' : 'false'));
    };

    labels.forEach(l => {
        l.addEventListener('click', () => showTab(l.dataset.tab));
        l.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showTab(l.dataset.tab);
            }
        });
    });

    const onResize = () => moveIndicator(currentTab);
    window.addEventListener('resize', onResize);

    // 初始位置
    requestAnimationFrame(() => {
        moveIndicator(currentTab);
    });

    // 暴露辅助函数
    window.__moveSegIndicator = moveIndicator;
    window.__panelsEl = panels;
};

/**
 * 显示指定的标签页
 * @param {string} tabName - 要显示的标签页名称（'words', 'records', 'backup'）
 */
const showTab = (tabName) => {
    currentTab = tabName;
    const panels = window.__panelsEl || document.getElementById('tabPanels');
    const order = ['words', 'records', 'backup']; // 标签页顺序
    const index = order.indexOf(tabName);

    if (panels && index >= 0) {
        // 获取所有的tab-panel元素
        const allPanels = panels.querySelectorAll('.tab-panel');

        // 在transform之前，确保所有panel都显示（移除可能的隐藏样式）
        // 这样可以确保滑动动画的流畅性
        allPanels.forEach(panel => {
            panel.style.display = '';
            panel.style.visibility = '';
            panel.style.height = '';
            panel.style.overflow = '';
        });

        // 执行transform动画，通过平移来切换标签页
        panels.style.transform = `translateX(-${index * 100}%)`;

        // 等待transform动画完成后隐藏其他panel
        // CSS中transition设置为 0.15s，以等待动画完成
        setTimeout(() => {
            allPanels.forEach((panel, panelIndex) => {
                if (panelIndex !== index) {
                    // 隐藏非当前panel，但保持其宽度占位以维持布局
                    panel.style.visibility = 'hidden';
                    panel.style.height = '0';
                    panel.style.overflow = 'hidden';
                } else {
                    // 确保当前panel可见且恢复正常高度
                    panel.style.visibility = 'visible';
                    panel.style.height = '';
                    panel.style.overflow = '';
                }
            });
        }, 300); // 与CSS transition时间匹配
    }

    if (typeof window.__moveSegIndicator === 'function') {
        window.__moveSegIndicator(tabName);
    }
    // 同步单选按钮以支持无障碍访问和状态管理
    const radio = document.querySelector(`.segmented-tabs input[value="${tabName}"]`);
    if (radio) radio.checked = true;
};

// =================================================================
// 词库管理
// =================================================================

const showVocabularyView = () => {
    document.getElementById('vocabularyManagementView').style.display = 'block';
    document.getElementById('wordManagementView').style.display = 'none';
    document.getElementById('breadcrumbText').textContent = '词库管理';
    document.getElementById('backToVocabularies').style.display = 'none';
    currentVocabularyId = null;
    refreshVocabularies();
};

const showWordView = (vocabularyId) => {
    const vocabulary = getVocabularyById(vocabularyId);
    if (!vocabulary) {
        showToast('词库不存在', 'error');
        return;
    }

    currentVocabularyId = vocabularyId;
    document.getElementById('vocabularyManagementView').style.display = 'none';
    document.getElementById('wordManagementView').style.display = 'block';
    document.getElementById('breadcrumbText').textContent = `词库管理 > ${vocabulary.name}`;
    document.getElementById('backToVocabularies').style.display = 'inline-block';
    refreshWords();
};

const refreshVocabularies = () => {
    const vocabularies = getVocabularies();
    const tbody = document.getElementById('vocabulariesTable');
    tbody.innerHTML = '';

    vocabularies.forEach(vocabulary => {
        const wordCount = getWordsByVocabulary(vocabulary.id).length;
        const isEnabled = vocabulary.enabled !== false;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="word-cell" style="cursor: pointer;" onclick="showWordView('${vocabulary.id}')">${vocabulary.name}</td>
            <td>${vocabulary.description || '暂无描述'}</td>
            <td>${wordCount}</td>
            <td style="text-align: center;">
                <vocabulary-status-button 
                    status="${isEnabled ? 'enabled' : 'disabled'}" 
                    vocabulary-id="${vocabulary.id}" 
                    size="1.0">
                </vocabulary-status-button>
            </td>
            <td>${new Date(vocabulary.createdAt).toLocaleString()}</td>
            <td class="action-btns">
                <button class="btn btn-edit" onclick="showVocabularyModal('${vocabulary.id}')">编辑</button>
                ${vocabulary.id === 'default' ? '' : `
                    <button class="btn btn-merge" onclick="showMergeVocabularyModal('${vocabulary.id}')">合并</button>
                    <button class="btn btn-delete" onclick="deleteVocabularyConfirm(event, '${vocabulary.id}')">删除</button>
                `}
            </td>
        `;
        tbody.appendChild(row);
    });

    if (vocabularies.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6; // 更新列数
        td.innerHTML = `<div class="empty-state">暂无词库数据，点击"新建词库"开始创建。</div>`;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
};

// 监听单词checkbox变化（事件委托）
document.addEventListener('change', (e) => {
    // 监听单词checkbox变化
    if (e.target && e.target.classList.contains('word-checkbox')) {
        updateBatchActionsVisibility();
        const all = document.getElementById('selectAllWords');
        if (all) {
            const boxes = document.querySelectorAll('.word-checkbox');
            const allChecked = boxes.length > 0 && Array.from(boxes).every(cb => cb.checked);
            all.checked = allChecked;
        }
    }

    // 监听记录checkbox变化
    if (e.target && e.target.classList.contains('record-checkbox')) {
        updateBatchRecordsActionsVisibility();
        const all = document.getElementById('selectAllRecords');
        if (all) {
            const boxes = document.querySelectorAll('.record-checkbox');
            const allChecked = boxes.length > 0 && Array.from(boxes).every(cb => cb.checked);
            all.checked = allChecked;
        }
    }
});

/**
 * 显示词库编辑模态框
 * @param {string|null} vocabularyId - 词库ID，null表示新建，有值表示编辑
 */
const showVocabularyModal = (vocabularyId) => {
    currentVocabularyEditId = vocabularyId;
    const modal = document.getElementById('vocabularyModal');

    if (vocabularyId) {
        // 编辑模式：加载现有词库数据
        const vocabulary = getVocabularyById(vocabularyId);
        if (!vocabulary) {
            showToast('词库不存在', 'error');
            return;
        }
        document.getElementById('vocabularyModalTitle').textContent = '编辑词库';
        document.getElementById('vocabularyName').value = vocabulary.name;
        document.getElementById('vocabularyDescription').value = vocabulary.description;
    } else {
        // 新建模式：清空表单
        document.getElementById('vocabularyModalTitle').textContent = '新建词库';
        document.getElementById('vocabularyName').value = '';
        document.getElementById('vocabularyDescription').value = '';
    }

    // 打开模态框并聚焦到第一个输入框
    openModal(modal);
    focusFirstInput(modal);
};

/**
 * 关闭词库编辑模态框
 */
const closeVocabularyModal = () => {
    closeModalEl(document.getElementById('vocabularyModal'));
    currentVocabularyEditId = null; // 重置编辑状态
};

/**
 * 保存词库（新建或更新）
 */
const saveVocabulary = () => {
    const name = document.getElementById('vocabularyName').value.trim();
    const description = document.getElementById('vocabularyDescription').value.trim();

    // 验证输入
    if (!name) {
        showToast('词库名称不能为空', 'error');
        return;
    }

    try {
        if (currentVocabularyEditId) {
            // 编辑现有词库
            const success = updateVocabulary(currentVocabularyEditId, name, description);
            if (success) {
                showToast('词库更新成功', 'success');
                closeVocabularyModal();
                refreshVocabularies(); // 刷新词库列表
            } else {
                showToast('词库更新失败', 'error');
            }
        } else {
            // 新建词库
            const id = createVocabulary(name, description);
            showToast('词库创建成功', 'success');
            closeVocabularyModal();
            refreshVocabularies();
        }
    } catch (error) {
        showToast('操作失败: ' + error.message, 'error');
    }
};

const deleteVocabularyConfirm = (event, vocabularyId) => {
    event.stopPropagation();

    if (vocabularyId === 'default') {
        showToast('不能删除默认词库', 'error');
        return;
    }

    const vocabulary = getVocabularyById(vocabularyId);
    const wordCount = getWordsByVocabulary(vocabularyId).length;

    const safeName = escapeHTML(vocabulary.name);
    const message = `确定要删除词库 "${safeName}" 吗？这将同时删除其下的 ${wordCount} 个单词。`;
    const tip = createConfirmTip(message, () => {
        try {
            deleteVocabulary(vocabularyId);
            showToast('词库删除成功', 'success');
            refreshVocabularies();
        } catch (error) {
            showToast('删除失败: ' + error.message, 'error');
        }
    });

    const buttonRect = event.target.getBoundingClientRect();
    tip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    tip.style.top = `${buttonRect.top - 10}px`;
    tip.style.transform = 'translate(-50%, -100%)';
};

const showMergeVocabularyModal = (sourceVocabularyId) => {
    mergeSourceVocabularyId = sourceVocabularyId;
    const modal = document.getElementById('mergeVocabularyModal');
    const select = document.getElementById('targetVocabularySelect');

    // 填充目标词库选项（排除源词库）
    const vocabularies = getVocabularies().filter(v => v.id !== sourceVocabularyId);
    select.innerHTML = vocabularies.map(v =>
        `<option value="${v.id}">${v.name}</option>`
    ).join('');

    openModal(modal);
    focusFirstInput(modal);
};

const closeMergeVocabularyModal = () => {
    closeModalEl(document.getElementById('mergeVocabularyModal'));
    mergeSourceVocabularyId = null;
};

const confirmMergeVocabulary = () => {
    const targetVocabularyId = document.getElementById('targetVocabularySelect').value;

    if (!mergeSourceVocabularyId || !targetVocabularyId) {
        showToast('请选择目标词库', 'error');
        return;
    }

    try {
        const sourceVocab = getVocabularyById(mergeSourceVocabularyId);
        const targetVocab = getVocabularyById(targetVocabularyId);
        mergeVocabularies(mergeSourceVocabularyId, targetVocabularyId);
        showToast(`词库 "${sourceVocab.name}" 已成功合并到 "${targetVocab.name}"`, 'success');
        closeMergeVocabularyModal();
        refreshVocabularies();
    } catch (error) {
        showToast('合并失败: ' + error.message, 'error');
    }
};

/**
 * 切换词库的启用/禁用状态
 * @param {string} vocabularyId - 词库ID
 */
const toggleVocabularyStatus = (vocabularyId) => {
    try {
        const vocabulary = getVocabularyById(vocabularyId);
        const newStatus = !vocabulary.enabled;

        toggleVocabularyEnabled(vocabularyId);

        const statusText = newStatus ? '启用' : '禁用';
        showToast(`词库 "${vocabulary.name}" 已${statusText}`, 'success');
    } catch (error) {
        showToast('操作失败: ' + error.message, 'error');
    }
};

// =================================================================
// 单词管理
// =================================================================

const refreshWords = () => {
    // 确保在单词管理视图中且有选中的词库
    if (!currentVocabularyId) {
        console.warn('No vocabulary selected');
        return;
    }

    const { wordBank, practiceRecords } = loadData();
    const selectedMode = document.getElementById('wordModeSelector').value;
    const tbody = document.getElementById('wordsTable');
    tbody.innerHTML = '';

    // 只显示当前词库的单词
    const vocabularyWords = wordBank.filter(word => word.vocabularyId === currentVocabularyId);

    // 对单词进行排序：收藏的单词排在前面，然后按单词字母顺序排序
    vocabularyWords.sort((a, b) => {
        // 如果一个收藏一个不收藏，收藏的排在前面
        if (a.favorite !== b.favorite) {
            return b.favorite ? 1 : -1;
        }
        // 都收藏或都不收藏时，按单词字母顺序排序
        return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
    });

    const lastPracticeTime = {};
    practiceRecords.forEach(record => {
        if (record.word) {
            lastPracticeTime[record.word] = Math.max(
                new Date(record.date).getTime(),
                lastPracticeTime[record.word] || 0
            );
        }
    });

    vocabularyWords.forEach((word, vocabularyIndex) => {
        // 获取原始wordBank中的索引
        const originalIndex = wordBank.findIndex(w => w.word === word.word && w.vocabularyId === word.vocabularyId);
        const modeData = getWordModeData(word, selectedMode === 'all' ? 'context' : selectedMode); // 默认显示context数据
        const weight = calculateWordWeight(word, selectedMode, practiceRecords);

        const row = document.createElement('tr');
        if (word.favorite) {
            row.classList.add('favorite-row');
        }
        row.innerHTML = `
            <td class="batch-column" style="${isBatchMode ? '' : 'display: none;'}">
                <input type="checkbox" class="word-checkbox" value="${originalIndex}">
            </td>
            <td class="word-cell">${word.word}</td>
            <td>${word.translations.join(', ')}</td>
            <td>${modeData.errors}</td>
            <td>${modeData.practiceCount}</td>
            <td>${weight.toFixed(2)}</td>
            <td class="action-btns">
                <button class="btn btn-edit ${isBatchMode ? 'disabled' : ''}" onclick="${isBatchMode ? '' : `showEditModal(${originalIndex})`}">编辑</button>
                <button class="btn btn-delete ${isBatchMode ? 'disabled' : ''}" onclick="${isBatchMode ? '' : `deleteWord(event, ${originalIndex})`}">删除</button>
                <button class="btn btn-favorite ${word.favorite ? 'active' : ''} ${isBatchMode ? 'disabled' : ''}" onclick="${isBatchMode ? '' : `toggleFavorite(${originalIndex})`}">
                    ${word.favorite ? '★' : '☆'}
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    updateBatchActionsVisibility();

    // 更新计数和空状态显示
    const wordsCountEl = document.getElementById('count-words');
    if (wordsCountEl) wordsCountEl.textContent = String(vocabularyWords.length);
    if (vocabularyWords.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.innerHTML = `<div class="empty-state">暂无单词数据，点击“添加新单词”或使用“批量添加”。</div>`;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

const focusFirstInput = (container) => {
    const first = container.querySelector('input, select, textarea, button');
    if (first) {
        try { first.focus({ preventScroll: true }); } catch (_) { }
    }
};

const openModal = (modalEl) => {
    if (!modalEl) return;

    modalEl.style.display = 'flex';

    requestAnimationFrame(() => {
        modalEl.classList.add('visible');
        modalEl.setAttribute('aria-hidden', 'false');

        const modalContent = modalEl.querySelector('.modal-content');
        if (modalContent) {
            // 计算当前视口滚动位置，将模态弹窗定位在用户当前视野中
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const viewportHeight = window.innerHeight;

            // 获取模态弹窗内容的实际高度
            modalContent.style.marginTop = '0px'; // 重置边距以获取准确高度
            const contentHeight = modalContent.offsetHeight;

            // 计算最佳位置：优先显示在视口中心，但确保完全可见
            let modalTop = scrollTop + Math.max(20, (viewportHeight - contentHeight) / 2);

            // 确保模态弹窗不会超出视口底部
            const maxTop = scrollTop + viewportHeight - contentHeight - 40;
            modalTop = Math.min(modalTop, maxTop);

            // 确保模态弹窗不会超出页面顶部
            modalTop = Math.max(modalTop, scrollTop + 20);

            modalContent.style.marginTop = `${modalTop}px`;
            modalContent.focus();
        }
    });
};

const closeModalEl = (modalEl) => {
    if (!modalEl) return;
    modalEl.classList.remove('visible');
    modalEl.setAttribute('aria-hidden', 'true');
    setTimeout(() => modalEl.style.display = 'none', 300);
};

const showEditModal = (index) => {
    // 添加单词时确保在单词管理视图中
    if (index === null && !currentVocabularyId) {
        showToast('请先选择一个词库', 'error');
        return;
    }

    currentEditIndex = index;
    const modal = document.getElementById('editModal');
    const { wordBank } = loadData();
    const activeModes = getActiveModes();

    if (index !== null) {
        const word = wordBank[index];
        document.getElementById('modalTitle').textContent = '编辑单词';
        document.getElementById('editWord').value = word.word;
        document.getElementById('editTranslations').value = word.translations.join(',');

        let statsHtml = '';
        activeModes.forEach(mode => {
            const modeData = getWordModeData(word, mode.id);
            statsHtml += `
                <div class="form-group">
                    <label for="editErrors_${mode.id}">${mode.name} (错误)</label>
                    <input type="number" id="editErrors_${mode.id}" value="${modeData.errors}" min="0">
                </div>
                <div class="form-group">
                    <label for="editPracticeCount_${mode.id}">${mode.name} (练习)</label>
                    <input type="number" id="editPracticeCount_${mode.id}" value="${modeData.practiceCount}" min="0">
                </div>
            `;
        });
        document.getElementById('wordStatsContainer').innerHTML = statsHtml;

    } else {
        document.getElementById('modalTitle').textContent = '添加新单词';
        document.getElementById('editWord').value = '';
        document.getElementById('editTranslations').value = '';
        let statsHtml = '';
        activeModes.forEach(mode => {
            statsHtml += `
                 <div class="form-group">
                    <label for="editErrors_${mode.id}">${mode.name} (错误)</label>
                    <input type="number" id="editErrors_${mode.id}" value="0" min="0">
                </div>
                <div class="form-group">
                    <label for="editPracticeCount_${mode.id}">${mode.name} (练习)</label>
                    <input type="number" id="editPracticeCount_${mode.id}" value="0" min="0">
                </div>
            `;
        });
        document.getElementById('wordStatsContainer').innerHTML = statsHtml;
    }
    openModal(modal);
    focusFirstInput(modal);
}

const closeModal = () => {
    closeModalEl(document.getElementById('editModal'));
}

const saveWord = () => {
    const word = document.getElementById('editWord').value.trim();
    const translations = document.getElementById('editTranslations').value.split(',').map(t => t.trim()).filter(t => t);
    if (!word || translations.length === 0) {
        showToast('单词和翻译不能为空', 'error');
        return;
    }

    const { wordBank } = loadData();
    const activeModes = getActiveModes();
    const newModes = {};

    activeModes.forEach(mode => {
        const errors = parseInt(document.getElementById(`editErrors_${mode.id}`).value) || 0;
        const practiceCount = parseInt(document.getElementById(`editPracticeCount_${mode.id}`).value) || 0;
        newModes[mode.id] = { errors, practiceCount };
    });


    if (currentEditIndex !== null) {
        wordBank[currentEditIndex].word = word;
        wordBank[currentEditIndex].translations = translations;
        wordBank[currentEditIndex].modes = { ...wordBank[currentEditIndex].modes, ...newModes };
    } else {
        // 检查当前词库中是否已存在该单词
        const existingWord = wordBank.find(w =>
            w.word.toLowerCase() === word.toLowerCase() &&
            w.vocabularyId === currentVocabularyId
        );
        if (existingWord) {
            showToast('该单词在当前词库中已存在', 'error');
            return;
        }
        wordBank.push({
            word,
            translations,
            modes: newModes,
            favorite: false,
            vocabularyId: currentVocabularyId || 'default'
        });
    }

    localStorage.setItem('wordBank', JSON.stringify(wordBank));
    showToast('保存成功', 'success');
    closeModal();
    refreshWords();
}

const deleteWord = (event, index) => {
    event.stopPropagation();
    const tip = createConfirmTip('确定要删除这个单词吗？', () => {
        const { wordBank } = loadData();
        wordBank.splice(index, 1);
        localStorage.setItem('wordBank', JSON.stringify(wordBank));
        showToast('删除成功', 'success');
        refreshWords();
    });
    const buttonRect = event.target.getBoundingClientRect();
    tip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    tip.style.top = `${buttonRect.top - 10}px`;
    tip.style.transform = 'translate(-50%, -100%)';
}

const toggleFavorite = (index) => {
    const { wordBank } = loadData();
    wordBank[index].favorite = !wordBank[index].favorite;
    localStorage.setItem('wordBank', JSON.stringify(wordBank));
    refreshWords();
    showToast(wordBank[index].favorite ? '已收藏' : '已取消收藏', 'info');
}

// 批量操作
let isBatchMode = false;
const toggleBatchMode = () => {
    isBatchMode = !isBatchMode;
    const batchColumns = document.querySelectorAll('.batch-column');

    if (isBatchMode) {
        batchColumns.forEach(el => {
            el.style.display = '';
            el.style.width = '40px';
            el.style.opacity = '1';
        });
    } else {
        batchColumns.forEach(el => {
            el.style.opacity = '0';
            el.style.width = '0';
            setTimeout(() => {
                if (!isBatchMode) el.style.display = 'none';
            }, 300);
        });
    }

    document.getElementById('batchModeText').textContent = isBatchMode ? '退出批量管理' : '批量管理';
    if (!isBatchMode) {
        document.getElementById('selectAllWords').checked = false;
        document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = false);
        lastCheckedWordIndex = -1; // 重置Shift选择索引
    }
    updateBatchActionsVisibility();
    refreshWords(); // 重新刷新表格以更新按钮状态
}

const updateBatchActionsVisibility = () => {
    const batchActions = document.querySelector('.batch-actions');
    const selected = document.querySelectorAll('.word-checkbox:checked').length > 0;
    const shouldShow = isBatchMode && selected;

    if (shouldShow) {
        batchActions.style.display = 'flex';
        batchActions.classList.remove('hiding');
        batchActions.classList.add('showing');
    } else {
        batchActions.classList.remove('showing');
        batchActions.classList.add('hiding');
        // 延迟隐藏以等待动画完成
        setTimeout(() => {
            if (batchActions.classList.contains('hiding')) {
                batchActions.style.display = 'none';
            }
        }, 300);
    }
}

const toggleSelectAllWords = () => {
    const isChecked = document.getElementById('selectAllWords').checked;
    document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = isChecked);
    updateBatchActionsVisibility();
}

document.getElementById('wordsTable').addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row) return;

    // 在批量模式下阻止操作按钮的点击
    if (isBatchMode && event.target.closest('button')) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // 只在批量模式下进行批量选择操作
    if (!isBatchMode) return;

    const checkbox = row.querySelector('.word-checkbox');
    if (!checkbox) return;

    // 如果点击的是按钮，则不进行选择操作
    if (event.target.closest('button')) {
        return;
    }

    const checkboxes = Array.from(document.querySelectorAll('#wordsTable .word-checkbox'));
    const currentIndex = checkboxes.indexOf(checkbox);

    // 如果点击的不是复选框本身，则切换其状态
    if (event.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
        // 触发变更事件以更新UI
        checkbox.dispatchEvent(new Event('change'));
    }

    // 支持Shift键进行范围选择
    if (lastCheckedWordIndex !== -1 && event.shiftKey) {
        const start = Math.min(lastCheckedWordIndex, currentIndex);
        const end = Math.max(lastCheckedWordIndex, currentIndex);
        const shouldBeChecked = checkboxes[currentIndex].checked;

        // 批量设置范围内所有复选框的状态
        for (let i = start; i <= end; i++) {
            if (checkboxes[i].checked !== shouldBeChecked) {
                checkboxes[i].checked = shouldBeChecked;
                checkboxes[i].dispatchEvent(new Event('change'));
            }
        }
    }

    // 记录当前选择的索引，用于下次Shift选择
    lastCheckedWordIndex = currentIndex;
});

// 记录练习记录表格中最后选择的复选框索引，用于Shift范围选择
let lastCheckedRecordIndex = -1;

/**
 * 练习记录表格的批量选择事件处理
 * 支持单击选择和Shift键范围选择
 */
document.getElementById('recordsTable').addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row) return;

    // 在批量模式下阻止操作按钮的点击，防止误操作
    if (isBatchModeRecords && event.target.closest('button')) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // 只在批量模式下进行批量选择操作
    if (!isBatchModeRecords) return;

    const checkbox = row.querySelector('.record-checkbox');
    if (!checkbox) return;

    // 如果点击的是按钮，则不进行选择操作
    if (event.target.closest('button')) {
        return;
    }

    const checkboxes = Array.from(document.querySelectorAll('#recordsTable .record-checkbox'));
    const currentIndex = checkboxes.indexOf(checkbox);

    // 如果点击的不是checkbox本身，则切换其状态
    if (event.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
    }

    // 支持Shift键进行范围选择（与单词表格相同的逻辑）
    if (lastCheckedRecordIndex !== -1 && event.shiftKey) {
        const start = Math.min(lastCheckedRecordIndex, currentIndex);
        const end = Math.max(lastCheckedRecordIndex, currentIndex);
        const shouldBeChecked = checkboxes[currentIndex].checked;

        // 批量设置范围内所有复选框的状态
        for (let i = start; i <= end; i++) {
            if (checkboxes[i].checked !== shouldBeChecked) {
                checkboxes[i].checked = shouldBeChecked;
                checkboxes[i].dispatchEvent(new Event('change'));
            }
        }
    }

    // 记录当前选择的索引，用于下次Shift选择
    lastCheckedRecordIndex = currentIndex;
});


/**
 * 批量删除选中的单词
 * @param {Event} event - 点击事件
 */
const batchDelete = (event) => {
    const selectedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('请先选择要删除的单词', 'info');
        return;
    }

    const message = `确定要删除选中的 ${selectedCheckboxes.length} 个单词吗？`;
    const tip = createConfirmTip(message, () => {
        let { wordBank } = loadData();

        // 获取要删除的索引并按降序排列，从后往前删除以避免索引变化问题
        const indicesToDelete = Array.from(selectedCheckboxes)
            .map(cb => parseInt(cb.value))
            .sort((a, b) => b - a);

        // 执行删除操作
        indicesToDelete.forEach(index => wordBank.splice(index, 1));
        localStorage.setItem('wordBank', JSON.stringify(wordBank));
        showToast('批量删除成功', 'success');
        refreshWords();
        toggleBatchMode();
    });

    const buttonRect = event.target.getBoundingClientRect();
    tip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    tip.style.top = `${buttonRect.top - 10}px`;
    tip.style.transform = 'translate(-50%, -100%)';
}


// 练习记录
const refreshRecords = () => {
    const { practiceRecords } = loadData();
    const selectedMode = document.getElementById('recordModeSelector').value;
    const tbody = document.getElementById('recordsTable');
    tbody.innerHTML = '';

    const filteredRecords = practiceRecords.filter(record =>
        selectedMode === 'all' || record.mode === selectedMode
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredRecords.forEach((record, index) => {
        const modeInfo = getModeById(record.mode);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="batch-column-records" style="${isBatchModeRecords ? '' : 'display: none;'}">
                <input type="checkbox" class="record-checkbox" value="${practiceRecords.indexOf(record)}">
            </td>
            <td>${new Date(record.date).toLocaleString()}</td>
            <td><span class="badge ${record.correct ? 'badge-success' : 'badge-error'}">${record.correct ? '正确' : '错误'}</span></td>
            <td>${record.word}</td>
            <td>${modeInfo ? modeInfo.name : (record.mode || 'N/A')}</td>
            <td class="action-btns">
                 <button class="btn btn-edit ${isBatchModeRecords ? 'disabled' : ''}" onclick="${isBatchModeRecords ? '' : `showEditRecordModal(${practiceRecords.indexOf(record)})`}">编辑</button>
                 <button class="btn btn-delete ${isBatchModeRecords ? 'disabled' : ''}" onclick="${isBatchModeRecords ? '' : `deleteRecord(event, ${practiceRecords.indexOf(record)})`}">删除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    updateBatchRecordsActionsVisibility();

    const recCountEl = document.getElementById('count-records');
    if (recCountEl) recCountEl.textContent = String(practiceRecords.length);
    if (filteredRecords.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.innerHTML = `<div class="empty-state">暂无练习记录。</div>`;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

const deleteRecord = (event, index) => {
    event.stopPropagation();
    const tip = createConfirmTip('确定要删除这条记录吗？', () => {
        const { practiceRecords } = loadData();
        practiceRecords.splice(index, 1);
        localStorage.setItem('practiceRecords', JSON.stringify(practiceRecords));
        showToast('删除成功', 'success');
        refreshRecords();
    });
    const buttonRect = event.target.getBoundingClientRect();
    tip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    tip.style.top = `${buttonRect.top - 10}px`;
    tip.style.transform = 'translate(-50%, -100%)';
}

const showEditRecordModal = (index) => {
    currentRecordEditIndex = index;
    const modal = document.getElementById('editRecordModal');
    const { practiceRecords } = loadData();
    const record = practiceRecords[index];

    document.getElementById('editRecordWord').value = record.word;
    document.getElementById('editRecordDate').value = new Date(record.date).toISOString().slice(0, 16);
    document.getElementById('editRecordResult').value = record.correct.toString();

    generateModeSelectorsHTML('editRecordMode', false, false);
    document.getElementById('editRecordMode').value = record.mode;

    openModal(modal);
    focusFirstInput(modal);
};

const closeRecordModal = () => {
    closeModalEl(document.getElementById('editRecordModal'));
};

const saveRecordEdit = (event) => {
    event.preventDefault();
    const { practiceRecords } = loadData();
    const record = practiceRecords[currentRecordEditIndex];

    record.word = document.getElementById('editRecordWord').value;
    record.date = new Date(document.getElementById('editRecordDate').value).toISOString();
    record.correct = document.getElementById('editRecordResult').value === 'true';
    record.mode = document.getElementById('editRecordMode').value;

    localStorage.setItem('practiceRecords', JSON.stringify(practiceRecords));
    showToast('记录更新成功', 'success');
    closeRecordModal();
    refreshRecords();
};


// 记录批量操作
let isBatchModeRecords = false;
const toggleBatchModeRecords = () => {
    isBatchModeRecords = !isBatchModeRecords;
    const batchColumns = document.querySelectorAll('.batch-column-records');

    if (isBatchModeRecords) {
        batchColumns.forEach(el => {
            el.style.display = '';
            el.style.width = '40px';
            el.style.opacity = '1';
        });
    } else {
        batchColumns.forEach(el => {
            el.style.opacity = '0';
            el.style.width = '0';
            setTimeout(() => {
                if (!isBatchModeRecords) el.style.display = 'none';
            }, 300);
        });
    }

    document.getElementById('batchModeRecordsText').textContent = isBatchModeRecords ? '退出批量管理' : '批量管理';
    if (!isBatchModeRecords) {
        document.getElementById('selectAllRecords').checked = false;
        document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = false);
        lastCheckedRecordIndex = -1; // 重置Shift选择索引
    }
    updateBatchRecordsActionsVisibility();
    refreshRecords(); // 重新刷新表格以更新按钮状态
}

const updateBatchRecordsActionsVisibility = () => {
    const batchActions = document.querySelector('.batch-actions-records');
    const selected = document.querySelectorAll('.record-checkbox:checked').length > 0;
    const shouldShow = isBatchModeRecords && selected;

    if (shouldShow) {
        batchActions.style.display = 'flex';
        batchActions.classList.remove('hiding');
        batchActions.classList.add('showing');
    } else {
        batchActions.classList.remove('showing');
        batchActions.classList.add('hiding');
        // 延迟隐藏以等待动画完成
        setTimeout(() => {
            if (batchActions.classList.contains('hiding')) {
                batchActions.style.display = 'none';
            }
        }, 300);
    }
}

const toggleSelectAllRecords = () => {
    const isChecked = document.getElementById('selectAllRecords').checked;
    document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = isChecked);
    updateBatchRecordsActionsVisibility();
}

const batchDeleteRecords = (event) => {
    const selectedCheckboxes = document.querySelectorAll('.record-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('请先选择要删除的记录', 'info');
        return;
    }

    const message = `确定要删除选中的 ${selectedCheckboxes.length} 条记录吗？`;
    const tip = createConfirmTip(message, () => {
        let { practiceRecords } = loadData();
        const indicesToDelete = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value)).sort((a, b) => b - a);
        indicesToDelete.forEach(index => practiceRecords.splice(index, 1));
        localStorage.setItem('practiceRecords', JSON.stringify(practiceRecords));
        showToast('批量删除成功', 'success');
        refreshRecords();
        toggleBatchModeRecords();
    });

    const buttonRect = event.target.getBoundingClientRect();
    tip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    tip.style.top = `${buttonRect.top - 10}px`;
    tip.style.transform = 'translate(-50%, -100%)';
}


// 数据备份
const exportData = () => {
    const data = {
        wordBank: loadData().wordBank,
        practiceRecords: loadData().practiceRecords,
        supportedModes: getSupportedModes()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english_learning_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出', 'success');
}

const updateFileName = () => {
    const fileInput = document.getElementById('importFile');
    const fileNameDisplay = document.getElementById('fileName');
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
        fileNameDisplay.textContent = '未选择文件';
    }
};

let importedData = null;
const importData = () => {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        showToast('请先选择文件', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            importedData = JSON.parse(e.target.result);
            if (!importedData.wordBank || !importedData.practiceRecords) {
                throw new Error('文件格式不正确');
            }

            const summaryEl = document.getElementById('importDataSummary');
            summaryEl.innerHTML = `
                <p><strong>文件内容预览:</strong></p>
                <ul>
                    <li>单词数量: ${importedData.wordBank.length}</li>
                    <li>练习记录数量: ${importedData.practiceRecords.length}</li>
                    <li>模式数量: ${importedData.supportedModes?.length || 'N/A'}</li>
                </ul>
            `;

            const modal = document.getElementById('importConfirmModal');
            openModal(modal);

        } catch (error) {
            showToast(`导入失败: ${error.message}`, 'error');
            importedData = null;
        }
    };
    reader.readAsText(file);
}

const closeImportConfirmModal = () => {
    closeModalEl(document.getElementById('importConfirmModal'));
    importedData = null;
};

const confirmImport = () => {
    if (importedData) {
        localStorage.setItem('wordBank', JSON.stringify(importedData.wordBank));
        localStorage.setItem('practiceRecords', JSON.stringify(importedData.practiceRecords));
        if (importedData.supportedModes) {
            localStorage.setItem('supportedModes', JSON.stringify(importedData.supportedModes));
        }
        showToast('数据导入成功', 'success');
        closeImportConfirmModal();
        // 刷新所有视图
        initializePage();
    }
};


// 批量添加
const showBatchAddModal = () => {
    if (!currentVocabularyId) {
        showToast('请先选择一个词库', 'error');
        return;
    }

    const modal = document.getElementById('batchAddModal');
    generateModeSelectorsHTML('batchAddModeSelector', true, true);
    updateBatchFormatHelp();
    openModal(modal);
    focusFirstInput(modal);
}

const closeBatchAddModal = () => {
    closeModalEl(document.getElementById('batchAddModal'));
}

const showFormatHelp = () => {
    const format = document.getElementById('batchFormat').value;
    document.getElementById('jsonHelp').style.display = format === 'json' ? 'block' : 'none';
    document.getElementById('csvHelp').style.display = format === 'csv' ? 'block' : 'none';
    document.getElementById('excelHelp').style.display = format === 'excel' ? 'block' : 'none';
}

const updateBatchFormatHelp = () => {
    const mode = document.getElementById('batchAddModeSelector').value;
    const isAllModes = mode === 'all';

    document.getElementById('jsonHelpText').textContent = isAllModes
        ? '选择全部模式时，只需提供单词和翻译。'
        : '选择特定模式时，可额外提供 "errors" 和 "practiceCount" 字段。';
    document.getElementById('jsonHelpExample').textContent = isAllModes
        ? `[
  {"word": "vivid", "translations": ["生动的, 鲜明的"]},
  {"word": "ambiguous", "translations": ["模糊的"]}
]`
        : `[
  {"word": "vivid", "translations": ["生动的, 鲜明的"], "errors": 1, "practiceCount": 5},
  {"word": "ambiguous", "translations": ["模糊的"], "errors": 0, "practiceCount": 2}
]`;

    document.getElementById('csvHelpText').textContent = isAllModes
        ? '选择全部模式时，只需提供单词和翻译（前两列）。'
        : '选择特定模式时，可额外提供错误次数和练习次数（后两列）。';
    document.getElementById('csvHelpExample').textContent = isAllModes
        ? `vivid,生动的
ambiguous,模糊的`
        : `vivid,生动的,1,5
ambiguous,模糊的,0,2`;

    document.getElementById('excelHelpText').textContent = isAllModes
        ? '选择全部模式时，只需提供单词和翻译（前两列）。'
        : '选择特定模式时，可额外提供错误次数和练习次数（后两列）。';
    document.getElementById('excelHelpExample').textContent = isAllModes
        ? `vivid\t生动的
ambiguous\t模糊的`
        : `vivid\t生动的\t1\t5
ambiguous\t模糊的\t0\t2`;
}


const processBatchAdd = () => {
    const format = document.getElementById('batchFormat').value;
    const data = document.getElementById('batchData').value.trim();
    const mode = document.getElementById('batchAddModeSelector').value;

    if (!data) {
        showToast('粘贴的数据不能为空', 'error');
        return;
    }

    let newWords = [];
    try {
        if (format === 'json') {
            newWords = JSON.parse(data);
        } else {
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const delimiter = format === 'csv' ? ',' : '\t';
            newWords = lines.map(line => {
                const parts = line.split(delimiter).map(p => p.trim());
                const wordData = {
                    word: parts[0],
                    translations: parts[1] ? parts[1].split(/[,;，；]/).map(t => t.trim()) : []
                };
                if (mode !== 'all') {
                    wordData.errors = parseInt(parts[2]) || 0;
                    wordData.practiceCount = parseInt(parts[3]) || 0;
                }
                return wordData;
            });
        }
    } catch (e) {
        showToast('数据格式错误，请检查', 'error');
        return;
    }

    const { wordBank } = loadData();
    const activeModes = getActiveModes();
    let addedCount = 0;
    let updatedCount = 0;

    newWords.forEach(newWord => {
        if (!newWord.word || !newWord.translations || newWord.translations.length === 0) return;

        // 只在当前词库中查找已存在的单词
        const existingIndex = wordBank.findIndex(w =>
            w.word.toLowerCase() === newWord.word.toLowerCase() &&
            w.vocabularyId === currentVocabularyId
        );

        if (existingIndex !== -1) { // 更新现有单词
            const existingWord = wordBank[existingIndex];
            // 合并翻译，去重
            existingWord.translations = [...new Set([...existingWord.translations, ...newWord.translations])];

            if (mode === 'all') {
                // "all" 模式下不更新统计数据
            } else {
                if (!existingWord.modes) existingWord.modes = {};
                existingWord.modes[mode] = {
                    errors: newWord.errors || (existingWord.modes[mode] ? existingWord.modes[mode].errors : 0),
                    practiceCount: newWord.practiceCount || (existingWord.modes[mode] ? existingWord.modes[mode].practiceCount : 0)
                };
            }
            updatedCount++;
        } else { // 添加新单词
            const wordToAdd = {
                word: newWord.word,
                translations: newWord.translations,
                favorite: false,
                vocabularyId: currentVocabularyId || 'default', // 添加词库归属
                modes: {}
            };
            if (mode === 'all') {
                activeModes.forEach(m => {
                    wordToAdd.modes[m.id] = { errors: 0, practiceCount: 0 };
                });
            } else {
                // 为所有激活的模式初始化数据，但只设置特定模式的数据
                activeModes.forEach(m => {
                    wordToAdd.modes[m.id] = { errors: 0, practiceCount: 0 };
                });
                wordToAdd.modes[mode] = {
                    errors: newWord.errors || 0,
                    practiceCount: newWord.practiceCount || 0
                };
            }
            wordBank.push(wordToAdd);
            addedCount++;
        }
    });

    localStorage.setItem('wordBank', JSON.stringify(wordBank));
    showToast(`成功添加 ${addedCount} 个单词，更新 ${updatedCount} 个单词`, 'success');
    closeBatchAddModal();
    refreshWords();
}


// 初始化
const initializePage = () => {
    initializeStorage(); // 来自 common.js
    migrateWordData(); // 来自 common.js

    generateModeSelectorsHTML('wordModeSelector', true);
    generateModeSelectorsHTML('recordModeSelector', true);
    document.getElementById('wordModeSelector').value = 'context';
    document.getElementById('recordModeSelector').value = 'context';

    setupTabs();
    refreshVocabularies(); // 初始显示词库管理
    refreshRecords();
    showTab('words');
}

document.addEventListener('DOMContentLoaded', initializePage);

// ===== 模态框用户体验增强：ESC关闭、背景点击关闭 =====
(function () {
    const getVisibleModals = () => Array.from(document.querySelectorAll('.modal.visible'));

    const closeTopModal = () => {
        const modals = getVisibleModals();
        if (modals.length) {
            const top = modals[modals.length - 1];
            closeModalEl(top);
            return true;
        }
        return false;
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (closeTopModal()) {
                e.stopPropagation();
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        const modals = getVisibleModals();
        if (!modals.length) return;
        const top = modals[modals.length - 1];
        const content = top.querySelector('.modal-content');
        if (!content) return;
        if (!content.contains(e.target) && top.contains(e.target)) {
            closeModalEl(top);
        }
    }, true);
})();

// =================================================================
// 开发者测试函数 - 用于测试合并去重功能
// =================================================================

/**
 * 测试词库合并去重功能
 * 在浏览器控制台调用：testMergeWithDuplicates()
 */
window.testMergeWithDuplicates = function () {
    console.log('开始测试词库合并去重功能...');

    try {
        // 备份当前数据
        const backupVocabularies = localStorage.getItem('vocabularies');
        const backupWordBank = localStorage.getItem('wordBank');

        // 创建测试数据
        const testVocabularies = [
            { id: 'test_source', name: '测试源词库', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'test_target', name: '测试目标词库', enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ];

        const testWords = [
            // 源词库中的单词
            {
                word: 'apple',
                translations: ['苹果'],
                vocabularyId: 'test_source',
                favorite: false,
                modes: {
                    context: { errors: 2, practiceCount: 5 },
                    blank: { errors: 1, practiceCount: 3 }
                }
            },
            {
                word: 'banana',
                translations: ['香蕉'],
                vocabularyId: 'test_source',
                favorite: true,
                modes: {
                    context: { errors: 0, practiceCount: 2 },
                    blank: { errors: 1, practiceCount: 1 }
                }
            },
            // 目标词库中的单词（包含重复）
            {
                word: 'apple', // 与源词库重复
                translations: ['苹果', '果实'],
                vocabularyId: 'test_target',
                favorite: false,
                modes: {
                    context: { errors: 1, practiceCount: 3 },
                    blank: { errors: 2, practiceCount: 4 }
                }
            },
            {
                word: 'orange',
                translations: ['橙子'],
                vocabularyId: 'test_target',
                favorite: false,
                modes: {
                    context: { errors: 0, practiceCount: 1 },
                    blank: { errors: 0, practiceCount: 1 }
                }
            }
        ];

        // 设置测试数据
        localStorage.setItem('vocabularies', JSON.stringify(testVocabularies));
        localStorage.setItem('wordBank', JSON.stringify(testWords));

        console.log('测试前数据:');
        console.log('源词库单词:', testWords.filter(w => w.vocabularyId === 'test_source'));
        console.log('目标词库单词:', testWords.filter(w => w.vocabularyId === 'test_target'));

        // 执行合并
        mergeVocabularies('test_source', 'test_target');

        // 检查结果
        const resultWords = JSON.parse(localStorage.getItem('wordBank'));
        const resultVocabularies = JSON.parse(localStorage.getItem('vocabularies'));
        const targetWords = resultWords.filter(w => w.vocabularyId === 'test_target');

        console.log('合并后结果:');
        console.log('目标词库单词:', targetWords);
        console.log('剩余词库:', resultVocabularies);

        // 验证结果
        const appleWord = targetWords.find(w => w.word.toLowerCase() === 'apple');
        const bananaWord = targetWords.find(w => w.word.toLowerCase() === 'banana');
        const orangeWord = targetWords.find(w => w.word.toLowerCase() === 'orange');

        console.log('验证结果:');

        // 验证apple单词的合并
        if (appleWord) {
            console.log('✓ apple单词存在');
            console.log('翻译:', appleWord.translations);
            console.log('应该包含: ["苹果", "果实"]');
            console.log('context统计 - errors: ', appleWord.modes.context.errors, '(应为3)', 'practiceCount:', appleWord.modes.context.practiceCount, '(应为8)');
            console.log('blank统计 - errors: ', appleWord.modes.blank.errors, '(应为3)', 'practiceCount:', appleWord.modes.blank.practiceCount, '(应为7)');
        } else {
            console.error('✗ apple单词缺失');
        }

        // 验证banana单词的转移
        if (bananaWord) {
            console.log('✓ banana单词存在');
            console.log('收藏状态:', bananaWord.favorite, '(应为true)');
        } else {
            console.error('✗ banana单词缺失');
        }

        // 验证orange单词的保留
        if (orangeWord) {
            console.log('✓ orange单词保留');
        } else {
            console.error('✗ orange单词缺失');
        }

        // 验证源词库是否被删除
        const sourceVocabExists = resultVocabularies.some(v => v.id === 'test_source');
        if (!sourceVocabExists) {
            console.log('✓ 源词库已删除');
        } else {
            console.error('✗ 源词库未删除');
        }

        // 恢复原始数据
        if (backupVocabularies) {
            localStorage.setItem('vocabularies', backupVocabularies);
        }
        if (backupWordBank) {
            localStorage.setItem('wordBank', backupWordBank);
        }

        console.log('测试完成，数据已恢复');

    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
};

// 监听词库状态按钮的状态变化事件
document.addEventListener('statuschange', function (event) {
    const { vocabularyId, status } = event.detail;
    // 调用现有的toggleVocabularyStatus函数来处理状态变化
    toggleVocabularyStatus(vocabularyId);
});
