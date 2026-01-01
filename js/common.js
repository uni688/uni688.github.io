// =================================================================
// 常量定义
// =================================================================

// 权重算法相关常量
const WEIGHT_CONFIG = {
  // 练习次数衰减系数（每次练习后权重衰减比例）
  PRACTICE_DECAY: 0.85,
  // 错误率权重放大系数
  ERROR_MULTIPLIER: 2,
  // 时间权重最大值
  MAX_TIME_WEIGHT: 2,
  // 新单词默认天数（用于时间权重计算）
  DEFAULT_DAYS_FOR_NEW_WORDS: 7,
  // 时间权重计算的天数除数
  TIME_WEIGHT_DIVISOR: 7,
  // 收藏单词权重加成
  FAVORITE_BOOST: 1.5,
  // 基础权重（确保每个单词都有被选中的机会）
  BASE_WEIGHT: 0.3,
};

// localStorage 键名常量
const STORAGE_KEYS = {
  WORD_BANK: "wordBank",
  VOCABULARIES: "vocabularies",
  PRACTICE_RECORDS: "practiceRecords",
  SUPPORTED_MODES: "supportedModes",
  USER_PROFILE: "userProfile",
  ACHIEVEMENTS: "achievements",
  SHOP_ITEMS: "shopItems",
  USER_INVENTORY: "userInventory",
  THEME_SETTING: "themeSetting",
  DEVELOPER_MODE: "developerMode",
  ACTIVE_ITEMS: "activeItems", // 激活的道具状态
};

// 默认词库ID
const DEFAULT_VOCABULARY_ID = "default";

// 激励系统常量
const REWARD_CONFIG = {
  // 每次正确答题获得的金币
  COINS_PER_CORRECT: 10,
  // 每次正确答题获得的经验值
  EXP_PER_CORRECT: 15,
  // 连续答对奖励倍数
  STREAK_MULTIPLIER: 1.5,
  // 每个等级所需经验值（基础值）
  EXP_PER_LEVEL: 100,
  // 等级经验增长系数
  LEVEL_EXP_MULTIPLIER: 1.2,
};

// 成就类型
const ACHIEVEMENT_TYPES = {
  STREAK: "streak", // 连续学习
  TOTAL_WORDS: "total", // 累计单词
  PERFECT_DAY: "perfect", // 完美一天
  MODE_MASTER: "mode", // 模式精通
  COLLECTOR: "collector", // 收藏家
};

// Toast 显示时长（毫秒）
const TOAST_DURATION = 3000;
const TOAST_FADEOUT_DURATION = 300;

// API 超时时间（毫秒）
const API_TIMEOUT = 10000;

// 错误类型常量
const ERROR_TYPES = {
  NETWORK: "network",
  TIMEOUT: "timeout",
  API: "api",
  EMPTY: "empty",
  NO_WORDS: "no_words",
  NO_ENABLED_VOCAB: "no_enabled_vocab",
  STORAGE_QUOTA: "storage_quota",
  STORAGE_SECURITY: "storage_security",
  STORAGE_PARSE: "storage_parse",
  UNKNOWN: "unknown",
};

// 权重计算的最大值（防止 Infinity）
const MAX_WEIGHT_VALUE = 1000000;

// =================================================================
// localStorage 安全封装
// =================================================================

/**
 * 安全地从 localStorage 读取数据
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值（当读取失败时返回）
 * @returns {*} 解析后的数据或默认值
 */
function safeGetItem(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    return JSON.parse(value);
  } catch (error) {
    // JSON 解析错误或其他异常
    logMessage("error", "Storage", `读取 ${key} 失败`, error);
    handleError(
      error,
      {
        source: "localStorage",
        action: `读取 ${key}`,
      },
      false
    );
    return defaultValue;
  }
}

/**
 * 安全地向 localStorage 写入数据
 * @param {string} key - 存储键名
 * @param {*} value - 要存储的数据
 * @returns {boolean} 是否成功保存
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // 处理不同类型的存储错误
    if (error.name === "QuotaExceededError") {
      logMessage("error", "Storage", `存储空间已满，无法保存 ${key}`, error);
      showToast("存储空间已满，请清理部分数据后重试", "error", 5000);
      return false;
    } else if (error.name === "SecurityError") {
      logMessage("error", "Storage", `安全限制，无法保存 ${key}`, error);
      showToast("浏览器安全设置阻止了数据保存", "error");
      return false;
    } else {
      logMessage("error", "Storage", `保存 ${key} 失败`, error);
      showToast("数据保存失败，请重试", "error");
      return false;
    }
  }
}

/**
 * 安全地从 localStorage 删除数据
 * @param {string} key - 存储键名
 * @returns {boolean} 是否成功删除
 */
function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logMessage("error", "Storage", `删除 ${key} 失败`, error);
    return false;
  }
}

/**
 * 检查 localStorage 是否可用
 * @returns {boolean} 是否可用
 */
function isLocalStorageAvailable() {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    logMessage("error", "Storage", "localStorage 不可用", error);
    return false;
  }
}

// =================================================================
// 错误处理和日志
// =================================================================

/**
 * 统一的错误处理函数
 * @param {Error} error - 错误对象
 * @param {Object} context - 错误上下文信息
 * @param {string} context.source - 错误来源
 * @param {string} context.action - 正在执行的操作
 * @param {boolean} showToastMessage - 是否显示Toast提示
 */
function handleError(error, context = {}, showToastMessage = true) {
  const source = context.source || "未知来源";
  const action = context.action || "操作";

  // 统一的日志格式
  console.error(`[${source}] ${action}失败:`, error);

  // 根据错误类型决定用户提示
  if (showToastMessage) {
    let message = "操作失败，请重试";

    if (error.message) {
      if (error.message.includes("网络") || error.message.includes("Network")) {
        message = "网络连接失败，请检查您的网络设置";
      } else if (
        error.message.includes("超时") ||
        error.message.includes("timeout")
      ) {
        message = "请求超时，请稍后重试";
      } else if (error.message.includes("API")) {
        message = "AI服务暂时不可用，请稍后再试";
      }
    }

    showToast(message, "error");
  }

  return error;
}

/**
 * 统一的日志记录函数
 * @param {string} level - 日志级别 ('info', 'warn', 'error')
 * @param {string} source - 日志来源
 * @param {string} message - 日志消息
 * @param {*} data - 附加数据
 */
