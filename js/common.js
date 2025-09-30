// =================================================================
// 本地存储管理
// =================================================================

/**
 * 如果不存在则初始化localStorage的默认值。
 * 包括支持的模式、单词库和练习记录。
 */
function initializeStorage() {
  // 如果不存在，则初始化支持的模式列表。
  if (!localStorage.getItem("supportedModes")) {
    const defaultModes = [
      { id: "context", name: "上下文猜词", active: true },
      { id: "blank", name: "填空练习", active: true },
    ];
    localStorage.setItem("supportedModes", JSON.stringify(defaultModes));
  } else {
    // 确保存在'blank'模式以保持向后兼容性。
    const modes = JSON.parse(localStorage.getItem("supportedModes"));
    if (!modes.some((mode) => mode.id === "blank")) {
      modes.push({ id: "blank", name: "填空练习", active: true });
      localStorage.setItem("supportedModes", JSON.stringify(modes));
    }
  }

  // 如果不存在，则初始化词库。
  if (!localStorage.getItem("vocabularies")) {
    const defaultVocabulary = {
      id: "default",
      name: "默认词库",
      description: "",
      enabled: true, // 新创建的词库默认启用
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("vocabularies", JSON.stringify([defaultVocabulary]));
  }

  // 如果不存在，则用默认单词初始化单词库。
  if (!localStorage.getItem("wordBank")) {
    const defaultWords = [
      {
        word: "vivid",
        translations: ["生动的"],
        modes: {
          context: { errors: 0, practiceCount: 0 },
          blank: { errors: 0, practiceCount: 0 },
        },
        vocabularyId: "default",
      },
      {
        word: "ambiguous",
        translations: ["模糊的"],
        modes: {
          context: { errors: 0, practiceCount: 0 },
          blank: { errors: 0, practiceCount: 0 },
        },
        vocabularyId: "default",
      },
      {
        word: "profound",
        translations: ["深刻的"],
        modes: {
          context: { errors: 0, practiceCount: 0 },
          blank: { errors: 0, practiceCount: 0 },
        },
        vocabularyId: "default",
      },
    ];
    localStorage.setItem("wordBank", JSON.stringify(defaultWords));
  } else {
    // 如有必要，迁移旧数据格式。
    migrateWordData();
  }

  // 迁移词库数据，确保所有词库都有enabled属性
  migrateVocabularyData();

  // 如果不存在，则初始化练习记录。
  if (!localStorage.getItem("practiceRecords")) {
    localStorage.setItem("practiceRecords", JSON.stringify([]));
  }
}

/**
 * 迁移旧的单词数据结构到新格式，包括模式支持和词库归属。
 */
function migrateWordData() {
  try {
    const wordBank = JSON.parse(localStorage.getItem("wordBank") || "[]");
    let needsMigration = wordBank.some((word) => !word.modes);
    let needsVocabularyMigration = wordBank.some((word) => !word.vocabularyId);

    if (needsMigration || needsVocabularyMigration) {
      // 确保默认词库存在
      let vocabularies = JSON.parse(
        localStorage.getItem("vocabularies") || "[]"
      );
      const defaultVocabulary = vocabularies.find((v) => v.id === "default");
      if (!defaultVocabulary) {
        vocabularies.push({
          id: "default",
          name: "默认词库",
          description: "",
          enabled: true, // 确保迁移时创建的默认词库也是启用状态
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem("vocabularies", JSON.stringify(vocabularies));
      }

      const migratedWordBank = wordBank.map((word) => {
        let newWord = { ...word };

        // 迁移模式数据结构
        if (!word.modes) {
          newWord.modes = {
            context: {
              errors: word.errors || 0,
              practiceCount: word.practiceCount || 0,
            },
            blank: { errors: 0, practiceCount: 0 },
          };
          // 删除旧属性
          delete newWord.errors;
          delete newWord.practiceCount;
        }

        // 迁移词库归属
        if (!word.vocabularyId) {
          newWord.vocabularyId = "default";
        }

        return newWord;
      });

      localStorage.setItem("wordBank", JSON.stringify(migratedWordBank));
      console.log("单词数据已迁移到新格式，包含词库归属信息。");
    }
  } catch (error) {
    console.error("迁移单词数据时出错:", error);
  }
}

/**
 * 迁移词库数据，确保所有词库都有enabled属性
 */
function migrateVocabularyData() {
  try {
    const vocabularies = JSON.parse(
      localStorage.getItem("vocabularies") || "[]"
    );
    let needsMigration = false;

    const migratedVocabularies = vocabularies.map((vocabulary) => {
      if (vocabulary.enabled === undefined) {
        needsMigration = true;
        return {
          ...vocabulary,
          enabled: true, // 现有词库默认为启用状态
          updatedAt: new Date().toISOString(),
        };
      }
      return vocabulary;
    });

    if (needsMigration) {
      localStorage.setItem(
        "vocabularies",
        JSON.stringify(migratedVocabularies)
      );
      console.log("词库数据已迁移，添加了enabled属性。");
    }
  } catch (error) {
    console.error("迁移词库数据时出错:", error);
  }
}

// =================================================================
// 数据访问和工具函数
// =================================================================

/**
 * Retrieves information about a specific learning mode.
 * @param {string} modeId - The ID of the mode (e.g., 'context', 'blank').
 * @returns {Object} - The mode object with its details.
 */
function getModeInfo(modeId) {
  const supportedModes = JSON.parse(
    localStorage.getItem("supportedModes") || "[]"
  );
  return (
    supportedModes.find((mode) => mode.id === modeId) || {
      id: modeId,
      name: modeId,
      active: false,
    }
  );
}

/**
 * Retrieves the practice data for a specific mode from a word object.
 * @param {Object} word - The word object from the word bank.
 * @param {string} mode - The ID of the mode.
 * @returns {{errors: number, practiceCount: number}} - The mode-specific data.
 */
function getWordModeData(word, mode) {
  if (!word.modes || !word.modes[mode]) {
    return { errors: 0, practiceCount: 0 };
  }
  return word.modes[mode];
}

/**
 * Selects a word from the word bank using a weighted random algorithm.
 * The algorithm prioritizes words that are new, have a high error rate, or haven't been practiced recently.
 * @param {string} currentMode - The learning mode to calculate weights for.
 * @param {string} vocabularyId - (可选) 限制词库ID，如果提供则只从该词库选择单词
 * @returns {Object|null} - The selected word object or null if the bank is empty.
 */
function getWeightedWord(currentMode, vocabularyId = null) {
  let words = JSON.parse(localStorage.getItem("wordBank") || "[]");
  if (!words || words.length === 0) return null;

  // 获取所有词库信息
  const vocabularies = JSON.parse(localStorage.getItem("vocabularies") || "[]");

  // 如果指定了词库ID，则只使用该词库的单词
  if (vocabularyId) {
    words = words.filter((word) => word.vocabularyId === vocabularyId);
    if (words.length === 0) return null;

    // 检查指定词库是否启用
    const vocabulary = vocabularies.find((v) => v.id === vocabularyId);
    if (vocabulary && vocabulary.enabled === false) {
      return null;
    }
  } else {
    // 没有指定词库ID，只选择来自启用词库的单词
    const enabledVocabularyIds = vocabularies
      .filter((v) => v.enabled !== false) // 默认启用或明确启用的词库
      .map((v) => v.id);

    words = words.filter((word) =>
      enabledVocabularyIds.includes(word.vocabularyId)
    );
    if (words.length === 0) return null;
  }

  const records = JSON.parse(localStorage.getItem("practiceRecords") || "[]");
  const modeRecords = records.filter((record) => record.mode === currentMode);
  const lastPracticeTime = {};
  modeRecords.forEach((record) => {
    if (record.word) {
      lastPracticeTime[record.word] = Math.max(
        new Date(record.date).getTime(),
        lastPracticeTime[record.word] || 0
      );
    }
  });

  const currentTime = new Date().getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  const weightedList = words.map((word) => {
    const modeData = getWordModeData(word, currentMode);

    // 1. Practice Count Weight: Fewer practices -> higher weight.
    const practiceWeight = Math.pow(0.85, modeData.practiceCount || 0);

    // 2. Error Rate Weight: Higher error rate -> higher weight.
    const errorRate =
      modeData.practiceCount > 0 ? modeData.errors / modeData.practiceCount : 0;
    const errorWeight = 1 + errorRate * 2;

    // 3. Time Since Last Practice Weight: Longer time -> higher weight.
    const lastPractice = lastPracticeTime[word.word] || 0;
    const daysSince = lastPractice ? (currentTime - lastPractice) / dayInMs : 7; // Default to 7 days for new words.
    const timeWeight = Math.min(2, 1 + daysSince / 7); // Max weight is 2.

    // 4. Favorite Weight: Favorited words get a boost.
    const favoriteWeight = word.favorite ? 1.5 : 1;

    // 5. Base Weight: Ensures every word has a chance.
    const baseWeight = 0.3;

    const finalWeight =
      (baseWeight + practiceWeight * errorWeight * timeWeight) * favoriteWeight;

    return { ...word, weight: finalWeight };
  });

  const totalWeight = weightedList.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const word of weightedList) {
    random -= word.weight;
    if (random < 0) return word;
  }

  return weightedList[0]; // Fallback
}

/**
 * Adds a new practice record to localStorage.
 * @param {string} word - The word that was practiced.
 * @param {boolean} isCorrect - Whether the answer was correct.
 * @param {string} mode - The learning mode.
 */
function updateRecords(word, isCorrect, mode) {
  const records = JSON.parse(localStorage.getItem("practiceRecords"));
  records.push({
    date: new Date().toISOString(),
    correct: isCorrect,
    word: word,
    mode: mode,
  });
  localStorage.setItem("practiceRecords", JSON.stringify(records));
}

/**
 * Calculates the weight of a word for weighted random selection.
 * @param {object} word - The word object.
 * @param {string} mode - The current practice mode.
 * @param {Array} practiceRecords - All practice records.
 * @returns {number} - The calculated weight.
 */
function calculateWordWeight(word, mode, practiceRecords) {
  const modeData = getWordModeData(word, mode);
  const now = new Date().getTime();

  // Find the last practice time for this specific word and mode
  const lastPracticeRecord = practiceRecords
    .filter((r) => r.word === word.word && r.mode === mode)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const lastPracticeTime = lastPracticeRecord
    ? new Date(lastPracticeRecord.date).getTime()
    : 0;

  // Time-based weight: more recent practice lowers the weight
  const hoursSincePractice = (now - lastPracticeTime) / (1000 * 60 * 60);
  const timeWeight = Math.log(Math.max(hoursSincePractice, 1)) + 1; // Logarithmic scale to not penalize old words too much

  // Error-based weight: more errors increase the weight
  const errorWeight = Math.pow(modeData.errors + 1, 1.5); // Exponentially increase weight with errors

  // Practice count weight: fewer practices increase the weight
  const practiceWeight = 1 / (modeData.practiceCount + 1);

  // Favorite weight: favorited words get a significant boost
  const favoriteWeight = word.favorite ? 5 : 1;

  // Combine weights
  const finalWeight =
    timeWeight * errorWeight * practiceWeight * favoriteWeight;

  return finalWeight;
}

// =================================================================
// UI Utility Functions
// =================================================================

/**
 * Displays a toast notification on the screen.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} [type='info'] - The type of toast.
 * @param {number} [duration=3000] - How long the toast should be visible in ms.
 */
function showToast(message, type = "info", duration = 3000) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    console.error("Toast container not found!");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "i";
  if (type === "success") icon = "✓";
  if (type === "error") icon = "✗";

  toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

/**
 * Shows a skeleton loading state in a given container.
 * @param {HTMLElement} container - The element to show the skeleton in.
 */
function showSkeleton(container) {
  container.innerHTML = `
        <div class="skeleton-fade-in">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line medium"></div>
        </div>
    `;
}

// =================================================================
// 词库管理函数
// =================================================================

/**
 * 获取所有词库列表
 * @returns {Array} 词库数组
 */
function getVocabularies() {
  return JSON.parse(localStorage.getItem("vocabularies") || "[]");
}

/**
 * 根据ID获取特定词库
 * @param {string} vocabularyId - 词库ID
 * @returns {Object|null} 词库对象或null
 */
function getVocabularyById(vocabularyId) {
  const vocabularies = getVocabularies();
  return vocabularies.find((v) => v.id === vocabularyId) || null;
}

/**
 * 获取特定词库下的所有单词
 * @param {string} vocabularyId - 词库ID
 * @returns {Array} 单词数组
 */
function getWordsByVocabulary(vocabularyId) {
  const wordBank = JSON.parse(localStorage.getItem("wordBank") || "[]");
  return wordBank.filter((word) => word.vocabularyId === vocabularyId);
}

/**
 * 创建新词库
 * @param {string} name - 词库名称
 * @param {string} description - 词库描述
 * @returns {string} 新词库的ID
 */
function createVocabulary(name, description = "") {
  const vocabularies = getVocabularies();
  const id =
    "vocab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

  const newVocabulary = {
    id,
    name,
    description,
    enabled: true, // 新词库默认启用
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  vocabularies.push(newVocabulary);
  localStorage.setItem("vocabularies", JSON.stringify(vocabularies));

  return id;
}

/**
 * 更新词库信息
 * @param {string} vocabularyId - 词库ID
 * @param {string} name - 新名称
 * @param {string} description - 新描述
 * @returns {boolean} 是否更新成功
 */
function updateVocabulary(vocabularyId, name, description = "") {
  const vocabularies = getVocabularies();
  const index = vocabularies.findIndex((v) => v.id === vocabularyId);

  if (index === -1) return false;

  vocabularies[index].name = name;
  vocabularies[index].description = description;
  vocabularies[index].updatedAt = new Date().toISOString();

  localStorage.setItem("vocabularies", JSON.stringify(vocabularies));
  return true;
}

/**
 * 删除词库及其下所有单词
 * @param {string} vocabularyId - 词库ID
 * @returns {boolean} 是否删除成功
 */
function deleteVocabulary(vocabularyId) {
  if (vocabularyId === "default") {
    throw new Error("不能删除默认词库");
  }

  const vocabularies = getVocabularies();
  const index = vocabularies.findIndex((v) => v.id === vocabularyId);

  if (index === -1) return false;

  // 删除词库下的所有单词
  const wordBank = JSON.parse(localStorage.getItem("wordBank") || "[]");
  const filteredWords = wordBank.filter(
    (word) => word.vocabularyId !== vocabularyId
  );
  localStorage.setItem("wordBank", JSON.stringify(filteredWords));

  // 删除词库
  vocabularies.splice(index, 1);
  localStorage.setItem("vocabularies", JSON.stringify(vocabularies));

  return true;
}

/**
 * 合并词库（将源词库的单词移动到目标词库，然后删除源词库）
 * @param {string} sourceVocabularyId - 源词库ID
 * @param {string} targetVocabularyId - 目标词库ID
 * @returns {boolean} 是否合并成功
 */
function mergeVocabularies(sourceVocabularyId, targetVocabularyId) {
  if (sourceVocabularyId === "default") {
    throw new Error("不能合并默认词库");
  }

  if (sourceVocabularyId === targetVocabularyId) {
    throw new Error("源词库和目标词库不能相同");
  }

  const vocabularies = getVocabularies();
  const sourceVocab = vocabularies.find((v) => v.id === sourceVocabularyId);
  const targetVocab = vocabularies.find((v) => v.id === targetVocabularyId);

  if (!sourceVocab || !targetVocab) {
    throw new Error("词库不存在");
  }

  // 将源词库的单词转移到目标词库
  const wordBank = JSON.parse(localStorage.getItem("wordBank") || "[]");
  wordBank.forEach((word) => {
    if (word.vocabularyId === sourceVocabularyId) {
      word.vocabularyId = targetVocabularyId;
    }
  });
  localStorage.setItem("wordBank", JSON.stringify(wordBank));

  // 删除源词库
  const sourceIndex = vocabularies.findIndex(
    (v) => v.id === sourceVocabularyId
  );
  vocabularies.splice(sourceIndex, 1);
  localStorage.setItem("vocabularies", JSON.stringify(vocabularies));

  return true;
}

/**
 * 切换词库的启用/禁用状态
 * @param {string} vocabularyId - 词库ID
 * @returns {boolean} 是否切换成功
 */
function toggleVocabularyEnabled(vocabularyId) {
  const vocabularies = getVocabularies();
  const index = vocabularies.findIndex((v) => v.id === vocabularyId);

  if (index === -1) {
    throw new Error("词库不存在");
  }

  // 如果词库没有enabled属性，默认为true
  if (vocabularies[index].enabled === undefined) {
    vocabularies[index].enabled = true;
  }

  // 切换状态
  vocabularies[index].enabled = !vocabularies[index].enabled;
  vocabularies[index].updatedAt = new Date().toISOString();

  localStorage.setItem("vocabularies", JSON.stringify(vocabularies));
  return true;
}

// =================================================================
// 提示面板管理
// =================================================================

const HintPanelManager = {
  container: null,
  inputElement: null,
  hints: [],
  currentIndex: 0,
  isVisible: false,

  init(container, inputEl) {
    this.container = container;
    this.inputElement = inputEl;
    this.hints = [];
    this.currentIndex = 0;
    this.isVisible = false;

    this.container.innerHTML = `
            <div class="hint-panel" style="display: none;">
                <div class="hint-header">
                    <span class="hint-counter">提示 1/1</span>
                    <div class="hint-nav">
                        <button class="hint-nav-btn hint-prev" disabled>‹</button>
                        <button class="hint-nav-btn hint-next" disabled>›</button>
                    </div>
                </div>
                <div class="hint-content">
                    <div class="hint-text">暂无提示</div>
                </div>
            </div>
        `;

    const prevBtn = this.container.querySelector(".hint-prev");
    const nextBtn = this.container.querySelector(".hint-next");

    prevBtn.addEventListener("click", () =>
      this.switchHint(this.currentIndex - 1)
    );
    nextBtn.addEventListener("click", () =>
      this.switchHint(this.currentIndex + 1)
    );
  },

  pushHint(level, text) {
    this.hints.push({ level, text });
    this.currentIndex = this.hints.length - 1;
    this.updatePanel();
    this.show();
  },

  async pushAiHint(
    wordData,
    context = null,
    hintType = "complex",
    onSuccess = null,
    onError = null
  ) {
    try {
      let loadingText = "🤖 AI正在生成提示...";
      let aiHintText = "";

      if (hintType === "complex") {
        loadingText = "🤖 AI正在生成超级复杂的提示...";
        this.pushHint(1, loadingText);
        aiHintText = await getApiHint(wordData, context);
        this.hints[this.hints.length - 1].text = `🤖 AI提示：${aiHintText}`;
      } else if (hintType === "simple") {
        loadingText = "🤖 AI正在生成超级简单的提示...";
        this.pushHint(2, loadingText);
        aiHintText = await getSimpleHint(wordData, context);
        this.hints[this.hints.length - 1].text = `💡 简单提示：${aiHintText}`;
      } else if (hintType === "synonyms") {
        loadingText = "🤖 AI正在生成近义词...";
        this.pushHint(2, loadingText);
        aiHintText = await getSynonymsHint(wordData);
        this.hints[this.hints.length - 1].text = `🔄 近义词：${aiHintText}`;
      } else if (hintType === "contextual") {
        loadingText = "🤖 AI正在分析语境...";
        this.pushHint(1, loadingText);
        aiHintText = await getContextualHint(wordData, context);
        this.hints[this.hints.length - 1].text = `🎯 语境提示：${aiHintText}`;
      }

      this.updatePanel();
      if (onSuccess) onSuccess(aiHintText);
    } catch (error) {
      console.error("AI提示获取失败:", error);

      if (this.hints.length > 0) {
        const retryId = "retry_" + Date.now();
        this.hints[
          this.hints.length - 1
        ].text = `❌ AI提示获取失败，请检查网络连接<br><button class="error-refresh-btn" onclick="HintPanelManager.retryLastAiHint()">🔄 重试</button>`;
        this.hints[this.hints.length - 1].level = 1;
        this.hints[this.hints.length - 1].retryData = {
          wordData,
          context,
          hintType,
        };
        this.updatePanel();
      }

      if (onError) onError(error);
    }
  },

  // 新增：专门处理简单AI提示的方法
  async pushSimpleAiHint(
    wordData,
    context = null,
    onSuccess = null,
    onError = null
  ) {
    return this.pushAiHint(wordData, context, "simple", onSuccess, onError);
  },

  // 新增：专门处理近义词AI提示的方法
  async pushSynonymsHint(wordData, onSuccess = null, onError = null) {
    return this.pushAiHint(wordData, null, "synonyms", onSuccess, onError);
  },

  // 重试最后一个失败的AI提示获取
  async retryLastAiHint() {
    // 找到最后一个有retryData的提示
    let failedHintIndex = -1;
    for (let i = this.hints.length - 1; i >= 0; i--) {
      if (this.hints[i].retryData) {
        failedHintIndex = i;
        break;
      }
    }

    if (failedHintIndex === -1) return;

    const { wordData, context, hintType } =
      this.hints[failedHintIndex].retryData;

    // 更新为加载状态
    let loadingText = "🤖 AI正在重新生成提示...";
    if (hintType === "complex") {
      loadingText = "🤖 AI正在重新生成复杂提示...";
    } else if (hintType === "simple") {
      loadingText = "🤖 AI正在重新生成简单提示...";
    } else if (hintType === "synonyms") {
      loadingText = "🤖 AI正在重新生成近义词...";
    } else if (hintType === "contextual") {
      loadingText = "🤖 AI正在重新分析语境...";
    }

    this.hints[failedHintIndex].text = loadingText;
    this.updatePanel();

    try {
      let aiHintText = "";

      if (hintType === "complex") {
        aiHintText = await getApiHint(wordData, context);
        this.hints[failedHintIndex].text = `🤖 AI提示：${aiHintText}`;
      } else if (hintType === "simple") {
        aiHintText = await getSimpleHint(wordData, context);
        this.hints[failedHintIndex].text = `💡 简单提示：${aiHintText}`;
      } else if (hintType === "synonyms") {
        aiHintText = await getSynonymsHint(wordData);
        this.hints[failedHintIndex].text = `🔄 近义词：${aiHintText}`;
      } else if (hintType === "contextual") {
        aiHintText = await getContextualHint(wordData, context);
        this.hints[failedHintIndex].text = `🎯 语境提示：${aiHintText}`;
      }

      // 清除retryData，表示成功了
      delete this.hints[failedHintIndex].retryData;
      this.updatePanel();
    } catch (error) {
      console.error("AI提示重试失败:", error);
      this.hints[
        failedHintIndex
      ].text = `❌ AI提示获取失败，请检查网络连接<br><button class="error-refresh-btn">🔄 重试</button>`;
      this.updatePanel();
      // Attach event handler to the retry button
      const panel = this.container.querySelector(".hint-panel");
      if (panel) {
        const retryBtn = panel.querySelector(".error-refresh-btn");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            this.retryLastAiHint();
          });
        }
      }
    }
  },

  switchHint(index) {
    if (index < 0 || index >= this.hints.length) return;
    this.currentIndex = index;
    this.updatePanel();
  },

  clearHints() {
    this.hints = [];
    this.currentIndex = 0;
    this.hide();
  },

  show() {
    if (this.hints.length === 0) return;
    const panel = this.container.querySelector(".hint-panel");
    panel.style.display = "block";
    this.isVisible = true;
  },

  hide() {
    const panel = this.container.querySelector(".hint-panel");
    panel.style.display = "none";
    this.isVisible = false;
  },

  updatePanel() {
    if (this.hints.length === 0) return;

    const panel = this.container.querySelector(".hint-panel");
    const counter = panel.querySelector(".hint-counter");
    const content = panel.querySelector(".hint-text");
    const prevBtn = panel.querySelector(".hint-prev");
    const nextBtn = panel.querySelector(".hint-next");

    counter.textContent = `提示 ${this.currentIndex + 1}/${this.hints.length}`;

    const currentHint = this.hints[this.currentIndex];
    // 如果提示文本包含HTML标签，使用innerHTML，否则使用textContent
    if (
      currentHint.text &&
      (currentHint.text.includes("<") || currentHint.text.includes(">"))
    ) {
      content.innerHTML = currentHint.text;
    } else {
      content.textContent = currentHint.text;
    }
    content.className = `hint-text hint-level-${currentHint.level}`;

    prevBtn.disabled = this.currentIndex === 0;
    nextBtn.disabled = this.currentIndex === this.hints.length - 1;
  },

  generateHint(word, wordData, context, mode) {
    const hintCount = this.hints.length + 1;

    if (mode === "context") {
      return this.generateContextHint(word, wordData, context, hintCount);
    } else {
      return this.generateBlankHint(word, wordData, context, hintCount);
    }
  },

  generateContextHint(word, wordData, context, hintCount) {
    let level, text;

    switch (hintCount) {
      case 1:
        // 第一次：复杂的AI提示（英文定义）
        return { level: 1, text: null, isLocal: false, aiType: "complex" };
      case 2:
        // 第二次：简单直接的AI提示
        return { level: 2, text: null, isLocal: false, aiType: "simple" };
      case 3:
        // 第三次：AI生成的近义词
        return { level: 2, text: null, isLocal: false, aiType: "synonyms" };
      case 4:
        // 第四次：本地词性提示
        level = 3;
        text = `📝 词性提示：观察这个词在句子中的位置和作用`;
        break;
      case 5:
        // 第五次：含义提示（部分翻译）
        level = 4;
        if (wordData.translations && wordData.translations.length > 0) {
          const translation = wordData.translations[0];
          if (translation.length > 2) {
            const partial =
              translation.substring(0, Math.ceil(translation.length / 2)) +
              "...";
            text = `💡 含义提示：${partial}`;
          } else {
            text = `💡 这是一个${translation.length}个字的词语`;
          }
        } else {
          text = `💡 这个词表达这种或者那种含义。嗯……你懂的`;
        }
        break;
      default:
        level = 5;
        text = `⚠️ warning：你是 SB 吧！这么简单都要提示！`;
        break;
    }

    return { level, text, isLocal: true };
  },

  generateBlankHint(word, wordData, context, hintCount) {
    let level, text;

    switch (hintCount) {
      case 1:
        // 第一次：基于语境的AI提示（解释在句子中的作用和含义）
        return { level: 1, text: null, isLocal: false, aiType: "contextual" };
      case 2:
        // 第二次：简单直接的AI提示
        return { level: 2, text: null, isLocal: false, aiType: "simple" };
      case 3:
        // 第三次：AI生成的近义词
        return { level: 2, text: null, isLocal: false, aiType: "synonyms" };
      case 4:
        // 第四次：首字母和长度提示
        level = 2;
        text = `🔤 首字母：${word.charAt(0).toLowerCase()} | 长度：${
          word.length
        }个字母`;
        break;
      case 5:
        // 第五次：元音辅音结构提示
        level = 2;
        const vowels = "aeiouAEIOU";
        const vowelCount = [...word].filter((char) =>
          vowels.includes(char)
        ).length;
        text = `🔍 结构：${vowelCount}个元音，${
          word.length - vowelCount
        }个辅音`;
        break;
      case 6:
        // 第六次：部分拼写提示（20%）
        level = 3;
        const showCount = Math.ceil(word.length * 0.2);
        const partial =
          word.substring(0, showCount) + "_".repeat(word.length - showCount);
        text = `✏️ 部分拼写：${partial}`;
        break;
      case 7:
        // 第七次：更多拼写提示（40%）
        level = 3;
        const showCount2 = Math.ceil(word.length * 0.4);
        const partial2 =
          word.substring(0, showCount2) + "_".repeat(word.length - showCount2);
        text = `🔤 更多拼写：${partial2}`;
        break;
      case 8:
        // 第八次：接近完整拼写（60%）
        level = 4;
        const showCount3 = Math.ceil(word.length * 0.6);
        const almostComplete =
          word.substring(0, showCount3) + "_".repeat(word.length - showCount3);
        text = `🎯 接近完整：${almostComplete}`;
        break;
      case 9:
        // 第九次：最后提示（结尾字母）
        level = 4;
        const lastChar = word.charAt(word.length - 1);
        text = `🌟 最后提示：单词以字母"${lastChar}"结尾`;
        break;
      default:
        level = 5;
        text = `⚠️ warning：你是 SB 吧！这么简单都要提示！`;
        break;
    }

    return { level, text, isLocal: true };
  },
};

function initHintPanel(container, inputEl) {
  HintPanelManager.init(container, inputEl);
}

function pushHint(level, text) {
  HintPanelManager.pushHint(level, text);
}

function switchHint(index) {
  HintPanelManager.switchHint(index);
}

function clearHints() {
  HintPanelManager.clearHints();
}
