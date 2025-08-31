let currentEditIndex = -1;
let currentRecordEditIndex = -1;

// 确认提示框
const createConfirmTip = (message, onConfirm) => {
    // 移除已存在的提示框
    const existingTip = document.querySelector('.confirm-tip');
    if (existingTip) {
        existingTip.remove();
    }

    const tip = document.createElement('div');
    tip.className = 'confirm-tip';
    tip.innerHTML = `
        <p>${message}</p>
        <div class="confirm-tip-buttons">
            <button class="confirm-tip-cancel">取消</button>
            <button class="confirm-tip-confirm">确认</button>
        </div>
    `;

    document.body.appendChild(tip);

    const confirmBtn = tip.querySelector('.confirm-tip-confirm');
    const cancelBtn = tip.querySelector('.confirm-tip-cancel');

    const removeTip = () => {
        tip.remove();
        document.removeEventListener('click', handleOutsideClick, true);
    };

    const handleOutsideClick = (event) => {
        if (!tip.contains(event.target)) {
            removeTip();
        }
    };

    confirmBtn.onclick = () => {
        onConfirm();
        removeTip();
    };
    cancelBtn.onclick = removeTip;

    // 延迟以确保事件监听器不会立即捕捉到创建提示的点击
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

// Segmented tabs with sliding panels
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

    // initial position
    requestAnimationFrame(() => {
        moveIndicator(currentTab);
    });

    // expose helper
    window.__moveSegIndicator = moveIndicator;
    window.__panelsEl = panels;
};

const showTab = (tabName) => {
    currentTab = tabName;
    const panels = window.__panelsEl || document.getElementById('tabPanels');
    const order = ['words', 'records', 'backup'];
    const index = order.indexOf(tabName);
    if (panels && index >= 0) {
        panels.style.transform = `translateX(-${index * 100}%)`;
    }
    if (typeof window.__moveSegIndicator === 'function') {
        window.__moveSegIndicator(tabName);
    }
    // sync radios for a11y/state
    const radio = document.querySelector(`.segmented-tabs input[value="${tabName}"]`);
    if (radio) radio.checked = true;
};

