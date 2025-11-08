// 混合模式练习脚本
const CURRENT_MODE = "mix";

// 混合模式包含的子模式
const SUB_MODES = ["context", "blank"];

// 练习进度保存键
const MIX_PROGRESS_KEY = "mixPracticeProgress";

// 当前练习状态
let currentExercise = null;
let currentSubMode = null;
let sessionStats = {
  correct: 0,
  errors: 0,
  streak: 0,
  currentQuestion: 0,
  totalQuestions: 10,
  completed: false, // 是否完成所有题目
};

// 已完成的单词列表(防止重复)
let completedWords = new Set();

// DOM 元素
let exerciseBox, exerciseTitle, exerciseContent;
let answerInput, submitBtn, hintBtn, nextBtn;
let modeIndicator, progressFill, progressText;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  initializeUserProfile();
  updateStreak();
  initElements();
  initEventListeners();

  // 初始化提示面板
  const hintPanelContainer = document.getElementById("hintPanel");
  if (hintPanelContainer && answerInput) {
    initHintPanel(hintPanelContainer, answerInput);
  }

  // 检查是否有未完成的进度
  checkAndResumePractice();
});

function initElements() {
  exerciseBox = document.getElementById("exerciseBox");
  exerciseTitle = document.getElementById("exerciseTitle");
  exerciseContent = document.getElementById("exerciseContent");
  answerInput = document.getElementById("answerInput");
  submitBtn = document.getElementById("submitBtn");
  hintBtn = document.getElementById("hintBtn");
  nextBtn = document.getElementById("nextBtn");
  modeIndicator = document.getElementById("currentModeIndicator");
  progressFill = document.getElementById("progressFill");
  progressText = document.getElementById("progressText");
}

function initEventListeners() {
  if (submitBtn) submitBtn.addEventListener("click", submitAnswer);
  if (hintBtn) hintBtn.addEventListener("click", showHint);
  if (nextBtn) nextBtn.addEventListener("click", loadNextQuestion);

  if (answerInput) {
    answerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && submitBtn && !submitBtn.disabled) {
        submitAnswer();
      }
    });
  }

  // 初始禁用提示按钮
  if (hintBtn) hintBtn.disabled = true;
  if (nextBtn) nextBtn.style.display = "none";
}

/**
 * 检查并恢复练习进度
 */
function checkAndResumePractice() {
  const savedProgress = safeGetItem(MIX_PROGRESS_KEY, null);

  if (savedProgress && !savedProgress.completed) {
    // 显示自定义确认弹窗
    showResumeDialog(savedProgress);
  } else {
    // 没有保存的进度或已完成,开始新练习
    clearProgress();
    setTimeout(() => startMixedPractice(), 500);
  }
}

/**
 * 显示恢复进度确认弹窗
 */
