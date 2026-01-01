// 用户中心脚本

/**
 * 初始化用户中心页面
 */
function initUserCenterPage() {
  initializeStorage();
  initializeUserProfile();
  initializeTheme();
  loadUserProfile();
  loadAchievements();
  loadVocabularyStats();
  initializeCharts(); // 初始化图表
  initLeaderboard(); // 初始化排行榜
  initScrollableTabsHint(document.querySelector(".leaderboard-tabs"));
  initDeveloperMode(); // 初始化开发者模式
}

document.addEventListener("DOMContentLoaded", initUserCenterPage);

/**
 * 加载用户档案信息
 */
function loadUserProfile() {
  const profile = getUserProfile();

  // 更新基本信息
  document.getElementById("userLevel").textContent = profile.level;
  document.getElementById("totalCoins").textContent = profile.coins;
  document.getElementById("currentStreak").textContent = profile.streak;
  document.getElementById("totalWords").textContent = profile.totalWordsLearned;

  // 计算学习时长（假设每个单词平均学习2分钟）
  const estimatedTime = Math.floor(
    profile.totalPracticeTime || profile.totalWordsLearned * 2
  );
  document.getElementById("totalTime").textContent = estimatedTime;

  // 计算加入天数
  const createdDate = new Date(profile.createdAt);
  const today = new Date();
  const daysDiff = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
  document.getElementById("joinDays").textContent = daysDiff;

  // 更新经验值进度条
  const currentExp = profile.exp;
  const nextLevelExp = getExpForNextLevel(profile.level);
  const expPercentage = (currentExp / nextLevelExp) * 100;

  document.getElementById("currentExp").textContent = currentExp;
  document.getElementById("nextLevelExp").textContent = nextLevelExp;
  document.getElementById("expFill").style.width = `${expPercentage}%`;
}

/**
 * 加载成就列表
 */
