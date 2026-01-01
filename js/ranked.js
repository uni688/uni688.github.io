// 排位赛模式脚本
const CURRENT_MODE = "ranked";

// 比赛状态
let matchState = {
  isActive: false,
  currentQuestion: 0,
  totalQuestions: 10,
  correctCount: 0,
  wrongCount: 0,
  questions: [],
  currentWord: null,
  currentContent: null,
  questionType: null, // 'context' 或 'blank'
};

// DOM 元素缓存
let elements = {};

// =================================================================
// 初始化
// =================================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  initializeUserProfile();
  initializeTheme();
  updateStreak();
  initDeveloperMode();

  // 初始化赛季数据
  initializeSeasonData();

  // 缓存 DOM 元素
  cacheElements();

  // 更新界面显示
  updateMainView();

  // 绑定事件
  bindEvents();

  // 初始化提示面板
  const hintPanelContainer = document.getElementById("hintPanel");
  const answerInput = document.getElementById("answerInput");
  if (hintPanelContainer && answerInput) {
    initHintPanel(hintPanelContainer, answerInput);
  }
});

/**
 * 缓存 DOM 元素
 */
function cacheElements() {
  elements = {
    // 主界面
    mainView: document.getElementById("mainView"),
    seasonNumber: document.getElementById("seasonNumber"),
    seasonRemaining: document.getElementById("seasonRemaining"),
    tierIcon: document.getElementById("tierIcon"),
    tierName: document.getElementById("tierName"),
    playerScore: document.getElementById("playerScore"),
    nextTierProgress: document.getElementById("nextTierProgress"),
    nextTierName: document.getElementById("nextTierName"),
    nextTierNeeded: document.getElementById("nextTierNeeded"),
    tierProgressBar: document.getElementById("tierProgressBar"),
    playerWins: document.getElementById("playerWins"),
    playerLosses: document.getElementById("playerLosses"),
    winRate: document.getElementById("winRate"),
    maxStreak: document.getElementById("maxStreak"),
    startMatchBtn: document.getElementById("startMatchBtn"),
    leaderboardList: document.getElementById("leaderboardList"),

    // 比赛界面
    matchView: document.getElementById("matchView"),
    currentQuestion: document.getElementById("currentQuestion"),
    correctCount: document.getElementById("correctCount"),
    wrongCount: document.getElementById("wrongCount"),
    questionContent: document.getElementById("questionContent"),
    answerInput: document.getElementById("answerInput"),
    submitAnswerBtn: document.getElementById("submitAnswerBtn"),

    // 结果界面
    matchResult: document.getElementById("matchResult"),
    resultIcon: document.getElementById("resultIcon"),
    resultTitle: document.getElementById("resultTitle"),
    resultCorrect: document.getElementById("resultCorrect"),
    resultWrong: document.getElementById("resultWrong"),
    resultScoreChange: document.getElementById("resultScoreChange"),
    tierChangeDisplay: document.getElementById("tierChangeDisplay"),
    oldTierDisplay: document.getElementById("oldTierDisplay"),
    newTierDisplay: document.getElementById("newTierDisplay"),
  };
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 回车提交答案
  if (elements.answerInput) {
    elements.answerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !elements.submitAnswerBtn.disabled) {
        submitAnswer();
      }
    });
  }
}

// =================================================================
// 主界面更新
// =================================================================

/**
 * 更新主界面显示
 */