function showResumeDialog(savedProgress) {
  const dialog = document.createElement("div");
  dialog.className = "custom-dialog-overlay";
  dialog.innerHTML = `
    <div class="custom-dialog">
      <div class="dialog-icon">💾</div>
      <h3>检测到未完成的练习</h3>
      <div class="dialog-content">
        <p class="dialog-progress">进度：<strong>${savedProgress.currentQuestion}/${savedProgress.totalQuestions}</strong> 题</p>
        <p class="dialog-warning">⚠️ 需要完成所有练习才能领取奖励！</p>
      </div>
      <div class="dialog-buttons">
        <button class="dialog-btn dialog-btn-secondary" id="restartBtn">
          🔄 重新开始
        </button>
        <button class="dialog-btn dialog-btn-primary" id="resumeBtn">
          ▶️ 继续练习
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // 绑定按钮事件
  const resumeBtn = dialog.querySelector("#resumeBtn");
  const restartBtn = dialog.querySelector("#restartBtn");

  resumeBtn.addEventListener("click", () => {
    // 恢复进度
    sessionStats = { ...savedProgress };
    completedWords = new Set(savedProgress.completedWords || []);
    updateProgress();
    dialog.remove();
    setTimeout(() => loadNextQuestion(), 500);
  });

  restartBtn.addEventListener("click", () => {
    // 清除旧进度,开始新练习
    clearProgress();
    dialog.remove();
    setTimeout(() => startMixedPractice(), 500);
  });

  // 点击遮罩层关闭（默认为继续）
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      resumeBtn.click();
    }
  });

  // 添加显示动画
  setTimeout(() => dialog.classList.add("show"), 10);
}

/**
 * 保存练习进度
 */
function saveProgress() {
  const progress = {
    ...sessionStats,
    completedWords: Array.from(completedWords),
    timestamp: Date.now(),
  };
  safeSetItem(MIX_PROGRESS_KEY, progress);
}

/**
 * 清除练习进度
 */
function clearProgress() {
  safeRemoveItem(MIX_PROGRESS_KEY);
}

/**
 * 开始混合模式练习
 */
async function startMixedPractice() {
  // 重置统计
  sessionStats = {
    correct: 0,
    errors: 0,
    streak: 0,
    currentQuestion: 0,
    totalQuestions: 10,
    completed: false,
  };
  completedWords.clear();

  updateProgress();
  saveProgress();

  // 加载第一题
  await loadNextQuestion();
}

/**
 * 加载下一题 - 重构为使用 common.js 的统一方法
 */
async function loadNextQuestion() {
  // 隐藏 Next 按钮
  if (nextBtn) nextBtn.style.display = "none";

  if (sessionStats.currentQuestion >= sessionStats.totalQuestions) {
    // 练习完成
    finishPractice();
    return;
  }

  // 随机选择子模式
  currentSubMode = SUB_MODES[Math.floor(Math.random() * SUB_MODES.length)];

  // 更新模式指示器
  updateModeIndicator();

  // 清空提示
  if (typeof HintPanelManager !== "undefined" && HintPanelManager.clearHints) {
    HintPanelManager.clearHints();
  }

  // 禁用按钮
  if (submitBtn) submitBtn.disabled = true;
  if (hintBtn) hintBtn.disabled = true;

  try {
    // 使用 common.js 的 startPracticeSession 统一加载内容
    const config = {
      container: exerciseContent,
      answerBox: null, // 不使用答案框
      buttons: {
        submit: submitBtn,
        hint: hintBtn,
      },
      contentGenerator:
        currentSubMode === "context" ? generateContext : generateBlankSentence,
      renderContent:
        currentSubMode === "context"
          ? renderContextContent
          : renderBlankContent,
      onSuccess: (word, content) => {
        currentExercise = {
          word: word.word,
          type: currentSubMode,
          wordObj: word,
          content: content,
        };

        // 设置标题
        exerciseTitle.textContent =
          currentSubMode === "context"
            ? "📖 根据上下文猜测单词"
            : "✏️ 填入正确的单词";

        // 配置输入框
        setupInputForMode(currentSubMode);

        // 启用按钮
        if (submitBtn) submitBtn.disabled = false;
        if (hintBtn) hintBtn.disabled = false;

        // 更新进度
        sessionStats.currentQuestion++;
        updateProgress();
        saveProgress();
      },
      onError: (error) => {
        console.error("加载题目失败:", error);
        showToast("加载题目失败，请重试", "error");
      },
      // 过滤已完成的单词
      filterWord: (word) => !completedWords.has(word.word),
    };

    await startPracticeSession(currentSubMode, config);
  } catch (error) {
    handleError(error, { source: "loadNextQuestion" });
    showToast("加载题目失败，请重试", "error");
  }
}

/**
 * 渲染上下文内容
 */
function renderContextContent(container, word, context) {
  // 参数验证
  if (!context || typeof context !== "string") {
    console.error("[Mix renderContextContent] Invalid context:", context);
    container.innerHTML = '<p style="color: var(--error);">内容生成失败</p>';
    return;
  }

  if (!word || !word.word) {
    console.error("[Mix renderContextContent] Invalid word:", word);
    container.innerHTML = '<p style="color: var(--error);">单词数据错误</p>';
    return;
  }

  container.innerHTML = `
    <h3>Contextual Situation</h3>
    <p id="contextParagraph"></p>
    <p style="margin-top: 1rem;"><strong style="color: var(--primary);">Target Word: ${word.word}</strong></p>
  `;

  // 高亮显示段落中目标单词
  const contextPara = container.querySelector("#contextParagraph");
  if (contextPara) {
    const re = new RegExp(`\\b${word.word}\\b`, "gi");
    const highlighted = context.replace(
      re,
      (match) => `<mark class="highlight">${match}</mark>`
    );
    contextPara.innerHTML = highlighted;
  }
}

/**
 * 渲染填空内容
 */
function renderBlankContent(container, word, sentence) {
  // 参数验证
  if (!sentence || typeof sentence !== "string") {
    console.error("[Mix renderBlankContent] Invalid sentence:", sentence);
    container.innerHTML = '<p style="color: var(--error);">句子生成失败</p>';
    return;
  }

  if (!word || !word.word) {
    console.error("[Mix renderBlankContent] Invalid word:", word);
    container.innerHTML = '<p style="color: var(--error);">单词数据错误</p>';
    return;
  }

  const blankSentenceHTML = createBlankSentenceHTML(sentence, word.word);

  container.innerHTML = `
    <h3>Fill in the Blank</h3>
    <p class="blank-sentence">${blankSentenceHTML}</p>
  `;
}

/**
 * 根据模式配置输入框
 */
function setupInputForMode(mode) {
  if (mode === "context") {
    // context 模式使用 answerInput
    if (answerInput) {
      answerInput.style.display = "block";
      answerInput.disabled = false;
      answerInput.value = "";
      answerInput.placeholder = "请输入中文翻译...";
      answerInput.focus();

      // 更新提示面板引用
      if (typeof HintPanelManager !== "undefined") {
        HintPanelManager.inputElement = answerInput;
      }
    }
  } else if (mode === "blank") {
    // blank 模式隐藏 answerInput，使用 blankInput
    if (answerInput) {
      answerInput.style.display = "none";
    }

    // 绑定 blankInput 事件
    const blankInput = document.getElementById("blankInput");
    if (blankInput) {
      blankInput.focus();

      // 更新提示面板引用
      if (typeof HintPanelManager !== "undefined") {
        HintPanelManager.inputElement = blankInput;
      }

      // 绑定回车键
      blankInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submitAnswer();
        }
      });
    }
  }
}

/**
 * 更新模式指示器
 */
function updateModeIndicator() {
  const indicator = document.getElementById("modeIndicator");
  if (indicator) {
    indicator.textContent =
      currentSubMode === "context" ? "📖 Context Mode" : "✏️ Blank Mode";
    indicator.className = `mode-indicator ${currentSubMode}`;
  }
}

/**
 * 创建填空句子HTML（与 blank.js 相同）
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
 * 提交答案
 */
async function submitAnswer() {
  if (!currentExercise) {
    showToast("当前没有练习题", "error");
    return;
  }

  // 防止重复提交
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;

  try {
    const userAnswer = getUserAnswer();
    if (!userAnswer.trim()) {
      showToast("请输入答案", "error");
      submitBtn.disabled = false;
      return;
    }

    let isCorrect = false;

    if (currentSubMode === "context") {
      // 上下文模式 - 使用 API 验证翻译
      isCorrect = await validateTranslation(
        currentExercise.wordObj, // 传入单词对象而不是字符串
        userAnswer,
        currentExercise.content
      );
    } else if (currentSubMode === "blank") {
      // 填空模式 - 精确匹配单词
      isCorrect =
        userAnswer.toLowerCase() === currentExercise.word.toLowerCase();
    }

    // 记录结果到练习历史
    updateRecords(currentExercise.word, isCorrect, currentSubMode);

    // 更新单词数据
    updateWordData(currentExercise.wordObj, currentSubMode, isCorrect);

    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }

    // 保存进度
    completedWords.add(currentExercise.word);
    saveProgress();
  } catch (error) {
    handleError(error, { source: "submitAnswer" });
    showToast("提交失败，请重试", "error");
    submitBtn.disabled = false;
  }
}

/**
 * 获取用户答案
 */
function getUserAnswer() {
  if (currentSubMode === "context") {
    return answerInput ? answerInput.value.trim() : "";
  } else if (currentSubMode === "blank") {
    const blankInput = document.getElementById("blankInput");
    return blankInput ? blankInput.value.trim() : "";
  }
  return "";
}

/**
 * 更新单词数据
 */
function updateWordData(wordObj, mode, isCorrect) {
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
 * 处理正确答案
 */
function handleCorrectAnswer() {
  sessionStats.correct++;
  sessionStats.streak++;
  updateProgress();
  saveProgress();

  // 显示连击提示
  const isStreakBonus = sessionStats.streak >= 3;
  showToast(`回答正确！${isStreakBonus ? "🔥 连续答对！" : ""}`, "success");

  // 禁用输入和提交按钮
  disableAnswering();

  // 答对后1秒自动进入下一题
  setTimeout(() => {
    loadNextQuestion();
  }, 1000);
}

/**
 * 处理错误答案
 */
function handleWrongAnswer() {
  sessionStats.errors++;
  sessionStats.streak = 0;
  updateProgress();
  saveProgress();

  // 显示正确答案
  const correctAnswer =
    currentSubMode === "context"
      ? currentExercise.wordObj.translations.join(", ")
      : currentExercise.word;

  showToast(`回答错误！正确答案是: ${correctAnswer}`, "error", 4000);

  // 禁用输入和提交按钮
  disableAnswering();

  // 显示 Next 按钮
  if (nextBtn) {
    nextBtn.style.display = "inline-block";
    nextBtn.focus();
  }
}

/**
 * 禁用答题功能
 */
function disableAnswering() {
  if (submitBtn) submitBtn.disabled = true;
  if (hintBtn) hintBtn.disabled = true;

  if (currentSubMode === "context" && answerInput) {
    answerInput.disabled = true;
  } else if (currentSubMode === "blank") {
    const blankInput = document.getElementById("blankInput");
    if (blankInput) blankInput.disabled = true;
  }
}

/**
 * 显示提示
 */
async function showHint() {
  if (!currentExercise) {
    showToast("当前没有可用的单词", "error");
    return;
  }

  // 防止重复点击
  if (hintBtn.disabled) {
    return;
  }

  hintBtn.disabled = true;
  hintBtn.textContent = "Hinting...";

  try {
    // 生成渐进式提示
    const progressiveHint = HintPanelManager.generateHint(
      currentExercise.word,
      currentExercise.wordObj,
      currentSubMode === "context"
        ? currentExercise.context
        : currentExercise.sentence,
      currentSubMode // 传入模式参数，确保使用正确的提示策略
    );

    if (progressiveHint.isLocal) {
      // 本地提示，直接添加
      HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
    } else {
      // AI提示，根据类型异步获取
      const aiType = progressiveHint.aiType || "complex";
      await HintPanelManager.pushAiHint(
        currentExercise.wordObj,
        currentSubMode === "context"
          ? currentExercise.context
          : currentExercise.sentence,
        aiType, // AI提示类型：complex、simple、synonyms、contextual
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
 * 更新模式指示器
 */
function updateModeIndicator() {
  const modeNames = {
    context: "📖 上下文猜词",
    blank: "✏️ 单词填空",
  };
  modeIndicator.textContent = modeNames[currentSubMode] || "未知模式";
}

/**
 * 更新进度条
 */
function updateProgress() {
  const progress =
    (sessionStats.currentQuestion / sessionStats.totalQuestions) * 100;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `题目进度：${sessionStats.currentQuestion} / ${sessionStats.totalQuestions}`;
}

/**
 * 完成练习
 */
function finishPractice() {
  // 标记为已完成
  sessionStats.completed = true;
  saveProgress();

  // 禁用所有控件
  if (answerInput) answerInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
  if (hintBtn) hintBtn.disabled = true;
  if (nextBtn) nextBtn.style.display = "none";

  // 显示完成信息
  exerciseTitle.textContent = "🎉 练习完成！";
  const total = sessionStats.correct + sessionStats.errors;
  const accuracy =
    total > 0 ? ((sessionStats.correct / total) * 100).toFixed(1) : 0;

  exerciseContent.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h2 style="color: var(--primary); margin-bottom: 1rem;">恭喜完成本轮练习！</h2>
      <p style="font-size: 1.2rem; margin: 1rem 0;">
        本轮正确：<strong style="color: var(--success);">${sessionStats.correct}</strong> 题<br>
        本轮错误：<strong style="color: var(--error);">${sessionStats.errors}</strong> 题<br>
        正确率：<strong style="color: var(--info);">${accuracy}%</strong>
      </p>
      <p style="color: #64748b; margin-top: 1rem;">
        继续保持，再接再厉！💪
      </p>
      <button class="btn" id="claimRewardBtn"
        style="margin-top: 1.5rem; background: var(--primary); font-size: 1.1rem; padding: 0.75rem 2rem;">
        🎁 领取奖励
      </button>
    </div>
  `;

  // 绑定领取奖励按钮
  const claimBtn = document.getElementById("claimRewardBtn");
  if (claimBtn) {
    claimBtn.addEventListener("click", () => {
      // 只有完成所有题目才能领取奖励
      if (sessionStats.completed) {
        grantPracticeRewards();
        claimBtn.disabled = true;
        claimBtn.textContent = "✅ 已领取";
        claimBtn.style.background = "#6b7280";

        // 清除进度(已完成且已领取奖励)
        clearProgress();
      } else {
        showToast("请完成所有练习后再领取奖励", "error");
      }
    });
  }
}