function logMessage(level, source, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] [${source}] ${message}`;

  switch (level) {
    case "info":
      console.log(logMsg, data || "");
      break;
    case "warn":
      console.warn(logMsg, data || "");
      break;
    case "error":
      console.error(logMsg, data || "");
      break;
    default:
      console.log(logMsg, data || "");
  }
}

// =================================================================
// 输入验证和清理
// =================================================================

/**
 * 清理用户输入，防止XSS攻击
 * @param {string} input - 用户输入的字符串
 * @returns {string} 清理后的字符串
 */
function sanitizeInput(input) {
  if (typeof input !== "string") {
    return "";
  }

  // 创建一个临时div元素来利用浏览器的文本转义
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/**
 * 验证输入是否为空
 * @param {string} input - 输入字符串
 * @returns {boolean} 是否为空
 */
function isEmptyInput(input) {
  return !input || input.trim().length === 0;
}

/**
 * 验证输入长度
 * @param {string} input - 输入字符串
 * @param {number} maxLength - 最大长度
 * @returns {boolean} 是否有效
 */
function validateInputLength(input, maxLength = 100) {
  return input && input.length <= maxLength;
}

/**
 * 验证单词输入（只允许字母、空格和连字符）
 * @param {string} word - 单词字符串
 * @returns {Object} 验证结果 {valid: boolean, error: string}
 */
function validateWordInput(word) {
  if (!word || isEmptyInput(word)) {
    return { valid: false, error: "单词不能为空" };
  }

  const trimmedWord = word.trim();

  if (!validateInputLength(trimmedWord, 50)) {
    return { valid: false, error: "单词长度不能超过50个字符" };
  }

  // 只允许字母、空格、连字符和撇号（用于所有格等）
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedWord)) {
    return { valid: false, error: "单词只能包含字母、空格、连字符和撇号" };
  }

  return { valid: true, word: trimmedWord };
}

/**
 * 验证翻译输入
 * @param {string} translation - 翻译字符串
 * @returns {Object} 验证结果 {valid: boolean, error: string}
 */
function validateTranslationInput(translation) {
  if (!translation || isEmptyInput(translation)) {
    return { valid: false, error: "翻译不能为空" };
  }

  const trimmedTranslation = translation.trim();

  if (!validateInputLength(trimmedTranslation, 200)) {
    return { valid: false, error: "翻译长度不能超过200个字符" };
  }

  return { valid: true, translation: trimmedTranslation };
}

/**
 * 批量验证单词数组
 * @param {Array<Object>} words - 单词对象数组
 * @returns {Object} 验证结果 {valid: boolean, errors: Array, validWords: Array}
 */
function validateWordsArray(words) {
  if (!Array.isArray(words)) {
    return { valid: false, errors: ["输入不是有效的数组"], validWords: [] };
  }

  const errors = [];
  const validWords = [];

  words.forEach((word, index) => {
    if (!word || typeof word !== "object") {
      errors.push(`第 ${index + 1} 个单词格式无效`);
      return;
    }

    if (!word.word) {
      errors.push(`第 ${index + 1} 个单词缺少 word 字段`);
      return;
    }

    const wordValidation = validateWordInput(word.word);
    if (!wordValidation.valid) {
      errors.push(`第 ${index + 1} 个单词: ${wordValidation.error}`);
      return;
    }

    if (
      !word.translations ||
      !Array.isArray(word.translations) ||
      word.translations.length === 0
    ) {
      errors.push(`第 ${index + 1} 个单词缺少翻译`);
      return;
    }

    validWords.push(word);
  });

  return {
    valid: errors.length === 0,
    errors,
    validWords,
  };
}

// =================================================================
// 防抖和节流工具函数
// =================================================================

/**
 * 防抖函数 - 在停止调用后等待指定时间才执行
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      clearTimeout(timeout);
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数 - 限制函数执行频率
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 1000) {
  let inThrottle = false;
  let timeoutId = null;
  return function executedFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      timeoutId = setTimeout(() => {
        inThrottle = false;
        timeoutId = null;
      }, limit);
    }
  };
}

/**
 * 创建一个防止重复执行的函数包装器
 * @param {Function} asyncFunc - 要包装的异步函数
 * @returns {Function} 包装后的函数
 */
function preventDuplicateExecution(asyncFunc) {
  let isExecuting = false;

  return async function (...args) {
    if (isExecuting) {
      console.warn("函数正在执行中，忽略重复调用");
      return null;
    }

    isExecuting = true;
    try {
      return await asyncFunc.apply(this, args);
    } finally {
      isExecuting = false;
    }
  };
}

// =================================================================
// 会话管理公共函数
// =================================================================

/**
 * 检查是否有可用的单词
 * @returns {Object} 包含状态和错误消息的对象
 */
function checkWordsAvailability() {
  const vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
  const enabledVocabs = vocabularies.filter((v) => v.enabled !== false);
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const hasWords = wordBank.length > 0;

  if (!hasWords) {
    return {
      available: false,
      errorType: ERROR_TYPES.NO_WORDS,
      message: "词库为空，请先在管理页面添加单词。",
    };
  }

  if (enabledVocabs.length === 0) {
    return {
      available: false,
      errorType: ERROR_TYPES.NO_ENABLED_VOCAB,
      message: "所有词库都已被禁用，请在管理页面启用至少一个词库。",
    };
  }

  return {
    available: true,
    errorType: null,
    message: null,
  };
}

/**
 * 显示错误状态到容器
 * @param {HTMLElement} container - 容器元素
 * @param {string} message - 错误消息
 * @param {Function} retryCallback - 重试回调函数（可选）
 */
function showErrorInContainer(container, message, retryCallback = null) {
  container.innerHTML = "";
  const errorDiv = document.createElement("div");
  errorDiv.className = "error";

  const errorIcon = document.createElement("div");
  errorIcon.className = "error-icon";
  errorIcon.textContent = "⚠️";

  const errorText = document.createElement("div");
  errorText.className = "error-message";
  errorText.textContent = message;

  errorDiv.appendChild(errorIcon);
  errorDiv.appendChild(errorText);

  if (retryCallback) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "error-refresh-btn";
    retryBtn.textContent = "🔄 重试";
    retryBtn.onclick = retryCallback;
    errorDiv.appendChild(retryBtn);
  }

  container.appendChild(errorDiv);
}

/**
 * 禁用或启用练习相关按钮
 * @param {Object} buttons - 按钮对象
 * @param {boolean} disabled - 是否禁用
 * @param {boolean} disableHintOnly - 仅禁用提示按钮(用于生成内容时)
 */
function togglePracticeButtons(buttons, disabled, disableHintOnly = false) {
  if (disableHintOnly) {
    if (buttons.hint) buttons.hint.disabled = true;
    return;
  }

  if (buttons.submit) buttons.submit.disabled = disabled;
  if (buttons.hint) buttons.hint.disabled = disabled;
  if (buttons.answer) buttons.answer.disabled = disabled;
}

// =================================================================
// 共享渲染函数 - 消除模式间重复代码
// =================================================================

/**
 * 创建带有输入框的填空句子HTML
 * 供 blank.js 和 mix.js 共同使用
 * @param {string} sentence - 完整的句子
 * @param {string} word - 要留空的单词
 * @returns {string} - 包含输入框的HTML字符串
 */
function createBlankSentenceHTML(sentence, word) {
  // 参数验证
  if (!sentence || typeof sentence !== "string") {
    console.error("[createBlankSentenceHTML] Invalid sentence:", sentence);
    return '<p style="color: var(--error);">句子生成失败</p>';
  }

  if (!word || typeof word !== "string") {
    console.error("[createBlankSentenceHTML] Invalid word:", word);
    return sentence; // 返回原句子
  }

  // 转义特殊字符
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 使用正则表达式匹配完整单词并替换为输入框
  const regex = new RegExp(`\\b${escapedWord}\\b`, "gi");
  return sentence.replace(
    regex,
    '<input type="text" class="blank-input" id="blankInput" placeholder="click to fill" autocomplete="off">'
  );
}

/**
 * 渲染上下文猜词内容到容器
 * 供 context.js 和 mix.js 共同使用
 * @param {HTMLElement} container - 容器元素
 * @param {Object} word - 单词对象
 * @param {string} content - 生成的上下文内容
 */
function renderContextContentShared(container, word, content) {
  // 参数验证
  if (!content || typeof content !== "string") {
    console.error("[renderContextContent] Invalid content:", content);
    container.innerHTML = '<p style="color: var(--error);">内容生成失败</p>';
    return;
  }

  if (!word || !word.word) {
    console.error("[renderContextContent] Invalid word:", word);
    container.innerHTML = '<p style="color: var(--error);">单词数据错误</p>';
    return;
  }

  container.innerHTML = `
    <h3>Contextual Situation</h3>
    <p id="contextParagraph"></p>
    <p style="margin-top: 1rem;"><strong>Target Word: ${word.word}</strong></p>
  `;

  // 高亮显示段落中目标单词的出现位置（不区分大小写）
  const contextPara = container.querySelector("#contextParagraph");
  if (contextPara) {
    const re = new RegExp(`\\b${word.word}\\b`, "gi");
    const highlighted = content.replace(
      re,
      (match) => `<mark class="highlight">${match}</mark>`
    );
    contextPara.innerHTML = highlighted;
  }

  // 添加淡入动画
  container.style.opacity = "0";
  setTimeout(() => (container.style.opacity = "1"), 50);
}

/**
 * 渲染填空内容到容器
 * 供 blank.js 和 mix.js 共同使用
 * @param {HTMLElement} container - 容器元素
 * @param {Object} word - 单词对象
 * @param {string} content - 生成的句子内容
 * @param {Function} onInputKeypress - 输入框回车键回调（可选）
 */
function renderBlankContentShared(container, word, content, onInputKeypress) {
  // 参数验证
  if (!content || typeof content !== "string") {
    console.error("[renderBlankContent] Invalid content:", content);
    container.innerHTML = '<p style="color: var(--error);">句子生成失败</p>';
    return;
  }

  if (!word || !word.word) {
    console.error("[renderBlankContent] Invalid word:", word);
    container.innerHTML = '<p style="color: var(--error);">单词数据错误</p>';
    return;
  }

  // 将目标单词替换为输入框
  const blankSentenceHTML = createBlankSentenceHTML(content, word.word);

  container.innerHTML = `
    <h3>Fill in the Blank</h3>
    <p class="blank-sentence">${blankSentenceHTML}</p>
  `;

  // 为输入框绑定事件监听器
  const blankInput = document.getElementById("blankInput");
  if (blankInput) {
    blankInput.focus(); // 自动聚焦到输入框

    // 更新提示面板的输入框引用
    if (typeof HintPanelManager !== "undefined") {
      HintPanelManager.inputElement = blankInput;
    }

    // 绑定回车键提交事件
    if (onInputKeypress) {
      blankInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onInputKeypress();
        }
      });
    }
  }

  // 添加淡入动画
  container.style.opacity = "0";
  setTimeout(() => (container.style.opacity = "1"), 50);
}

/**
 * 更新单词练习数据
 * 供各模式共同使用
 * @param {Object} wordObj - 单词对象
 * @param {string} mode - 练习模式
 * @param {boolean} isCorrect - 是否答对
 */
function updateWordPracticeData(wordObj, mode, isCorrect) {
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const wordIndex = wordBank.findIndex((w) => w.word === wordObj.word);

  if (wordIndex !== -1) {
    const modeData = getWordModeData(wordBank[wordIndex], mode);
    modeData.practiceCount++;
    if (!isCorrect) {
      modeData.errors++;
    }
    wordBank[wordIndex].modes[mode] = modeData;
    safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank);
  }
}

/**
 * 通用提示获取函数
 * 供各模式共同使用
 * @param {Object} options - 配置选项
 * @param {Object} options.currentWord - 当前单词对象
 * @param {string} options.contextText - 上下文文本
 * @param {string} options.mode - 当前模式
 * @param {HTMLButtonElement} options.hintBtn - 提示按钮
 * @param {Function} options.onError - 错误回调
 */
async function getHintShared(options) {
  const { currentWord, contextText, mode, hintBtn, onError } = options;

  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  // 防止重复点击
  if (hintBtn && hintBtn.disabled) {
    return;
  }

  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.textContent = "Hinting...";
  }

  try {
    // 生成渐进式提示
    const progressiveHint = HintPanelManager.generateHint(
      currentWord.word,
      currentWord,
      contextText,
      mode // 传入模式参数，确保使用正确的提示策略
    );

    // 检查是否被阻止（缺少道具）
    if (progressiveHint.blocked) {
      HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
      if (hintBtn) {
        hintBtn.disabled = false;
        hintBtn.textContent = "Hint";
      }
      return;
    }

    // 如果需要消耗提示加速器（高级提示且没有大师之钥）
    const hintCount = HintPanelManager.hints.length + 1;
    if (needsHintBooster(hintCount, mode) && !isItemActive("item_master_key")) {
      // 消耗提示加速器
      if (!consumeHintBooster()) {
        showToast("提示加速器不足！", "error");
        if (hintBtn) {
          hintBtn.disabled = false;
          hintBtn.textContent = "Hint";
        }
        return;
      }
      showToast("消耗了1个提示加速器 💡", "info", 1500);
    }

    if (progressiveHint.isLocal) {
      // 本地提示，直接添加
      HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
    } else {
      // AI提示，根据类型异步获取
      const aiType = progressiveHint.aiType || "complex";
      await HintPanelManager.pushAiHint(
        currentWord,
        contextText,
        aiType, // AI提示类型：complex、simple、synonyms、contextual
        null, // 成功回调
        (error) => {
          const errorMsg =
            error && error.message ? error.message : String(error);
          showToast(
            "获取AI提示失败，请检查网络连接。错误提示：" + errorMsg,
            "error"
          );
          if (onError) onError(error);
        }
      );
    }
  } catch (error) {
    console.error("生成提示失败:", error);
    showToast("生成提示失败: " + error.message, "error");
    if (onError) onError(error);
  } finally {
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.textContent = "Hint";
    }
  }
}

/**
 * 显示答案并更新状态
 * 供各模式共同使用
 * @param {Object} options - 配置选项
 * @param {Object} options.currentWord - 当前单词对象
 * @param {string} options.mode - 当前模式
 * @param {HTMLElement} options.answerBox - 答案容器
 * @param {HTMLButtonElement} options.answerBtn - 答案按钮
 * @param {HTMLButtonElement} options.submitBtn - 提交按钮
 * @param {boolean} options.hasErrorInCurrentWord - 是否已有错误
 * @param {Function} options.onStateUpdate - 状态更新回调
 */
function showAnswerShared(options) {
  const {
    currentWord,
    mode,
    answerBox,
    answerBtn,
    submitBtn,
    hasErrorInCurrentWord,
    onStateUpdate,
  } = options;

  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  // 记录为错误，因为用户放弃了
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const wordIndex = wordBank.findIndex((w) => w.word === currentWord.word);
  if (wordIndex !== -1 && !hasErrorInCurrentWord) {
    const modeData = getWordModeData(wordBank[wordIndex], mode);
    modeData.practiceCount++;
    modeData.errors++;
    wordBank[wordIndex].modes[mode] = modeData;
    safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank);
  }

  // 在练习记录中记录为错误
  updateRecords(currentWord.word, false, mode);

  // 显示答案
  if (answerBox) {
    answerBox.style.display = "block";
    answerBox.style.opacity = "0";

    // 根据模式显示不同内容
    const isContextMode = mode === "context";
    answerBox.innerHTML = `
      <div class="answer-card">
        <h4>${isContextMode ? "正确答案" : "答案"}</h4>
        <p>${isContextMode ? "单词" : "正确答案"}：<strong>${
      currentWord.word
    }</strong></p>
        <p>中文翻译：<span style="color: #10b981; font-weight: 600;">${currentWord.translations.join(
          " / "
        )}</span></p>
      </div>
    `;
    setTimeout(() => (answerBox.style.opacity = "1"), 50);
  }

  // 更新按钮状态
  if (answerBtn) answerBtn.disabled = true;
  if (submitBtn) submitBtn.textContent = "Next";

  showToast("已显示答案，点击 Next 进入下一题", "info");

  // 调用状态更新回调
  if (onStateUpdate) {
    onStateUpdate({ answerShown: true, hasErrorInCurrentWord: true });
  }
}

/**
 * 通用的会话启动函数
 * @param {string} mode - 练习模式
 * @param {Object} config - 配置对象
 * @param {HTMLElement} config.container - 内容容器
 * @param {HTMLElement} config.answerBox - 答案显示容器
 * @param {Object} config.buttons - 按钮对象
 * @param {Function} config.contentGenerator - 内容生成函数
 * @param {Function} config.renderContent - 内容渲染函数
 * @param {Function} config.onSuccess - 成功回调
 * @param {Function} config.onError - 错误回调
 * @returns {Promise<Object>} 包含成功状态和当前单词的对象
 */
async function startPracticeSession(mode, config) {
  const {
    container,
    answerBox,
    buttons,
    contentGenerator,
    renderContent,
    onSuccess,
    onError,
  } = config;

  // 重置UI状态
  if (answerBox) {
    answerBox.innerHTML = "";
    answerBox.style.display = "none";
  }

  // 显示加载状态
  showSkeleton(container);

  // 禁用提示按钮(在生成内容前)
  togglePracticeButtons(buttons, false, true);

  // 检查单词可用性
  const availability = checkWordsAvailability();
  if (!availability.available) {
    showErrorInContainer(container, availability.message, onError);
    togglePracticeButtons(buttons, true);
    return { success: false, word: null };
  }

  // 获取单词
  const word = getWeightedWord(mode);
  if (!word) {
    showErrorInContainer(
      container,
      "启用的词库中没有可用单词，请检查词库设置。",
      onError
    );
    togglePracticeButtons(buttons, true);
    return { success: false, word: null };
  }

  try {
    // 生成内容
    const content = await contentGenerator(word);

    // 渲染内容
    renderContent(container, word, content);

    // 启用所有按钮(包括提示按钮)
    togglePracticeButtons(buttons, false);

    // 调用成功回调
    if (onSuccess) {
      onSuccess(word, content);
    }

    return { success: true, word, content };
  } catch (error) {
    handleError(
      error,
      {
        source: mode,
        action: "生成内容",
      },
      false
    );

    showErrorInContainer(container, "内容生成失败，请重试", onError);

    return { success: false, word: null };
  }
}

// =================================================================
// 本地存储管理
// =================================================================

/**
 * 如果不存在则初始化localStorage的默认值。
 * 包括支持的模式、单词库和练习记录。
 */
function initializeStorage() {
  // 检查 localStorage 是否可用
  if (!isLocalStorageAvailable()) {
    const errorMsg =
      "浏览器存储不可用，数据无法保存。请检查浏览器设置或使用隐私模式。";
    console.error(errorMsg);
    // 尝试显示错误，但不阻止程序运行
    if (typeof showToast === "function") {
      showToast(errorMsg, "error", 5000);
    }
    return false;
  }

  // 如果不存在，则初始化支持的模式列表。
  const existingModes = safeGetItem(STORAGE_KEYS.SUPPORTED_MODES);
  if (!existingModes) {
    const defaultModes = [
      { id: "context", name: "上下文猜词", active: true },
      { id: "blank", name: "填空练习", active: true },
    ];
    safeSetItem(STORAGE_KEYS.SUPPORTED_MODES, defaultModes);
  } else {
    // 确保存在'blank'模式以保持向后兼容性。
    if (!existingModes.some((mode) => mode.id === "blank")) {
      existingModes.push({ id: "blank", name: "填空练习", active: true });
      safeSetItem(STORAGE_KEYS.SUPPORTED_MODES, existingModes);
    }
  }

  // 如果不存在，则初始化词库。
  const existingVocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES);
  if (!existingVocabularies) {
    const defaultVocabulary = {
      id: DEFAULT_VOCABULARY_ID,
      name: "默认词库",
      description: "",
      enabled: true, // 新创建的词库默认启用
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    safeSetItem(STORAGE_KEYS.VOCABULARIES, [defaultVocabulary]);
  }

  // 如果不存在，则用默认单词初始化单词库。
  const existingWords = safeGetItem(STORAGE_KEYS.WORD_BANK);
  if (!existingWords) {
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
        vocabularyId: DEFAULT_VOCABULARY_ID,
      },
    ];
    safeSetItem(STORAGE_KEYS.WORD_BANK, defaultWords);
  } else {
    // 如有必要，迁移旧数据格式。
    migrateWordData();
  }

  // 迁移词库数据，确保所有词库都有enabled属性
  migrateVocabularyData();

  // 如果不存在，则初始化练习记录。
  const existingRecords = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS);
  if (!existingRecords) {
    safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
  }

  // 应用已装备的主题皮肤
  applyEquippedThemeSkin();

  return true;
}

/**
 * 迁移旧的单词数据结构到新格式，包括模式支持和词库归属。
 */
function migrateWordData() {
  try {
    const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
    let needsMigration = wordBank.some((word) => !word.modes);
    let needsVocabularyMigration = wordBank.some((word) => !word.vocabularyId);

    if (needsMigration || needsVocabularyMigration) {
      // 确保默认词库存在
      let vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
      const defaultVocabulary = vocabularies.find(
        (v) => v.id === DEFAULT_VOCABULARY_ID
      );
      if (!defaultVocabulary) {
        vocabularies.push({
          id: DEFAULT_VOCABULARY_ID,
          name: "默认词库",
          description: "",
          enabled: true, // 确保迁移时创建的默认词库也是启用状态
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);
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
          newWord.vocabularyId = DEFAULT_VOCABULARY_ID;
        }

        return newWord;
      });

      safeSetItem(STORAGE_KEYS.WORD_BANK, migratedWordBank);
      logMessage(
        "info",
        "Migration",
        "单词数据已迁移到新格式，包含词库归属信息"
      );
    }
  } catch (error) {
    logMessage("error", "Migration", "迁移单词数据时出错", error);
    handleError(error, { source: "Migration", action: "迁移单词数据" }, false);
  }
}

/**
 * 迁移词库数据，确保所有词库都有enabled属性
 */
function migrateVocabularyData() {
  try {
    const vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
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
      safeSetItem(STORAGE_KEYS.VOCABULARIES, migratedVocabularies);
      logMessage("info", "Migration", "词库数据已迁移，添加了enabled属性");
    }
  } catch (error) {
    logMessage("error", "Migration", "迁移词库数据时出错", error);
    handleError(error, { source: "Migration", action: "迁移词库数据" }, false);
  }
}

// =================================================================
// 数据访问和工具函数
// =================================================================

/**
 * 获取所有支持的学习模式列表
 * @returns {Array} - 支持的模式数组
 */
function getSupportedModes() {
  return safeGetItem(STORAGE_KEYS.SUPPORTED_MODES, []);
}

/**
 * Retrieves information about a specific learning mode.
 * @param {string} modeId - The ID of the mode (e.g., 'context', 'blank').
 * @returns {Object} - The mode object with its details.
 */
function getModeInfo(modeId) {
  const supportedModes = safeGetItem(STORAGE_KEYS.SUPPORTED_MODES, []);
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
  let words = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  if (!words || words.length === 0) return null;

  // 获取所有词库信息
  const vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);

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

  const records = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
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

    // 安全取值辅助函数
    const safeNumber = (value, defaultValue = 0, min = 0, max = Infinity) => {
      if (typeof value !== "number" || !isFinite(value) || isNaN(value)) {
        return defaultValue;
      }
      return Math.max(min, Math.min(max, value));
    };

    // 1. Practice Count Weight: Fewer practices -> higher weight.
    // 限制练习次数避免产生 Infinity
    const safePracticeCount = safeNumber(modeData.practiceCount, 0, 0, 100);
    let practiceWeight = Math.pow(
      WEIGHT_CONFIG.PRACTICE_DECAY,
      safePracticeCount
    );
    practiceWeight = safeNumber(
      practiceWeight,
      WEIGHT_CONFIG.BASE_WEIGHT,
      WEIGHT_CONFIG.BASE_WEIGHT,
      10
    );

    // 2. Error Rate Weight: Higher error rate -> higher weight.
    const errors = safeNumber(modeData.errors, 0, 0);
    const practiceCount = safeNumber(modeData.practiceCount, 0, 0);
    const errorRate =
      practiceCount > 0 ? Math.min(errors / practiceCount, 1) : 0;
    let errorWeight = 1 + errorRate * WEIGHT_CONFIG.ERROR_MULTIPLIER;
    errorWeight = safeNumber(errorWeight, 1, 1, 10);

    // 3. Time Since Last Practice Weight: Longer time -> higher weight.
    const lastPractice = lastPracticeTime[word.word] || 0;
    const daysSince = lastPractice
      ? (currentTime - lastPractice) / dayInMs
      : WEIGHT_CONFIG.DEFAULT_DAYS_FOR_NEW_WORDS;
    let timeWeight =
      1 + Math.max(0, daysSince) / WEIGHT_CONFIG.TIME_WEIGHT_DIVISOR;
    timeWeight = safeNumber(timeWeight, 1, 1, WEIGHT_CONFIG.MAX_TIME_WEIGHT);

    // 4. Favorite Weight: Favorited words get a boost.
    const favoriteWeight = word.favorite ? WEIGHT_CONFIG.FAVORITE_BOOST : 1;

    // 5. Base Weight: Ensures every word has a chance.
    const baseWeight = WEIGHT_CONFIG.BASE_WEIGHT;

    // 计算最终权重，并限制最大值
    let finalWeight =
      (baseWeight + practiceWeight * errorWeight * timeWeight) * favoriteWeight;

    // 确保 finalWeight 是有效数字，并限制在合理范围内
    finalWeight = safeNumber(
      finalWeight,
      baseWeight,
      baseWeight,
      MAX_WEIGHT_VALUE
    );

    return { ...word, weight: finalWeight };
  });

  const totalWeight = weightedList.reduce((sum, w) => sum + w.weight, 0);

  // 如果总权重为 0 或无效，使用随机选择
  if (totalWeight === 0 || !isFinite(totalWeight) || isNaN(totalWeight)) {
    const randomIndex = Math.floor(Math.random() * weightedList.length);
    return weightedList[randomIndex];
  }

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
 * @returns {boolean} 是否成功添加记录
 */
function updateRecords(word, isCorrect, mode) {
  // 验证输入参数
  if (!word || typeof word !== "string") {
    console.warn("updateRecords: 无效的单词参数");
    return false;
  }
  if (typeof isCorrect !== "boolean") {
    console.warn("updateRecords: 无效的isCorrect参数");
    return false;
  }
  if (!mode || typeof mode !== "string") {
    console.warn("updateRecords: 无效的mode参数");
    return false;
  }

  try {
    const records = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
    records.push({
      date: new Date().toISOString(),
      correct: isCorrect,
      word: word,
      mode: mode,
    });
    return safeSetItem(STORAGE_KEYS.PRACTICE_RECORDS, records);
  } catch (error) {
    console.error("updateRecords 失败:", error);
    return false;
  }
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
function showToast(message, type = "info", duration = TOAST_DURATION) {
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
    }, TOAST_FADEOUT_DURATION);
  }, duration);
}

/**
 * Shows a skeleton loading state in a given container.
 * @param {HTMLElement} container - The element to show the skeleton in.
 */
function showSkeleton(container) {
  if (!container) {
    console.warn("showSkeleton: 容器不存在");
    return;
  }

  // 使用innerHTML以保持简单性，但添加验证
  container.innerHTML = `
        <div class="skeleton-fade-in">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line medium"></div>
        </div>
    `;
}

/**
 * 隐藏加载骨架屏
 * @param {HTMLElement} container - The element to hide the skeleton from.
 */
function hideSkeleton(container) {
  if (!container) {
    console.warn("hideSkeleton: 容器不存在");
    return;
  }

  // 移除骨架屏内容
  const skeletonElement = container.querySelector(".skeleton-fade-in");
  if (skeletonElement) {
    skeletonElement.remove();
  }
}

// =================================================================
// 词库管理函数
// =================================================================

/**
 * 获取所有词库列表
 * @returns {Array} 词库数组
 */
function getVocabularies() {
  return safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
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
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
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
  safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);

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

  return safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);
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
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const filteredWords = wordBank.filter(
    (word) => word.vocabularyId !== vocabularyId
  );
  const wordsDeleted = safeSetItem(STORAGE_KEYS.WORD_BANK, filteredWords);

  // 删除词库
  vocabularies.splice(index, 1);
  const vocabDeleted = safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);

  return wordsDeleted && vocabDeleted;
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
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  wordBank.forEach((word) => {
    if (word.vocabularyId === sourceVocabularyId) {
      word.vocabularyId = targetVocabularyId;
    }
  });
  safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank);

  // 删除源词库
  const sourceIndex = vocabularies.findIndex(
    (v) => v.id === sourceVocabularyId
  );
  vocabularies.splice(sourceIndex, 1);
  safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);

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

  safeSetItem(STORAGE_KEYS.VOCABULARIES, vocabularies);
  return true;
}

// =================================================================
// 键盘快捷键支持
// =================================================================

/**
 * 初始化键盘快捷键
 * @param {Object} handlers - 处理函数对象
 * @param {Function} handlers.submit - 提交处理函数
 * @param {Function} handlers.hint - 提示处理函数
 * @param {Function} handlers.answer - 答案处理函数
 * @param {Function} handlers.next - 下一题处理函数
 */
function initKeyboardShortcuts(handlers) {
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + Enter: 提交答案
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (handlers.submit && typeof handlers.submit === "function") {
        handlers.submit();
      }
    }

    // Ctrl/Cmd + H: 获取提示
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      if (handlers.hint && typeof handlers.hint === "function") {
        handlers.hint();
      }
    }

    /*     // Ctrl/Cmd + A: 显示答案
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      if (handlers.answer && typeof handlers.answer === "function") {
        handlers.answer();
      }
    } */

    // Ctrl/Cmd + N: 下一题
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      if (handlers.next && typeof handlers.next === "function") {
        handlers.next();
      }
    }
  });
}

/**
 * 显示快捷键提示
 * @returns {string} 快捷键提示HTML
 */
function getShortcutHints() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";

  return `
    <div class="shortcuts-hint">
      <span><kbd>${modKey}</kbd> + <kbd>Enter</kbd> 提交</span>
      <span><kbd>${modKey}</kbd> + <kbd>H</kbd> 提示</span>
      <span><kbd>${modKey}</kbd> + <kbd>A</kbd> 答案</span>
      <span><kbd>${modKey}</kbd> + <kbd>N</kbd> 下一题</span>
    </div>
  `;
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
      // 使用onclick属性而非addEventListener，避免重复添加监听器
      this.hints[
        failedHintIndex
      ].text = `❌ AI提示获取失败，请检查网络连接<br><button class="error-refresh-btn" onclick="HintPanelManager.retryLastAiHint()">🔄 重试</button>`;
      this.updatePanel();
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

    const panel = this.container?.querySelector(".hint-panel");
    if (!panel) {
      console.warn("HintPanelManager: 提示面板不存在");
      return;
    }

    const counter = panel.querySelector(".hint-counter");
    const content = panel.querySelector(".hint-text");
    const prevBtn = panel.querySelector(".hint-prev");
    const nextBtn = panel.querySelector(".hint-next");

    if (!counter || !content || !prevBtn || !nextBtn) {
      console.warn("HintPanelManager: 提示面板元素不完整");
      return;
    }

    counter.textContent = `提示 ${this.currentIndex + 1}/${this.hints.length}`;

    const currentHint = this.hints[this.currentIndex];
    if (!currentHint) {
      console.warn("HintPanelManager: 当前提示不存在");
      return;
    }

    // 如果提示文本包含HTML标签，使用innerHTML，否则使用textContent
    if (
      currentHint.text &&
      (currentHint.text.includes("<") || currentHint.text.includes(">"))
    ) {
      content.innerHTML = currentHint.text;
    } else {
      content.textContent = currentHint.text || "";
    }
    content.className = `hint-text hint-level-${currentHint.level || 1}`;

    prevBtn.disabled = this.currentIndex === 0;
    nextBtn.disabled = this.currentIndex === this.hints.length - 1;
  },

  generateHint(word, wordData, context, mode) {
    const hintCount = this.hints.length + 1;

    // 检查是否需要消耗提示加速器
    const hintCheck = canUseAdvancedHint(hintCount, mode);
    if (!hintCheck.canUse) {
      // 无法获取高级提示，返回提示信息
      return {
        level: 3,
        text: `🔒 ${hintCheck.reason}`,
        isLocal: true,
        blocked: true,
      };
    }

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
        text = `📝 词性提示：观察这个词在句子中的位置和作用!`;
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

// =================================================================
// 激励系统函数
// =================================================================

/**
 * 初始化用户档案
 */
function initializeUserProfile() {
  let profile = safeGetItem(STORAGE_KEYS.USER_PROFILE);
  if (!profile) {
    profile = {
      coins: 0,
      diamonds: 0, // 钻石余额
      exp: 0,
      level: 1,
      streak: 0,
      lastLoginDate: new Date().toISOString().split("T")[0],
      totalWordsLearned: 0,
      totalPracticeTime: 0,
      createdAt: new Date().toISOString(),
    };
    safeSetItem(STORAGE_KEYS.USER_PROFILE, profile);
  }
  // 迁移：为已有用户添加钻石字段
  if (profile && profile.diamonds === undefined) {
    profile.diamonds = 0;
    safeSetItem(STORAGE_KEYS.USER_PROFILE, profile);
  }
  return profile;
}

/**
 * 获取用户档案
 */
function getUserProfile() {
  return safeGetItem(STORAGE_KEYS.USER_PROFILE) || initializeUserProfile();
}

/**
 * 更新用户档案
 */
function updateUserProfile(updates) {
  const profile = getUserProfile();
  const updatedProfile = { ...profile, ...updates };
  safeSetItem(STORAGE_KEYS.USER_PROFILE, updatedProfile);
  return updatedProfile;
}

/**
 * 添加金币
 */
function addCoins(amount) {
  const profile = getUserProfile();
  const newCoins = profile.coins + amount;
  updateUserProfile({ coins: newCoins });
  showToast(`💰 获得 ${amount} 金币！`, "success");
  return newCoins;
}

/**
 * 扣除金币
 */
function deductCoins(amount) {
  const profile = getUserProfile();
  if (profile.coins < amount) {
    showToast("金币不足！", "error");
    return false;
  }
  const newCoins = profile.coins - amount;
  updateUserProfile({ coins: newCoins });
  return true;
}

/**
 * 添加钻石
 */
function addDiamonds(amount) {
  const profile = getUserProfile();
  const newDiamonds = profile.diamonds + amount;
  updateUserProfile({ diamonds: newDiamonds });
  showToast(`💎 获得 ${amount} 钻石！`, "success");
  return newDiamonds;
}

/**
 * 扣除钻石
 */
function deductDiamonds(amount) {
  const profile = getUserProfile();
  if (profile.diamonds < amount) {
    showToast("钻石不足！", "error");
    return false;
  }
  const newDiamonds = profile.diamonds - amount;
  updateUserProfile({ diamonds: newDiamonds });
  return true;
}

/**
 * 初始化用户物品库存
 * 确保所有用户(新用户和老用户)都拥有默认的明月清辉和星夜深邃主题
 */
function initializeInventory() {
  let inventory = safeGetItem(STORAGE_KEYS.USER_INVENTORY);
  let needsSave = false;
  const pendingToasts = []; // 收集需要显示的 toast 消息

  if (!inventory) {
    // 新用户: 初始化默认库存
    inventory = {
      owned: ["theme_light", "theme_dark"], // 默认拥有明月清辉和星夜深邃主题
      equipped: "theme_light", // 默认装备明月清辉主题
    };
    needsSave = true;
    logMessage("info", "Inventory", "新用户已自动获得明月清辉和星夜深邃主题");
  } else {
    // 老用户: 确保拥有默认主题
    if (!inventory.owned) {
      inventory.owned = [];
      needsSave = true;
    }

    // 检查并自动赠送明月清辉主题
    if (!inventory.owned.includes("theme_light")) {
      inventory.owned.push("theme_light");
      needsSave = true;
      logMessage("info", "Inventory", "系统已自动赠送明月清辉主题");
      pendingToasts.push("🎁 系统已赠送明月清辉主题！");
    }

    // 检查并自动赠送星夜深邃主题
    if (!inventory.owned.includes("theme_dark")) {
      inventory.owned.push("theme_dark");
      needsSave = true;
      logMessage("info", "Inventory", "系统已自动赠送星夜深邃主题");
      pendingToasts.push("🎁 系统已赠送星夜深邃主题！");
    }

    // 如果没有装备任何主题，默认装备明月清辉
    if (!inventory.equipped) {
      inventory.equipped = "theme_light";
      needsSave = true;
    }
  }

  // 只在有变更时保存
  if (needsSave) {
    safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
  }

  // 延迟显示 toast，确保 toastContainer 已存在于 DOM 中
  if (pendingToasts.length > 0) {
    setTimeout(() => {
      pendingToasts.forEach((msg) => showToast(msg, "success"));
    }, 100);
  }

  return inventory;
}

/**
 * 添加经验值并检查升级
 */
function addExp(amount) {
  const profile = getUserProfile();
  const newExp = profile.exp + amount;
  const currentLevel = profile.level;

  // 计算所需经验值
  const expNeeded = getExpForNextLevel(currentLevel);

  let updates = { exp: newExp };

  // 检查是否升级
  if (newExp >= expNeeded) {
    updates.level = currentLevel + 1;
    updates.exp = newExp - expNeeded;
    showToast(`🎉 恭喜升级到 ${updates.level} 级！`, "success");

    // 升级奖励
    addCoins(updates.level * 50);
  } else {
    showToast(`✨ 获得 ${amount} 经验值！`, "success");
  }

  updateUserProfile(updates);
  return updates;
}

/**
 * 计算下一级所需经验值
 */
function getExpForNextLevel(level) {
  return Math.floor(
    REWARD_CONFIG.EXP_PER_LEVEL *
      Math.pow(REWARD_CONFIG.LEVEL_EXP_MULTIPLIER, level - 1)
  );
}

/**
 * 处理答题奖励（正确答题时调用）
 */
function rewardCorrectAnswer(mode, isStreak = false) {
  let coins = REWARD_CONFIG.COINS_PER_CORRECT;
  let exp = REWARD_CONFIG.EXP_PER_CORRECT;

  // 连续答对奖励
  if (isStreak) {
    coins = Math.floor(coins * REWARD_CONFIG.STREAK_MULTIPLIER);
    exp = Math.floor(exp * REWARD_CONFIG.STREAK_MULTIPLIER);
  }

  // 应用道具效果
  const rewards = applyItemEffects(coins, exp);
  coins = rewards.coins;
  exp = rewards.exp;

  addCoins(coins);
  addExp(exp);

  // 更新总学习单词数
  const profile = getUserProfile();
  updateUserProfile({
    totalWordsLearned: profile.totalWordsLearned + 1,
  });

  // 检查成就
  checkAchievements();
}

/**
 * 更新连续学习天数
 */
function updateStreak() {
  const profile = getUserProfile();
  const today = new Date().toISOString().split("T")[0];
  const lastLogin = profile.lastLoginDate;

  if (lastLogin !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastLogin === yesterdayStr) {
      // 连续登录
      updateUserProfile({
        streak: profile.streak + 1,
        lastLoginDate: today,
      });
    } else {
      // 中断连续
      updateUserProfile({
        streak: 1,
        lastLoginDate: today,
      });
    }
  }
}

// =================================================================
// 道具效果系统
// =================================================================

/**
 * 初始化激活道具状态
 */
function initializeActiveItems() {
  let activeItems = safeGetItem(STORAGE_KEYS.ACTIVE_ITEMS);
  if (!activeItems) {
    activeItems = {
      items: {}, // { itemId: { activatedAt, expiresAt, usesLeft } }
    };
    safeSetItem(STORAGE_KEYS.ACTIVE_ITEMS, activeItems);
  }
  return activeItems;
}

/**
 * 激活道具
 * @param {string} itemId - 道具ID
 * @param {number} duration - 持续时间（毫秒），null表示永久
 * @param {number} uses - 使用次数，null表示无限
 * @returns {boolean} 是否激活成功
 */
function activateItem(itemId, duration = null, uses = null) {
  const activeItems = initializeActiveItems();
  const now = Date.now();

  activeItems.items[itemId] = {
    activatedAt: now,
    expiresAt: duration ? now + duration : null,
    usesLeft: uses,
  };

  safeSetItem(STORAGE_KEYS.ACTIVE_ITEMS, activeItems);
  logMessage("info", "道具系统", `激活道具: ${itemId}`);
  return true;
}

/**
 * 检查道具是否激活
 * @param {string} itemId - 道具ID
 * @returns {boolean} 是否激活
 */
function isItemActive(itemId) {
  const activeItems = initializeActiveItems();
  const item = activeItems.items[itemId];

  if (!item) return false;

  const now = Date.now();

  // 检查是否过期
  if (item.expiresAt && now > item.expiresAt) {
    deactivateItem(itemId);
    return false;
  }

  // 检查使用次数
  if (item.usesLeft !== null && item.usesLeft <= 0) {
    deactivateItem(itemId);
    return false;
  }

  return true;
}

/**
 * 消耗道具使用次数
 * @param {string} itemId - 道具ID
 * @returns {boolean} 是否成功消耗
 */
function consumeItemUse(itemId) {
  const activeItems = initializeActiveItems();
  const item = activeItems.items[itemId];

  if (!item || item.usesLeft === null) return false;

  item.usesLeft -= 1;

  if (item.usesLeft <= 0) {
    deactivateItem(itemId);
  } else {
    safeSetItem(STORAGE_KEYS.ACTIVE_ITEMS, activeItems);
  }

  return true;
}

/**
 * 取消激活道具
 * @param {string} itemId - 道具ID
 */
function deactivateItem(itemId) {
  const activeItems = initializeActiveItems();
  delete activeItems.items[itemId];
  safeSetItem(STORAGE_KEYS.ACTIVE_ITEMS, activeItems);
  logMessage("info", "道具系统", `道具失效: ${itemId}`);
}

/**
 * 获取所有激活的道具
 * @returns {Object} 激活的道具列表
 */
function getActiveItems() {
  const activeItems = initializeActiveItems();
  const now = Date.now();
  const active = {};

  for (const [itemId, item] of Object.entries(activeItems.items)) {
    // 清理过期和用尽的道具
    if (
      (item.expiresAt && now > item.expiresAt) ||
      (item.usesLeft !== null && item.usesLeft <= 0)
    ) {
      deactivateItem(itemId);
    } else {
      active[itemId] = item;
    }
  }

  return active;
}

/**
 * 应用道具效果到奖励
 * @param {number} baseCoins - 基础金币
 * @param {number} baseExp - 基础经验值
 * @returns {Object} 应用道具后的奖励 { coins, exp }
 */
function applyItemEffects(baseCoins, baseExp) {
  let coins = baseCoins;
  let exp = baseExp;

  // 检查经验倍增卡
  if (isItemActive("item_exp_boost")) {
    exp *= 2;
  }

  // 检查金币加成
  if (isItemActive("item_coin_boost")) {
    coins *= 1.5;
  }

  return {
    coins: Math.floor(coins),
    exp: Math.floor(exp),
  };
}

/**
 * 检查是否需要消耗提示加速器来获取高级提示
 * @param {number} hintCount - 当前是第几次提示（从1开始）
 * @returns {boolean} 是否需要消耗提示加速器
 */
function needsHintBooster(hintCount) {
  // 第一次提示和最后的警告提示不需要消耗
  // 上下文模式：第1次和第6次（警告）不消耗，第2-5次需要消耗
  // 填空模式：第1次和第10次（警告）不消耗，第2-9次需要消耗
  return hintCount >= 2 && hintCount <= 9;
}

/**
 * 检查是否可以获取高级提示（检查提示加速器或大师之钥）
 * @param {number} hintCount - 当前是第几次提示
 * @param {string} mode - 模式（context 或 blank）
 * @returns {Object} { canUse: boolean, reason: string }
 */
function canUseAdvancedHint(hintCount, mode = "blank") {
  // 第一次提示和警告提示无需道具
  if (!needsHintBooster(hintCount, mode)) {
    return { canUse: true, reason: "basic_hint" };
  }

  // 检查是否拥有大师之钥
  if (isItemActive("item_master_key")) {
    return { canUse: true, reason: "master_key" };
  }

  // 检查是否拥有提示加速器
  const inventory = safeGetItem(STORAGE_KEYS.USER_INVENTORY, { owned: [] });
  const hasBooster = inventory.owned.includes("item_hint_boost");

  if (!hasBooster) {
    return {
      canUse: false,
      reason: "需要提示加速器才能获取高级提示！请前往商店购买。",
    };
  }

  return { canUse: true, reason: "hint_booster" };
}

/**
 * 消耗一个提示加速器
 * @returns {boolean} 是否消耗成功
 */
function consumeHintBooster() {
  const inventory = safeGetItem(STORAGE_KEYS.USER_INVENTORY, { owned: [] });
  const boosterIndex = inventory.owned.indexOf("item_hint_boost");

  if (boosterIndex === -1) {
    return false;
  }

  // 移除一个提示加速器
  inventory.owned.splice(boosterIndex, 1);
  safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);

  logMessage("info", "道具系统", "消耗了1个提示加速器");
  return true;
}

/**
 * 初始化成就系统
 */
function initializeAchievements() {
  let achievements = safeGetItem(STORAGE_KEYS.ACHIEVEMENTS);
  if (!achievements) {
    achievements = {
      unlocked: [],
      definitions: [
        // 全局成就
        {
          id: "first_step",
          name: "初来乍到",
          description: "完成第一个单词练习",
          type: ACHIEVEMENT_TYPES.TOTAL_WORDS,
          requirement: 1,
          reward: 50,
          icon: "🎯",
        },
        {
          id: "word_master_10",
          name: "小试牛刀",
          description: "累计学习10个单词",
          type: ACHIEVEMENT_TYPES.TOTAL_WORDS,
          requirement: 10,
          reward: 100,
          icon: "📚",
        },
        {
          id: "word_master_50",
          name: "勤学苦练",
          description: "累计学习50个单词",
          type: ACHIEVEMENT_TYPES.TOTAL_WORDS,
          requirement: 50,
          reward: 300,
          icon: "🏆",
        },
        {
          id: "word_master_100",
          name: "百战精英",
          description: "累计学习100个单词",
          type: ACHIEVEMENT_TYPES.TOTAL_WORDS,
          requirement: 100,
          reward: 500,
          icon: "👑",
        },
        {
          id: "streak_3",
          name: "持之以恒",
          description: "连续学习3天",
          type: ACHIEVEMENT_TYPES.STREAK,
          requirement: 3,
          reward: 100,
          icon: "🔥",
        },
        {
          id: "streak_7",
          name: "七日之约",
          description: "连续学习7天",
          type: ACHIEVEMENT_TYPES.STREAK,
          requirement: 7,
          reward: 300,
          icon: "⭐",
        },
        {
          id: "streak_30",
          name: "月度冠军",
          description: "连续学习30天",
          type: ACHIEVEMENT_TYPES.STREAK,
          requirement: 30,
          reward: 1000,
          icon: "💎",
        },
        // Mix 模式专属成就（由 mix.js 触发）
        {
          id: "first_practice",
          name: "初次尝试",
          description: "完成第一次混合练习",
          type: "MANUAL", // 手动触发类型
          reward: 50,
          icon: "🎯",
        },
        {
          id: "perfect_round",
          name: "完美表现",
          description: "单轮练习全部答对",
          type: "MANUAL",
          reward: 100,
          icon: "💯",
        },
        {
          id: "streak_master",
          name: "连击大师",
          description: "单轮连续答对5题",
          type: "MANUAL",
          reward: 100,
          icon: "🔥",
        },
        {
          id: "level_10",
          name: "十级学者",
          description: "达到10级",
          type: "MANUAL",
          reward: 500,
          icon: "⭐",
        },
        // 排位赛成就
        {
          id: "first_ranked_match",
          name: "初入竞技",
          description: "完成第一场排位赛",
          type: "MANUAL",
          reward: 100,
          icon: "⚔️",
        },
        {
          id: "reach_gold",
          name: "黄金选手",
          description: "排位赛达到黄金段位",
          type: "MANUAL",
          reward: 200,
          icon: "🥇",
        },
        {
          id: "reach_platinum",
          name: "铂金精英",
          description: "排位赛达到铂金段位",
          type: "MANUAL",
          reward: 300,
          icon: "💎",
        },
        {
          id: "reach_diamond",
          name: "钻石王者",
          description: "排位赛达到钻石段位",
          type: "MANUAL",
          reward: 500,
          icon: "💠",
        },
        {
          id: "reach_master",
          name: "登峰造极",
          description: "排位赛达到大师段位",
          type: "MANUAL",
          reward: 800,
          icon: "👑",
        },
        {
          id: "reach_grandmaster",
          name: "一代宗师",
          description: "排位赛达到宗师段位",
          type: "MANUAL",
          reward: 1500,
          icon: "🏆",
        },
        {
          id: "ranked_win_streak_5",
          name: "势不可挡",
          description: "排位赛连胜5场",
          type: "MANUAL",
          reward: 300,
          icon: "🔥",
        },
        {
          id: "season_champion",
          name: "赛季冠军",
          description: "赛季结束时排名第一",
          type: "MANUAL",
          reward: 2000,
          icon: "🏅",
        },
      ],
    };
    safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);
  }
  return achievements;
}

/**
 * 检查并解锁成就
 */
function checkAchievements() {
  const profile = getUserProfile();
  const achievements = initializeAchievements();

  achievements.definitions.forEach((achievement) => {
    // 如果已解锁，跳过
    if (achievements.unlocked.includes(achievement.id)) {
      return;
    }

    let shouldUnlock = false;

    switch (achievement.type) {
      case ACHIEVEMENT_TYPES.TOTAL_WORDS:
        shouldUnlock = profile.totalWordsLearned >= achievement.requirement;
        break;
      case ACHIEVEMENT_TYPES.STREAK:
        shouldUnlock = profile.streak >= achievement.requirement;
        break;
    }

    if (shouldUnlock) {
      unlockAchievement(achievement);
    }
  });
}

/**
 * 显示成就通知（通用函数）
 * @param {Object} achievement - 成就对象
 */
function showAchievementNotification(achievement) {
  // 移除已存在的通知
  const existingNotif = document.querySelector(".achievement-notification");
  if (existingNotif) {
    existingNotif.remove();
  }

  const notification = document.createElement("div");
  notification.className = "achievement-notification";
  notification.innerHTML = `
    <div class="achievement-shine"></div>
    <div class="achievement-content">
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-text">
        <h3 class="achievement-title">${
          achievement.name || achievement.title
        }</h3>
        <p class="achievement-description">${
          achievement.description || achievement.message
        }</p>
        <div class="achievement-reward">💰 ${achievement.reward}</div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // 添加显示动画
  setTimeout(() => notification.classList.add("show"), 10);

  // 5秒后自动关闭
  setTimeout(() => {
    // 先移除 show 类，添加 hide 类触发离场动画
    notification.classList.remove("show");
    notification.classList.add("hide");
    // 等待离场动画完成后再移除元素（动画时长 600ms，留出 650ms 余量）
    setTimeout(() => notification.remove(), 650);
  }, 5000);
}