// 单词管理
const refreshWords = () => {
    const { wordBank, practiceRecords } = loadData();
    const selectedMode = document.getElementById('wordModeSelector').value;
    const tbody = document.getElementById('wordsTable');
    tbody.innerHTML = '';

    const lastPracticeTime = {};
    practiceRecords.forEach(record => {
        if (record.word) {
            lastPracticeTime[record.word] = Math.max(
                new Date(record.date).getTime(),
                lastPracticeTime[record.word] || 0
            );
        }
    });

    wordBank.forEach((word, index) => {
        const modeData = getWordModeData(word, selectedMode === 'all' ? 'context' : selectedMode); // 默认显示context数据
        const weight = calculateWordWeight(word, selectedMode, practiceRecords);

        const row = document.createElement('tr');
        if (word.favorite) {
            row.classList.add('favorite-row');
        }
        row.innerHTML = `
            <td class="batch-column" style="display: none;">
                <input type="checkbox" class="word-checkbox" value="${index}">
            </td>
            <td class="word-cell">${word.word}</td>
            <td>${word.translations.join(', ')}</td>
            <td>${modeData.errors}</td>
            <td>${modeData.practiceCount}</td>
            <td>${weight.toFixed(2)}</td>
            <td class="action-btns">
                <button class="btn btn-edit" onclick="showEditModal(${index})">编辑</button>
                <button class="btn btn-delete" onclick="deleteWord(event, ${index})">删除</button>
                <button class="btn btn-favorite ${word.favorite ? 'active' : ''}" onclick="toggleFavorite(${index})">
                    ${word.favorite ? '★' : '☆'}
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    updateBatchActionsVisibility();

    // update count & empty state
    const wordsCountEl = document.getElementById('count-words');
    if (wordsCountEl) wordsCountEl.textContent = String(wordBank.length);
    if (wordBank.length === 0) {
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
            modalContent.style.marginTop = '0px'; // 重置margin以获取准确高度
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
        const existingWord = wordBank.find(w => w.word.toLowerCase() === word.toLowerCase());
        if (existingWord) {
            showToast('该单词已存在', 'error');
            return;
        }
        wordBank.push({ word, translations, modes: newModes, favorite: false });
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
    document.querySelectorAll('.batch-column').forEach(el => el.style.display = isBatchMode ? '' : 'none');
    document.getElementById('batchModeText').textContent = isBatchMode ? '退出批量管理' : '批量管理';
    if (!isBatchMode) {
        document.getElementById('selectAllWords').checked = false;
        document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = false);
    }
    updateBatchActionsVisibility();
}

const updateBatchActionsVisibility = () => {
    const batchActions = document.querySelector('.batch-actions');
    const selected = document.querySelectorAll('.word-checkbox:checked').length > 0;
    batchActions.style.display = isBatchMode && selected ? 'flex' : 'none';
}

const toggleSelectAllWords = () => {
    const isChecked = document.getElementById('selectAllWords').checked;
    document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = isChecked);
    updateBatchActionsVisibility();
}

document.getElementById('wordsTable').addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row || !isBatchMode) return; // 只在批量模式下生效

    const checkbox = row.querySelector('.word-checkbox');
    if (!checkbox) return;

    // 如果点击的是按钮，则不进行选择操作
    if (event.target.closest('button')) {
        return;
    }

    const checkboxes = Array.from(document.querySelectorAll('#wordsTable .word-checkbox'));
    const currentIndex = checkboxes.indexOf(checkbox);

    // 如果点击的不是checkbox本身，则切换其状态
    if (event.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
        // 触发change事件以更新UI
        checkbox.dispatchEvent(new Event('change'));
    }

    if (lastCheckedWordIndex !== -1 && event.shiftKey) {
        const start = Math.min(lastCheckedWordIndex, currentIndex);
        const end = Math.max(lastCheckedWordIndex, currentIndex);
        const shouldBeChecked = checkboxes[currentIndex].checked;

        for (let i = start; i <= end; i++) {
            if (checkboxes[i].checked !== shouldBeChecked) {
                checkboxes[i].checked = shouldBeChecked;
                checkboxes[i].dispatchEvent(new Event('change'));
            }
        }
    }

    lastCheckedWordIndex = currentIndex;
});


let lastCheckedRecordIndex = -1;

document.getElementById('recordsTable').addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row || !isBatchModeRecords) return; // 只在批量模式下生效

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

    if (lastCheckedRecordIndex !== -1 && event.shiftKey) {
        const start = Math.min(lastCheckedRecordIndex, currentIndex);
        const end = Math.max(lastCheckedRecordIndex, currentIndex);
        const shouldBeChecked = checkboxes[currentIndex].checked;

        for (let i = start; i <= end; i++) {
            if (checkboxes[i].checked !== shouldBeChecked) {
                checkboxes[i].checked = shouldBeChecked;
                checkboxes[i].dispatchEvent(new Event('change'));
            }
        }
    }

    lastCheckedRecordIndex = currentIndex;
});


const batchDelete = (event) => {
    const selectedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showToast('请先选择要删除的单词', 'info');
        return;
    }

    const message = `确定要删除选中的 ${selectedCheckboxes.length} 个单词吗？`;
    const tip = createConfirmTip(message, () => {
        let { wordBank } = loadData();
        const indicesToDelete = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value)).sort((a, b) => b - a);
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
            <td class="batch-column-records" style="display: none;">
                <input type="checkbox" class="record-checkbox" value="${practiceRecords.indexOf(record)}">
            </td>
            <td>${new Date(record.date).toLocaleString()}</td>
            <td><span class="badge ${record.correct ? 'badge-success' : 'badge-error'}">${record.correct ? '正确' : '错误'}</span></td>
            <td>${record.word}</td>
            <td>${modeInfo ? modeInfo.name : (record.mode || 'N/A')}</td>
            <td class="action-btns">
                 <button class="btn btn-edit" onclick="showEditRecordModal(${practiceRecords.indexOf(record)})">编辑</button>
                 <button class="btn btn-delete" onclick="deleteRecord(event, ${practiceRecords.indexOf(record)})">删除</button>
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
    document.querySelectorAll('.batch-column-records').forEach(el => el.style.display = isBatchModeRecords ? '' : 'none');
    document.getElementById('batchModeRecordsText').textContent = isBatchModeRecords ? '退出批量管理' : '批量管理';
    if (!isBatchModeRecords) {
        document.getElementById('selectAllRecords').checked = false;
        document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = false);
    }
    updateBatchRecordsActionsVisibility();
}

const updateBatchRecordsActionsVisibility = () => {
    const batchActions = document.querySelector('.batch-actions-records');
    const selected = document.querySelectorAll('.record-checkbox:checked').length > 0;
    batchActions.style.display = isBatchModeRecords && selected ? 'flex' : 'none';
}

const toggleSelectAllRecords = () => {
    const isChecked = document.getElementById('selectAllRecords').checked;
    document.querySelectorAll('.record-checkbox').forEach(cb => cb.checked = isChecked);
    updateBatchRecordsActionsVisibility();
}

document.getElementById('recordsTable').addEventListener('click', (event) => {
    const row = event.target.closest('tr');
    if (!row || !isBatchModeRecords) return; // 只在批量模式下生效

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

    if (lastCheckedRecordIndex !== -1 && event.shiftKey) {
        const start = Math.min(lastCheckedRecordIndex, currentIndex);
        const end = Math.max(lastCheckedRecordIndex, currentIndex);
        const shouldBeChecked = checkboxes[currentIndex].checked;

        for (let i = start; i <= end; i++) {
            if (checkboxes[i].checked !== shouldBeChecked) {
                checkboxes[i].checked = shouldBeChecked;
                checkboxes[i].dispatchEvent(new Event('change'));
            }
        }
    }

    lastCheckedRecordIndex = currentIndex;
});


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
  {"word": "vivid", "translations": ["生动的"]},
  {"word": "ambiguous", "translations": ["模糊的"]}
]`
        : `[
  {"word": "vivid", "translations": ["生动的"], "errors": 1, "practiceCount": 5},
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

        const existingIndex = wordBank.findIndex(w => w.word.toLowerCase() === newWord.word.toLowerCase());

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
    initializeStorage(); // From common.js
    migrateWordData(); // From common.js

    generateModeSelectorsHTML('wordModeSelector', true);
    generateModeSelectorsHTML('recordModeSelector', true);
    document.getElementById('wordModeSelector').value = 'context';
    document.getElementById('recordModeSelector').value = 'context';

    setupTabs();
    refreshWords();
    refreshRecords();
    showTab('words');
}

document.addEventListener('DOMContentLoaded', initializePage);

// ===== Modal UX extras: ESC close, backdrop click =====
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

    document.addEventListener('click', (e) => {
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
