let currentEditIndex = -1;
let currentRecordEditIndex = -1;
let currentVocabularyEditId = null;
let currentVocabularyId = null; // 当前选中的词库ID
let mergeSourceVocabularyId = null; // 合并操作的源词库ID

// =================================================================
// 批量操作管理器 - 统一处理单词和记录的批量选择
// =================================================================
class BatchOperationManager {
  constructor(config) {
    this.tableId = config.tableId; // 表格ID
    this.checkboxClass = config.checkboxClass; // checkbox类名
    this.selectAllId = config.selectAllId; // 全选checkbox ID
    this.batchColumnClass = config.batchColumnClass; // 批量操作列类名
    this.batchActionsClass = config.batchActionsClass; // 批量操作按钮容器类名
    this.batchModeTextId = config.batchModeTextId; // 批量模式按钮文本ID
    this.isBatchMode = false; // 当前是否处于批量模式
    this.lastCheckedIndex = -1; // 最后选中的索引(支持Shift范围选择)
    this.refreshCallback = config.refreshCallback; // 刷新表格的回调函数
  }

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    this.isBatchMode = !this.isBatchMode;
    const batchColumns = document.querySelectorAll(`.${this.batchColumnClass}`);

    if (this.isBatchMode) {
      batchColumns.forEach((el) => {
        el.style.display = "";
        el.style.width = "40px";
        el.style.opacity = "1";
      });
    } else {
      batchColumns.forEach((el) => {
        el.style.opacity = "0";
        el.style.width = "0";
        setTimeout(() => {
          if (!this.isBatchMode) el.style.display = "none";
        }, 300);
      });
    }

    const btnText = document.getElementById(this.batchModeTextId);
    if (btnText) {
      btnText.textContent = this.isBatchMode ? "退出批量管理" : "批量管理";
    }

    if (!this.isBatchMode) {
      // 退出批量模式时清空选择
      const selectAll = document.getElementById(this.selectAllId);
      if (selectAll) selectAll.checked = false;
      document
        .querySelectorAll(`.${this.checkboxClass}`)
        .forEach((cb) => (cb.checked = false));
      this.lastCheckedIndex = -1;
    }

    this.updateBatchActionsVisibility();
    if (this.refreshCallback) this.refreshCallback();
  }

  /**
   * 更新批量操作按钮的可见性
   */
  updateBatchActionsVisibility() {
    const batchActions = document.querySelector(`.${this.batchActionsClass}`);
    if (!batchActions) return;

    const selected =
      document.querySelectorAll(`.${this.checkboxClass}:checked`).length > 0;
    const shouldShow = this.isBatchMode && selected;

    if (shouldShow) {
      batchActions.style.display = "flex";
      batchActions.classList.remove("hiding");
      batchActions.classList.add("showing");
    } else {
      batchActions.classList.remove("showing");
      batchActions.classList.add("hiding");
      setTimeout(() => {
        if (batchActions.classList.contains("hiding")) {
          batchActions.style.display = "none";
        }
      }, 300);
    }
  }

  /**
   * 切换全选状态
   */
  toggleSelectAll() {
    const selectAll = document.getElementById(this.selectAllId);
    if (!selectAll) return;

    const isChecked = selectAll.checked;
    document
      .querySelectorAll(`.${this.checkboxClass}`)
      .forEach((cb) => (cb.checked = isChecked));
    this.updateBatchActionsVisibility();
  }

  /**
   * 处理表格行点击(支持Shift范围选择)
   */
  handleRowClick(event, row) {
    // 在批量模式下阻止按钮点击
    if (this.isBatchMode && event.target.closest("button")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!this.isBatchMode) return;

    const checkbox = row.querySelector(`.${this.checkboxClass}`);
    if (!checkbox || event.target.closest("button")) return;

    const checkboxes = Array.from(
      document.querySelectorAll(`#${this.tableId} .${this.checkboxClass}`)
    );
    const currentIndex = checkboxes.indexOf(checkbox);

    // 如果点击的不是checkbox本身,则切换其状态
    if (event.target.tagName !== "INPUT") {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    }

    // 支持Shift键范围选择
    if (this.lastCheckedIndex !== -1 && event.shiftKey) {
      const start = Math.min(this.lastCheckedIndex, currentIndex);
      const end = Math.max(this.lastCheckedIndex, currentIndex);
      const shouldBeChecked = checkboxes[currentIndex].checked;

      for (let i = start; i <= end; i++) {
        if (checkboxes[i].checked !== shouldBeChecked) {
          checkboxes[i].checked = shouldBeChecked;
          checkboxes[i].dispatchEvent(new Event("change"));
        }
      }
    }

    this.lastCheckedIndex = currentIndex;
  }

  /**
   * 获取选中的项的索引
   */
  getSelectedIndices() {
    return Array.from(
      document.querySelectorAll(`.${this.checkboxClass}:checked`)
    )
      .map((cb) => parseInt(cb.value))
      .sort((a, b) => b - a); // 降序排列,便于删除操作
  }

  /**
   * 检查是否有选中项
   */
  hasSelection() {
    return (
      document.querySelectorAll(`.${this.checkboxClass}:checked`).length > 0
    );
  }
}

// 初始化批量操作管理器
const wordBatchManager = new BatchOperationManager({
  tableId: "wordsTable",
  checkboxClass: "word-checkbox",
  selectAllId: "selectAllWords",
  batchColumnClass: "batch-column",
  batchActionsClass: "batch-actions",
  batchModeTextId: "batchModeText",
  refreshCallback: () => refreshWords(),
});

const recordBatchManager = new BatchOperationManager({
  tableId: "recordsTable",
  checkboxClass: "record-checkbox",
  selectAllId: "selectAllRecords",
  batchColumnClass: "batch-column-records",
  batchActionsClass: "batch-actions-records",
  batchModeTextId: "batchModeRecordsText",
  refreshCallback: () => refreshRecords(),
});

// =================================================================
// 通用工具函数
// =================================================================

/**
 * 渲染表格空状态
 * @param {HTMLElement} tbody - 表格body元素
 * @param {number} colSpan - 列数
 * @param {string} message - 提示消息
 */
const renderEmptyState = (tbody, colSpan, message) => {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colSpan;
  td.innerHTML = `<div class="empty-state">${message}</div>`;
  tr.appendChild(td);
  tbody.appendChild(tr);
};

/**
 * 显示确认删除提示框(带定位)
 * @param {Event} event - 点击事件
 * @param {string} message - 确认消息
 * @param {Function} onConfirm - 确认回调
 */
const showDeleteConfirm = (event, message, onConfirm) => {
  event.stopPropagation();

  // 确保获取的是按钮元素,而不是按钮内的文字等子元素
  const button = event.target.closest("button") || event.target;

  // 定位函数
  const positionTip = (tip, btn) => {
    const rect = btn.getBoundingClientRect();
    tip.style.position = "fixed";
    tip.style.left = `${rect.left + rect.width / 2}px`;
    tip.style.top = `${rect.top - 10}px`;
    tip.style.transform = "translate(-50%, -100%)";
    tip.style.zIndex = "10000";
  };

  const tip = createConfirmTip(message, onConfirm);

  // 初始定位
  positionTip(tip, button);

  // 监听滚动事件,实时更新位置
  const handleScroll = () => {
    if (document.body.contains(tip)) {
      positionTip(tip, button);
    } else {
      // 如果tip已被移除,取消监听
      window.removeEventListener("scroll", handleScroll, true);
    }
  };

  window.addEventListener("scroll", handleScroll, true);

  // 在tip被移除时清理事件监听器
  const originalRemove = tip.remove.bind(tip);
  tip.remove = () => {
    window.removeEventListener("scroll", handleScroll, true);
    originalRemove();
  };
};

/**
 * 创建确认提示框的工具函数。该函数会修改DOM：在页面中添加一个确认提示框元素，移除已存在的提示框，并添加相关事件监听器。
 * @param {string} message - 要显示的确认消息
 * @param {Function} onConfirm - 用户点击确认时执行的回调函数
 * @returns {HTMLDivElement} 创建并添加到页面的提示框DOM元素
 */
const createConfirmTip = (message, onConfirm) => {
  // 移除已存在的提示框，确保同时只有一个提示框
  const existingTip = document.querySelector(".confirm-tip");
  if (existingTip) {
    existingTip.remove();
  }

  // 创建提示框DOM元素
  const tip = document.createElement("div");
  tip.className = "confirm-tip";
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
  const confirmBtn = tip.querySelector(".confirm-tip-confirm");
  const cancelBtn = tip.querySelector(".confirm-tip-cancel");

  // 移除提示框的统一方法
  const removeTip = () => {
    tip.remove();
    document.removeEventListener("click", handleOutsideClick, true);
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
    document.addEventListener("click", handleOutsideClick, true);
  }, 0);

  return tip;
};

// 模式管理（使用 common.js 中的 getSupportedModes）
const getActiveModes = () => {
  return getSupportedModes().filter((mode) => mode.active);
};

const getModeById = (modeId) => {
  return getSupportedModes().find((mode) => mode.id === modeId) || null;
};