/**
 * 解锁成就
 */
function unlockAchievement(achievement) {
  const achievements = initializeAchievements();

  if (!achievements.unlocked.includes(achievement.id)) {
    achievements.unlocked.push(achievement.id);
    safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);

    // 给予奖励
    addCoins(achievement.reward);

    // 显示成就解锁通知（使用新样式）
    showAchievementNotification(achievement);
  }
}

/**
 * 获取已解锁的成就
 */
function getUnlockedAchievements() {
  const achievements = initializeAchievements();
  return achievements.definitions.filter((a) =>
    achievements.unlocked.includes(a.id)
  );
}

/**
 * 获取未解锁的成就
 */
function getLockedAchievements() {
  const achievements = initializeAchievements();
  return achievements.definitions.filter(
    (a) => !achievements.unlocked.includes(a.id)
  );
}

/**
 * 初始化主题设置
 */
function initializeTheme() {
  let theme = safeGetItem(STORAGE_KEYS.THEME_SETTING);
  if (!theme) {
    // 检测系统主题偏好
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
    safeSetItem(STORAGE_KEYS.THEME_SETTING, theme);
  }
  applyTheme(theme);
  return theme;
}

/**
 * 切换主题
 */
function toggleTheme() {
  const currentTheme = safeGetItem(STORAGE_KEYS.THEME_SETTING) || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  safeSetItem(STORAGE_KEYS.THEME_SETTING, newTheme);
  applyTheme(newTheme);
  return newTheme;
}