/**
 * 发放练习奖励
 */
function grantPracticeRewards() {
  const profile = getUserProfile();

  // 基础奖励
  const baseCoins = 10;
  const baseExp = 20;

  // 正确率加成
  const total = sessionStats.correct + sessionStats.errors;
  const accuracy = total > 0 ? sessionStats.correct / total : 0;
  const accuracyBonus = Math.floor(accuracy * 10); // 最多10个额外金币

  // 连续答对加成
  const streakBonus = sessionStats.streak >= 5 ? 5 : 0;

  // 总奖励
  const totalCoins = baseCoins + accuracyBonus + streakBonus;
  const totalExp = baseExp + accuracyBonus * 2;

  // 更新用户资料
  profile.coins += totalCoins;
  profile.exp += totalExp;

  // 检查升级
  while (profile.exp >= getExpForNextLevel(profile.level)) {
    profile.exp -= getExpForNextLevel(profile.level);
    profile.level++;
    showAchievementNotification({
      icon: "🎊",
      name: "等级提升！",
      description: `恭喜升级到 Lv.${profile.level}`,
      reward: 0,
    });
  }

  saveUserProfile(profile);
  updateUserInfoBar();

  // 显示奖励通知
  showRewardNotification({
    coins: totalCoins,
    exp: totalExp,
    accuracy: (accuracy * 100).toFixed(1),
    streak: sessionStats.streak,
  });

  // 检查成就
  checkAndUnlockAchievements();
}