const generateModeSelectorsHTML = (
  elementId,
  includeAll = true,
  defaultToFirst = false
) => {
  const activeModes = getActiveModes();
  const select = document.getElementById(elementId);
  if (!select) return;

  const currentValue = select.value;
  let options = includeAll ? `<option value="all">所有模式</option>` : "";
  activeModes.forEach((mode) => {
    options += `<option value="${mode.id}">${mode.name}</option>`;
  });
  select.innerHTML = options;

  if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
    select.value = currentValue;
  } else if (defaultToFirst && activeModes.length > 0) {
    select.value = activeModes[0].id;
  } else if (includeAll) {
    select.value = "all";
  }

  // 刷新自定义下拉组件
  if (typeof refreshCustomSelect === "function") {
    refreshCustomSelect(select);
  }
};

// 数据加载
const loadData = () => {
  return {
    wordBank: safeGetItem(STORAGE_KEYS.WORD_BANK, []),
    practiceRecords: safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []),
  };
};

// 带滑动面板的分段式标签页
let currentTab = "words";
const setupTabs = () => {
  const group = document.querySelector(".segmented-tabs");
  const indicator = group?.querySelector(".seg-indicator");
  const labels = Array.from(group?.querySelectorAll("label") || []);
  const panels = document.getElementById("tabPanels");

  const ensureLabelVisible = (label) => {
    if (!group) return;
    const padding = 16;
    const labelLeft = label.offsetLeft;
    const labelRight = labelLeft + label.offsetWidth;
    const visibleLeft = group.scrollLeft;
    const visibleRight = visibleLeft + group.clientWidth;

    if (labelLeft < visibleLeft + padding) {
      group.scrollLeft = Math.max(0, labelLeft - padding);
    } else if (labelRight > visibleRight - padding) {
      group.scrollLeft = Math.max(0, labelRight - group.clientWidth + padding);
    }
  };

  const moveIndicator = (tab, ensureVisible = false) => {
    const label = labels.find((l) => l.dataset.tab === tab);
    if (!label || !indicator) return;

    // 仅在切换标签/初始化时，才自动对齐可视区域；滚动时不要干预用户手势
    if (ensureVisible) {
      ensureLabelVisible(label);
    }

    // 使用 offsetLeft/offsetWidth（基于容器内容坐标），避免 getBoundingClientRect 在 scrollLeft 变化时计算错误
    indicator.style.width = `${label.offsetWidth}px`;
    indicator.style.transform = `translateX(${label.offsetLeft}px)`;
  };

  const updateAria = (tab) => {
    labels.forEach((l) =>
      l.setAttribute("aria-selected", l.dataset.tab === tab ? "true" : "false")
    );
  };

  labels.forEach((l) => {
    l.addEventListener("click", () => showTab(l.dataset.tab));
    l.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showTab(l.dataset.tab);
      }
    });
  });

  const onResize = () => moveIndicator(currentTab);
  window.addEventListener("resize", onResize);

  // 横向滚动时同步指示条位置（移动端常见）
  if (group) {
    let rafId = 0;
    group.addEventListener(
      "scroll",
      () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          moveIndicator(currentTab, false);
        });
      },
      { passive: true }
    );
  }

  // 初始位置
  requestAnimationFrame(() => {
    moveIndicator(currentTab, true);
  });

  // 暴露辅助函数
  window.__moveSegIndicator = moveIndicator;
  window.__panelsEl = panels;
};

/**
 * 显示指定的标签页
 * @param {string} tabName - 要显示的标签页名称（'words', 'records', 'user-data', 'backup'）
 */
const showTab = (tabName) => {
  currentTab = tabName;
  const panels = window.__panelsEl || document.getElementById("tabPanels");

  if (panels) {
    const allPanels = panels.querySelectorAll(".tab-panel");

    // 移除所有 active 类,添加给当前面板
    allPanels.forEach((panel) => {
      const isActive = panel.dataset.tab === tabName;
      panel.classList.toggle("active", isActive);

      // 滚动到顶部
      if (isActive) {
        panel.scrollTop = 0;
      }
    });
  }

  // 如果切换到用户数据标签,初始化用户数据显示
  if (tabName === "user-data") {
    initializeUserDataTab();
  }

  if (typeof window.__moveSegIndicator === "function") {
    window.__moveSegIndicator(tabName, true);
  }

  // 同步单选按钮以支持无障碍访问和状态管理
  const radio = document.querySelector(
    `.segmented-tabs input[value="${tabName}"]`
  );
  if (radio) radio.checked = true;
};

// =================================================================
// 词库管理
// =================================================================

const showVocabularyView = () => {
  document.getElementById("vocabularyManagementView").style.display = "block";
  document.getElementById("wordManagementView").style.display = "none";
  document.getElementById("breadcrumbText").textContent = "词库管理";
  document.getElementById("backToVocabularies").style.display = "none";
  currentVocabularyId = null;
  refreshVocabularies();
};

const showWordView = (vocabularyId) => {
  const vocabulary = getVocabularyById(vocabularyId);
  if (!vocabulary) {
    showToast("词库不存在", "error");
    return;
  }

  currentVocabularyId = vocabularyId;
  document.getElementById("vocabularyManagementView").style.display = "none";
  document.getElementById("wordManagementView").style.display = "block";
  document.getElementById(
    "breadcrumbText"
  ).textContent = `词库管理 > ${vocabulary.name}`;
  document.getElementById("backToVocabularies").style.display = "inline-block";
  refreshWords();
};