/**
 * 主题配置 - 定义所有可用主题的颜色方案
 */
const THEME_CONFIGS = {
  theme_light: {
    name: "明月清辉",
    colors: {
      primary: "#4f46e5",
      secondary: "#6366f1",
      background: "#f8fafc",
      textPrimary: "#1e293b",
      textSecondary: "#475569",
      cardBg: "#ffffff",
    },
    gradient: "linear-gradient(90deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
    isDefault: true,
  },
  theme_dark: {
    name: "星夜深邃",
    colors: {
      primary: "#6366f1",
      secondary: "#818cf8",
      background: "#0f172a",
      textPrimary: "#e2e8f0",
      textSecondary: "#94a3b8",
      cardBg: "rgba(30, 41, 59, 0.85)",
    },
    gradient: "linear-gradient(135deg, #1a1b4b, #2d1b69, #1e3a8a, #4c1d95)",
    isDefault: true,
  },
  theme_forest: {
    name: "森林绿野",
    colors: {
      primary: "#10b981",
      secondary: "#059669",
      background: "#f0fdf4",
      textPrimary: "#064e3b",
      textSecondary: "#047857",
      cardBg: "#dcfce7",
    },
    gradient: "linear-gradient(135deg, #10b981, #059669, #34d399, #6ee7b7)",
  },
  theme_ocean: {
    name: "深海蓝调",
    colors: {
      primary: "#0284c7",
      secondary: "#0369a1",
      background: "#f0f9ff",
      textPrimary: "#0c4a6e",
      textSecondary: "#0369a1",
      cardBg: "#e0f2fe",
    },
    gradient: "linear-gradient(135deg, #0284c7, #0369a1, #0ea5e9, #38bdf8)",
  },
  theme_sunset: {
    name: "日落余晖",
    colors: {
      primary: "#f59e0b",
      secondary: "#d97706",
      background: "#fffbeb",
      textPrimary: "#78350f",
      textSecondary: "#b45309",
      cardBg: "#fef3c7",
    },
    gradient: "linear-gradient(135deg, #f59e0b, #d97706, #fbbf24, #fcd34d)",
  },
  theme_galaxy: {
    name: "玉津璀璨",
    colors: {
      primary: "#8b5cf6",
      secondary: "#7c3aed",
      background: "#faf5ff",
      textPrimary: "#4c1d95",
      textSecondary: "#6d28d9",
      cardBg: "#ede9fe",
    },
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed, #a78bfa, #c4b5fd)",
  },
  theme_cherry: {
    name: "樱花纷飞",
    colors: {
      primary: "#ec4899",
      secondary: "#db2777",
      background: "#fdf2f8",
      textPrimary: "#831843",
      textSecondary: "#be185d",
      cardBg: "#fce7f3",
    },
    gradient: "linear-gradient(135deg, #ec4899, #db2777, #f472b6, #f9a8d4)",
  },
  theme_aurora: {
    name: "极光幻境",
    colors: {
      primary: "#06b6d4",
      secondary: "#0891b2",
      background: "#ecfeff",
      textPrimary: "#164e63",
      textSecondary: "#0e7490",
      cardBg: "#cffafe",
    },
    gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899, #f59e0b)",
  },
};