/**
 * 显示奖励通知
 */
function showRewardNotification(rewards) {
  const popup = document.createElement("div");
  popup.className = "reward-popup";
  popup.innerHTML = `
    <div class="reward-icon">🎁</div>
    <h3 style="color: var(--primary); margin-bottom: 1rem;">本轮收获</h3>
    <p style="font-size: 1.1rem; margin: 0.5rem 0;">
      💰 金币 +${rewards.coins}<br>
      ✨ 经验 +${rewards.exp}<br>
      🎯 正确率: ${rewards.accuracy}%<br>
      ${rewards.streak >= 3 ? `🔥 最高连击: ${rewards.streak}` : ""}
    </p>
    <button class="btn" onclick="this.parentElement.remove()"
      style="margin-top: 1.5rem; background: var(--primary);">
      太棒了！
    </button>
  `;
  document.body.appendChild(popup);

  // 3秒后自动关闭
  setTimeout(() => {
    popup.classList.add("hide");
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}

/**
 * 检查并解锁成就
 */
function checkAndUnlockAchievements() {
  const profile = getUserProfile();
  const achievementsData = initializeAchievements();

  // Mix 模式专属成就列表
  const mixAchievements = [
    {
      id: "first_practice",
      name: "初次尝试",
      description: "完成第一次混合练习",
      icon: "🎯",
      reward: 50,
      condition: () => true, // 完成练习即解锁
    },
    {
      id: "perfect_round",
      name: "完美表现",
      description: "单轮练习全部答对",
      icon: "💯",
      reward: 100,
      condition: () => sessionStats.errors === 0 && sessionStats.correct > 0,
    },
    {
      id: "streak_master",
      name: "连击大师",
      description: "单轮连续答对5题",
      icon: "🔥",
      reward: 100,
      condition: () => sessionStats.streak >= 5,
    },
    {
      id: "level_10",
      name: "十级学者",
      description: "达到10级",
      icon: "⭐",
      reward: 500,
      condition: () => profile.level >= 10,
    },
  ];

  // 检查每个成就
  mixAchievements.forEach((achievement) => {
    // 如果已解锁，跳过
    if (achievementsData.unlocked.includes(achievement.id)) {
      return;
    }

    // 检查条件是否满足
    if (achievement.condition()) {
      // 使用 common.js 中的统一解锁函数
      unlockAchievement(achievement);
    }
  });
}

/**
 * 显示奖励总结弹窗 (已废弃 - 使用新的奖励系统)
 */
