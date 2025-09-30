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

/**
 * 更新页面上当前模式的统计数据显示。
 */
function updateStats() {
  const records = JSON.parse(localStorage.getItem("practiceRecords") || "[]");
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
  const sessionSuccess = await startNewSession();
  if (!sessionSuccess) {
    console.warn("重试会话创建失败：没有可用的单词或词库");
  }
}

/**
 * 设置新的练习会话。
 * @returns {Promise<boolean>} 返回是否成功加载了新单词
 */
async function startNewSession() {
  translationInput.value = "";
  answerBox.innerHTML = "";
  answerBox.style.display = "none";
  submitBtn.textContent = "Submit";
  hasErrorInCurrentWord = false;
  answerShown = false;

  // 初始化并清空提示面板
  initHintPanel(hintPanelContainer, translationInput);
  clearHints();

  showSkeleton(contextBox);
  currentWord = getWeightedWord(CURRENT_MODE);

  if (!currentWord) {
    const vocabularies = JSON.parse(
      localStorage.getItem("vocabularies") || "[]"
    );
    const enabledVocabs = vocabularies.filter((v) => v.enabled !== false);
    const hasWords =
      JSON.parse(localStorage.getItem("wordBank") || "[]").length > 0;

    let errorMessage;
    if (!hasWords) {
      errorMessage = "词库为空，请先在管理页面添加单词。";
    } else if (enabledVocabs.length === 0) {
      errorMessage = "所有词库都已被禁用，请在管理页面启用至少一个词库。";
    } else {
      errorMessage = "启用的词库中没有可用单词，请检查词库设置。";
    }

    contextBox.innerHTML = `<div class="error">${errorMessage}</div>`;
    submitBtn.disabled = true;
    hintBtn.disabled = true;
    answerBtn.disabled = true;
    return false; // 返回失败标志
  }

  contextBox.innerHTML = `
    <h3>Contextual Situation</h3>
    <div class="skeleton-fade-in">
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line medium"></div>
    </div>
    <p style="margin-top: 1rem;"><strong>Target Word: ${currentWord.word}</strong></p>
`;
  contextBox.style.opacity = "0";
  setTimeout(() => (contextBox.style.opacity = "1"), 50);

  try {
    contextText = await generateContext(currentWord);
    const contextPara = contextBox.querySelector("div.skeleton-fade-in");
    if (contextPara) {
      // 高亮显示段落中目标单词的出现位置（不区分大小写）
      const re = new RegExp(`\\b${currentWord.word}\\b`, "gi");
      const highlighted = contextText.replace(
        re,
        (match) => `<mark class="highlight">${match}</mark>`
      );
      contextPara.outerHTML = `<p>${highlighted}</p>`;
    }
  } catch (error) {
    contextBox.innerHTML = `
            <div class="error">
                情境生成失败，请重试
                <br>
                <button class="error-refresh-btn" onclick="handleRetry()">🔄 重新生成</button>
            </div>
        `;
    return false; // 返回失败标志
  } finally {
    if (currentWord) {
      translationInput.focus();
    }
  }

  // 成功加载新单词，启用所有按钮
  submitBtn.disabled = false;
  hintBtn.disabled = false;
  answerBtn.disabled = false;
  return true;
}

/**
 * 检查用户提交的翻译。
 */
async function checkTranslation() {
  // 如果答案已显示，点击提交按钮进入下一题
  if (answerShown) {
    const sessionSuccess = await startNewSession();
    if (!sessionSuccess) {
      console.warn("新会话创建失败：没有可用的单词或词库");
    }
    return;
  }

  const userInput = translationInput.value.trim();
  if (!userInput) return;

  // 检查是否有可用的当前单词
  if (!currentWord) {
    showToast("当前没有可用的单词", "error");
    return;
  }

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
    const wordBank = JSON.parse(localStorage.getItem("wordBank"));
    const wordIndex = wordBank.findIndex((w) => w.word === currentWord.word);
    if (wordIndex !== -1) {
      const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
      modeData.practiceCount++;
      if (!isCorrect && !hasErrorInCurrentWord) {
        modeData.errors++;
        hasErrorInCurrentWord = true; // 标记该单词发生了错误
      }
      wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
      localStorage.setItem("wordBank", JSON.stringify(wordBank));
    }

    updateRecords(currentWord.word, isCorrect, CURRENT_MODE);
    updateStats(); // 更新统计显示

    if (isCorrect) {
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
  } finally {
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
    // 生成渐进式提示
    const progressiveHint = HintPanelManager.generateHint(
      currentWord.word,
      currentWord,
      contextText,
      CURRENT_MODE // 传入模式参数，确保使用Context模式的词义提示策略
    );

    if (progressiveHint.isLocal) {
      // 本地提示，直接添加
      HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
    } else {
      // AI提示，根据类型异步获取
      const aiType = progressiveHint.aiType || "complex";
      await HintPanelManager.pushAiHint(
        currentWord,
        contextText,
        aiType, // AI提示类型：complex、simple、synonyms
        null, // 成功回调
        (error) => {
          showToast("获取AI提示失败，请检查网络连接", "error");
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

  // 记录为错误，因为用户放弃了
  const wordBank = JSON.parse(localStorage.getItem("wordBank"));
  const wordIndex = wordBank.findIndex((w) => w.word === currentWord.word);
  if (wordIndex !== -1) {
    const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
    modeData.practiceCount++;
    if (!hasErrorInCurrentWord) {
      modeData.errors++;
      hasErrorInCurrentWord = true;
    }
    wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
    localStorage.setItem("wordBank", JSON.stringify(wordBank));
  }

  // 在练习记录中记录为错误
  updateRecords(currentWord.word, false, CURRENT_MODE);
  updateStats();

  answerBox.style.display = "block";
  answerBox.style.opacity = "0";
  answerBox.innerHTML = `
    <div class="answer-card">
        <h4>正确答案</h4>
        <p>单词：<strong>${currentWord.word}</strong></p>
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

// 事件监听器
translationInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkTranslation();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  initializeStorage();
  updateStats();
  const sessionSuccess = await startNewSession();
  if (!sessionSuccess) {
    console.warn("初始会话创建失败：没有可用的单词或词库");
  }
});
