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

    // 计算该天的练习次数
    const count = records.filter((r) => {
      const recordDate = new Date(r.date).toISOString().split("T")[0];
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

    // 该天的所有记录
    const dayRecords = records.filter((r) => {
      const recordDate = new Date(r.date).toISOString().split("T")[0];
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
