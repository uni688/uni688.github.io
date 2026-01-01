const CURRENT_MODE = "context";

// 页面特定元素
const contextBox = document.getElementById("contextBox");
const answerBox = document.getElementById("answerBox");
const translationInput = document.getElementById("translationInput");
const submitBtn = document.getElementById("submitBtn");
const hintBtn = document.getElementById("hintBtn");
const answerBtn = document.getElementById("answerBtn");
const practiceCountEl = document.getElementById("practiceCount");
const accuracyEl = document.getElementById("accuracy");
const hintPanelContainer = document.getElementById("hintPanelContainer");

// 页面状态
let currentWord = null;
let contextText = "";
let hasErrorInCurrentWord = false;
let answerShown = false;
let isSubmitting = false; // 防止重复提交标志

/**
 * 更新页面上当前模式的统计数据显示。
 */
function updateStats() {
  const records = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
  const modeRecords = records.filter((r) => r.mode === CURRENT_MODE);
  const total = modeRecords.length;
  const correct = modeRecords.filter((r) => r.correct).length;

  // 这些元素可能不存在，如果用户没有添加到HTML中
  if (practiceCountEl) {
    practiceCountEl.textContent = total;
  }
  if (accuracyEl) {
    accuracyEl.textContent = total
      ? `${Math.round((correct / total) * 100)}%`
      : "100%";
  }
}

/**
 * 处理重试按钮点击事件
 */
async function handleRetry() {
  const result = await startNewSession();
  if (!result.success) {
    logMessage("warn", "Context", "重试会话创建失败：没有可用的单词或词库");
  }
}

/**
 * 渲染上下文内容到容器
 * 使用 common.js 中的共享函数
 * @param {HTMLElement} container - 容器元素
 * @param {Object} word - 单词对象
 * @param {string} content - 生成的上下文内容
 */
function renderContextContent(container, word, content) {
  renderContextContentShared(container, word, content);
}

/**
 * 设置新的练习会话
 * @returns {Promise<Object>} 返回包含成功状态和单词的对象
 */
async function startNewSession() {
  // 重置UI状态
  translationInput.value = "";
  submitBtn.textContent = "Submit";
  hasErrorInCurrentWord = false;
  answerShown = false;

  // 初始化并清空提示面板
  initHintPanel(hintPanelContainer, translationInput);
  clearHints();

  // 使用公共会话启动函数
  const result = await startPracticeSession(CURRENT_MODE, {
    container: contextBox,
    answerBox: answerBox,
    buttons: {
      submit: submitBtn,
      hint: hintBtn,
      answer: answerBtn,
    },
    contentGenerator: generateContext,
    renderContent: renderContextContent,
    onSuccess: (word, content) => {
      currentWord = word;
      contextText = content;
      translationInput.focus();
    },
    onError: handleRetry,
  });

  return result;
}

/**
 * 检查用户提交的翻译。
 */
async function checkTranslation() {
  // 防止重复提交
  if (isSubmitting) {
    return;
  }

  // 如果答案已显示，点击提交按钮进入下一题
  if (answerShown) {
    isSubmitting = true;
    const sessionSuccess = await startNewSession();
    isSubmitting = false;
    if (!sessionSuccess.success) {
      logMessage("warn", "Context", "新会话创建失败：没有可用的单词或词库");
      return;
    }
    return;
  }

  const userInput = translationInput.value.trim();
  if (!userInput) {
    showToast("请输入翻译", "error");
    return;
  }

  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  // 验证输入长度
  const validation = validateTranslationInput(userInput);
  if (!validation.valid) {
    showToast(validation.error, "error");
    return;
  }

  // 设置提交状态
  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  let isCorrect = false; // 将变量声明移到try块外面

  try {
    // 首先，检查存储的正确翻译
    isCorrect = currentWord.translations.some((t) => userInput.includes(t));

    // 如果没找到，使用API进行更宽松的检查
    if (!isCorrect) {
      isCorrect = await validateTranslation(
        currentWord,
        userInput,
        contextText
      );
    }

    // 更新本地存储中的单词统计数据
    const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
    const wordIndex = wordBank.findIndex((w) => w.word === currentWord.word);
    if (wordIndex !== -1) {
      const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
      modeData.practiceCount++;
      if (!isCorrect && !hasErrorInCurrentWord) {
        modeData.errors++;
        hasErrorInCurrentWord = true; // 标记该单词发生了错误
      }
      wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
      safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank);
    }

    updateRecords(currentWord.word, isCorrect, CURRENT_MODE);
    updateStats(); // 更新统计显示

    if (isCorrect) {
      // 奖励正确答案
      rewardCorrectAnswer(CURRENT_MODE, !hasErrorInCurrentWord);

      // 更新用户信息栏
      if (typeof updateUserInfoBar === "function") {
        updateUserInfoBar();
      }

      showToast("回答正确！", "success");
      const sessionSuccess = await startNewSession();
      // 如果新会话创建失败（没有可用单词），不重新启用按钮
      if (!sessionSuccess) {
        return;
      }
    } else {
      showToast("回答错误，请再试一次", "error");
    }
  } catch (error) {
    showToast("验证过程中发生错误: " + error.message, "error");
    handleError(error, { source: "Context", action: "检查翻译" }, false);
  } finally {
    // 重置提交状态
    isSubmitting = false;

    // 只有在没有成功创建新会话的情况下才重新启用按钮
    if (currentWord) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
    // 答错时不清空输入框，允许用户修正
    if (isCorrect) {
      translationInput.value = "";
    }
    if (currentWord) {
      translationInput.focus();
    }
  }
}

/**
 * 获取并显示提示。
 * 使用 common.js 中的共享函数
 */
async function getHint() {
  await getHintShared({
    currentWord,
    contextText,
    mode: CURRENT_MODE,
    hintBtn,
    onError: null,
  });
}

/**
 * 显示正确答案。
 * 使用 common.js 中的共享函数
 */
function showAnswer() {
  showAnswerShared({
    currentWord,
    mode: CURRENT_MODE,
    answerBox,
    answerBtn,
    submitBtn,
    hasErrorInCurrentWord,
    onStateUpdate: (state) => {
      answerShown = state.answerShown;
      hasErrorInCurrentWord = state.hasErrorInCurrentWord;
      updateStats();
    },
  });
}

// 事件监听器 - 使用命名函数以便需要时移除
const handleTranslationInputKeypress = (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkTranslation();
  }
};

if (translationInput) {
  translationInput.addEventListener("keypress", handleTranslationInputKeypress);
}

// 初始化键盘快捷键
initKeyboardShortcuts({
  submit: checkTranslation,
  hint: getHint,
  answer: showAnswer,
  next: () => {
    if (answerShown) {
      startNewSession();
    }
  },
});

// 页面初始化
const initPage = async () => {
  try {
    const storageReady = initializeStorage();
    if (!storageReady) {
      console.warn("存储初始化失败，应用可能无法正常工作");
    }
    initDeveloperMode(); // 初始化开发者模式
    updateStats();
    const result = await startNewSession();
    if (!result.success) {
      logMessage("warn", "Context", "初始会话创建失败：没有可用的单词或词库");
    }
  } catch (error) {
    console.error("页面初始化失败:", error);
    showToast("页面加载失败，请刷新页面", "error", 5000);
  }
};

// 检查DOM是否已准备好
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  // DOM已经加载完成
  initPage();
}