function loadAchievements() {
  const achievements = initializeAchievements();
  const container = document.getElementById("achievementsContainer");

  container.innerHTML = "";

  achievements.definitions.forEach((achievement) => {
    const isUnlocked = achievements.unlocked.includes(achievement.id);
    const card = document.createElement("div");
    card.className = `achievement-card ${isUnlocked ? "unlocked" : "locked"}`;

    card.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-desc">${achievement.description}</div>
      <div class="achievement-reward">
        ${isUnlocked ? "✅ 已解锁" : `🎁 奖励：${achievement.reward} 金币`}
      </div>
    `;

    container.appendChild(card);
  });

  // 清除之前可能存在的进度文本
  const existingProgressText = container.parentElement.querySelector(
    ".achievement-progress-text"
  );
  if (existingProgressText) {
    existingProgressText.remove();
  }

  // 显示解锁进度
  const unlockedCount = achievements.unlocked.length;
  const totalCount = achievements.definitions.length;
  const progressText = document.createElement("p");
  progressText.className = "achievement-progress-text";
  progressText.style.cssText =
    "text-align: center; margin-top: 1rem; color: #64748b;";
  progressText.textContent = `已解锁 ${unlockedCount} / ${totalCount} 个成就`;
  container.parentElement.appendChild(progressText);
}

/**
 * 加载词库统计
 */
function loadVocabularyStats() {
  const vocabularies = getVocabularies();
  const wordBank = safeGetItem("wordBank", []);
  const container = document.getElementById("vocabularyList");

  container.innerHTML = "";

  if (vocabularies.length === 0) {
    container.innerHTML = `
      <p style="text-align: center; color: #64748b; padding: 2rem;">
        暂无词库数据
      </p>
    `;
    return;
  }

  vocabularies.forEach((vocab) => {
    // 统计该词库的单词数量
    const wordsInVocab = wordBank.filter(
      (w) => w.vocabularyId === vocab.id
    ).length;

    // 统计已学习单词（有练习记录的）
    const learnedWords = wordBank.filter((w) => {
      if (w.vocabularyId !== vocab.id) return false;
      const totalPractice = Object.values(w.modes || {}).reduce(
        (sum, mode) => sum + (mode.practiceCount || 0),
        0
      );
      return totalPractice > 0;
    }).length;

    const item = document.createElement("div");
    item.className = "vocab-item";

    item.innerHTML = `
      <div class="vocab-info">
        <div class="vocab-name">${vocab.name}</div>
        <div class="vocab-stats">
          📚 总单词：${wordsInVocab} |
          ✅ 已学习：${learnedWords} |
          ${vocab.enabled ? "🟢 已启用" : "⚫ 已禁用"}
        </div>
      </div>
    `;

    container.appendChild(item);
  });
}

/**
 * 刷新所有数据
 */
function refreshAllData() {
  loadUserProfile();
  loadAchievements();
  loadVocabularyStats();
  showToast("数据已刷新", "success");
}

// 每30秒自动刷新一次数据
setInterval(refreshAllData, 30000);

// =================================================================
// 数据可视化图表功能
// =================================================================

/**
 * 初始化所有图表
 */
function initializeCharts() {
  renderDailyChart();
  renderAccuracyChart();
  renderWordsPieChart();
}

/**
 * 切换图表显示
 */
function showChart(chartName) {
  // 更新标签按钮状态
  document.querySelectorAll(".chart-tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.chart === chartName) {
      btn.classList.add("active");
    }
  });

  // 显示对应图表
  document.getElementById("dailyChart").style.display =
    chartName === "daily" ? "block" : "none";
  document.getElementById("accuracyChart").style.display =
    chartName === "accuracy" ? "block" : "none";
  document.getElementById("wordsChart").style.display =
    chartName === "words" ? "block" : "none";
}

/**
 * 渲染每日练习柱状图
 */
function renderDailyChart() {
  const records = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
  const container = document.getElementById("dailyBarChart");

  // 获取最近7天的数据
  const last7Days = getLast7DaysData(records);

  container.innerHTML = "";

  // 找出最大值用于计算高度比例
  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);

  last7Days.forEach((day) => {
    const barItem = document.createElement("div");
    barItem.className = "bar-item";

    const height = (day.count / maxCount) * 100;

    barItem.innerHTML = `
      <div class="bar" style="height: ${height}%">
        <div class="bar-value">${day.count}</div>
      </div>
      <div class="bar-label">${day.label}</div>
    `;

    container.appendChild(barItem);
  });
}

/**
 * 渲染正确率折线图
 */
function renderAccuracyChart() {
  const records = safeGetItem(STORAGE_KEYS.PRACTICE_RECORDS, []);
  const container = document.getElementById("accuracyLineChart");

  // 获取最近7天的正确率数据
  const last7Days = getLast7DaysAccuracy(records);

  // SVG 尺寸
  const width = container.offsetWidth || 600;
  const height = 250;
  const padding = 40;

  // 创建SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  // 绘制网格线
  for (let i = 0; i <= 4; i++) {
    const y = padding + ((height - 2 * padding) * i) / 4;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padding);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - padding);
    line.setAttribute("y2", y);
    line.classList.add("line-grid");
    svg.appendChild(line);

    // Y轴标签
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", padding - 10);
    text.setAttribute("y", y + 5);
    text.setAttribute("text-anchor", "end");
    text.classList.add("line-label");
    text.textContent = `${100 - i * 25}%`;
    svg.appendChild(text);
  }

  // 计算点的位置
  const points = last7Days.map((day, index) => {
    const x =
      padding + ((width - 2 * padding) * index) / (last7Days.length - 1);
    const y = padding + (height - 2 * padding) * (1 - day.accuracy / 100);
    return { x, y, accuracy: day.accuracy, label: day.label };
  });

  // 绘制折线
  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.classList.add("line-path");
  svg.appendChild(path);

  // 绘制数据点
  points.forEach((point, index) => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 5);
    circle.classList.add("line-point");

    // 添加悬停提示
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title"
    );
    title.textContent = `${point.label}: ${point.accuracy.toFixed(1)}%`;
    circle.appendChild(title);

    svg.appendChild(circle);

    // X轴标签
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", point.x);
    text.setAttribute("y", height - padding + 20);
    text.setAttribute("text-anchor", "middle");
    text.classList.add("line-label");
    text.textContent = point.label;
    svg.appendChild(text);
  });

  container.innerHTML = "";
  container.appendChild(svg);
}

/**
 * 渲染单词掌握饼图
 */
function renderWordsPieChart() {
  const wordBank = safeGetItem(STORAGE_KEYS.WORD_BANK, []);
  const canvas = document.getElementById("wordsPieChart");
  const legendContainer = document.getElementById("pieLegend");

  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 100;

  // 统计各模式的练习次数
  const modeStats = {};
  const modes = getSupportedModes();

  modes.forEach((mode) => {
    modeStats[mode.id] = {
      name: mode.name,
      count: 0,
      color: mode.color || getRandomColor(),
    };
  });

  // 计算每个模式的练习次数
  wordBank.forEach((word) => {
    if (word.modes) {
      Object.keys(word.modes).forEach((modeId) => {
        if (modeStats[modeId]) {
          modeStats[modeId].count += word.modes[modeId].practiceCount || 0;
        }
      });
    }
  });

  // 过滤掉没有练习的模式
  const dataToShow = Object.entries(modeStats)
    .filter(([_, data]) => data.count > 0)
    .map(([id, data]) => ({ id, ...data }));

  if (dataToShow.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("暂无练习数据", centerX, centerY);
    legendContainer.innerHTML = "";
    return;
  }

  // 计算总数
  const total = dataToShow.reduce((sum, item) => sum + item.count, 0);

  // 绘制饼图
  let currentAngle = -Math.PI / 2; // 从顶部开始

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dataToShow.forEach((item, index) => {
    const sliceAngle = (item.count / total) * 2 * Math.PI;

    // 绘制扇形
    ctx.beginPath();
    ctx.fillStyle = item.color;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;
  });

  // 绘制图例
  legendContainer.innerHTML = "";
  dataToShow.forEach((item) => {
    const legendItem = document.createElement("div");
    legendItem.className = "pie-legend-item";

    const percentage = ((item.count / total) * 100).toFixed(1);

    legendItem.innerHTML = `
      <div class="pie-legend-color" style="background: ${item.color}"></div>
      <div class="pie-legend-label">${item.name}</div>
      <div class="pie-legend-value">${item.count} (${percentage}%)</div>
    `;

    legendContainer.appendChild(legendItem);
  });
}

/**
 * 获取最近7天的练习数据
 */
function getLast7DaysData(records) {
  const result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // 计算该天的练习次数（添加日期有效性检查）
    const count = records.filter((r) => {
      if (!r.date) return false;
      const recordDateObj = new Date(r.date);
      if (isNaN(recordDateObj.getTime())) return false;
      const recordDate = recordDateObj.toISOString().split("T")[0];
      return recordDate === dateStr;
    }).length;

    // 格式化日期标签
    const label =
      i === 0
        ? "今天"
        : i === 1
        ? "昨天"
        : `${date.getMonth() + 1}/${date.getDate()}`;

    result.push({ date: dateStr, count, label });
  }

  return result;
}

/**
 * 获取最近7天的正确率数据
 */
function getLast7DaysAccuracy(records) {
  const result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // 该天的所有记录（添加日期有效性检查）
    const dayRecords = records.filter((r) => {
      if (!r.date) return false;
      const recordDateObj = new Date(r.date);
      if (isNaN(recordDateObj.getTime())) return false;
      const recordDate = recordDateObj.toISOString().split("T")[0];
      return recordDate === dateStr;
    });

    // 计算正确率
    let accuracy = 0;
    if (dayRecords.length > 0) {
      const correctCount = dayRecords.filter((r) => r.correct).length;
      accuracy = (correctCount / dayRecords.length) * 100;
    }

    // 格式化日期标签
    const label =
      i === 0
        ? "今天"
        : i === 1
        ? "昨天"
        : `${date.getMonth() + 1}/${date.getDate()}`;

    result.push({ date: dateStr, accuracy, label });
  }

  return result;
}

/**
 * 获取随机颜色（用于饼图）
 */
function getRandomColor() {
  const colors = [
    "#6366f1", // 紫色
    "#8b5cf6", // 紫罗兰
    "#ec4899", // 粉红
    "#f59e0b", // 橙色
    "#10b981", // 绿色
    "#3b82f6", // 蓝色
    "#ef4444", // 红色
    "#14b8a6", // 青色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// =================================================================
// 排行榜系统（本地模拟）
// =================================================================

// 模拟玩家名字库
const FAKE_PLAYER_NAMES = [
  "英语小达人",
  "词汇王者",
  "学习之星",
  "单词猎手",
  "语言探索者",
  "知识追求者",
  "拼写高手",
  "背单词机器",
  "词汇收割者",
  "学霸本霸",
  "英语爱好者",
  "勤奋学习者",
  "语言天才",
  "记忆大师",
  "词汇专家",
  "坚持不懈",
  "每日一词",
  "进步达人",
  "努力学习ing",
  "永不放弃",
  "Alex_Study",
  "WordMaster",
  "EnglishPro",
  "LearnDaily",
  "VocabKing",
  "StudyHard",
  "NeverGiveUp",
  "LearningFun",
  "WordLover",
  "BookWorm",
  "一群傻逼",
  "楼下差1分怎么不凹了",
  "我就是你们的爸爸",
  "别看我，我只是世界第二",
];

// 模拟头像库
const FAKE_AVATARS = [
  "🎓",
  "📚",
  "✨",
  "🌟",
  "💪",
  "🔥",
  "⭐",
  "🏆",
  "👨‍🎓",
  "👩‍🎓",
  "🦊",
  "🐱",
  "🐶",
  "🐼",
  "🦁",
  "🐸",
  "🐵",
  "🐰",
];

// 排行榜数据缓存
let leaderboardCache = null;
let currentLeaderboardType = "exp";

/**
 * 生成模拟排行榜数据（基于用户当前数据动态生成）
 * 设计原则：
 * - 用户初始排名约在 60-70% 位置
 * - 随着用户进步，排名逐渐上升
 * - 始终有几个"可超越"的对手在前面
 * - 始终有几个"追赶者"在后面
 */
function generateFakeLeaderboard() {
  const profile = getUserProfile();
  const fakePlayers = [];

  // 获取用户当前数据
  const userLevel = profile.level || 1;
  const userExp = (userLevel - 1) * 100 + (profile.exp || 0);
  const userStreak = profile.streak || 0;
  const userWords = profile.totalWordsLearned || 0;

  // 生成 18-22 个假玩家
  const playerCount = 18 + Math.floor(Math.random() * 5);

  // 计算分布：
  // - 约 30% 玩家明显强于用户（榜首区）
  // - 约 25% 玩家略强于用户（可追赶区）
  // - 约 25% 玩家略弱于用户（被追赶区）
  // - 约 20% 玩家明显弱于用户（垫底区）
  const strongCount = Math.floor(playerCount * 0.3);
  const slightlyStrongCount = Math.floor(playerCount * 0.25);
  const slightlyWeakCount = Math.floor(playerCount * 0.25);
  const weakCount =
    playerCount - strongCount - slightlyStrongCount - slightlyWeakCount;

  for (let i = 0; i < playerCount; i++) {
    const nameIndex = Math.floor(Math.random() * FAKE_PLAYER_NAMES.length);
    const avatarIndex = Math.floor(Math.random() * FAKE_AVATARS.length);

    let level, exp, streak, wordsLearned;

    if (i < strongCount) {
      // 榜首区：比用户强 50%-150%
      const multiplier = 1.5 + Math.random() * 1.0;
      level = Math.max(
        1,
        Math.floor(userLevel * multiplier) + Math.floor(Math.random() * 5)
      );
      exp = Math.floor(userExp * multiplier) + Math.floor(Math.random() * 200);
      streak =
        Math.floor((userStreak + 10) * multiplier) +
        Math.floor(Math.random() * 15);
      wordsLearned =
        Math.floor((userWords + 20) * multiplier) +
        Math.floor(Math.random() * 50);
    } else if (i < strongCount + slightlyStrongCount) {
      // 可追赶区：比用户强 5%-40%（努力一下可以超越）
      const multiplier = 1.05 + Math.random() * 0.35;
      level = Math.max(
        1,
        Math.floor(userLevel * multiplier) + Math.floor(Math.random() * 2)
      );
      exp = Math.floor(userExp * multiplier) + Math.floor(Math.random() * 80);
      streak =
        Math.floor((userStreak + 3) * multiplier) +
        Math.floor(Math.random() * 5);
      wordsLearned =
        Math.floor((userWords + 5) * multiplier) +
        Math.floor(Math.random() * 20);
    } else if (i < strongCount + slightlyStrongCount + slightlyWeakCount) {
      // 被追赶区：比用户弱 5%-30%（刚被用户超越的感觉）
      const multiplier = 0.7 + Math.random() * 0.25;
      level = Math.max(1, Math.floor(userLevel * multiplier));
      exp = Math.max(
        0,
        Math.floor(userExp * multiplier) - Math.floor(Math.random() * 50)
      );
      streak = Math.max(
        0,
        Math.floor(userStreak * multiplier) - Math.floor(Math.random() * 3)
      );
      wordsLearned = Math.max(
        0,
        Math.floor(userWords * multiplier) - Math.floor(Math.random() * 10)
      );
    } else {
      // 垫底区：比用户弱 50%-90%
      const multiplier = 0.1 + Math.random() * 0.4;
      level = Math.max(1, Math.floor(userLevel * multiplier) + 1);
      exp = Math.max(10, Math.floor(userExp * multiplier));
      streak = Math.max(0, Math.floor(userStreak * multiplier));
      wordsLearned = Math.max(5, Math.floor(userWords * multiplier));
    }

    // 确保数据合理性
    level = Math.max(1, Math.min(level, 99));
    exp = Math.max(0, exp);
    streak = Math.max(0, Math.min(streak, 365));
    wordsLearned = Math.max(0, wordsLearned);

    fakePlayers.push({
      id: `fake_${i}`,
      name:
        FAKE_PLAYER_NAMES[nameIndex] +
        (Math.random() > 0.7 ? Math.floor(Math.random() * 100) : ""),
      avatar: FAKE_AVATARS[avatarIndex],
      level: level,
      exp: exp,
      streak: streak,
      wordsLearned: wordsLearned,
      isCurrentUser: false,
    });
  }

  // 添加当前用户
  const currentUser = {
    id: "current_user",
    name: "我",
    avatar: "🎓",
    level: userLevel,
    exp: userExp,
    streak: userStreak,
    wordsLearned: userWords,
    isCurrentUser: true,
  };

  fakePlayers.push(currentUser);

  return fakePlayers;
}

/**
 * 获取排行榜数据（带缓存）
 */
function getLeaderboardData() {
  // 检查缓存是否有效（24小时内）
  const cacheKey = "leaderboardCache";
  const cached = safeGetItem(cacheKey);

  if (cached && cached.timestamp && Date.now() - cached.timestamp < 86400000) {
    // 更新当前用户数据
    const profile = getUserProfile();
    const currentUserIndex = cached.data.findIndex((p) => p.isCurrentUser);
    if (currentUserIndex !== -1) {
      cached.data[currentUserIndex].level = profile.level || 1;
      cached.data[currentUserIndex].exp =
        (profile.level - 1) * 100 + (profile.exp || 0);
      cached.data[currentUserIndex].streak = profile.streak || 0;
      cached.data[currentUserIndex].wordsLearned =
        profile.totalWordsLearned || 0;
    }
    return cached.data;
  }

  // 生成新数据
  const newData = generateFakeLeaderboard();
  safeSetItem(cacheKey, {
    data: newData,
    timestamp: Date.now(),
  });

  return newData;
}

/**
 * 刷新排行榜（假刷新，只显示动画和提示）
 */
function refreshLeaderboard() {
  const btn = document.querySelector(".leaderboard-refresh-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "刷新中...";
  }

  // 模拟刷新延迟，增加真实感
  setTimeout(() => {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🔄 刷新排行榜";
    }
    showToast("排行榜已刷新！", "success");
  }, 800 + Math.random() * 400); // 随机 0.8-1.2 秒延迟
}

/**
 * 开发者专属：强制刷新排行榜（真正清除缓存并重新生成）
 */
function devForceRefreshLeaderboard() {
  safeRemoveItem("leaderboardCache");
  leaderboardCache = null;
  showLeaderboard(currentLeaderboardType);
  showToast("🛠️ 排行榜数据已重新生成！", "success");
}

/**
 * 显示排行榜
 * @param {string} type - 排行榜类型：exp(经验)、streak(连续天数)、words(学习单词)
 */
function showLeaderboard(type) {
  currentLeaderboardType = type;

  // 更新标签页状态
  document.querySelectorAll(".leaderboard-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const container = document.getElementById("leaderboardList");
  if (!container) return;

  // 获取数据
  const players = getLeaderboardData();

  // 根据类型排序
  let sortedPlayers;
  let scoreLabel;
  let scoreKey;

  switch (type) {
    case "exp":
      sortedPlayers = [...players].sort((a, b) => b.exp - a.exp);
      scoreLabel = "经验值";
      scoreKey = "exp";
      break;
    case "streak":
      sortedPlayers = [...players].sort((a, b) => b.streak - a.streak);
      scoreLabel = "天";
      scoreKey = "streak";
      break;
    case "words":
      sortedPlayers = [...players].sort(
        (a, b) => b.wordsLearned - a.wordsLearned
      );
      scoreLabel = "个单词";
      scoreKey = "wordsLearned";
      break;
    default:
      return;
  }

  // 只显示前10名
  const top10 = sortedPlayers.slice(0, 10);

  // 查找当前用户排名
  const currentUserRank = sortedPlayers.findIndex((p) => p.isCurrentUser) + 1;
  const currentUserInTop10 = currentUserRank <= 10;

  // 渲染列表
  container.innerHTML = "";

  top10.forEach((player, index) => {
    const rank = index + 1;
    const item = document.createElement("div");

    let itemClass = "leaderboard-item";
    if (player.isCurrentUser) itemClass += " current-user";
    if (rank === 1) itemClass += " top-1";
    else if (rank === 2) itemClass += " top-2";
    else if (rank === 3) itemClass += " top-3";

    item.className = itemClass;

    const rankDisplay =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
    const scoreValue = player[scoreKey];

    item.innerHTML = `
      <div class="leaderboard-rank">${rankDisplay}</div>
      <div class="leaderboard-avatar">${player.avatar}</div>
      <div class="leaderboard-info">
        <div class="leaderboard-name">${player.name}</div>
        <div class="leaderboard-level">Lv.${player.level}</div>
      </div>
      <div class="leaderboard-score">
        <div class="leaderboard-score-value">${scoreValue}</div>
        <div class="leaderboard-score-label">${scoreLabel}</div>
      </div>
    `;

    container.appendChild(item);
  });

  // 如果当前用户不在前10，显示分隔线和用户排名
  if (!currentUserInTop10) {
    const currentUser = sortedPlayers.find((p) => p.isCurrentUser);
    if (currentUser) {
      // 添加分隔符
      const separator = document.createElement("div");
      separator.style.cssText =
        "text-align: center; color: #94a3b8; padding: 0.5rem; font-size: 0.9rem;";
      separator.textContent = "· · ·";
      container.appendChild(separator);

      // 添加当前用户
      const item = document.createElement("div");
      item.className = "leaderboard-item current-user";

      const scoreValue = currentUser[scoreKey];

      item.innerHTML = `
        <div class="leaderboard-rank">${currentUserRank}</div>
        <div class="leaderboard-avatar">${currentUser.avatar}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${currentUser.name}</div>
          <div class="leaderboard-level">Lv.${currentUser.level}</div>
        </div>
        <div class="leaderboard-score">
          <div class="leaderboard-score-value">${scoreValue}</div>
          <div class="leaderboard-score-label">${scoreLabel}</div>
        </div>
      `;

      container.appendChild(item);
    }
  }
}

/**
 * 初始化排行榜
 */
function initLeaderboard() {
  showLeaderboard("exp");
}

/**
 * 为横向可滚动 tabs 提供“可滑动提示”的状态类：
 * - is-scrollable：内容宽度超过容器
 * - at-start / at-end：用于隐藏左右边缘渐变
 */
function initScrollableTabsHint(tabsContainer) {
  if (!tabsContainer) return;

  let rafId = 0;

  const update = () => {
    rafId = 0;

    const isScrollable =
      tabsContainer.scrollWidth > tabsContainer.clientWidth + 1;
    tabsContainer.classList.toggle("is-scrollable", isScrollable);

    if (!isScrollable) {
      tabsContainer.classList.remove("at-start");
      tabsContainer.classList.remove("at-end");
      return;
    }

    const maxScrollLeft = Math.max(
      0,
      tabsContainer.scrollWidth - tabsContainer.clientWidth
    );
    const atStart = tabsContainer.scrollLeft <= 1;
    const atEnd = tabsContainer.scrollLeft >= maxScrollLeft - 1;

    tabsContainer.classList.toggle("at-start", atStart);
    tabsContainer.classList.toggle("at-end", atEnd);
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  tabsContainer.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  // 首次计算
  scheduleUpdate();
}