/**
 * 应用主题（明暗模式）
 */
function applyTheme(theme) {
  let actualTheme = theme;

  // 如果是自动模式，检测系统偏好
  if (theme === "auto") {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    actualTheme = prefersDark ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", actualTheme);
}

/**
 * 创建圆形扩散主题切换动画
 * 使用 View Transition API 实现真正的圆内新主题、圆外旧主题效果
 */
async function createThemeTransitionAnimation(themeApplyFn) {
  // 检查浏览器是否支持 View Transition API
  if (!document.startViewTransition) {
    // 不支持则直接应用主题
    themeApplyFn();
    return;
  }

  // 使用 View Transition API
  const transition = document.startViewTransition(() => {
    themeApplyFn();
  });

  // 等待动画完成
  try {
    await transition.finished;
  } catch (error) {
    logMessage("warn", "Theme", "主题切换动画失败，已回退到直接切换");
  }
}

/**
 * 应用装备的主题皮肤（带动画）
 */
function applyEquippedThemeSkin(withAnimation = false) {
  const inventory = initializeInventory();
  const equippedTheme = inventory.equipped;

  const applyThemeStyles = () => {
    // 移除所有主题类
    Object.keys(THEME_CONFIGS).forEach((themeId) => {
      document.documentElement.classList.remove(themeId);
    });

    // 如果有装备的主题，应用它
    if (equippedTheme && THEME_CONFIGS[equippedTheme]) {
      document.documentElement.classList.add(equippedTheme);
      const config = THEME_CONFIGS[equippedTheme];

      // 动态设置 CSS 变量
      const root = document.documentElement;
      root.style.setProperty("--primary", config.colors.primary);
      root.style.setProperty("--secondary", config.colors.secondary);
      root.style.setProperty("--background", config.colors.background);
      root.style.setProperty("--text-primary", config.colors.textPrimary);
      root.style.setProperty("--text-secondary", config.colors.textSecondary);
      root.style.setProperty("--card-bg", config.colors.cardBg);

      logMessage("info", "Theme", `已应用主题: ${config.name}`);
    }
  };

  if (withAnimation) {
    // 使用 View Transition API 实现圆形扩散动画
    createThemeTransitionAnimation(applyThemeStyles);
  } else {
    applyThemeStyles();
  }
}

/**
 * 获取当前装备的主题信息
 */
function getEquippedThemeInfo() {
  const inventory = initializeInventory();
  const equippedTheme = inventory.equipped;

  if (equippedTheme && THEME_CONFIGS[equippedTheme]) {
    return {
      id: equippedTheme,
      ...THEME_CONFIGS[equippedTheme],
    };
  }

  return null;
}

// =================================================================
// 开发者模式系统
// =================================================================

// 开发者模式触发计数器
let devModeClickCount = 0;
let devModeClickTimer = null;

// =================================================================
// 赛季系统
// =================================================================

// 赛季系统存储键
const SEASON_STORAGE_KEY = "seasonData";

// 赛季配置
const SEASON_CONFIG = {
  // 赛季时长（毫秒）- 14天
  DURATION: 14 * 24 * 60 * 60 * 1000,
  // 段位配置（从低到高）
  TIERS: [
    { id: "bronze", name: "青铜", icon: "🥉", minScore: 0, color: "#cd7f32" },
    { id: "silver", name: "白银", icon: "🥈", minScore: 500, color: "#c0c0c0" },
    { id: "gold", name: "黄金", icon: "🥇", minScore: 1200, color: "#ffd700" },
    {
      id: "platinum",
      name: "铂金",
      icon: "💎",
      minScore: 2000,
      color: "#00ced1",
    },
    {
      id: "diamond",
      name: "钻石",
      icon: "💠",
      minScore: 3000,
      color: "#b9f2ff",
    },
    {
      id: "master",
      name: "大师",
      icon: "👑",
      minScore: 4500,
      color: "#9400d3",
    },
    {
      id: "grandmaster",
      name: "宗师",
      icon: "🏆",
      minScore: 6000,
      color: "#ff4500",
    },
  ],
  // 排位赛积分配置
  SCORE: {
    WIN: 30, // 胜利基础积分
    LOSS: -15, // 失败扣分
    PERFECT_BONUS: 20, // 全对额外奖励
    STREAK_BONUS: 5, // 连胜额外奖励（每连胜+5）
  },
  // 赛季结算奖励（按段位）
  REWARDS: {
    bronze: { coins: 100, diamonds: 0 },
    silver: { coins: 200, diamonds: 5 },
    gold: { coins: 400, diamonds: 15 },
    platinum: { coins: 700, diamonds: 30 },
    diamond: { coins: 1000, diamonds: 50 },
    master: { coins: 1500, diamonds: 80 },
    grandmaster: { coins: 2500, diamonds: 150 },
  },
};

/**
 * 初始化赛季数据
 * @returns {Object} 赛季数据
 */
function initializeSeasonData() {
  let seasonData = safeGetItem(SEASON_STORAGE_KEY);
  const now = Date.now();

  if (!seasonData) {
    // 首次创建赛季
    seasonData = createNewSeason();
    safeSetItem(SEASON_STORAGE_KEY, seasonData);
    logMessage("info", "Season", "创建新赛季");
  } else {
    // 检查赛季是否过期
    if (now > seasonData.endTime) {
      // 赛季结束，发放奖励并创建新赛季
      settleSeasonRewards(seasonData);
      seasonData = createNewSeason();
      safeSetItem(SEASON_STORAGE_KEY, seasonData);
      logMessage("info", "Season", "赛季结束，开启新赛季");
    }
  }

  return seasonData;
}

/**
 * 创建新赛季
 * @returns {Object} 新赛季数据
 */
function createNewSeason() {
  const now = Date.now();
  const seasonNumber = calculateSeasonNumber();

  return {
    seasonNumber: seasonNumber,
    startTime: now,
    endTime: now + SEASON_CONFIG.DURATION,
    playerData: {
      score: 0,
      tier: "bronze",
      wins: 0,
      losses: 0,
      winStreak: 0,
      maxWinStreak: 0,
      matchHistory: [], // 最近的比赛记录
    },
    leaderboard: generateFakeLeaderboard(seasonNumber),
  };
}

/**
 * 计算当前赛季编号
 * @returns {number} 赛季编号
 */
function calculateSeasonNumber() {
  // 基于2025年1月1日开始计算赛季
  const baseDate = new Date("2025-01-01").getTime();
  const now = Date.now();
  return Math.floor((now - baseDate) / SEASON_CONFIG.DURATION) + 1;
}

/**
 * 生成假玩家排行榜
 * @param {number} seasonNumber - 赛季编号
 * @returns {Array} 排行榜数据
 */
function generateFakeLeaderboard(seasonNumber) {
  const names = [
    "学霸小明",
    "英语达人",
    "单词王者",
    "勤奋的小华",
    "努力的小李",
    "英语学习者",
    "词汇大师",
    "阅读专家",
    "听力高手",
    "口语达人",
    "语法先锋",
    "翻译专家",
    "写作能手",
    "考试战神",
    "背单词狂人",
    "每日坚持",
    "从不放弃",
    "追梦少年",
    "知识海洋",
    "智慧之星",
    "学无止境",
    "天道酬勤",
    "厚积薄发",
    "勇往直前",
    "持之以恒",
    "百词斩手",
    "墨墨好友",
    "扇贝达人",
    "知米背词",
    "沪江学员",
  ];

  const leaderboard = [];
  const usedNames = new Set();

  // 生成20个假玩家
  for (let i = 0; i < 20; i++) {
    let name;
    do {
      name = names[Math.floor(Math.random() * names.length)];
      // 添加随机后缀避免重名
      if (usedNames.has(name)) {
        name = name + Math.floor(Math.random() * 100);
      }
    } while (usedNames.has(name));
    usedNames.add(name);

    // 根据排名生成合理的分数（排名越高分数越高）
    const baseScore = 6000 - i * 250 + Math.floor(Math.random() * 200);
    const tier = getTierByScore(Math.max(0, baseScore));

    leaderboard.push({
      rank: i + 1,
      name: name,
      score: Math.max(0, baseScore),
      tier: tier.id,
      isBot: true,
    });
  }

  return leaderboard;
}

/**
 * 根据分数获取段位
 * @param {number} score - 分数
 * @returns {Object} 段位信息
 */
function getTierByScore(score) {
  const tiers = SEASON_CONFIG.TIERS;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (score >= tiers[i].minScore) {
      return tiers[i];
    }
  }
  return tiers[0];
}