function updateMainView() {
  const seasonData = getSeasonData();
  const player = seasonData.playerData;
  const tier = getTierByScore(player.score);
  const nextTier = getNextTier(tier.id);
  const remaining = getSeasonRemainingTime();

  // 赛季信息
  elements.seasonNumber.textContent = seasonData.seasonNumber;
  elements.seasonRemaining.textContent = formatRemainingTime(remaining);

  // 段位显示
  elements.tierIcon.textContent = tier.icon;
  elements.tierName.textContent = tier.name;
  elements.tierName.style.color = tier.color;
  elements.playerScore.textContent = player.score;

  // 下一段位进度
  if (nextTier) {
    elements.nextTierProgress.style.display = "block";
    elements.nextTierName.textContent = nextTier.name;
    const needed = nextTier.minScore - player.score;
    elements.nextTierNeeded.textContent = needed;
    const progress =
      ((player.score - tier.minScore) / (nextTier.minScore - tier.minScore)) *
      100;
    elements.tierProgressBar.style.width = `${Math.min(
      100,
      Math.max(0, progress)
    )}%`;
  } else {
    elements.nextTierProgress.style.display = "none";
  }

  // 玩家统计
  elements.playerWins.textContent = player.wins;
  elements.playerLosses.textContent = player.losses;
  const totalGames = player.wins + player.losses;
  const winRate =
    totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
  elements.winRate.textContent = `${winRate}%`;
  elements.maxStreak.textContent = player.maxWinStreak;

  // 检查是否有足够单词
  checkWordsAvailability();

  // 更新排行榜
  updateLeaderboard();
}

/**
 * 格式化剩余时间
 */
function formatRemainingTime(remaining) {
  if (remaining.days > 0) {
    return `${remaining.days}天${remaining.hours}小时`;
  } else if (remaining.hours > 0) {
    return `${remaining.hours}小时${remaining.minutes}分钟`;
  } else {
    return `${remaining.minutes}分钟`;
  }
}

/**
 * 检查单词库可用性
 */
function checkWordsAvailability() {
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
  const enabledVocabs = vocabularies.filter((v) => v.enabled !== false);

  if (wordBank.length === 0) {
    elements.startMatchBtn.disabled = true;
    elements.startMatchBtn.textContent = "请先添加单词";
    return false;
  }

  if (enabledVocabs.length === 0) {
    elements.startMatchBtn.disabled = true;
    elements.startMatchBtn.textContent = "请启用词库";
    return false;
  }

  // 检查启用的词库中是否有单词
  const enabledVocabIds = enabledVocabs.map((v) => v.id);
  const availableWords = wordBank.filter((w) =>
    enabledVocabIds.includes(w.vocabularyId)
  );

  if (availableWords.length < 10) {
    elements.startMatchBtn.disabled = true;
    elements.startMatchBtn.textContent = `需要至少10个单词（当前${availableWords.length}个）`;
    return false;
  }

  elements.startMatchBtn.disabled = false;
  elements.startMatchBtn.textContent = "🎮 开始比赛";
  return true;
}

/**
 * 更新排行榜
 */
function updateLeaderboard() {
  const leaderboard = getLeaderboard(10);
  const html = leaderboard
    .map((player) => {
      const tier = getTierByScore(player.score);
      const rankDisplay =
        player.rank <= 3 ? ["🥇", "🥈", "🥉"][player.rank - 1] : player.rank;
      const isPlayer = player.isPlayer;

      return `
      <li class="leaderboard-item ${isPlayer ? "is-player" : ""}">
        <span class="leaderboard-rank ${
          player.rank <= 3 ? "top-3" : ""
        }">${rankDisplay}</span>
        <span class="leaderboard-name">${player.name}</span>
        <span class="leaderboard-tier">${tier.icon}</span>
        <span class="leaderboard-score">${player.score}</span>
      </li>
    `;
    })
    .join("");

  elements.leaderboardList.innerHTML = html;
}

// =================================================================
// 比赛逻辑
// =================================================================

/**
 * 开始比赛
 */
async function startMatch() {
  if (!checkWordsAvailability()) {
    return;
  }

  // 重置比赛状态
  matchState = {
    isActive: true,
    currentQuestion: 0,
    totalQuestions: 10,
    correctCount: 0,
    wrongCount: 0,
    questions: [],
    currentWord: null,
    currentContent: null,
    questionType: null,
  };

  // 预选10个单词
  const selectedWords = selectWordsForMatch();
  if (selectedWords.length < 10) {
    showToast("可用单词不足，无法开始比赛", "error");
    return;
  }

  matchState.questions = selectedWords;

  // 切换到比赛界面
  elements.mainView.style.display = "none";
  elements.matchResult.classList.remove("active");
  elements.matchView.classList.add("active");

  // 更新显示
  updateMatchDisplay();

  // 加载第一题
  await loadQuestion();
}