const refreshVocabularies = () => {
  const vocabularies = getVocabularies();
  const tbody = document.getElementById("vocabulariesTable");
  tbody.innerHTML = "";

  vocabularies.forEach((vocabulary) => {
    const wordCount = getWordsByVocabulary(vocabulary.id).length;
    const isEnabled = vocabulary.enabled !== false;
    const row = document.createElement("tr");

    // 添加整行点击样式
    row.style.cursor = "pointer";

    // 添加整行点击事件 - 进入该词库的单词管理界面
    row.addEventListener("click", (e) => {
      // 如果点击的是按钮或按钮内的元素,不触发行点击
      if (e.target.closest("button") || e.target.tagName === "BUTTON") {
        return;
      }
      // 如果点击的是 vocabulary-status-button 组件,也不触发
      if (e.target.closest("vocabulary-status-button")) {
        return;
      }
      // 进入该词库的单词管理界面
      showWordView(vocabulary.id);
    });

    row.innerHTML = `
            <td class="word-cell">${vocabulary.name}</td>
            <td>${vocabulary.description || "暂无描述"}</td>
            <td>${wordCount}</td>
            <td style="text-align: center;">
                <vocabulary-status-button
                    status="${isEnabled ? "enabled" : "disabled"}"
                    vocabulary-id="${vocabulary.id}"
                    size="1.0">
                </vocabulary-status-button>
            </td>
            <td>${new Date(vocabulary.createdAt).toLocaleString()}</td>
            <td class="action-btns">
                <button class="btn btn-edit" onclick="showVocabularyModal('${
                  vocabulary.id
                }')">编辑</button>
                ${
                  vocabulary.id === "default"
                    ? ""
                    : `
                    <button class="btn btn-merge" onclick="showMergeVocabularyModal('${vocabulary.id}')">合并</button>
                    <button class="btn btn-delete" onclick="deleteVocabularyConfirm(event, '${vocabulary.id}')">删除</button>
                `
                }
            </td>
        `;
    tbody.appendChild(row);
  });

  if (vocabularies.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6; // 更新列数
    td.innerHTML = `<div class="empty-state">暂无词库数据，点击"新建词库"开始创建。</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
};

// 监听单词和记录checkbox变化（事件委托）
document.addEventListener("change", (e) => {
  // 监听单词checkbox变化
  if (e.target && e.target.classList.contains("word-checkbox")) {
    wordBatchManager.updateBatchActionsVisibility();
    const all = document.getElementById("selectAllWords");
    if (all) {
      const boxes = document.querySelectorAll(".word-checkbox");
      const allChecked =
        boxes.length > 0 && Array.from(boxes).every((cb) => cb.checked);
      all.checked = allChecked;
    }
  }

  // 监听记录checkbox变化
  if (e.target && e.target.classList.contains("record-checkbox")) {
    recordBatchManager.updateBatchActionsVisibility();
    const all = document.getElementById("selectAllRecords");
    if (all) {
      const boxes = document.querySelectorAll(".record-checkbox");
      const allChecked =
        boxes.length > 0 && Array.from(boxes).every((cb) => cb.checked);
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
  const modal = document.getElementById("vocabularyModal");

  if (vocabularyId) {
    // 编辑模式：加载现有词库数据
    const vocabulary = getVocabularyById(vocabularyId);
    if (!vocabulary) {
      showToast("词库不存在", "error");
      return;
    }
    document.getElementById("vocabularyModalTitle").textContent = "编辑词库";
    document.getElementById("vocabularyName").value = vocabulary.name;
    document.getElementById("vocabularyDescription").value =
      vocabulary.description;
  } else {
    // 新建模式：清空表单
    document.getElementById("vocabularyModalTitle").textContent = "新建词库";
    document.getElementById("vocabularyName").value = "";
    document.getElementById("vocabularyDescription").value = "";
  }

  // 打开模态框并聚焦到第一个输入框
  openModal(modal);
  focusFirstInput(modal);
};

/**
 * 关闭词库编辑模态框
 */
const closeVocabularyModal = () => {
  closeModalEl(document.getElementById("vocabularyModal"));
  currentVocabularyEditId = null; // 重置编辑状态
};

/**
 * 保存词库（新建或更新）
 */
const saveVocabulary = () => {
  const name = document.getElementById("vocabularyName").value.trim();
  const description = document
    .getElementById("vocabularyDescription")
    .value.trim();

  // 验证输入
  if (!name) {
    showToast("词库名称不能为空", "error");
    return;
  }

  try {
    if (currentVocabularyEditId) {
      // 编辑现有词库
      const success = updateVocabulary(
        currentVocabularyEditId,
        name,
        description
      );
      if (success) {
        showToast("词库更新成功", "success");
        closeVocabularyModal();
        refreshVocabularies(); // 刷新词库列表
      } else {
        showToast("词库更新失败", "error");
      }
    } else {
      // 新建词库
      const id = createVocabulary(name, description);
      showToast("词库创建成功", "success");
      closeVocabularyModal();
      refreshVocabularies();
    }
  } catch (error) {
    showToast("操作失败: " + error.message, "error");
    console.error("操作失败。错误:", error);
  }
};

const deleteVocabularyConfirm = (event, vocabularyId) => {
  if (vocabularyId === "default") {
    event.stopPropagation();
    showToast("不能删除默认词库", "error");
    return;
  }

  const vocabulary = getVocabularyById(vocabularyId);
  const wordCount = getWordsByVocabulary(vocabularyId).length;
  const message = `确定要删除词库 "${vocabulary.name}" 吗？这将同时删除其下的 ${wordCount} 个单词。`;

  showDeleteConfirm(event, message, () => {
    try {
      deleteVocabulary(vocabularyId);
      showToast("词库删除成功", "success");
      refreshVocabularies();
    } catch (error) {
      showToast("删除失败: " + error.message, "error");
    }
  });
};

const showMergeVocabularyModal = (sourceVocabularyId) => {
  mergeSourceVocabularyId = sourceVocabularyId;
  const modal = document.getElementById("mergeVocabularyModal");
  const select = document.getElementById("targetVocabularySelect");

  // 填充目标词库选项（排除源词库）
  const vocabularies = getVocabularies().filter(
    (v) => v.id !== sourceVocabularyId
  );
  select.innerHTML = vocabularies
    .map((v) => `<option value="${v.id}">${v.name}</option>`)
    .join("");

  // 刷新自定义下拉组件
  if (typeof refreshCustomSelect === "function") {
    refreshCustomSelect(select);
  }

  openModal(modal);
  focusFirstInput(modal);
};

const closeMergeVocabularyModal = () => {
  closeModalEl(document.getElementById("mergeVocabularyModal"));
  mergeSourceVocabularyId = null;
};

const confirmMergeVocabulary = () => {
  const targetVocabularyId = document.getElementById(
    "targetVocabularySelect"
  ).value;

  if (!mergeSourceVocabularyId || !targetVocabularyId) {
    showToast("请选择目标词库", "error");
    return;
  }

  try {
    const sourceVocab = getVocabularyById(mergeSourceVocabularyId);
    const targetVocab = getVocabularyById(targetVocabularyId);
    mergeVocabularies(mergeSourceVocabularyId, targetVocabularyId);
    showToast(
      `词库 "${sourceVocab.name}" 已成功合并到 "${targetVocab.name}"`,
      "success"
    );
    closeMergeVocabularyModal();
    refreshVocabularies();
  } catch (error) {
    showToast("合并失败: " + error.message, "error");
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

    const statusText = newStatus ? "启用" : "禁用";
    showToast(`词库 "${vocabulary.name}" 已${statusText}`, "success");
  } catch (error) {
    showToast("操作失败: " + error.message, "error");
    console.error("操作失败。错误:", error);
  }
};

// =================================================================
// 单词管理
// =================================================================

const refreshWords = () => {
  // 确保在单词管理视图中且有选中的词库
  if (!currentVocabularyId) {
    console.warn("No vocabulary selected");
    return;
  }

  const { wordBank, practiceRecords } = loadData();
  const selectedMode = document.getElementById("wordModeSelector").value;
  const tbody = document.getElementById("wordsTable");
  tbody.innerHTML = "";

  // 只显示当前词库的单词
  const vocabularyWords = wordBank.filter(
    (word) => word.vocabularyId === currentVocabularyId
  );

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
  practiceRecords.forEach((record) => {
    if (record.word) {
      lastPracticeTime[record.word] = Math.max(
        new Date(record.date).getTime(),
        lastPracticeTime[record.word] || 0
      );
    }
  });

  vocabularyWords.forEach((word, vocabularyIndex) => {
    // 获取原始wordBank中的索引
    const originalIndex = wordBank.findIndex(
      (w) => w.word === word.word && w.vocabularyId === word.vocabularyId
    );
    const modeData = getWordModeData(
      word,
      selectedMode === "all" ? "context" : selectedMode
    ); // 默认显示context数据
    const weight = calculateWordWeight(word, selectedMode, practiceRecords);

    const row = document.createElement("tr");
    if (word.favorite) {
      row.classList.add("favorite-row");
    }
    row.innerHTML = `
            <td class="batch-column" style="${
              wordBatchManager.isBatchMode ? "" : "display: none;"
            }">
                <input type="checkbox" class="word-checkbox" value="${originalIndex}">
            </td>
            <td class="word-cell">${word.word}</td>
            <td>${word.translations.join(", ")}</td>
            <td>${modeData.errors}</td>
            <td>${modeData.practiceCount}</td>
            <td>${weight.toFixed(2)}</td>
            <td class="action-btns">
                <button class="btn btn-edit ${
                  wordBatchManager.isBatchMode ? "disabled" : ""
                }" onclick="${
      wordBatchManager.isBatchMode ? "" : `showEditModal(${originalIndex})`
    }">编辑</button>
                <button class="btn btn-delete ${
                  wordBatchManager.isBatchMode ? "disabled" : ""
                }" onclick="${
      wordBatchManager.isBatchMode ? "" : `deleteWord(event, ${originalIndex})`
    }">删除</button>
                <button class="btn btn-favorite ${
                  word.favorite ? "active" : ""
                } ${wordBatchManager.isBatchMode ? "disabled" : ""}" onclick="${
      wordBatchManager.isBatchMode ? "" : `toggleFavorite(${originalIndex})`
    }">
                    ${word.favorite ? "★" : "☆"}
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
  updateBatchActionsVisibility();

  // 更新计数和空状态显示
  const wordsCountEl = document.getElementById("count-words");
  if (wordsCountEl) wordsCountEl.textContent = String(vocabularyWords.length);
  if (vocabularyWords.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.innerHTML = `<div class="empty-state">暂无单词数据，点击“添加新单词”或使用“批量添加”。</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
};

const focusFirstInput = (container) => {
  const first = container.querySelector("input, select, textarea, button");
  if (first) {
    try {
      first.focus({ preventScroll: true });
    } catch (_) {}
  }
};

const openModal = (modalEl) => {
  if (!modalEl) return;

  modalEl.style.display = "flex";

  // 使用双层requestAnimationFrame确保渲染完成
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modalEl.classList.add("visible");
      modalEl.setAttribute("aria-hidden", "false");

      const modalContent = modalEl.querySelector(".modal-content");
      if (modalContent) {
        try {
          // 重置之前可能设置的样式
          modalContent.style.marginTop = "";
          modalContent.style.position = "";
          modalContent.style.top = "";

          // 安全聚焦
          if (modalContent.focus) {
            modalContent.focus();
          }
        } catch (error) {
          console.warn("模态框定位失败，使用默认布局", error);
        }
      }
    });
  });
};

const closeModalEl = (modalEl) => {
  if (!modalEl) return;

  // 在设置 aria-hidden 之前先移除焦点
  const focusedElement = modalEl.querySelector(":focus");
  if (focusedElement) {
    focusedElement.blur();
  }

  modalEl.classList.remove("visible");
  modalEl.setAttribute("aria-hidden", "true");
  setTimeout(() => (modalEl.style.display = "none"), 300);
};

const showEditModal = (index) => {
  // 添加单词时确保在单词管理视图中
  if (index === null && !currentVocabularyId) {
    showToast("请先选择一个词库", "error");
    return;
  }

  currentEditIndex = index;
  const modal = document.getElementById("editModal");
  const { wordBank } = loadData();
  const activeModes = getActiveModes();

  if (index !== null) {
    const word = wordBank[index];
    document.getElementById("modalTitle").textContent = "编辑单词";
    document.getElementById("editWord").value = word.word;
    document.getElementById("editTranslations").value =
      word.translations.join(",");

    let statsHtml = "";
    activeModes.forEach((mode) => {
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
    document.getElementById("wordStatsContainer").innerHTML = statsHtml;
  } else {
    document.getElementById("modalTitle").textContent = "添加新单词";
    document.getElementById("editWord").value = "";
    document.getElementById("editTranslations").value = "";
    let statsHtml = "";
    activeModes.forEach((mode) => {
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
    document.getElementById("wordStatsContainer").innerHTML = statsHtml;
  }
  openModal(modal);
  focusFirstInput(modal);
};

const closeModal = () => {
  closeModalEl(document.getElementById("editModal"));
};

const saveWord = () => {
  const word = document.getElementById("editWord").value.trim();
  const translations = document
    .getElementById("editTranslations")
    .value.split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  if (!word || translations.length === 0) {
    showToast("单词和翻译不能为空", "error");
    return;
  }

  const { wordBank } = loadData();
  const activeModes = getActiveModes();
  const newModes = {};

  activeModes.forEach((mode) => {
    const errors =
      parseInt(document.getElementById(`editErrors_${mode.id}`).value) || 0;
    const practiceCount =
      parseInt(document.getElementById(`editPracticeCount_${mode.id}`).value) ||
      0;
    newModes[mode.id] = { errors, practiceCount };
  });

  if (currentEditIndex !== null) {
    wordBank[currentEditIndex].word = word;
    wordBank[currentEditIndex].translations = translations;
    wordBank[currentEditIndex].modes = {
      ...wordBank[currentEditIndex].modes,
      ...newModes,
    };
  } else {
    // 检查当前词库中是否已存在该单词
    const existingWord = wordBank.find(
      (w) =>
        w.word.toLowerCase() === word.toLowerCase() &&
        w.vocabularyId === currentVocabularyId
    );
    if (existingWord) {
      showToast("该单词在当前词库中已存在", "error");
      return;
    }
    wordBank.push({
      word,
      translations,
      modes: newModes,
      favorite: false,
      vocabularyId: currentVocabularyId || "default",
    });
  }

  if (!safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank)) {
    return; // 错误提示已在 safeSetItem 中显示
  }
  showToast("保存成功", "success");
  closeModal();
  refreshWords();
};

const deleteWord = (event, index) => {
  showDeleteConfirm(event, "确定要删除这个单词吗？", () => {
    const { wordBank } = loadData();
    wordBank.splice(index, 1);
    if (!safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank)) {
      return;
    }
    showToast("删除成功", "success");
    refreshWords();
  });
};

const toggleFavorite = (index) => {
  const { wordBank } = loadData();
  wordBank[index].favorite = !wordBank[index].favorite;
  if (!safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank)) {
    return;
  }
  refreshWords();
  showToast(wordBank[index].favorite ? "已收藏" : "已取消收藏", "info");
};

// 批量操作 - 使用BatchOperationManager
const toggleBatchMode = () => wordBatchManager.toggleBatchMode();
const updateBatchActionsVisibility = () =>
  wordBatchManager.updateBatchActionsVisibility();
const toggleSelectAllWords = () => wordBatchManager.toggleSelectAll();

// 单词表格的批量选择事件处理
document.getElementById("wordsTable").addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (row) wordBatchManager.handleRowClick(event, row);
});

// 记录练习记录表格中最后选择的复选框索引，用于Shift范围选择
let lastCheckedRecordIndex = -1;

/**
 * 练习记录表格的批量选择事件处理
 * 支持单击选择和Shift键范围选择
 */
// 记录表格的批量选择事件处理
document.getElementById("recordsTable").addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (row) recordBatchManager.handleRowClick(event, row);
});

/**
 * 批量删除选中的单词
 * @param {Event} event - 点击事件
 */
const batchDelete = (event) => {
  if (!wordBatchManager.hasSelection()) {
    showToast("请先选择要删除的单词", "info");
    return;
  }

  const selectedIndices = wordBatchManager.getSelectedIndices();
  const message = `确定要删除选中的 ${selectedIndices.length} 个单词吗？`;

  showDeleteConfirm(event, message, () => {
    let { wordBank } = loadData();
    // 执行删除操作(selectedIndices已经是降序排列)
    selectedIndices.forEach((index) => wordBank.splice(index, 1));
    if (!safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank)) {
      return;
    }
    showToast("批量删除成功", "success");
    refreshWords();
    toggleBatchMode();
  });
};

// 练习记录
const refreshRecords = () => {
  const { practiceRecords } = loadData();
  const selectedMode = document.getElementById("recordModeSelector").value;
  const tbody = document.getElementById("recordsTable");
  tbody.innerHTML = "";

  const filteredRecords = practiceRecords
    .filter((record) => selectedMode === "all" || record.mode === selectedMode)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  filteredRecords.forEach((record, index) => {
    const modeInfo = getModeById(record.mode);
    const row = document.createElement("tr");
    row.innerHTML = `
            <td class="batch-column-records" style="${
              recordBatchManager.isBatchMode ? "" : "display: none;"
            }">
                <input type="checkbox" class="record-checkbox" value="${practiceRecords.indexOf(
                  record
                )}">
            </td>
            <td>${new Date(record.date).toLocaleString()}</td>
            <td><span class="badge ${
              record.correct ? "badge-success" : "badge-error"
            }">${record.correct ? "正确" : "错误"}</span></td>
            <td>${record.word}</td>
            <td>${modeInfo ? modeInfo.name : record.mode || "N/A"}</td>
            <td class="action-btns">
                 <button class="btn btn-edit ${
                   recordBatchManager.isBatchMode ? "disabled" : ""
                 }" onclick="${
      recordBatchManager.isBatchMode
        ? ""
        : `showEditRecordModal(${practiceRecords.indexOf(record)})`
    }">编辑</button>
                 <button class="btn btn-delete ${
                   recordBatchManager.isBatchMode ? "disabled" : ""
                 }" onclick="${
      recordBatchManager.isBatchMode
        ? ""
        : `deleteRecord(event, ${practiceRecords.indexOf(record)})`
    }">删除</button>
            </td>
        `;
    tbody.appendChild(row);
  });
  updateBatchRecordsActionsVisibility();

  const recCountEl = document.getElementById("count-records");
  if (recCountEl) recCountEl.textContent = String(practiceRecords.length);
  if (filteredRecords.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.innerHTML = `<div class="empty-state">暂无练习记录。</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
};