/**
 * 获取下一个段位信息
 * @param {string} currentTierId - 当前段位ID
 * @returns {Object|null} 下一段位信息，已是最高段位则返回null
 */
function getNextTier(currentTierId) {
  const tiers = SEASON_CONFIG.TIERS;
  const currentIndex = tiers.findIndex((t) => t.id === currentTierId);
  if (currentIndex < tiers.length - 1) {
    return tiers[currentIndex + 1];
  }
  return null;
}

/**
 * 获取当前赛季数据
 * @returns {Object} 赛季数据
 */
function getSeasonData() {
  return initializeSeasonData();
}

/**
 * 获取玩家排位数据
 * @returns {Object} 玩家排位数据
 */
function getPlayerRankedData() {
  const seasonData = getSeasonData();
  return seasonData.playerData;
}

/**
 * 更新排位赛结果
 * @param {boolean} isWin - 是否胜利
 * @param {boolean} isPerfect - 是否完美（全对）
 * @param {number} correctCount - 正确数量
 * @param {number} totalCount - 总题目数
 * @returns {Object} 更新结果 { scoreChange, newScore, tierChange, rewards }
 */
function updateRankedResult(
  isWin,
  isPerfect = false,
  correctCount = 0,
  totalCount = 10
) {
  const seasonData = getSeasonData();
  const player = seasonData.playerData;
  const oldTier = player.tier;

  let scoreChange = 0;

  if (isWin) {
    // 基础胜利分数
    scoreChange = SEASON_CONFIG.SCORE.WIN;

    // 完美奖励
    if (isPerfect) {
      scoreChange += SEASON_CONFIG.SCORE.PERFECT_BONUS;
    }

    // 连胜奖励
    player.winStreak++;
    if (player.winStreak > 1) {
      scoreChange +=
        SEASON_CONFIG.SCORE.STREAK_BONUS * Math.min(player.winStreak - 1, 5);
    }

    player.wins++;
    player.maxWinStreak = Math.max(player.maxWinStreak, player.winStreak);
  } else {
    // 失败扣分
    scoreChange = SEASON_CONFIG.SCORE.LOSS;
    player.winStreak = 0;
    player.losses++;
  }

  // 更新分数（不低于0）
  player.score = Math.max(0, player.score + scoreChange);

  // 更新段位
  const newTierInfo = getTierByScore(player.score);
  player.tier = newTierInfo.id;

  // 记录比赛历史（最多保留20条）
  player.matchHistory.unshift({
    time: Date.now(),
    isWin: isWin,
    isPerfect: isPerfect,
    scoreChange: scoreChange,
    correctCount: correctCount,
    totalCount: totalCount,
  });
  if (player.matchHistory.length > 20) {
    player.matchHistory.pop();
  }

  // 更新假玩家分数（模拟其他玩家也在进步）
  updateFakePlayersScore(seasonData);

  // 更新玩家在排行榜中的位置
  updatePlayerRankPosition(seasonData);

  safeSetItem(SEASON_STORAGE_KEY, seasonData);

  // 检查是否触发段位相关成就
  checkRankedAchievements(player, oldTier);

  return {
    scoreChange: scoreChange,
    newScore: player.score,
    tierChange:
      oldTier !== player.tier ? { from: oldTier, to: player.tier } : null,
    newTier: newTierInfo,
  };
}