/**
 * 为比赛选择单词
 */
function selectWordsForMatch() {
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const vocabularies = safeGetItem(STORAGE_KEYS.VOCABULARIES, []);
  const enabledVocabIds = vocabularies
    .filter((v) => v.enabled !== false)
    .map((v) => v.id);
  const availableWords = wordBank.filter((w) =>
    enabledVocabIds.includes(w.vocabularyId)
  );

  // 随机选择10个不重复的单词
  const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10).map((word, index) => ({
    word: word,
    type: index % 2 === 0 ? "context" : "blank", // 交替出题类型
  }));
}

/**
 * 加载题目
 */
async function loadQuestion() {
  const questionIndex = matchState.currentQuestion;
  if (questionIndex >= matchState.totalQuestions) {
    endMatch();
    return;
  }

  const questionData = matchState.questions[questionIndex];
  matchState.currentWord = questionData.word;
  matchState.questionType = questionData.type;

  // 显示加载状态
  elements.questionContent.innerHTML =
    '<div class="skeleton-text"></div><div class="skeleton-text" style="width: 80%"></div><div class="skeleton-text" style="width: 60%"></div>';
  elements.answerInput.disabled = true;
  elements.submitAnswerBtn.disabled = true;

  try {
    let content;
    if (questionData.type === "context") {
      // 上下文猜词模式
      content = await generateContext(questionData.word.word);
      matchState.currentContent = content;
      renderContextQuestion(content);
    } else {
      // 填空模式
      content = await generateBlankSentence(questionData.word.word);
      matchState.currentContent = content;
      renderBlankQuestion(content, questionData.word.word);
    }

    elements.answerInput.disabled = false;
    elements.submitAnswerBtn.disabled = false;
    elements.answerInput.value = "";
    elements.answerInput.focus();

    // 重置提示面板
    if (typeof HintPanelManager !== "undefined") {
      HintPanelManager.reset();
    }
  } catch (error) {
    console.error("加载题目失败:", error);
    showToast("加载题目失败，请重试", "error");
    // 跳过此题
    matchState.wrongCount++;
    matchState.currentQuestion++;
    updateMatchDisplay();
    await loadQuestion();
  }
}

/**
 * 渲染上下文猜词题目
 */
function renderContextQuestion(content) {
  elements.questionContent.innerHTML = `
    <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
      📚 上下文猜词：阅读以下段落，猜测加粗单词的中文含义
    </div>
    <div class="context-text">${content}</div>
  `;
  elements.answerInput.placeholder = "输入中文翻译...";
}

/**
 * 渲染填空题目
 */
function renderBlankQuestion(content, word) {
  // 将单词替换为空白
  const blankContent = content.replace(
    new RegExp(`\\b${word}\\b`, "gi"),
    '<span class="blank">______</span>'
  );

  elements.questionContent.innerHTML = `
    <div style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
      🔍 填空练习：根据上下文填入正确的单词
    </div>
    <div class="context-text">${blankContent}</div>
  `;
  elements.answerInput.placeholder = "输入英文单词...";
}

/**
 * 更新比赛显示
 */
function updateMatchDisplay() {
  elements.currentQuestion.textContent = matchState.currentQuestion + 1;
  elements.correctCount.textContent = matchState.correctCount;
  elements.wrongCount.textContent = matchState.wrongCount;
}

/**
 * 提交答案
 */