const deleteRecord = (event, index) => {
  showDeleteConfirm(event, "确定要删除这条记录吗？", () => {
    const { practiceRecords } = loadData();
    practiceRecords.splice(index, 1);
    if (!safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, practiceRecords)) {
      return;
    }
    showToast("删除成功", "success");
    refreshRecords();
  });
};

const showEditRecordModal = (index) => {
  currentRecordEditIndex = index;
  const modal = document.getElementById("editRecordModal");
  const { practiceRecords } = loadData();
  const record = practiceRecords[index];

  document.getElementById("editRecordWord").value = record.word;
  document.getElementById("editRecordDate").value = new Date(record.date)
    .toISOString()
    .slice(0, 16);
  document.getElementById("editRecordResult").value = record.correct.toString();

  generateModeSelectorsHTML("editRecordMode", false, false);
  document.getElementById("editRecordMode").value = record.mode;

  openModal(modal);
  focusFirstInput(modal);
};

const closeRecordModal = () => {
  closeModalEl(document.getElementById("editRecordModal"));
};

const saveRecordEdit = (event) => {
  event.preventDefault();
  const { practiceRecords } = loadData();
  const record = practiceRecords[currentRecordEditIndex];

  record.word = document.getElementById("editRecordWord").value;
  record.date = new Date(
    document.getElementById("editRecordDate").value
  ).toISOString();
  record.correct = document.getElementById("editRecordResult").value === "true";
  record.mode = document.getElementById("editRecordMode").value;

  if (!safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, practiceRecords)) {
    return;
  }
  showToast("记录更新成功", "success");
  closeRecordModal();
  refreshRecords();
};

// 记录批量操作 - 使用BatchOperationManager
const toggleBatchModeRecords = () => recordBatchManager.toggleBatchMode();
const updateBatchRecordsActionsVisibility = () =>
  recordBatchManager.updateBatchActionsVisibility();
const toggleSelectAllRecords = () => recordBatchManager.toggleSelectAll();

const batchDeleteRecords = (event) => {
  if (!recordBatchManager.hasSelection()) {
    showToast("请先选择要删除的记录", "info");
    return;
  }

  const selectedIndices = recordBatchManager.getSelectedIndices();
  const message = `确定要删除选中的 ${selectedIndices.length} 条记录吗？`;
  const tip = createConfirmTip(message, () => {
    let { practiceRecords } = loadData();
    selectedIndices.forEach((index) => practiceRecords.splice(index, 1));
    if (!safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, practiceRecords)) {
      return;
    }
    showToast("批量删除成功", "success");
    refreshRecords();
    toggleBatchModeRecords();
  });
};

