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
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
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
 * 应用主题
 */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