/**
 * 更新假玩家分数（模拟活跃度）
 * @param {Object} seasonData - 赛季数据
 */
function updateFakePlayersScore(seasonData) {
  seasonData.leaderboard.forEach((player) => {
    if (player.isBot) {
      // 随机增减分数（-10 到 +20）
      const change = Math.floor(Math.random() * 31) - 10;
      player.score = Math.max(0, player.score + change);
      player.tier = getTierByScore(player.score).id;
    }
  });

  // 重新排序
  seasonData.leaderboard.sort((a, b) => b.score - a.score);

  // 更新排名
  seasonData.leaderboard.forEach((player, index) => {
    player.rank = index + 1;
  });
}

/**
 * 更新玩家在排行榜中的位置
 * @param {Object} seasonData - 赛季数据
 */
function updatePlayerRankPosition(seasonData) {
  const player = seasonData.playerData;

  // 移除旧的玩家数据（如果存在）
  seasonData.leaderboard = seasonData.leaderboard.filter((p) => !p.isPlayer);

  // 添加玩家数据
  seasonData.leaderboard.push({
    rank: 0,
    name: "我",
    score: player.score,
    tier: player.tier,
    isPlayer: true,
    isBot: false,
  });

  // 重新排序
  seasonData.leaderboard.sort((a, b) => b.score - a.score);

  // 更新排名
  seasonData.leaderboard.forEach((p, index) => {
    p.rank = index + 1;
  });
}