async function submitAnswer() {
  const userAnswer = elements.answerInput.value.trim();
  if (!userAnswer) {
    showToast("请输入答案", "info");
    return;
  }

  elements.submitAnswerBtn.disabled = true;
  elements.answerInput.disabled = true;

  let isCorrect = false;

  try {
    if (matchState.questionType === "context") {
      // 上下文模式：验证中文翻译
      isCorrect = await validateTranslation(
        matchState.currentWord.word,
        userAnswer,
        matchState.currentContent
      );
    } else {
      // 填空模式：直接比较英文单词
      isCorrect =
        userAnswer.toLowerCase() === matchState.currentWord.word.toLowerCase();
    }
  } catch (error) {
    console.error("验证答案失败:", error);
    // 简单比较作为后备
    if (matchState.questionType === "context") {
      const translations = matchState.currentWord.translations || [];
      isCorrect = translations.some(
        (t) =>
          t.toLowerCase().includes(userAnswer.toLowerCase()) ||
          userAnswer.toLowerCase().includes(t.toLowerCase())
      );
    } else {
      isCorrect =
        userAnswer.toLowerCase() === matchState.currentWord.word.toLowerCase();
    }
  }

  // 更新分数
  if (isCorrect) {
    matchState.correctCount++;
    showToast("✓ 回答正确！", "success", 1500);
  } else {
    matchState.wrongCount++;
    const correctAnswer =
      matchState.questionType === "context"
        ? matchState.currentWord.translations.join("、")
        : matchState.currentWord.word;
    showToast(`✗ 回答错误，正确答案：${correctAnswer}`, "error", 2500);
  }

  // 记录练习（用于权重系统）
  const wordObj = matchState.currentWord;
  const modeToRecord =
    matchState.questionType === "context" ? "context" : "blank";
  recordPractice(wordObj.word, modeToRecord, isCorrect);

  // 更新显示
  matchState.currentQuestion++;
  updateMatchDisplay();

  // 短暂延迟后加载下一题
  setTimeout(async () => {
    if (matchState.currentQuestion >= matchState.totalQuestions) {
      endMatch();
    } else {
      await loadQuestion();
    }
  }, 1000);
}

/**
 * 结束比赛
 */
function endMatch() {
  matchState.isActive = false;

  // 判断胜负（答对6题以上获胜）
  const isWin = matchState.correctCount >= 6;
  const isPerfect = matchState.correctCount === matchState.totalQuestions;

  // 更新排位数据
  const result = updateRankedResult(
    isWin,
    isPerfect,
    matchState.correctCount,
    matchState.totalQuestions
  );

  // 显示结果
  showMatchResult(isWin, isPerfect, result);
}

/**
 * 显示比赛结果
 */
function showMatchResult(isWin, isPerfect, result) {
  elements.matchView.classList.remove("active");
  elements.matchResult.classList.add("active");

  // 设置结果显示
  if (isWin) {
    elements.resultIcon.textContent = isPerfect ? "🏆" : "🎉";
    elements.resultTitle.textContent = isPerfect ? "完美胜利！" : "胜利！";
    elements.resultTitle.className = "result-title win";
  } else {
    elements.resultIcon.textContent = "😢";
    elements.resultTitle.textContent = "失败";
    elements.resultTitle.className = "result-title lose";
  }

  elements.resultCorrect.textContent = matchState.correctCount;
  elements.resultWrong.textContent = matchState.wrongCount;

  // 分数变化
  const scoreChangeText =
    result.scoreChange >= 0
      ? `+${result.scoreChange}`
      : `${result.scoreChange}`;
  elements.resultScoreChange.textContent = scoreChangeText;
  elements.resultScoreChange.className = `result-score-change ${
    result.scoreChange >= 0 ? "positive" : "negative"
  }`;

  // 段位变化
  if (result.tierChange) {
    const oldTier = SEASON_CONFIG.TIERS.find(
      (t) => t.id === result.tierChange.from
    );
    const newTier = SEASON_CONFIG.TIERS.find(
      (t) => t.id === result.tierChange.to
    );
    elements.oldTierDisplay.textContent = `${oldTier.icon} ${oldTier.name}`;
    elements.newTierDisplay.textContent = `${newTier.icon} ${newTier.name}`;
    elements.tierChangeDisplay.style.display = "flex";
  } else {
    elements.tierChangeDisplay.style.display = "none";
  }

  // 奖励金币和经验
  if (isWin) {
    rewardCorrectAnswer(CURRENT_MODE, matchState.correctCount >= 8);
  }
}

/**
 * 返回主界面
 */
function backToMain() {
  elements.matchResult.classList.remove("active");
  elements.mainView.style.display = "block";
  updateMainView();
}

// 暴露全局函数
window.startMatch = startMatch;
window.submitAnswer = submitAnswer;
window.backToMain = backToMain;
