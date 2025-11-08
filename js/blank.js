const CURRENT_MODE = "blank";

// 页面特定元素
const contextBox = document.getElementById("contextBox");
const answerBox = document.getElementById("answerBox");
const submitBtn = document.getElementById("submitBtn");
const hintBtn = document.querySelector('button[onclick="getHint()"]');
const answerBtn = document.getElementById("answerBtn");
const hintPanelContainer = document.getElementById("hintPanelContainer");

// 页面状态
let currentWord = null;
let sentenceText = "";
let hasErrorInCurrentWord = false;
let answerShown = false;

/**
 * 创建带有输入框的填空句子HTML。
 * @param {string} sentence - 完整的句子。
 * @param {string} word - 要留空的单词。
 * @returns {string} - 包含输入框的HTML字符串。
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

  // 使用正则表达式匹配完整单词并替换为输入框
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  return sentence.replace(
    regex,
    '<input type="text" class="blank-input" id="blankInput" placeholder="click to fill" autocomplete="off">'
  );
}

/**
 * 验证用户输入是否与正确答案匹配。
 * @param {string} userInput - 用户的输入。
 * @param {string} correctWord - 正确的单词。
 * @returns {boolean} - 如果答案正确则返回true。
 */
function validateAnswer(userInput, correctWord) {
  // 忽略大小写和首尾空格进行比较
  return userInput.toLowerCase().trim() === correctWord.toLowerCase().trim();
}

/**
 * 处理重试按钮点击事件
 */
async function handleRetry() {
  const result = await startNewSession();
  if (!result.success) {
    logMessage("warn", "Blank", "重试会话创建失败：没有可用的单词或词库");
  }
}

/**
 * 渲染填空内容到容器
 * @param {HTMLElement} container - 容器元素
 * @param {Object} word - 单词对象
 * @param {string} content - 生成的句子内容
 */
function renderBlankContent(container, word, content) {
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
    HintPanelManager.inputElement = blankInput;

    // 绑定回车键提交事件
    blankInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        checkAnswer();
      }
    });
  }

  // 添加淡入动画
  container.style.opacity = "0";
  setTimeout(() => (container.style.opacity = "1"), 50);
}

/**
 * 设置新的练习会话
 * @returns {Promise<Object>} 返回包含成功状态和单词的对象
 */
async function startNewSession() {
  // 重置UI状态
  answerShown = false;
  submitBtn.textContent = "Submit";
  hasErrorInCurrentWord = false;

  // 初始化并清空提示面板
  initHintPanel(hintPanelContainer, null);
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
    contentGenerator: generateBlankSentence,
    renderContent: renderBlankContent,
    onSuccess: (word, content) => {
      currentWord = word;
      sentenceText = content;
    },
    onError: handleRetry,
  });

  return result;
}

/**
 * 检查用户的答案。
 */
async function checkAnswer() {
  if (answerShown) {
    const sessionSuccess = await startNewSession();
    if (!sessionSuccess.success) {
      logMessage("warn", "Blank", "新会话创建失败：没有可用的单词或词库");
    }
    return;
  }

  const blankInput = document.getElementById("blankInput");
  if (!blankInput) {
    showToast("输入框不存在", "error");
    return;
  }

  const userInput = blankInput.value.trim();
  if (!userInput) {
    showToast("请输入答案", "info");
    return;
  }

  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const isCorrect = validateAnswer(userInput, currentWord.word);

    // 更新单词统计数据
    const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
    const wordIndex = wordBank.findIndex((w) => w.word === currentWord.word);
    if (wordIndex !== -1) {
      const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
      modeData.practiceCount++;
      if (!isCorrect && !hasErrorInCurrentWord) {
        modeData.errors++;
        hasErrorInCurrentWord = true;
      }
      wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
      safeSetItem(STORAGE_KEYS.WORD_BANK, wordBank);
    }

    updateRecords(currentWord.word, isCorrect, CURRENT_MODE);

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
      if (!sessionSuccess.success) {
        return;
      }
    } else {
      showToast("回答错误，请再试一次", "error");
      blankInput.value = "";
      if (blankInput.focus) {
        blankInput.focus();
      }
    }
  } catch (error) {
    console.error("验证过程错误:", error);
    showToast("验证过程中发生错误", "error");
  } finally {
    // 只有在没有成功创建新会话的情况下才重新启用按钮
    if (currentWord) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

/**
 * 获取并显示提示。
 */
async function getHint() {
  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  hintBtn.disabled = true;
  hintBtn.textContent = "Hinting...";

  try {
    // 生成渐进式提示 - blank模式专注于拼写和词形提示
    const progressiveHint = HintPanelManager.generateHint(
      currentWord.word,
      currentWord,
      sentenceText,
      CURRENT_MODE // 传入模式参数，确保使用Blank模式的拼写提示策略
    );

    if (progressiveHint.isLocal) {
      // 本地提示，直接添加
      HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
    } else {
      // AI提示，根据类型异步获取
      const aiType = progressiveHint.aiType || "complex";
      await HintPanelManager.pushAiHint(
        currentWord,
        sentenceText, // blank模式使用句子作为上下文
        aiType, // AI提示类型：complex、simple、synonyms
        null, // 成功回调
        (error) => {
          const errorMsg =
            error && error.message ? error.message : String(error);
          showToast(
            "获取AI提示失败，请检查网络连接。错误提示：" + errorMsg,
            "error"
          );
        }
      );
    }
  } catch (error) {
    console.error("生成提示失败:", error);
    showToast("生成提示失败: " + error.message, "error");
  } finally {
    hintBtn.disabled = false;
    hintBtn.textContent = "Hint";
  }
}

/**
 * 显示正确答案。
 */
function showAnswer() {
  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  answerShown = true;
  answerBox.style.display = "block";
  answerBox.style.opacity = "0";
  answerBox.innerHTML = `
        <div class="answer-card">
            <h4>答案</h4>
            <p>正确答案：<strong>${currentWord.word}</strong></p>
            <p>中文翻译：<span style="color: #10b981; font-weight: 600;">${currentWord.translations.join(
              " / "
            )}</span></p>
        </div>
    `;
  setTimeout(() => (answerBox.style.opacity = "1"), 50);

  answerBtn.disabled = true;
  submitBtn.textContent = "Next";
  showToast("已显示答案，点击 Next 进入下一题", "info");
}

// 初始化键盘快捷键
initKeyboardShortcuts({
  submit: checkAnswer,
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
    const result = await startNewSession();
    if (!result.success) {
      logMessage("warn", "Blank", "初始会话创建失败：没有可用的单词或词库");
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