/**
 * 获取排行榜数据
 * @param {number} limit - 返回数量限制
 * @returns {Array} 排行榜数据
 */
function getLeaderboard(limit = 20) {
  const seasonData = getSeasonData();
  return seasonData.leaderboard.slice(0, limit);
}

/**
 * 获取玩家排名
 * @returns {number} 玩家排名
 */
function getPlayerRank() {
  const seasonData = getSeasonData();
  const playerEntry = seasonData.leaderboard.find((p) => p.isPlayer);
  return playerEntry ? playerEntry.rank : seasonData.leaderboard.length + 1;
}

/**
 * 获取赛季剩余时间
 * @returns {Object} { days, hours, minutes, totalMs }
 */
function getSeasonRemainingTime() {
  const seasonData = getSeasonData();
  const remaining = Math.max(0, seasonData.endTime - Date.now());

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return { days, hours, minutes, totalMs: remaining };
}

/**
 * 结算赛季奖励
 * @param {Object} seasonData - 赛季数据
 */
function settleSeasonRewards(seasonData) {
  const tier = seasonData.playerData.tier;
  const rewards = SEASON_CONFIG.REWARDS[tier];

  if (rewards) {
    addCoins(rewards.coins);
    if (rewards.diamonds > 0) {
      addDiamonds(rewards.diamonds);
    }

    showToast(
      `🎊 赛季结算！获得 ${rewards.coins} 金币${
        rewards.diamonds > 0 ? ` 和 ${rewards.diamonds} 钻石` : ""
      }`,
      "success",
      5000
    );

    // 检查赛季冠军成就
    if (getPlayerRank() === 1) {
      const achievements = initializeAchievements();
      const championAchievement = achievements.definitions.find(
        (a) => a.id === "season_champion"
      );
      if (
        championAchievement &&
        !achievements.unlocked.includes("season_champion")
      ) {
        unlockAchievement(championAchievement);
      }
    }
  }

  logMessage(
    "info",
    "Season",
    `赛季结算: 段位=${tier}, 奖励=${JSON.stringify(rewards)}`
  );
}

/**
 * 检查排位赛相关成就
 * @param {Object} player - 玩家数据
 * @param {string} oldTier - 旧段位
 */
function checkRankedAchievements(player, oldTier) {
  const achievements = initializeAchievements();

  // 首次参赛成就
  if (player.wins + player.losses === 1) {
    const firstMatch = achievements.definitions.find(
      (a) => a.id === "first_ranked_match"
    );
    if (firstMatch && !achievements.unlocked.includes("first_ranked_match")) {
      unlockAchievement(firstMatch);
    }
  }

  // 段位晋升成就
  if (oldTier !== player.tier) {
    const tierIndex = SEASON_CONFIG.TIERS.findIndex(
      (t) => t.id === player.tier
    );
    const oldTierIndex = SEASON_CONFIG.TIERS.findIndex((t) => t.id === oldTier);

    if (tierIndex > oldTierIndex) {
      // 晋升了
      showToast(
        `🎉 恭喜晋升到${SEASON_CONFIG.TIERS[tierIndex].name}段位！`,
        "success"
      );

      // 检查段位成就
      const tierAchievements = {
        gold: "reach_gold",
        platinum: "reach_platinum",
        diamond: "reach_diamond",
        master: "reach_master",
        grandmaster: "reach_grandmaster",
      };

      const achievementId = tierAchievements[player.tier];
      if (achievementId) {
        const achievement = achievements.definitions.find(
          (a) => a.id === achievementId
        );
        if (achievement && !achievements.unlocked.includes(achievementId)) {
          unlockAchievement(achievement);
        }
      }
    }
  }

  // 连胜成就
  if (player.winStreak >= 5) {
    const winStreakAchievement = achievements.definitions.find(
      (a) => a.id === "ranked_win_streak_5"
    );
    if (
      winStreakAchievement &&
      !achievements.unlocked.includes("ranked_win_streak_5")
    ) {
      unlockAchievement(winStreakAchievement);
    }
  }
}

/**
 * 添加钻石
 * @param {number} amount - 钻石数量
 */
function addDiamonds(amount) {
  const profile = getUserProfile();
  const newDiamonds = (profile.diamonds || 0) + amount;
  updateUserProfile({ diamonds: newDiamonds });
  showToast(`💎 获得 ${amount} 钻石！`, "success");
}

/**
 * 检查是否为开发者模式
 * @returns {boolean} 是否为开发者模式
 */
function isDeveloperMode() {
  return safeGetItem(STORAGE_KEYS.DEVELOPER_MODE, false) === true;
}

/**
 * 设置开发者模式
 * @param {boolean} enabled - 是否启用
 */
function setDeveloperMode(enabled) {
  safeSetItem(STORAGE_KEYS.DEVELOPER_MODE, enabled);
  applyDeveloperModeUI();
  logMessage("info", "DevMode", `开发者模式已${enabled ? "启用" : "关闭"}`);
}

/**
 * 切换开发者模式
 */
function toggleDeveloperMode() {
  const current = isDeveloperMode();
  setDeveloperMode(!current);
  showToast(
    current ? "🔒 开发者模式已关闭" : "🔓 开发者模式已启用",
    current ? "info" : "success"
  );
}

/**
 * 处理标题点击（用于触发开发者模式）
 * 连续点击7次启用/关闭开发者模式
 */
function handleDevModeTitleClick() {
  devModeClickCount++;

  // 清除之前的计时器
  if (devModeClickTimer) {
    clearTimeout(devModeClickTimer);
  }

  // 3秒内没有继续点击则重置计数
  devModeClickTimer = setTimeout(() => {
    devModeClickCount = 0;
  }, 3000);

  // 达到7次点击
  if (devModeClickCount >= 7) {
    devModeClickCount = 0;
    clearTimeout(devModeClickTimer);
    toggleDeveloperMode();
  } else if (devModeClickCount >= 5) {
    // 提示用户快要触发了
    showToast(`再点击 ${7 - devModeClickCount} 次...`, "info", 1000);
  }
}

/**
 * 初始化开发者模式标题点击监听
 * @param {string} selector - 标题元素选择器
 */
function initDevModeTrigger(selector = "h1") {
  const titleElement = document.querySelector(selector);
  if (titleElement) {
    titleElement.style.cursor = "default";
    titleElement.style.userSelect = "none";
    titleElement.addEventListener("click", handleDevModeTitleClick);
  }
}

/**
 * 应用开发者模式UI状态
 * 控制开发者专属元素的显示/隐藏
 */
function applyDeveloperModeUI() {
  const isDevMode = isDeveloperMode();

  // 1. 主题切换按钮 (.theme-toggle-wrapper)
  document.querySelectorAll(".theme-toggle-wrapper").forEach((el) => {
    el.style.display = isDevMode ? "" : "none";
  });

  // 2. 开发者刷新按钮 (#devRefreshBtn)
  const devRefreshBtn = document.getElementById("devRefreshBtn");
  if (devRefreshBtn) {
    devRefreshBtn.style.display = isDevMode ? "" : "none";
  }

  // 3. 管理界面的"用户数据"和"数据备份"标签
  const devOnlyTabs = ["tab-user-data", "tab-backup"];
  devOnlyTabs.forEach((tabId) => {
    const tabInput = document.getElementById(tabId);
    const tabLabel = document.querySelector(`label[for="${tabId}"]`);
    if (tabInput) {
      tabInput.style.display = isDevMode ? "" : "none";
    }
    if (tabLabel) {
      tabLabel.style.display = isDevMode ? "" : "none";
    }
  });

  // 4. 对应的 tab-content 面板
  const devOnlyPanels = ["userDataTab", "backupTab"];
  devOnlyPanels.forEach((panelId) => {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.style.display = isDevMode ? "" : "none";
    }
  });

  const tabGroup = document.querySelector(".segmented-tabs");
  const tabRadios = tabGroup
    ? Array.from(tabGroup.querySelectorAll('input[name="admin-tabs"]'))
    : [];
  const checkedTab = tabRadios.find((radio) => radio.checked);
  const devOnlyValues = ["user-data", "backup"];
  let targetTab = checkedTab?.value || "words";

  // 关闭开发者模式时，如果当前是开发者专属标签则回退到单词管理
  if (!isDevMode && devOnlyValues.includes(targetTab)) {
    targetTab = "words";
    const wordsTab = document.getElementById("tab-words");
    if (wordsTab) {
      wordsTab.checked = true;
    }
  }

  // 同步标签显示和指示器位置
  const syncTabs = () => {
    if (typeof showTab === "function") {
      showTab(targetTab);
    } else if (typeof window.__moveSegIndicator === "function") {
      window.__moveSegIndicator(targetTab);
    }
  };

  // 等待样式更新后再同步，避免宽度计算异常
  requestAnimationFrame(syncTabs);
}

/**
 * 页面加载时初始化开发者模式
 */
function initDeveloperMode() {
  // 应用当前开发者模式状态到UI
  applyDeveloperModeUI();

  // 初始化标题点击触发器
  initDevModeTrigger("h1");
}