// 数据备份
const exportData = () => {
  const data = {
    wordBank: loadData().wordBank,
    vocabularies: getVocabularies(), // 导出词库列表
    practiceRecords: loadData().practiceRecords,
    supportedModes: getSupportedModes(),
    // 游戏化数据
    userProfile: getUserProfile(), // 金币、经验值、等级、连续天数
    achievements: safeGetItem(STORAGE_KEYS.ACHIEVEMENTS, null), // 成就数据
    shopItems: safeGetItem(STORAGE_KEYS.SHOP_ITEMS, null), // 商店物品
    userInventory: safeGetItem(STORAGE_KEYS.USER_INVENTORY, null), // 用户库存（道具）
    themeSetting: safeGetItem(STORAGE_KEYS.THEME_SETTING, null), // 主题设置
    // 导出时间和版本信息
    exportDate: new Date().toISOString(),
    version: "0.4",
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `english_learning_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("数据已导出（包含所有用户数据）", "success");
};

const updateFileName = () => {
  const fileInput = document.getElementById("importFile");
  const fileNameDisplay = document.getElementById("fileName");
  if (fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = "未选择文件";
  }
};

let importedData = null;
const importData = () => {
  const file = document.getElementById("importFile").files[0];
  if (!file) {
    showToast("请先选择文件", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      importedData = JSON.parse(e.target.result);
      if (!importedData.wordBank || !importedData.practiceRecords) {
        throw new Error("文件格式不正确");
      }

      const summaryEl = document.getElementById("importDataSummary");

      // 生成用户数据预览
      let userDataHtml = "";
      if (importedData.userProfile) {
        const profile = importedData.userProfile;
        userDataHtml = `
          <li>用户等级: ${profile.level || 1}</li>
          <li>金币: ${profile.coins || 0}</li>
          <li>经验值: ${profile.exp || 0}</li>
          <li>连续天数: ${profile.streak || 0}</li>
        `;
      }

      let achievementHtml = "";
      if (importedData.achievements) {
        achievementHtml = `<li>成就数量: ${
          importedData.achievements.unlocked?.length || 0
        }</li>`;
      }

      let inventoryHtml = "";
      if (importedData.userInventory) {
        inventoryHtml = `<li>拥有物品: ${
          importedData.userInventory.owned?.length || 0
        }</li>`;
      }

      summaryEl.innerHTML = `
                <p><strong>文件内容预览:</strong></p>
                <ul>
                    <li>单词数量: ${importedData.wordBank.length}</li>
                    <li>词库数量: ${
                      importedData.vocabularies?.length || "N/A"
                    }</li>
                    <li>练习记录数量: ${
                      importedData.practiceRecords.length
                    }</li>
                    <li>模式数量: ${
                      importedData.supportedModes?.length || "N/A"
                    }</li>
                    ${userDataHtml}
                    ${achievementHtml}
                    ${inventoryHtml}
                </ul>
                ${
                  importedData.version
                    ? `<p><small>数据版本: ${importedData.version}</small></p>`
                    : ""
                }
                ${
                  importedData.exportDate
                    ? `<p><small>导出时间: ${new Date(
                        importedData.exportDate
                      ).toLocaleString("zh-CN")}</small></p>`
                    : ""
                }
            `;

      const modal = document.getElementById("importConfirmModal");
      openModal(modal);
    } catch (error) {
      showToast(`导入失败: ${error.message}`, "error");
      importedData = null;
    }
  };
  reader.readAsText(file);
};

const closeImportConfirmModal = () => {
  closeModalEl(document.getElementById("importConfirmModal"));
  importedData = null;
};

const confirmImport = () => {
  if (importedData) {
    // 导入单词库
    if (!safeSetItem(STORAGE_KEYS.WORD_BANK, importedData.wordBank)) {
      return;
    }

    // 导入词库列表（如果存在）
    if (importedData.vocabularies && importedData.vocabularies.length > 0) {
      if (!safeSetItem(STORAGE_KEYS.VOCABULARIES, importedData.vocabularies)) {
        return;
      }
    }

    // 导入练习记录
    if (
      !safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, importedData.practiceRecords)
    ) {
      return;
    }

    // 导入支持的模式
    if (importedData.supportedModes) {
      safeSetItem(STORAGE_KEYS.SUPPORTED_MODES, importedData.supportedModes);
    }

    // 导入用户档案（金币、经验值、等级、连续天数）
    if (importedData.userProfile) {
      safeSetItem(STORAGE_KEYS.USER_PROFILE, importedData.userProfile);
    }

    // 导入成就数据
    if (importedData.achievements) {
      safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, importedData.achievements);
    }

    // 导入商店物品
    if (importedData.shopItems) {
      safeSetItem(STORAGE_KEYS.SHOP_ITEMS, importedData.shopItems);
    }

    // 导入用户库存（道具）
    if (importedData.userInventory) {
      safeSetItem(STORAGE_KEYS.USER_INVENTORY, importedData.userInventory);
    }

    // 导入主题设置
    if (importedData.themeSetting) {
      safeSetItem(STORAGE_KEYS.THEME_SETTING, importedData.themeSetting);
    }

    showToast("数据导入成功（包含所有用户数据）", "success");
    closeImportConfirmModal();
    // 刷新所有视图
    initializePage();
  }
};

// 批量添加
const showBatchAddModal = () => {
  if (!currentVocabularyId) {
    showToast("请先选择一个词库", "error");
    return;
  }

  const modal = document.getElementById("batchAddModal");
  generateModeSelectorsHTML("batchAddModeSelector", true, true);
  updateBatchFormatHelp();
  openModal(modal);
  focusFirstInput(modal);
};

const closeBatchAddModal = () => {
  closeModalEl(document.getElementById("batchAddModal"));
};

const showFormatHelp = () => {
  const format = document.getElementById("batchFormat").value;
  document.getElementById("jsonHelp").style.display =
    format === "json" ? "block" : "none";
  document.getElementById("csvHelp").style.display =
    format === "csv" ? "block" : "none";
  document.getElementById("excelHelp").style.display =
    format === "excel" ? "block" : "none";
};

const updateBatchFormatHelp = () => {
  const mode = document.getElementById("batchAddModeSelector").value;
  const isAllModes = mode === "all";

  document.getElementById("jsonHelpText").textContent = isAllModes
    ? "选择全部模式时，只需提供单词和翻译。"
    : '选择特定模式时，可额外提供 "errors" 和 "practiceCount" 字段。';
  document.getElementById("jsonHelpExample").textContent = isAllModes
    ? `[
  {"word": "vivid", "translations": ["生动的, 鲜明的"]},
  {"word": "ambiguous", "translations": ["模糊的"]}
]`
    : `[
  {"word": "vivid", "translations": ["生动的, 鲜明的"], "errors": 1, "practiceCount": 5},
  {"word": "ambiguous", "translations": ["模糊的"], "errors": 0, "practiceCount": 2}
]`;

  document.getElementById("csvHelpText").textContent = isAllModes
    ? "选择全部模式时，只需提供单词和翻译（前两列）。"
    : "选择特定模式时，可额外提供错误次数和练习次数（后两列）。";
  document.getElementById("csvHelpExample").textContent = isAllModes
    ? `vivid,生动的
ambiguous,模糊的`
    : `vivid,生动的,1,5
ambiguous,模糊的,0,2`;

  document.getElementById("excelHelpText").textContent = isAllModes
    ? "选择全部模式时，只需提供单词和翻译（前两列）。"
    : "选择特定模式时，可额外提供错误次数和练习次数（后两列）。";
  document.getElementById("excelHelpExample").textContent = isAllModes
    ? `vivid\t生动的
ambiguous\t模糊的`
    : `vivid\t生动的\t1\t5
ambiguous\t模糊的\t0\t2`;
};

const processBatchAdd = () => {
  const format = document.getElementById("batchFormat").value;
  const data = document.getElementById("batchData").value.trim();
  const mode = document.getElementById("batchAddModeSelector").value;

  if (!data) {
    showToast("粘贴的数据不能为空", "error");
    return;
  }

  let newWords = [];
  try {
    if (format === "json") {
      newWords = JSON.parse(data);
    } else {
      const lines = data.split("\n").filter((line) => line.trim() !== "");
      const delimiter = format === "csv" ? "," : "\t";
      newWords = lines.map((line) => {
        const parts = line.split(delimiter).map((p) => p.trim());
        const wordData = {
          word: parts[0],
          translations: parts[1]
            ? parts[1].split(/[,;，；]/).map((t) => t.trim())
            : [],
        };
        if (mode !== "all") {
          wordData.errors = parseInt(parts[2]) || 0;
          wordData.practiceCount = parseInt(parts[3]) || 0;
        }
        return wordData;
      });
    }
  } catch (e) {
    showToast("数据格式错误，请检查", "error");
    return;
  }

  const { wordBank } = loadData();
  const activeModes = getActiveModes();
  let addedCount = 0;
  let updatedCount = 0;

  newWords.forEach((newWord) => {
    if (
      !newWord.word ||
      !newWord.translations ||
      newWord.translations.length === 0
    )
      return;

    // 只在当前词库中查找已存在的单词
    const existingIndex = wordBank.findIndex(
      (w) =>
        w.word.toLowerCase() === newWord.word.toLowerCase() &&
        w.vocabularyId === currentVocabularyId
    );

    if (existingIndex !== -1) {
      // 更新现有单词
      const existingWord = wordBank[existingIndex];
      // 合并翻译，去重
      existingWord.translations = [
        ...new Set([...existingWord.translations, ...newWord.translations]),
      ];

      if (mode === "all") {
        // "all" 模式下不更新统计数据
      } else {
        if (!existingWord.modes) existingWord.modes = {};
        existingWord.modes[mode] = {
          errors:
            newWord.errors ||
            (existingWord.modes[mode] ? existingWord.modes[mode].errors : 0),
          practiceCount:
            newWord.practiceCount ||
            (existingWord.modes[mode]
              ? existingWord.modes[mode].practiceCount
              : 0),
        };
      }
      updatedCount++;
    } else {
      // 添加新单词
      const wordToAdd = {
        word: newWord.word,
        translations: newWord.translations,
        favorite: false,
        vocabularyId: currentVocabularyId || "default", // 添加词库归属
        modes: {},
      };
      if (mode === "all") {
        activeModes.forEach((m) => {
          wordToAdd.modes[m.id] = { errors: 0, practiceCount: 0 };
        });
      } else {
        // 为所有激活的模式初始化数据，但只设置特定模式的数据
        activeModes.forEach((m) => {
          wordToAdd.modes[m.id] = { errors: 0, practiceCount: 0 };
        });
        wordToAdd.modes[mode] = {
          errors: newWord.errors || 0,
          practiceCount: newWord.practiceCount || 0,
        };
      }
      wordBank.push(wordToAdd);
      addedCount++;
    }
  });

  if (!safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank)) {
    return;
  }
  showToast(
    `成功添加 ${addedCount} 个单词，更新 ${updatedCount} 个单词`,
    "success"
  );
  closeBatchAddModal();
  refreshWords();
};

// 初始化
const initializePage = () => {
  initializeStorage(); // 来自 common.js
  migrateWordData(); // 来自 common.js
  initializeTheme(); // 初始化主题

  generateModeSelectorsHTML("wordModeSelector", true);
  generateModeSelectorsHTML("recordModeSelector", true);

  // 安全设置默认值（检查元素是否存在）
  const wordModeSelector = document.getElementById("wordModeSelector");
  const recordModeSelector = document.getElementById("recordModeSelector");

  if (wordModeSelector) {
    wordModeSelector.value = "context";
  }
  if (recordModeSelector) {
    recordModeSelector.value = "context";
  }

  setupTabs();
  refreshVocabularies(); // 初始显示词库管理
  refreshRecords();
  showTab("words");

  // 初始化设置页面（主题下拉框等）
  initSettings();

  // 初始化开发者模式
  initDeveloperMode();
};

document.addEventListener("DOMContentLoaded", initializePage);

// ===== 模态框用户体验增强：ESC关闭、背景点击关闭 =====
(function () {
  const getVisibleModals = () =>
    Array.from(document.querySelectorAll(".modal.visible"));

  const closeTopModal = () => {
    const modals = getVisibleModals();
    if (modals.length) {
      const top = modals[modals.length - 1];
      closeModalEl(top);
      return true;
    }
    return false;
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (closeTopModal()) {
        e.stopPropagation();
      }
    }
  });

  document.addEventListener(
    "mousedown",
    (e) => {
      const modals = getVisibleModals();
      if (!modals.length) return;
      const top = modals[modals.length - 1];
      const content = top.querySelector(".modal-content");
      if (!content) return;
      if (!content.contains(e.target) && top.contains(e.target)) {
        closeModalEl(top);
      }
    },
    true
  );
})();

// =================================================================
// 开发者测试函数 - 用于测试合并去重功能
// =================================================================

/**
 * 测试词库合并去重功能
 * 在浏览器控制台调用：testMergeWithDuplicates()
 */
window.testMergeWithDuplicates = function () {
  console.log("开始测试词库合并去重功能...");

  try {
    // 备份当前数据（用于测试恢复）
    const backupVocabularies = localStorage.getItem(STORAGE_KEYS.VOCABULARIES);
    const backupWordBank = localStorage.getItem(STORAGE_KEYS.WORD_BANK);

    // 创建测试数据
    const testVocabularies = [
      {
        id: "test_source",
        name: "测试源词库",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "test_target",
        name: "测试目标词库",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const testWords = [
      // 源词库中的单词
      {
        word: "apple",
        translations: ["苹果"],
        vocabularyId: "test_source",
        favorite: false,
        modes: {
          context: { errors: 2, practiceCount: 5 },
          blank: { errors: 1, practiceCount: 3 },
        },
      },
      {
        word: "banana",
        translations: ["香蕉"],
        vocabularyId: "test_source",
        favorite: true,
        modes: {
          context: { errors: 0, practiceCount: 2 },
          blank: { errors: 1, practiceCount: 1 },
        },
      },
      // 目标词库中的单词（包含重复）
      {
        word: "apple", // 与源词库重复
        translations: ["苹果", "果实"],
        vocabularyId: "test_target",
        favorite: false,
        modes: {
          context: { errors: 1, practiceCount: 3 },
          blank: { errors: 2, practiceCount: 4 },
        },
      },
      {
        word: "orange",
        translations: ["橙子"],
        vocabularyId: "test_target",
        favorite: false,
        modes: {
          context: { errors: 0, practiceCount: 1 },
          blank: { errors: 0, practiceCount: 1 },
        },
      },
    ];

    // 设置测试数据
    safeSetItem(STORAGE_KEYS.VOCABULARIES, testVocabularies);
    safeSetItem(STORAGE_KEYS.WORD_BANK, testWords);

    console.log("测试前数据:");
    console.log(
      "源词库单词:",
      testWords.filter((w) => w.vocabularyId === "test_source")
    );
    console.log(
      "目标词库单词:",
      testWords.filter((w) => w.vocabularyId === "test_target")
    );

    // 执行合并
    mergeVocabularies("test_source", "test_target");

    // 检查结果
    const resultWords = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
    const resultVocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
    const targetWords = resultWords.filter(
      (w) => w.vocabularyId === "test_target"
    );

    console.log("合并后结果:");
    console.log("目标词库单词:", targetWords);
    console.log("剩余词库:", resultVocabularies);

    // 验证结果
    const appleWord = targetWords.find((w) => w.word.toLowerCase() === "apple");
    const bananaWord = targetWords.find(
      (w) => w.word.toLowerCase() === "banana"
    );
    const orangeWord = targetWords.find(
      (w) => w.word.toLowerCase() === "orange"
    );

    console.log("验证结果:");

    // 验证apple单词的合并
    if (appleWord) {
      console.log("✓ apple单词存在");
      console.log("翻译:", appleWord.translations);
      console.log('应该包含: ["苹果", "果实"]');
      console.log(
        "context统计 - errors: ",
        appleWord.modes.context.errors,
        "(应为3)",
        "practiceCount:",
        appleWord.modes.context.practiceCount,
        "(应为8)"
      );
      console.log(
        "blank统计 - errors: ",
        appleWord.modes.blank.errors,
        "(应为3)",
        "practiceCount:",
        appleWord.modes.blank.practiceCount,
        "(应为7)"
      );
    } else {
      console.error("✗ apple单词缺失");
    }

    // 验证banana单词的转移
    if (bananaWord) {
      console.log("✓ banana单词存在");
      console.log("收藏状态:", bananaWord.favorite, "(应为true)");
    } else {
      console.error("✗ banana单词缺失");
    }

    // 验证orange单词的保留
    if (orangeWord) {
      console.log("✓ orange单词保留");
    } else {
      console.error("✗ orange单词缺失");
    }

    // 验证源词库是否被删除
    const sourceVocabExists = resultVocabularies.some(
      (v) => v.id === "test_source"
    );
    if (!sourceVocabExists) {
      console.log("✓ 源词库已删除");
    } else {
      console.error("✗ 源词库未删除");
    }

    // 恢复原始数据
    if (backupVocabularies) {
      try {
        localStorage.setItem("vocabularies", backupVocabularies);
      } catch (e) {
        console.error("恢复词库数据失败:", e);
      }
    }
    if (backupWordBank) {
      try {
        localStorage.setItem("wordBank", backupWordBank);
      } catch (e) {
        console.error("恢复单词数据失败:", e);
      }
    }

    console.log("测试完成，数据已恢复");
  } catch (error) {
    console.error("测试过程中发生错误:", error);
  }
};

// 监听词库状态按钮的状态变化事件
document.addEventListener("statuschange", function (event) {
  const { vocabularyId, status } = event.detail;
  // 调用现有的toggleVocabularyStatus函数来处理状态变化
  toggleVocabularyStatus(vocabularyId);
});

// =================================================================
// 用户数据管理功能
// =================================================================

/**
 * 加载并显示用户数据
 */
function loadUserDataDisplay() {
  const profile = getUserProfile();

  // 更新显示卡片
  document.getElementById("userCoinsDisplay").textContent = profile.coins || 0;
  document.getElementById("userDiamondsDisplay").textContent =
    profile.diamonds || 0;
  document.getElementById("userLevelDisplay").textContent = profile.level || 1;
  document.getElementById("userStreakDisplay").textContent =
    profile.streak || 0;
  document.getElementById("userWordsDisplay").textContent =
    profile.totalWordsLearned || 0;

  // 更新表单输入
  document.getElementById("editCoins").value = profile.coins || 0;
  document.getElementById("editDiamonds").value = profile.diamonds || 0;
  document.getElementById("editExp").value = profile.exp || 0;
  document.getElementById("editLevel").value = profile.level || 1;
  document.getElementById("editStreak").value = profile.streak || 0;
  document.getElementById("editTotalWords").value =
    profile.totalWordsLearned || 0;
  document.getElementById("editPracticeTime").value =
    profile.totalPracticeTime || 0;

  // 加载 Mix 模式题目数量设置
  const mixSettings = safeGetItem("mixModeSettings", { totalQuestions: 10 });
  document.getElementById("editMixQuestions").value =
    mixSettings.totalQuestions || 10;

  // 加载并显示当前 Mix 进度
  loadMixProgressStatus();

  // 更新详细信息
  const createdAt = profile.createdAt
    ? new Date(profile.createdAt).toLocaleString("zh-CN")
    : "-";
  const lastLogin = profile.lastLoginDate || "-";
  const practiceHours = ((profile.totalPracticeTime || 0) / 60).toFixed(1);

  document.getElementById("userCreatedAt").textContent = createdAt;
  document.getElementById("userLastLogin").textContent = lastLogin;
  document.getElementById("userPracticeHours").textContent = practiceHours;
}

/**
 * 保存用户数据
 */
function saveUserData() {
  const coins = parseInt(document.getElementById("editCoins").value) || 0;
  const diamonds = parseInt(document.getElementById("editDiamonds").value) || 0;
  const exp = parseInt(document.getElementById("editExp").value) || 0;
  const level = parseInt(document.getElementById("editLevel").value) || 1;
  const streak = parseInt(document.getElementById("editStreak").value) || 0;
  const totalWords =
    parseInt(document.getElementById("editTotalWords").value) || 0;
  const practiceTime =
    parseInt(document.getElementById("editPracticeTime").value) || 0;
  const mixQuestions =
    parseInt(document.getElementById("editMixQuestions").value) || 10;

  // 验证输入
  if (
    coins < 0 ||
    diamonds < 0 ||
    exp < 0 ||
    level < 1 ||
    streak < 0 ||
    totalWords < 0 ||
    practiceTime < 0
  ) {
    showToast("❌ 数值不能为负数！", "error");
    return;
  }

  // 验证 Mix 题目数量范围
  if (mixQuestions < 1 || mixQuestions > 50) {
    showToast("❌ Mix 题目数量必须在 1-50 之间！", "error");
    return;
  }

  // 更新用户档案
  const updates = {
    coins,
    diamonds,
    exp,
    level,
    streak,
    totalWordsLearned: totalWords,
    totalPracticeTime: practiceTime,
  };

  updateUserProfile(updates);

  // 保存 Mix 模式设置
  safeSetItem("mixModeSettings", { totalQuestions: mixQuestions });

  // 重新加载显示
  loadUserDataDisplay();

  showToast("✅ 用户数据已保存！", "success");

  // 触发自定义事件,通知其他组件更新
  window.dispatchEvent(
    new CustomEvent("userProfileUpdated", { detail: updates })
  );
}

/**
 * 加载并显示 Mix 进度状态
 */
function loadMixProgressStatus() {
  const savedProgress = safeGetItem("mixPracticeProgress", null);
  const statusDiv = document.getElementById("mixProgressStatus");
  const editSection = document.getElementById("mixProgressEditSection");
  const saveBtn = document.getElementById("saveMixProgressBtn");

  if (!savedProgress || savedProgress.completed) {
    // 没有进行中的进度
    statusDiv.innerHTML =
      '<p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">暂无进行中的 Mix 练习</p>';
    editSection.style.display = "none";
    saveBtn.style.display = "none";
    return;
  }

  // 显示当前进度
  const { currentQuestion, totalQuestions, correct, errors, streak } =
    savedProgress;
  const accuracy =
    currentQuestion > 0 ? ((correct / currentQuestion) * 100).toFixed(1) : 0;

  statusDiv.innerHTML = `
    <div style="display: grid; gap: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: var(--text-primary); font-weight: 600; font-size: 1.1rem;">📊 进度：${currentQuestion} / ${totalQuestions}</span>
        <span style="color: var(--primary); font-weight: 600;">${accuracy}% 正确率</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.9rem;">
        <div><span style="color: var(--success);">✓ ${correct}</span> 正确</div>
        <div><span style="color: var(--error);">✗ ${errors}</span> 错误</div>
        <div><span style="color: var(--info);">🔥 ${streak}</span> 连击</div>
      </div>
    </div>
  `;

  // 显示编辑区域
  editSection.style.display = "block";
  saveBtn.style.display = "block";
  document.getElementById("editMixCurrentQuestion").value = currentQuestion;
  document.getElementById("mixTotalQuestions").textContent = totalQuestions;
}

/**
 * 保存 Mix 进度修改
 */
function saveMixProgress() {
  const savedProgress = safeGetItem("mixPracticeProgress", null);

  if (!savedProgress || savedProgress.completed) {
    showToast("❌ 没有找到进行中的 Mix 练习", "error");
    return;
  }

  const newCurrentQuestion = parseInt(
    document.getElementById("editMixCurrentQuestion").value
  );
  const totalQuestions = savedProgress.totalQuestions;

  // 验证输入
  if (
    isNaN(newCurrentQuestion) ||
    newCurrentQuestion < 0 ||
    newCurrentQuestion > totalQuestions
  ) {
    showToast(`❌ 题号必须在 0 到 ${totalQuestions} 之间！`, "error");
    return;
  }

  // 更新进度
  savedProgress.currentQuestion = newCurrentQuestion;

  // 保存
  safeSetItem("mixPracticeProgress", savedProgress);

  logMessage(
    "info",
    "Mix进度修改",
    `已将进度修改为 ${newCurrentQuestion}/${totalQuestions}`
  );
  showToast(
    `✅ 进度已修改为 ${newCurrentQuestion}/${totalQuestions}`,
    "success"
  );

  // 刷新显示
  setTimeout(() => {
    loadMixProgressStatus();
  }, 500);
}

/**
 * 清除未完成的 Mix 进度
 */
function clearMixProgress() {
  const confirmMsg =
    "确定要清除未完成的 Mix 练习进度吗？\n\n这将删除当前保存的进度数据，但不会影响已完成的练习记录。";

  if (!confirm(confirmMsg)) {
    return;
  }

  // 检查是否存在未完成进度
  const savedProgress = safeGetItem("mixPracticeProgress", null);

  if (!savedProgress) {
    showToast("ℹ️ 没有找到未完成的 Mix 进度", "info");
    return;
  }

  if (savedProgress.completed) {
    showToast("ℹ️ 当前进度已完成，无需清除", "info");
    return;
  }

  // 删除进度数据
  safeRemoveItem("mixPracticeProgress");

  logMessage("info", "Mix进度管理", "已清除未完成的 Mix 练习进度");
  showToast("✅ 已清除未完成的 Mix 进度", "success");

  // 显示进度信息
  const progressInfo = `已清除进度：${savedProgress.currentQuestion}/${savedProgress.totalQuestions} 题`;
  setTimeout(() => {
    showToast(progressInfo, "info", 4000);
    loadMixProgressStatus(); // 刷新显示
  }, 500);
}

/**
 * 重置用户数据
 */
function resetUserData() {
  const message =
    "确定要重置所有用户数据吗？\n\n这将清空金币、经验、等级、连续天数等所有数据！";

  if (!confirm(message)) {
    return;
  }

  // 重置为初始值
  const resetProfile = {
    coins: 0,
    exp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: new Date().toISOString().split("T")[0],
    totalWordsLearned: 0,
    totalPracticeTime: 0,
    createdAt: new Date().toISOString(),
  };

  safeSetItem(STORAGE_KEYS.USER_PROFILE, resetProfile);

  // 重新加载显示
  loadUserDataDisplay();

  showToast("🔄 用户数据已重置！", "success");

  // 触发自定义事件
  window.dispatchEvent(
    new CustomEvent("userProfileUpdated", { detail: resetProfile })
  );
}

/**
 * 初始化用户数据标签页
 * 在切换到用户数据标签时调用
 */
function initializeUserDataTab() {
  loadUserDataDisplay();
  loadAchievementsList();
}

// ==================== 测试工具功能 ====================

/**
 * 测试显示 Mix 模式的奖励弹窗
 */
function testShowMixReward() {
  // 创建测试奖励数据
  const testRewards = {
    coins: 25,
    exp: 50,
    accuracy: 0.8,
    streak: 5,
    isLevelUp: false,
    newLevel: null,
  };

  // 检查是否存在 showRewardNotification 函数（来自 mix.js）
  if (typeof showRewardNotification !== "function") {
    // 如果不在 mix.html 页面，创建一个临时的奖励弹窗
    showTestRewardPopup(testRewards);
  } else {
    // 如果在 mix.html 页面，直接调用
    showRewardNotification(testRewards);
  }
}

/**
 * 创建测试用的奖励弹窗
 */
function showTestRewardPopup(rewards) {
  // 移除已存在的弹窗和遮罩
  const existingPopup = document.querySelector(".test-reward-popup");
  const existingOverlay = document.querySelector(".test-reward-overlay");
  if (existingPopup) existingPopup.remove();
  if (existingOverlay) existingOverlay.remove();

  // 创建遮罩层
  const overlay = document.createElement("div");
  overlay.className = "test-reward-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const popup = document.createElement("div");
  popup.className = "test-reward-popup";
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.8);
    background: white;
    padding: 2.5rem;
    border-radius: 1.5rem;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    text-align: center;
    min-width: 320px;
    max-width: 90vw;
    opacity: 0;
    transition: all 0.3s ease;
  `;

  popup.innerHTML = `
    <div style="font-size: 4rem; margin-bottom: 1rem; animation: iconBounce 0.6s ease;">🎁</div>
    <h3 style="color: var(--primary); font-size: 1.5rem; margin-bottom: 1.5rem;">恭喜完成练习！</h3>
    <div style="background: #f8fafc; border-radius: 1rem; padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b;">💰 金币奖励</span>
        <span style="color: var(--primary); font-weight: 600;">+${
          rewards.coins
        }</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
        <span style="color: #64748b;">⭐ 经验奖励</span>
        <span style="color: var(--primary); font-weight: 600;">+${
          rewards.exp
        }</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
        <span style="color: #64748b;">🎯 正确率</span>
        <span style="color: var(--success); font-weight: 600;">${(
          rewards.accuracy * 100
        ).toFixed(0)}%</span>
      </div>
      ${
        rewards.streak >= 5
          ? `
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.5rem; background: linear-gradient(90deg, #fef3c7, #fde68a); border-radius: 0.5rem; padding: 0.75rem;">
        <span style="color: #92400e;">🔥 连击奖励</span>
        <span style="color: #92400e; font-weight: 600;">+5 金币</span>
      </div>
      `
          : ""
      }
    </div>
    <button onclick="this.closest('.test-reward-popup').remove(); document.querySelector('.test-reward-overlay').remove();"
      style="width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border: none; border-radius: 3rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
      太棒了！
    </button>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // 添加显示动画
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  });

  // 点击遮罩关闭
  overlay.addEventListener("click", () => {
    popup.style.opacity = "0";
    popup.style.transform = "translate(-50%, -50%) scale(0.8)";
    overlay.style.opacity = "0";
    setTimeout(() => {
      popup.remove();
      overlay.remove();
    }, 300);
  });

  showToast("💡 这是测试弹窗，仅用于预览效果", "info");
}

/**
 * 测试显示成就通知
 */
function testShowAchievement() {
  // 获取所有成就定义
  const achievements = initializeAchievements();

  // 找一个未解锁的成就作为测试
  const unlockedIds = achievements.unlocked;
  const testAchievement =
    achievements.definitions.find((a) => !unlockedIds.includes(a.id)) ||
    achievements.definitions[0]; // 如果都解锁了，用第一个

  // 直接调用 common.js 中的通用函数
  showAchievementNotification(testAchievement);

  showToast("💡 这是测试通知，仅用于预览效果，不会实际解锁成就", "info", 3000);
}

// ==================== 成就管理功能 ====================

/**
 * 加载并显示成就列表
 */
function loadAchievementsList() {
  const achievements = initializeAchievements();
  const container = document.getElementById("achievementsList");

  if (!container) return;

  container.innerHTML = achievements.definitions
    .map((achievement) => {
      const isUnlocked = achievements.unlocked.includes(achievement.id);
      const requirementBadges = [];

      if (achievement.type === "TOTAL_WORDS") {
        requirementBadges.push(`📚 要求: ${achievement.requirement} 个单词`);
      }

      if (achievement.type === "STREAK") {
        requirementBadges.push(`🔥 要求: 连续 ${achievement.requirement} 天`);
      }

      const requirementsHtml = requirementBadges
        .map((text) => `<span>${text}</span>`)
        .join("");
      const statusClass = isUnlocked ? "status-unlocked" : "";
      const actionButton = isUnlocked
        ? `<button class="btn btn-secondary btn-compact" onclick="lockAchievement('${achievement.id}')">🔒 锁定</button>`
        : `<button class="btn btn-success btn-compact" onclick="unlockAchievementManually('${achievement.id}')">🔓 解锁</button>`;

      return `
      <div class="admin-achievement-card ${isUnlocked ? "unlocked" : ""}">
        <div class="admin-achievement-icon">${achievement.icon}</div>
        <div class="admin-achievement-content">
          <div class="admin-achievement-header">
            <strong>${achievement.name}</strong>
            <span class="admin-achievement-status ${statusClass}">
              ${isUnlocked ? "✓ 已解锁" : "未解锁"}
            </span>
          </div>
          <p class="admin-achievement-description">${
            achievement.description
          }</p>
          <div class="admin-achievement-meta">
            <span>💰 奖励: ${achievement.reward} 金币</span>
            ${requirementsHtml}
          </div>
        </div>
        <div class="admin-achievement-actions">
          ${actionButton}
        </div>
      </div>
    `;
    })
    .join("");
}

/**
 * 手动解锁成就（用于测试）
 */
function unlockAchievementManually(achievementId) {
  const achievements = initializeAchievements();
  const achievement = achievements.definitions.find(
    (a) => a.id === achievementId
  );

  if (!achievement) {
    showToast("❌ 成就不存在", "error");
    return;
  }

  if (achievements.unlocked.includes(achievementId)) {
    showToast("⚠️ 该成就已经解锁", "info");
    return;
  }

  // 解锁成就
  achievements.unlocked.push(achievementId);
  safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);

  // 给予奖励
  addCoins(achievement.reward);

  // 显示成就解锁通知（使用新样式）
  showAchievementNotification(achievement);

  // 刷新显示
  loadAchievementsList();
  loadUserDataDisplay();
}

/**
 * 锁定成就（用于测试）
 */
function lockAchievement(achievementId) {
  const achievements = initializeAchievements();
  const achievement = achievements.definitions.find(
    (a) => a.id === achievementId
  );

  if (!achievement) {
    showToast("❌ 成就不存在", "error");
    return;
  }

  if (!achievements.unlocked.includes(achievementId)) {
    showToast("⚠️ 该成就尚未解锁", "info");
    return;
  }

  // 锁定成就（从已解锁列表移除）
  achievements.unlocked = achievements.unlocked.filter(
    (id) => id !== achievementId
  );
  safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);

  // 刷新显示
  loadAchievementsList();

  showToast(
    `🔒 成就已锁定：${achievement.icon} ${achievement.name}\n（不扣除已获得的金币）`,
    "info",
    3000
  );
}

/**
 * 重置所有成就
 */
function resetAllAchievements() {
  if (
    !confirm(
      "确定要重置所有成就吗？\n\n这将清空所有已解锁的成就，但不会扣除已获得的金币奖励！"
    )
  ) {
    return;
  }

  const achievements = initializeAchievements();
  achievements.unlocked = [];
  safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);

  // 刷新显示
  loadAchievementsList();

  showToast("🔄 所有成就已重置！", "success");
}

// =================================================================
// 设置功能
// =================================================================

/**
 * 初始化设置页面
 */
function initSettings() {
  const themeSelect = document.getElementById("themeSelect");
  if (!themeSelect) return;

  // 获取所有可用主题
  const allThemes = Object.keys(THEME_CONFIGS).map((id) => ({
    id: id,
    name: THEME_CONFIGS[id].name,
    isDefault: THEME_CONFIGS[id].isDefault || false,
  }));

  // 填充主题选项
  themeSelect.innerHTML = allThemes
    .map(
      (theme) => `
      <option value="${theme.id}">
        ${theme.name}${theme.isDefault ? " ⭐" : ""}
      </option>
    `
    )
    .join("");

  // 获取当前装备的主题
  const inventory = initializeInventory();
  const currentThemeId = inventory.equipped || "theme_light";
  themeSelect.value = currentThemeId;
}

/**
 * 处理主题切换
 */
function handleThemeChange() {
  const themeSelect = document.getElementById("themeSelect");
  if (!themeSelect) return;

  const selectedThemeId = themeSelect.value;

  // 装备选择的主题
  if (typeof equipTheme !== "undefined") {
    equipTheme(selectedThemeId);
  } else {
    // 直接应用主题（回退方案，带动画）
    const inventory = initializeInventory();
    inventory.equipped = selectedThemeId;
    safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
    applyEquippedThemeSkin(true);

    // 获取主题名称
    const themeName = THEME_CONFIGS[selectedThemeId]?.name || "未知主题";
    showToast(`🎨 主题已切换为 ${themeName}`, "success");
  }
}

/**
 * 清除 Service Worker 缓存
 */
async function clearServiceWorkerCache() {
  try {
    // 检查是否支持 Service Worker
    if (!("serviceWorker" in navigator)) {
      showToast("❌ 您的浏览器不支持 Service Worker", "error");
      return;
    }

    // 确认操作
    if (
      !confirm(
        "确定要清除所有缓存吗？\n\n清除后需要重新加载页面以应用最新版本。"
      )
    ) {
      return;
    }

    // 先尝试调用 cacheManager 使用 Service Worker API 清理,以便 SW 能感知到
    if (navigator.serviceWorker.controller && window.cacheManager) {
      const success = await window.cacheManager.clearAll();
      if (success) {
        showToast("✅ 缓存已清除！页面将在 3 秒后刷新...", "success", 3000);
        setTimeout(() => window.location.reload(), 3000);
        return;
      }
    }

    // 如果 cacheManager 不可用,退回到直接删除所有缓存 + 注销 SW
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );

    showToast(
      "⚠️ 已手动清除缓存并注销 SW，需重新打开页面以重建最新版本",
      "info",
      4000
    );
    setTimeout(() => window.location.reload(), 2000);
  } catch (error) {
    console.error("清除缓存失败:", error);
    showToast("❌ 清除缓存失败: " + error.message, "error");
  }
}

// 页面加载时初始化设置
document.addEventListener("DOMContentLoaded", () => {
  // 监听标签切换，当切换到设置标签时初始化
  const settingsTab = document.getElementById("tab-settings");
  if (settingsTab) {
    settingsTab.addEventListener("change", () => {
      if (settingsTab.checked) {
        initSettings();
      }
    });
  }
});
